#!/usr/bin/env node
/**
 * Rasterises `assets/icon.svg` into the icons Next.js picks up from `src/app/`.
 *
 * The artwork sets 粵 as live text, so it has to be baked into bitmaps here —
 * shipping the SVG itself would render as tofu on a machine with no CJK font.
 *
 * Requires `rsvg-convert` (librsvg) and `magick` (ImageMagick) on PATH:
 *   brew install librsvg imagemagick
 *
 * Run: npm run icons
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'assets/icon.svg')
const appDir = join(root, 'src/app')

const run = (command, args) => {
  try {
    execFileSync(command, args, { stdio: 'pipe' })
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `${command} not found. Install it with: brew install librsvg imagemagick`,
      )
    }
    throw error
  }
}

const work = mkdtempSync(join(tmpdir(), 'jyut-icons-'))
try {
  const artwork = readFileSync(source, 'utf8')
  // iOS applies its own mask to the home-screen icon, so that one is full-bleed.
  const square = artwork.replace('rx="112" ry="112"', 'rx="0" ry="0"')
  if (square === artwork) throw new Error('Could not find the corner radius to square off')

  const roundedSvg = join(work, 'rounded.svg')
  const squareSvg = join(work, 'square.svg')
  writeFileSync(roundedSvg, artwork)
  writeFileSync(squareSvg, square)

  const rounded512 = join(work, 'rounded-512.png')
  run('rsvg-convert', ['-w', '512', '-h', '512', roundedSvg, '-o', rounded512])

  // Chrome, Firefox and Edge pick this one; 512 covers every density.
  run('magick', [rounded512, join(appDir, 'icon.png')])

  run('rsvg-convert', ['-w', '180', '-h', '180', squareSvg, '-o', join(appDir, 'apple-icon.png')])

  // Legacy fallback, and what Safari uses in the tab bar.
  run('magick', [rounded512, '-define', 'icon:auto-resize=48,32,16', join(appDir, 'favicon.ico')])

  console.log('icons: wrote icon.png, apple-icon.png, favicon.ico to src/app/')
} finally {
  rmSync(work, { recursive: true, force: true })
}
