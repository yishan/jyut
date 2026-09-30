'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadToJyutping,
  respellTokens,
  tokenize,
  type Token,
} from '@/lib/convert'
import { loadPingyam, type PingyamTable } from '@/lib/pingyam'
import { DEFAULT_SCHEME, type SchemeId } from '@/lib/schemes'
import { DEFAULT_FORMAT, toPlainText, type FormatOptions } from '@/lib/format'
import { useI18n, type StringKey } from '@/lib/i18n'
import {
  streamTranslation,
  TranslateFailure,
  type FinishReason,
} from '@/lib/translate'
import { TRANSLATE_MAX_CHARS } from '@/lib/cantonesePrompt'
import { usePersisted } from '@/lib/usePersisted'
import { useSpeech } from '@/lib/tts'
import { Header } from './Header'
import { ResultView } from './ResultView'
import { LayoutPicker, SettingsPanel } from './SettingsPanel'
import { Button, Card, SectionLabel } from './ui'

const MAX_CHARS = 5000
const SAMPLE = '咁啱老世要求佢等陣要開會，剩低嘅嘢我會搞掂㗎喇。'

/** Failures worth explaining specifically; everything else gets one message. */
const SPECIFIC_ERRORS = new Set<StringKey>([
  'translate.err.translate_unconfigured',
  'translate.err.rate_limited',
  'translate.err.too_long',
])

const FINISH_WARNING: Record<Exclude<FinishReason, 'stop'>, StringKey> = {
  length: 'translate.warn.truncated',
  incomplete: 'translate.warn.truncated',
  content_filter: 'translate.warn.filtered',
}

type Engine = Awaited<ReturnType<typeof loadToJyutping>>

