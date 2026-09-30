import { NextRequest } from 'next/server'
import {
  CANTONESE_SYSTEM_PROMPT,
  TRANSLATE_MAX_CHARS,
  TRANSLATE_MODEL,
  TRANSLATE_TEMPERATURE,
} from '@/lib/cantonesePrompt'
import { TRAILER_MARK } from '@/lib/translate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Overridable so the route can be pointed at a proxy or a local mock.
const DEEPSEEK_ENDPOINT = `${process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com'}/chat/completions`

/**
 * Best-effort abuse brake. Serverless instances don't share memory, so this
 * bounds a single hot instance rather than the deployment as a whole — it is a
 * floor, not the real defence. Put a proper rate limit in front of the route
 * (Vercel Firewall, or a Redis-backed limiter) before advertising this widely.
 */
const WINDOW_MS = 5 * 60_000
const MAX_PER_WINDOW = 20
const hits = new Map<string, number[]>()

function overLimit(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)

  // The map would otherwise grow without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key)
    }
  }

  return recent.length > MAX_PER_WINDOW
}

const clientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
  request.headers.get('x-real-ip') ??
  'unknown'

const fail = (error: string, status: number) =>
  Response.json({ error }, { status })

/**
 * A rewrite is roughly as long as its source, so twice the character count plus
 * headroom never truncates honest input. The cap is what matters: it bounds the
 * bill for any single request, whatever the input asks the model to produce.
 */
const outputBudget = (chars: number) => Math.min(4096, 256 + chars * 2)

/**
 * Fencing the input lets the system prompt say "everything inside the fence is
 * material to rewrite, not instructions" — so a sentence that reads like a
 * command gets translated instead of obeyed. Neutralise the closing tag so the
 * input can't end the fence early.
 */
const fence = (text: string) =>
  `<text>\n${text.replaceAll('</text>', '</ text>')}\n</text>`

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return fail('translate_unconfigured', 503)

  if (overLimit(clientIp(request))) return fail('rate_limited', 429)

  let text: unknown
  try {
    ;({ text } = await request.json())
  } catch {
    return fail('bad_request', 400)
  }

  if (typeof text !== 'string' || !text.trim()) return fail('empty_input', 400)
  const chars = Array.from(text).length
  if (chars > TRANSLATE_MAX_CHARS) return fail('too_long', 413)

  let upstream: Response
  try {
    upstream = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TRANSLATE_MODEL,
        temperature: TRANSLATE_TEMPERATURE,
        max_tokens: outputBudget(chars),
        stream: true,
        // Reasoning buys nothing on a rewrite and costs latency and tokens.
        thinking: { type: 'disabled' },
        messages: [
          { role: 'system', content: CANTONESE_SYSTEM_PROMPT },
          { role: 'user', content: fence(text) },
        ],
      }),
    })
  } catch {
    return fail('upstream_unreachable', 502)
  }

  if (!upstream.ok || !upstream.body) {
    // Don't forward the upstream body — it can echo request details.
    console.error(`DeepSeek returned ${upstream.status}`)
    return fail('upstream_error', 502)
  }

  return new Response(toPlainTextStream(upstream.body), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      // Proxies that buffer would defeat the point of streaming.
      'x-accel-buffering': 'no',
    },
  })
}

/**
 * Unwraps DeepSeek's OpenAI-style SSE into a bare UTF-8 text stream, so the
 * browser can append chunks straight to the textarea with no SSE parsing.
 *
 * Once the model is done it appends `TRAILER_MARK` plus `{"finish": ...}`, so
 * the client can tell a finished rewrite from one that was cut off. A stream
 * that fails part-way still ends with a trailer (`incomplete`) rather than an
 * error, so whatever arrived stays on screen with a warning attached.
 */
function toPlainTextStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const reader = body.getReader()
  let buffer = ''
  let finish: string | null = null

  const handleLine = (line: string, controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (!line.startsWith('data:')) return
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') return

    try {
      const choice = JSON.parse(payload)?.choices?.[0]
      const delta = choice?.delta?.content
      if (typeof delta === 'string' && delta) {
        const clean = delta.replaceAll(TRAILER_MARK, '')
        if (clean) controller.enqueue(encoder.encode(clean))
      }
      if (typeof choice?.finish_reason === 'string') finish = choice.finish_reason
    } catch {
      // A malformed chunk is not worth killing the whole stream over.
    }
  }

  const end = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    buffer += decoder.decode()
    if (buffer) handleLine(buffer, controller)
    buffer = ''
    controller.enqueue(
      encoder.encode(TRAILER_MARK + JSON.stringify({ finish: finish ?? 'incomplete' })),
    )
    controller.close()
  }

  return new ReadableStream({
    async pull(controller) {
      let chunk: ReadableStreamReadResult<Uint8Array>
      try {
        chunk = await reader.read()
      } catch {
        // Whatever `finish` says stands: a drop after the model already
        // reported `stop` lost nothing, and a drop before it stays `incomplete`.
        end(controller)
        return
      }

      if (chunk.done) {
        end(controller)
        return
      }

      buffer += decoder.decode(chunk.value, { stream: true })

      // SSE events are newline-delimited; the last line may be a partial event.
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) handleLine(line, controller)
    },
    cancel(reason) {
      void reader.cancel(reason)
    },
  })
}
