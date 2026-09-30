import type { SchemeId } from './schemes'
import { respell, type PingyamTable } from './pingyam'
import type { DictEntry } from './userDict'

export type ReadingSource = 'auto' | 'word' | 'user' | 'manual'

/** Han script, including the extension blocks and compatibility ideographs. */
const HAN = /\p{Script=Han}/u

export interface Token {
  /** The original character (a single code point). */
  char: string
  /** Code-unit offset of the character in the source text. */
  offset: number
  /**
   * True for Han characters, whether or not a reading was found — a Han
   * character with no reading is a conversion failure worth marking, while a
   * comma simply has nothing to convert.
   */
  isHan: boolean
  /** Chosen Jyutping reading, or null when there is none. */
  jyutping: string | null
  /** Every reading on record, most common first. */
  candidates: string[]
  source: ReadingSource
}

export interface TokenizeOptions {
  /** Use word-level segmentation to disambiguate 多音字 (recommended). */
  useWordDictionary: boolean
  userDict: DictEntry[]
  /** Manual per-character choices, keyed by `${offset}:${char}`. */
  overrides: Record<string, string>
}

export const overrideKey = (token: Pick<Token, 'offset' | 'char'>) =>
  `${token.offset}:${token.char}`

/** The slice of `to-jyutping` this app uses. */
export interface JyutpingEngine {
  getJyutpingList(text: string): [string, string | null][]
  getJyutpingCandidates(text: string): [string, string[]][]
}

let modulePromise: Promise<JyutpingEngine> | null = null

/** Loads the ~1.2 MB pronunciation dictionary lazily, once. */
export function loadToJyutping(): Promise<JyutpingEngine> {
  modulePromise ??= import('to-jyutping')
    .then((module) => (module.default ?? module) as JyutpingEngine)
    .catch((error) => {
      // Forget the failure so a retry fetches again instead of replaying it.
      modulePromise = null
      throw error
    })
  return modulePromise
}

export function tokenize(
  text: string,
  toJyutping: JyutpingEngine,
  options: TokenizeOptions,
): Token[] {
  if (!text) return []

  // Both calls return one entry per code point, aligned with each other and
  // with the input string, which is what lets us zip them by index.
  const contextual = toJyutping.getJyutpingList(text)
  const candidates = toJyutping.getJyutpingCandidates(text)

  const tokens: Token[] = []
  let offset = 0

  for (let i = 0; i < contextual.length; i++) {
    const char = contextual[i][0]
    const wordReading = contextual[i][1]
    const charCandidates = candidates[i]?.[1] ?? []
    const isHan = HAN.test(char)

    const jyutping = options.useWordDictionary
      ? wordReading
      : (charCandidates[0] ?? null)

    tokens.push({
      char,
      offset,
      isHan,
      jyutping,
      candidates: charCandidates,
      // A word-dictionary reading that overrides the most common single-character
      // reading is worth surfacing in the UI.
      source:
        options.useWordDictionary &&
        wordReading !== null &&
        charCandidates[0] !== undefined &&
        wordReading !== charCandidates[0]
          ? 'word'
          : 'auto',
    })

    offset += char.length
  }

  applyUserDict(tokens, options.userDict)
  applyOverrides(tokens, options.overrides)

  return tokens
}

/**
 * Pins readings for words listed in the user's dictionary. Scanning left to
 * right and preferring the earliest matching entry gives the documented
 * "entries at the top of the list win" behaviour.
 */
function applyUserDict(tokens: Token[], entries: DictEntry[]) {
  if (entries.length === 0) return

  for (let i = 0; i < tokens.length; i++) {
    for (const entry of entries) {
      const word = Array.from(entry.word)
      if (i + word.length > tokens.length) continue

      let matches = true
      for (let k = 0; k < word.length; k++) {
        if (tokens[i + k].char !== word[k]) {
          matches = false
          break
        }
      }
      if (!matches) continue

      for (let k = 0; k < word.length; k++) {
        tokens[i + k].jyutping = entry.readings[k]
        tokens[i + k].source = 'user'
        // A user reading is always offered as a candidate so the picker can
        // show it as the selected one.
        if (!tokens[i + k].candidates.includes(entry.readings[k])) {
          tokens[i + k].candidates = [
            entry.readings[k],
            ...tokens[i + k].candidates,
          ]
        }
      }
      // Skip past the word we just pinned; an entry cannot overlap itself.
      i += word.length - 1
      break
    }
  }
}

function applyOverrides(tokens: Token[], overrides: Record<string, string>) {
  if (Object.keys(overrides).length === 0) return
  for (const token of tokens) {
    const reading = overrides[overrideKey(token)]
    if (reading === undefined) continue
    token.jyutping = reading
    token.source = 'manual'
  }
}

export interface Piece extends Token {
  /** The reading spelt in the selected scheme, or null when unavailable. */
  phonetic: string | null
  /** True when a reading exists but the scheme has no spelling for it. */
  unmapped: boolean
}

/** Spells every token's reading in the requested scheme. */
export function respellTokens(
  tokens: Token[],
  scheme: SchemeId,
  table: PingyamTable | null,
): Piece[] {
  return tokens.map((token) => {
    if (token.jyutping === null) {
      return { ...token, phonetic: null, unmapped: false }
    }
    const { text, ok } = respell(token.jyutping, scheme, table)
    return { ...token, phonetic: text, unmapped: !ok }
  })
}
