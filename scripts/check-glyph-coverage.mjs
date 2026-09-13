/**
 * CI guard: no tofu, and no broken shaping.
 *
 * Codepoint coverage alone is not enough. Subsetting can strip GSUB/GPOS and
 * leave a font that has every character but renders Arabic unjoined and
 * Devanagari with floating matras. fontkit runs the real shaper, so laying the
 * actual word out and asserting no .notdef glyphs catches both failures.
 *
 *   node scripts/check-glyph-coverage.mjs
 */
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { create } from 'fontkit'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Scripts whose correctness depends on layout tables surviving the subset. */
const COMPLEX = new Set(['arab', 'deva', 'beng', 'taml', 'thai', 'khmr', 'hebr', 'tibt'])

const decode = (v) =>
  v?.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))

async function readEntries() {
  const src = await readFile(join(ROOT, 'content', 'greetings.ts'), 'utf8')
  return src
    .split(/\n  \{\n/)
    .slice(1)
    .map((entry) => ({
      // `id` is the first line of each entry after the split, so it has no
      // leading newline to anchor against.
      id: entry.match(/^ {4}id:\s*'([^']+)'/m)?.[1],
      word: entry.match(/\n {4}word:\s*'((?:[^'\\]|\\.)*)'/)?.[1],
      endonym: entry.match(/endonym:\s*'((?:[^'\\]|\\.)*)'/)?.[1],
      script: entry.match(/script:\s*'([a-z]+)'/)?.[1],
    }))
    .filter((e) => e.id && e.script)
    .map((e) => ({
      ...e,
      // Both fields, not just `word` — the subsetter decodes both, so checking
      // only one lets a real mismatch hide behind a false failure.
      word: decode(e.word),
      endonym: decode(e.endonym),
    }))
}

const fontCache = new Map()
async function loadFont(script) {
  if (!fontCache.has(script)) {
    const buf = await readFile(join(ROOT, 'assets', 'fonts', `${script}-subset.woff2`))
    fontCache.set(script, create(buf))
  }
  return fontCache.get(script)
}

async function main() {
  const entries = await readEntries()
  const failures = []
  const warnings = []

  for (const { id, word, endonym, script } of entries) {
    let font
    try {
      font = await loadFont(script)
    } catch {
      failures.push(`${id}: no subset built for script "${script}"`)
      continue
    }

    for (const [label, text] of [
      ['word', word],
      ['endonym', endonym],
    ]) {
      if (!text) continue
      // Codepoint coverage.
      for (const ch of text) {
        if (ch === ' ') continue
        if (!font.hasGlyphForCodePoint(ch.codePointAt(0))) {
          failures.push(
            `${id}: ${label} "${text}" — missing glyph for U+${ch
              .codePointAt(0)
              .toString(16)
              .toUpperCase()
              .padStart(4, '0')} (${ch})`,
          )
        }
      }
      // Real shaping. A .notdef in the output means the shaper asked for a
      // glyph the subset does not carry.
      const run = font.layout(text)
      const notdef = run.glyphs.filter((g) => g.id === 0).length
      if (notdef > 0) {
        failures.push(`${id}: ${label} "${text}" — shaper produced ${notdef} .notdef glyph(s)`)
      }
    }

    if (COMPLEX.has(script)) {
      if (!font.GSUB) {
        failures.push(`${id}: script "${script}" needs GSUB but the subset has none — joining/conjuncts will be broken`)
      }
      if (!font.GPOS) {
        warnings.push(`${id}: script "${script}" has no GPOS — mark positioning may be off`)
      }
    }
  }

  for (const w of [...new Set(warnings)]) console.warn(`  warn  ${w}`)

  if (failures.length) {
    console.error(`\n  ${failures.length} glyph coverage failure(s):\n`)
    for (const f of failures) console.error(`  FAIL  ${f}`)
    console.error('')
    process.exit(1)
  }

  console.log(`\n  OK — ${entries.length} greetings, all glyphs present, all words shape cleanly.\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
