/** Error codes the route can return, mapped to i18n keys by the caller. */
export type TranslateError =
  | 'translate_unconfigured'
  | 'rate_limited'
  | 'too_long'
  | 'upstream_error'
  | 'upstream_unreachable'
  | 'bad_request'
  | 'empty_input'
  | 'network'

export class TranslateFailure extends Error {
  constructor(readonly code: TranslateError) {
    super(code)
  }
}

/**
 * Separates the rewrite from the status trailer the route appends once the
 * model is done. The ASCII record separator never occurs in natural text, and
 * the route strips it from model output, so it is safe as an in-band marker.
 */
export const TRAILER_MARK = '\u001e'

/**
 * `stop` is the only clean ending. `length` means the output cap was hit,
 * `content_filter` means the provider cut something, and `incomplete` covers a
 * stream that ended without saying why (a dropped connection, an upstream
 * failure mid-answer).
 */
export type FinishReason = 'stop' | 'length' | 'content_filter' | 'incomplete'

export interface TranslationResult {
  text: string
  finish: FinishReason
}

function parseFinish(trailer: string): FinishReason {
  try {
    const finish = JSON.parse(trailer)?.finish
    if (finish === 'stop' || finish === 'length' || finish === 'content_filter') {
      return finish
    }
  } catch {
    // A mangled trailer tells us nothing, which is itself not a clean finish.
  }
  return 'incomplete'
}

/**
 * Streams a Cantonese rewrite from `/api/translate`, invoking `onChunk` with the
 * text accumulated so far. Feeding the running text back to the caller (rather
 * than just the delta) lets the page drop it straight into the textarea, so the
 * Jyutping annotation re-renders as the rewrite arrives.
 */
export async function streamTranslation(
  text: string,
  onChunk: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<TranslationResult> {
  let response: Response
  try {
    response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new TranslateFailure('network')
  }

  if (!response.ok || !response.body) {
    let code: TranslateError = 'upstream_error'
    try {
      const body = await response.json()
      if (typeof body?.error === 'string') code = body.error as TranslateError
    } catch {
      // Non-JSON error body — keep the generic code.
    }
    throw new TranslateFailure(code)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let raw = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      raw += decoder.decode(value, { stream: true })
      const mark = raw.indexOf(TRAILER_MARK)
      onChunk(mark === -1 ? raw : raw.slice(0, mark))
    }
    raw += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  const mark = raw.indexOf(TRAILER_MARK)
  if (mark === -1) return { text: raw, finish: 'incomplete' }
  return { text: raw.slice(0, mark), finish: parseFinish(raw.slice(mark + 1)) }
}
