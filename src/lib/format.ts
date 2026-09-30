import type { Piece } from './convert'

export type Layout = 'inline' | 'phonetic' | 'ruby'

export const BRACKET_PRESETS = [
  { id: 'none', open: '', close: '' },
  { id: 'square', open: '[', close: ']' },
  { id: 'round', open: '(', close: ')' },
  { id: 'fullwidth', open: '（', close: '）' },
  { id: 'lenticular', open: '【', close: '】' },
  { id: 'custom', open: '', close: '' },
] as const

export type BracketId = (typeof BRACKET_PRESETS)[number]['id']

export interface FormatOptions {
  layout: Layout
  brackets: BracketId
  customOpen: string
  customClose: string
  /** Append a half-width space after each reading (after the closing bracket). */
  spaceAfter: boolean
  /** Show a `?` where a character has no reading, instead of nothing at all. */
  failedMarker: boolean
  /** Rewrite full-width letters, digits and punctuation as half-width. */
  normalizeFullwidth: boolean
  /** Keep characters that carry no reading (punctuation, latin, digits). */
  keepNonHan: boolean
}

export const DEFAULT_FORMAT: FormatOptions = {
  layout: 'ruby',
  brackets: 'square',
  customOpen: '<',
  customClose: '>',
  spaceAfter: false,
  failedMarker: true,
  normalizeFullwidth: false,
  keepNonHan: true,
}

export function bracketsOf(options: FormatOptions) {
  if (options.brackets === 'custom') {
    return { open: options.customOpen, close: options.customClose }
  }
  const preset = BRACKET_PRESETS.find((b) => b.id === options.brackets)
  return { open: preset?.open ?? '', close: preset?.close ?? '' }
}

/** Full-width ASCII (U+FF01–U+FF5E) and the ideographic space. */
export function toHalfWidth(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code >= 0xff01 && code <= 0xff5e) out += String.fromCodePoint(code - 0xfee0)
    else if (code === 0x3000) out += ' '
    else out += ch
  }
  return out
}

/** The literal text of a character as it should appear in the output. */
export function charText(piece: Piece, options: FormatOptions): string {
  return options.normalizeFullwidth ? toHalfWidth(piece.char) : piece.char
}

/** The reading as it should appear, or null when nothing should be shown. */
export function phoneticText(piece: Piece, options: FormatOptions): string | null {
  if (piece.phonetic !== null) return piece.phonetic
  if (piece.isHan && options.failedMarker) return '?'
  return null
}

/**
 * Renders the conversion as plain text — used for the copy button, and for the
 * `inline` and `phonetic` views (the `ruby` view is rendered as real markup).
 */
export function toPlainText(pieces: Piece[], options: FormatOptions): string {
  const { open, close } = bracketsOf(options)
  const gap = options.spaceAfter ? ' ' : ''

  if (options.layout === 'phonetic') {
    const out: string[] = []
    let needsSpace = false

    for (const piece of pieces) {
      if (piece.char === '\n') {
        out.push('\n')
        needsSpace = false
        continue
      }
      const phonetic = phoneticText(piece, options)
      if (phonetic !== null) {
        if (needsSpace) out.push(' ')
        out.push(phonetic)
        needsSpace = true
        continue
      }
      // A Han character we could not convert is always kept — dropping it would
      // silently lose content. `keepNonHan` only governs everything else.
      if ((piece.isHan || options.keepNonHan) && piece.char.trim()) {
        if (needsSpace) out.push(' ')
        out.push(charText(piece, options))
        needsSpace = true
      }
    }
    return out.join('')
  }

  // inline / ruby
  let out = ''
  for (const piece of pieces) {
    if (piece.char === '\n') {
      out += '\n'
      continue
    }
    const phonetic = phoneticText(piece, options)
    if (phonetic === null) {
      if (piece.isHan || options.keepNonHan) out += charText(piece, options)
      continue
    }
    out += charText(piece, options) + open + phonetic + close + gap
  }
  return out
}
