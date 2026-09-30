'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { overrideKey, type Piece } from '@/lib/convert'
import { respell, type PingyamTable } from '@/lib/pingyam'
import type { SchemeId } from '@/lib/schemes'
import {
  bracketsOf,
  charText,
  phoneticText,
  type FormatOptions,
} from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import type { Speech } from '@/lib/tts'

interface Props {
  pieces: Piece[]
  format: FormatOptions
  scheme: SchemeId
  table: PingyamTable | null
  overrides: Record<string, string>
  onPick: (key: string, reading: string | null) => void
  speech: Speech
}

interface Anchor {
  key: string
  piece: Piece
  x: number
  y: number
  /** The render the anchor belongs to; any edit produces a new array. */
  pieces: Piece[]
}

const SOURCE_LABEL = {
  auto: 'source.auto',
  word: 'source.word',
  user: 'source.user',
  manual: 'source.manual',
} as const

export function ResultView({
  pieces,
  format,
  scheme,
  table,
  overrides,
  onPick,
  speech,
}: Props) {
  const { t } = useI18n()
  const [openAnchor, setAnchor] = useState<Anchor | null>(null)
  const popover = useRef<HTMLDivElement>(null)
  // Any edit to the text invalidates the anchored piece, so an anchor from an
  // earlier render is treated as closed.
  const anchor = openAnchor?.pieces === pieces ? openAnchor : null

  const close = useCallback(() => setAnchor(null), [])

  useEffect(() => {
    if (!anchor) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onPointer = (event: PointerEvent) => {
      if (!popover.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    // `pointerdown` in the capture phase closes before a new anchor is set.
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [anchor, close])

  const openPicker = (piece: Piece, element: HTMLElement) => {
    if (!piece.isHan) return
    const rect = element.getBoundingClientRect()
    setAnchor({
      key: overrideKey(piece),
      piece,
      x: rect.left + rect.width / 2,
      y: rect.bottom,
      pieces,
    })
  }

  const { open, close: closeBracket } = bracketsOf(format)

  const renderPiece = (piece: Piece, index: number) => {
    if (piece.char === '\n') return <br key={index} />

    const phonetic = phoneticText(piece, format)
    const text = charText(piece, format)
    // In the reading-only layout the separator has to be a real space rather
    // than a margin, so that selecting the output copies it too.
    const separator = format.layout === 'phonetic' ? ' ' : ''

    if (phonetic === null) {
      if (!piece.isHan && !format.keepNonHan) return null
      return (
        <span key={index} className="text-[var(--text-faint)]">
          {text}
          {separator}
        </span>
      )
    }

    const interactive = piece.isHan
    const tone =
      piece.source === 'manual' || piece.source === 'user'
        ? 'text-[var(--color-vermilion-500)] dark:text-[var(--color-vermilion-300)]'
        : ''
    const hint =
      interactive && piece.candidates.length > 1
        ? 'decoration-dotted underline decoration-[var(--border-subtle)] underline-offset-[3px]'
        : ''

    if (format.layout === 'phonetic') {
      return (
        <span
          key={index}
          onClick={(event) => openPicker(piece, event.currentTarget)}
          className={`font-mono text-[0.95em] ${tone} ${
            interactive ? `cursor-pointer ${hint}` : ''
          }`}
          title={piece.char}
        >
          {phonetic}
          {separator}
        </span>
      )
    }

    if (format.layout === 'inline') {
      return (
        <span
          key={index}
          onClick={(event) => openPicker(piece, event.currentTarget)}
          className={`inline-block ${interactive ? 'cursor-pointer' : ''} ${
            format.spaceAfter ? 'mr-1' : ''
          }`}
        >
          <span className="font-han">{text}</span>
          <span className={`font-mono text-[0.72em] ${tone} ${hint}`}>
            {open}
            {phonetic}
            {closeBracket}
          </span>
        </span>
      )
    }

    return (
      <ruby
        key={index}
        onClick={(event) => openPicker(piece, event.currentTarget)}
        className={`font-han ${interactive ? 'cursor-pointer' : ''} ${
          format.spaceAfter ? 'mr-1' : ''
        }`}
      >
        {text}
        <rt className={`${tone} ${hint}`}>{phonetic}</rt>
      </ruby>
    )
  }

  return (
    <>
      <div
        className={`thin-scroll min-h-40 overflow-x-hidden ${
          format.layout === 'ruby'
            ? 'ruby-run text-3xl leading-[2.6] sm:text-4xl sm:leading-[2.5]'
            : format.layout === 'inline'
              ? 'font-han text-xl leading-[2.1]'
              : 'text-lg leading-[2]'
        }`}
      >
        {pieces.map(renderPiece)}
      </div>

      {anchor && (
        <div
          ref={popover}
          role="dialog"
          aria-label={t('picker.title')}
          style={{
            left: Math.min(Math.max(anchor.x, 130), window.innerWidth - 130),
            top: Math.min(anchor.y + 10, window.innerHeight - 40),
          }}
          className="fixed z-50 w-60 -translate-x-1/2 rounded-xl border bg-[var(--surface-raised)] p-2 shadow-xl"
        >
          <div className="flex items-center justify-between px-1.5 pt-1 pb-2">
            <span className="font-han text-lg">{anchor.piece.char}</span>
            <span className="text-[11px] text-[var(--text-faint)]">
              {t(SOURCE_LABEL[anchor.piece.source])}
            </span>
          </div>

          {anchor.piece.candidates.length === 0 ? (
            <p className="px-1.5 pb-2 text-xs text-[var(--text-faint)]">
              {t('picker.none')}
            </p>
          ) : (
            <ul className="thin-scroll max-h-56 overflow-y-auto">
              {anchor.piece.candidates.map((candidate) => {
                const selected = candidate === anchor.piece.jyutping
                const spelt = respell(candidate, scheme, table).text
                return (
                  <li key={candidate}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(anchor.key, candidate)
                        close()
                      }}
                      className={`flex w-full items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-sunken)] ${
                        selected ? 'bg-[var(--accent-soft)]' : ''
                      }`}
                    >
                      <span
                        className={`font-mono text-sm ${
                          selected ? 'text-[var(--accent-text)]' : ''
                        }`}
                      >
                        {spelt}
                      </span>
                      {spelt !== candidate && (
                        <span className="font-mono text-[11px] text-[var(--text-faint)]">
                          {candidate}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-1 flex items-center gap-1 border-t pt-1.5">
            {speech.supported && (
              <button
                type="button"
                onClick={() => speech.speak(anchor.piece.char)}
                className="rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
              >
                {t('picker.speak')}
              </button>
            )}
            {overrides[anchor.key] !== undefined && (
              <button
                type="button"
                onClick={() => {
                  onPick(anchor.key, null)
                  close()
                }}
                className="ml-auto rounded-lg px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
              >
                {t('picker.reset')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