export function Converter() {
  const { t } = useI18n()

  const [text, setText] = useState('')
  const [scheme, setScheme] = usePersisted<SchemeId>('jyut.scheme', DEFAULT_SCHEME)
  const [format, setFormat] = usePersisted<FormatOptions>('jyut.format', DEFAULT_FORMAT)
  const [useWordDictionary, setUseWordDictionary] = usePersisted('jyut.wordDict', true)
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<StringKey | null>(null)
  const [translateWarning, setTranslateWarning] = useState<StringKey | null>(null)
  // Holds the pre-rewrite text so a bad rewrite is one click away from undone.
  const [original, setOriginal] = useState<string | null>(null)
  const abortTranslate = useRef<AbortController | null>(null)

  const [engine, setEngine] = useState<Engine | null>(null)
  const [table, setTable] = useState<PingyamTable | null>(null)
  const [engineFailed, setEngineFailed] = useState(false)
  const [tableFailed, setTableFailed] = useState(false)
  // Bumping this re-runs the loaders after a failure.
  const [loadAttempt, setLoadAttempt] = useState(0)
  const speech = useSpeech()

  useEffect(() => {
    if (engine) return
    let cancelled = false
    loadToJyutping().then(
      (module) => {
        if (!cancelled) setEngine(() => module)
      },
      () => {
        if (!cancelled) setEngineFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [engine, loadAttempt])

  // Only fetch the cross-scheme table once a scheme actually needs it.
  useEffect(() => {
    if (scheme === 'jyutping' || table) return
    let cancelled = false
    loadPingyam().then(
      (loaded) => {
        if (!cancelled) setTable(loaded)
      },
      () => {
        if (!cancelled) setTableFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [scheme, table, loadAttempt])

  const retryLoad = () => {
    setEngineFailed(false)
    setTableFailed(false)
    setLoadAttempt((n) => n + 1)
  }

  // Until the scheme's table arrives every reading would render in Jyutping and
  // be counted as "no spelling in this scheme", so treat that as still loading.
  const schemeReady = scheme === 'jyutping' || table !== null
  const ready = engine !== null && schemeReady
  const loadFailed = engineFailed || (tableFailed && scheme !== 'jyutping')

  const chars = useMemo(() => Array.from(text), [text])
  const overLimit = chars.length > MAX_CHARS
  const clamped = overLimit ? chars.slice(0, MAX_CHARS).join('') : text
  const deferred = useDeferredValue(clamped)

  const tokens = useMemo<Token[]>(() => {
    if (!engine) return []
    return tokenize(deferred, engine, {
      useWordDictionary,
      // The custom-dictionary editor is hidden from the UI, so nothing feeds
      // this. `parseUserDict` and the panel are kept for when it comes back.
      userDict: [],
      overrides,
    })
  }, [engine, deferred, useWordDictionary, overrides])

  const pieces = useMemo(
    () => respellTokens(tokens, scheme, table),
    [tokens, scheme, table],
  )

  const unmapped = useMemo(
    () => (ready ? pieces.filter((piece) => piece.unmapped).length : 0),
    [pieces, ready],
  )
  const overrideCount = Object.keys(overrides).length

  const pick = (key: string, reading: string | null) => {
    setOverrides((current) => {
      const next = { ...current }
      if (reading === null) delete next[key]
      else next[key] = reading
      return next
    })
  }

  const copy = async () => {
    const output = toPlainText(pieces, format)
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard permission denied — nothing useful to do but stay quiet.
    }
  }

  const patchFormat = (patch: Partial<FormatOptions>) =>
    setFormat((current) => ({ ...current, ...patch }))

  // Abandon an in-flight rewrite if the component goes away.
  useEffect(() => () => abortTranslate.current?.abort(), [])

  /**
   * Stops an in-flight rewrite. Every action that replaces the text (Clear,
   * Sample, Undo) has to call this first, or the stream keeps writing into the
   * textarea and silently undoes what the user just did.
   */
  const cancelTranslate = () => {
    abortTranslate.current?.abort()
    abortTranslate.current = null
    setTranslating(false)
  }

  const resetTranslateState = () => {
    setOriginal(null)
    setTranslateError(null)
    setTranslateWarning(null)
  }

  const translate = async () => {
    const before = text
    const source = before.trim()
    if (!source || translating) return

    const controller = new AbortController()
    abortTranslate.current = controller

    setTranslating(true)
    setTranslateError(null)
    setTranslateWarning(null)
    setOriginal(before)
    setOverrides({})
    // Streaming straight into the textarea means the annotation below rebuilds
    // as the rewrite arrives, rather than jumping at the end.
    setText('')

    const restore = (error: StringKey) => {
      setText(before)
      setOriginal(null)
      setTranslateError(error)
    }

    try {
      const result = await streamTranslation(
        source,
        // A chunk can already be queued when the user cancels; the signal check
        // stops it landing on top of whatever they replaced the text with.
        (partial) => {
          if (!controller.signal.aborted) setText(partial)
        },
        controller.signal,
      )
      if (controller.signal.aborted) return

      if (!result.text.trim()) {
        restore('translate.err.empty_result')
      } else if (result.finish !== 'stop') {
        setTranslateWarning(FINISH_WARNING[result.finish])
      }
    } catch (error) {
      if (controller.signal.aborted || (error as Error).name === 'AbortError') return
      const code = error instanceof TranslateFailure ? error.code : 'upstream_error'
      const key = `translate.err.${code}` as StringKey
      restore(SPECIFIC_ERRORS.has(key) ? key : 'translate.err.generic')
    } finally {
      // A cancelled run must not flip the flag back if a newer run owns it.
      if (abortTranslate.current === controller) {
        abortTranslate.current = null
        setTranslating(false)
      }
    }
  }

  /** Also works mid-stream: it doubles as "stop and put my text back". */
  const undoTranslate = () => {
    if (original === null) return
    cancelTranslate()
    setText(original)
    setOverrides({})
    resetTranslateState()
  }

  const loadSample = () => {
    cancelTranslate()
    setText(SAMPLE)
    setOverrides({})
    resetTranslateState()
  }

  const clearInput = () => {
    cancelTranslate()
    setText('')
    setOverrides({})
    resetTranslateState()
  }

  const editInput = (value: string) => {
    setText(value)
    // An override is keyed `${offset}:${char}`; once an edit moves that
    // character, the key would otherwise re-attach to whatever lands there next.
    setOverrides((current) => {
      const stale = Object.keys(current).filter((key) => {
        const split = key.indexOf(':')
        return !value.startsWith(key.slice(split + 1), Number(key.slice(0, split)))
      })
      if (stale.length === 0) return current
      const next = { ...current }
      for (const key of stale) delete next[key]
      return next
    })
    // Undo means "revert the rewrite". Once the user edits by hand, reverting
    // would throw their edits away, so the offer goes.
    if (original !== null) resetTranslateState()
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <Header />

      <p className="max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
        {t('app.intro')}
      </p>

      <Card className="p-5">
        {/* Wraps on narrow screens: the English labels don't fit on one row at 375px. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <SectionLabel>{t('input.label')}</SectionLabel>
          <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
            {original !== null && (
              <button
                type="button"
                onClick={undoTranslate}
                className="rounded-lg px-2 py-1 text-xs text-[var(--accent-text)] hover:bg-[var(--surface-sunken)]"
              >
                {t('translate.undo')}
              </button>
            )}
            <button
              type="button"
              onClick={translate}
              disabled={!text.trim() || translating}
              title={t('translate.hint')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-text)] transition-colors hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {translating && (
                <span className="size-2.5 animate-spin rounded-full border border-current border-t-transparent" />
              )}
              {translating ? t('translate.running') : t('translate.action')}
            </button>
            <button
              type="button"
              onClick={loadSample}
              className="rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
            >
              {t('input.sample')}
            </button>
            <button
              type="button"
              onClick={clearInput}
              disabled={!text && !translating}
              className="rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] disabled:opacity-40"
            >
              {t('input.clear')}
            </button>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(event) => editInput(event.target.value)}
          // Keystrokes during a rewrite would be overwritten by the next chunk.
          readOnly={translating}
          aria-busy={translating}
          placeholder={t('input.placeholder')}
          rows={4}
          spellCheck={false}
          className="thin-scroll font-han mt-3 w-full resize-y rounded-xl border bg-[var(--surface-sunken)] p-3 text-lg leading-relaxed read-only:cursor-progress"
        />

        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--text-faint)]">
          <span>
            {chars.length} / {MAX_CHARS} {t('input.chars')}
          </span>
          {overLimit && (
            <span className="text-[var(--color-vermilion-500)] dark:text-[var(--color-vermilion-300)]">
              {t('input.overLimit', { limit: MAX_CHARS })}
            </span>
          )}
        </div>

        {translateError && (
          <p
            role="alert"
            className="mt-2 text-xs text-[var(--color-vermilion-500)] dark:text-[var(--color-vermilion-300)]"
          >
            {t(translateError, { limit: TRANSLATE_MAX_CHARS })}
          </p>
        )}
        {translateWarning && (
          <p role="status" className="mt-2 text-xs text-[var(--text-secondary)]">
            {t(translateWarning)}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>{t('result.title')}</SectionLabel>
          <div className="flex items-center gap-2">
            {speech.supported && (
              <Button
                onClick={() => (speech.speaking ? speech.stop() : speech.speak(clamped))}
                disabled={!clamped}
                title={speech.hasCantoneseVoice ? undefined : t('notice.noVoice')}
              >
                {speech.speaking ? t('result.stop') : t('result.speak')}
              </Button>
            )}
            <Button onClick={copy} disabled={!ready || pieces.length === 0} variant="solid">
              {copied ? t('result.copied') : t('result.copy')}
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <LayoutPicker
            value={format.layout}
            onChange={(layout) => patchFormat({ layout })}
          />
        </div>

        <div className="mt-4 border-t pt-4">
          {loadFailed ? (
            <div role="alert" className="py-12 text-center text-sm text-[var(--text-secondary)]">
              <p>{t('result.loadFailed')}</p>
              <div className="mt-3 inline-block">
                <Button onClick={retryLoad}>{t('result.retry')}</Button>
              </div>
            </div>
          ) : !ready && text ? (
            <p className="py-12 text-center text-sm text-[var(--text-faint)]">
              {t('result.loading')}
            </p>
          ) : pieces.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--text-faint)]">
              {t('result.empty')}
            </p>
          ) : (
            <ResultView
              pieces={pieces}
              format={format}
              scheme={scheme}
              table={table}
              overrides={overrides}
              onPick={pick}
              speech={speech}
            />
          )}
        </div>

        {(unmapped > 0 ||
          overrideCount > 0 ||
          (speech.supported && !speech.hasCantoneseVoice && !!clamped)) && (
          <div className="mt-4 space-y-1 border-t pt-3 text-xs text-[var(--text-faint)]">
            {unmapped > 0 && <p>{t('notice.unmapped', { n: unmapped })}</p>}
            {speech.supported && !speech.hasCantoneseVoice && !!clamped && (
              <p>{t('notice.noVoice')}</p>
            )}
            {overrideCount > 0 && (
              <p className="flex items-center gap-2">
                {t('notice.overrides', { n: overrideCount })}
                <button
                  type="button"
                  onClick={() => setOverrides({})}
                  className="text-[var(--accent-text)] underline underline-offset-2"
                >
                  {t('notice.clearOverrides')}
                </button>
              </p>
            )}
          </div>
        )}
      </Card>

      <SettingsPanel
        scheme={scheme}
        onScheme={setScheme}
        format={format}
        onFormat={patchFormat}
        useWordDictionary={useWordDictionary}
        onUseWordDictionary={setUseWordDictionary}
      />

      <footer className="mt-4 border-t pt-6 text-xs leading-relaxed text-[var(--text-faint)]">
        <p className="mb-1 font-medium text-[var(--text-secondary)]">
          {t('about.title')}
        </p>
        <p>{t('about.body')}</p>
        <p className="mt-2">{t('about.privacy')}</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <a
            className="underline underline-offset-2 hover:text-[var(--accent-text)]"
            href="https://github.com/CanCLID/ToJyutping"
            target="_blank"
            rel="noreferrer"
          >
            CanCLID/ToJyutping
          </a>
          <a
            className="underline underline-offset-2 hover:text-[var(--accent-text)]"
            href="https://github.com/kfcd/pingyam"
            target="_blank"
            rel="noreferrer"
          >
            kfcd/pingyam
          </a>
          <a
            className="underline underline-offset-2 hover:text-[var(--accent-text)]"
            href="https://words.hk/"
            target="_blank"
            rel="noreferrer"
          >
            {t('about.words')}
          </a>
        </p>
        <p className="mt-4 border-t pt-4">
          Built by{' '}
          <a
            className="font-medium text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--accent-text)]"
            href="https://yishan.li"
            target="_blank"
            rel="noreferrer"
          >
            Yishan
          </a>
        </p>
      </footer>
    </div>
  )
}
