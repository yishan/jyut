#!/usr/bin/env node
/**
 * Builds `public/data/pingyam.json` — the syllable-level lookup table that lets us
 * re-spell a Jyutping syllable in any of the other romanisation schemes.
 *
 * Source: https://github.com/kfcd/pingyam (CC BY 3.0, 開放詞典)
 * The upstream file is a headerless TSV whose 11 columns are, in order:
 *   yale-num, yale-dia, cantonese-pinyin, sl-wong-num, sl-wong-dia,
 *   ipa, jyutping, canton, sidney-lau, penkyamp-num, penkyamp-dia
 *
 * Run: npm run data
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE = 'https://raw.githubusercontent.com/kfcd/pingyam/master/pingyambiu'
const COLUMNS = [
  'yale-num',
  'yale-dia',
  'cantonese-pinyin',
  'sl-wong-num',
  'sl-wong-dia',
  'ipa',
  'jyutping',
  'canton',
  'sidney-lau',
  'penkyamp-num',
  'penkyamp-dia',
]
const JYUTPING_INDEX = COLUMNS.indexOf('jyutping')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outFile = resolve(root, 'public/data/pingyam.json')

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`Failed to fetch pingyam table: ${res.status}`)
const raw = await res.text()

/** @type {Record<string, string[]>} */
const table = {}
let rows = 0
let collisions = 0

for (const line of raw.split('\n')) {
  if (!line.trim()) continue
  const cells = line.split('\t')
  if (cells.length !== COLUMNS.length) {
    throw new Error(`Unexpected column count ${cells.length} in row: ${line}`)
  }
  rows++
  const key = cells[JYUTPING_INDEX]
  // The table lists every attested tone of every syllable, so a Jyutping key is
  // expected to be unique. Keep the first spelling if upstream ever duplicates.
  if (key in table) {
    collisions++
    continue
  }
  table[key] = cells
}

await mkdir(dirname(outFile), { recursive: true })
await writeFile(
  outFile,
  JSON.stringify({ columns: COLUMNS, table }),
  'utf8',
)

console.log(`pingyam: ${rows} rows -> ${Object.keys(table).length} syllables` +
  (collisions ? ` (${collisions} duplicate keys skipped)` : ''))
