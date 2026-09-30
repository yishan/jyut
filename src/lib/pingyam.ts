import { SCHEME_BY_ID, type SchemeId } from './schemes'

export interface PingyamTable {
  columns: string[]
  table: Record<string, string[]>
}

let pending: Promise<PingyamTable> | null = null

/**
 * Loads the syllable conversion table on demand. Jyutping output never needs it,
 * so a visitor who sticks to the default never downloads the ~390 KB payload.
 */
export function loadPingyam(): Promise<PingyamTable> {
  if (!pending) {
    pending = fetch('/data/pingyam.json')
      .then((res) => {
        if (!res.ok) throw new Error(`pingyam.json: HTTP ${res.status}`)
        return res.json() as Promise<PingyamTable>
      })
      .catch((err) => {
        pending = null
        throw err
      })
  }
  return pending
}

export interface Respelt {
  text: string
  /** False when at least one syllable had no entry in the table. */
  ok: boolean
}

/**
 * Re-spells a Jyutping reading in `scheme`. A reading may hold several
 * space-separated syllables (a handful of CJK compatibility characters such as
 * ㍶ carry multi-syllable readings), so each is converted independently.
 */
export function respell(
  jyutping: string,
  scheme: SchemeId,
  table: PingyamTable | null,
): Respelt {
  if (scheme === 'jyutping') return { text: jyutping, ok: true }
  // Callers must wait for the table rather than render this: `ok: false` here
  // means "not loaded", which is not the same as "no spelling in this scheme".
  if (!table) return { text: jyutping, ok: false }

  const column = SCHEME_BY_ID.get(scheme)?.column
  if (column === undefined) return { text: jyutping, ok: false }

  let ok = true
  const parts = jyutping.split(' ').map((syllable) => {
    const row = table.table[syllable]
    if (!row) {
      ok = false
      return syllable
    }
    return row[column]
  })

  return { text: parts.join(' '), ok }
}
