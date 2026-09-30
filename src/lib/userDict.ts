/**
 * Parser for the user's own conversion dictionary.
 *
 * One entry per line, in the form `漢字,拼音` — for example `聽日,ting1 jat6`.
 * The number of characters must match the number of syllables. Entries earlier
 * in the list win when two of them could match at the same position.
 */

export interface DictEntry {
  word: string
  /** One reading per character of `word`. */
  readings: string[]
  /** 1-based line number in the source text, for error reporting. */
  line: number
}

export interface DictIssue {
  line: number
  text: string
  reason: 'missing-comma' | 'empty-word' | 'empty-reading' | 'length-mismatch'
}

export interface ParsedDict {
  entries: DictEntry[]
  issues: DictIssue[]
}

const chars = (s: string) => Array.from(s)

export function parseUserDict(source: string): ParsedDict {
  const entries: DictEntry[] = []
  const issues: DictIssue[] = []

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1
    const text = rawLine.trim()
    if (!text || text.startsWith('#')) return

    // Accept the full-width comma too — it is what an IME produces by default.
    const separator = text.search(/[,，]/)
    if (separator === -1) {
      issues.push({ line, text, reason: 'missing-comma' })
      return
    }

    const word = text.slice(0, separator).trim()
    const reading = text.slice(separator + 1).trim()

    if (!word) {
      issues.push({ line, text, reason: 'empty-word' })
      return
    }
    if (!reading) {
      issues.push({ line, text, reason: 'empty-reading' })
      return
    }

    const readings = reading.split(/\s+/)
    if (readings.length !== chars(word).length) {
      issues.push({ line, text, reason: 'length-mismatch' })
      return
    }

    entries.push({ word, readings, line })
  })

  return { entries, issues }
}
