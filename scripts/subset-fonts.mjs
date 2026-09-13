/**
 * Build-time font subsetting.
 *
 * Each greeting displays exactly one word — five to fifteen glyphs. Shipping
 * full Noto families for 17 writing systems would be tens of megabytes; because
 * the glyph set is closed and known at build time, we ship a few kilobytes per
 * script instead.
 *
 * harfbuzz (via subset-font) performs glyph closure through GSUB/GPOS, so
 * Arabic keeps its initial/medial/final forms and Devanagari keeps its
 * conjuncts and matra reordering. Dropping those tables is the single most
 * common way to ship Arabic that looks broken.
 *
 *   node scripts/subset-fonts.mjs
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'
import { FONT_SOURCES, RAW_BASE } from './font-sources.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, '.cache', 'fonts')
const OUT = join(ROOT, 'assets', 'fonts')

/** Space and non-breaking space, carried by every subset. */
const ALWAYS = ' ' + String.fromCharCode(0x00a0)

/** Latin, Latin-1 Supplement, Latin Extended-A/B, Additional, and modifiers. */
const LATINISH = /[ -ɏʰ-˿Ḁ-ỿ‘-”]/

/**
 * Read the content file as text rather than importing it, so this script needs
 * no TypeScript toolchain and runs anywhere.
 */
async function collectGlyphs() {
  const src = await readFile(join(ROOT, 'content', 'greetings.ts'), 'utf8')
  const byScript = {}

  const add = (target, s) => {
    if (!s) return
    const decoded = s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    byScript[target] = (byScript[target] ?? '') + decoded
  }

  const entries = src.split(/\n  \{\n/).slice(1)
  for (const entry of entries) {
    const script = entry.match(/script:\s*'([a-z]+)'/)?.[1]
    if (!script) continue

    const word = entry.match(/\n {4}word:\s*'((?:[^'\\]|\\.)*)'/)?.[1]
    const endonym = entry.match(/endonym:\s*'((?:[^'\\]|\\.)*)'/)?.[1]
    const roman = entry.match(/romanization:\s*'((?:[^'\\]|\\.)*)'/)?.[1]

    // The hero word and the endonym both render in the entry's own script.
    add(script, word)
    add(script, endonym)
    // Romanizations carry diacritics Geist may lack; park them in the Latin
    // fallback subset.
    add('latn', roman)
  }

  // Any Latin-ish character appearing in a non-Latin entry also needs to exist
  // in the Latin fallback, since the label bar mixes scripts.
  for (const [script, chars] of Object.entries(byScript)) {
    if (script === 'latn') continue
    byScript.latn += [...chars].filter((c) => LATINISH.test(c)).join('')
  }

  const out = {}
  for (const [script, chars] of Object.entries(byScript)) {
    out[script] = [...new Set([...(chars + ALWAYS)])].sort().join('')
  }
  return out
}

async function fetchFont(script) {
  const { path } = FONT_SOURCES[script]
  const cached = join(CACHE, path.split('/').pop().replace(/%5B|%5D/g, '_'))
  try {
    await stat(cached)
    return await readFile(cached)
  } catch {
    // not cached yet
  }
  const url = RAW_BASE + path
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${script}: HTTP ${res.status} fetching ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(CACHE, { recursive: true })
  await writeFile(cached, buf)
  return buf
}

async function main() {
  const glyphs = await collectGlyphs()
  await mkdir(OUT, { recursive: true })

  let total = 0
  const rows = []

  for (const script of Object.keys(FONT_SOURCES)) {
    const text = glyphs[script]
    if (!text) {
      rows.push([script, '-', 'no glyphs in data, skipped'])
      continue
    }
    const source = await fetchFont(script)
    const buf = await subsetFont(source, text, {
      targetFormat: 'woff2',
      // A bare number pins the axis, collapsing the variable font to one
      // instance. Keeping the axis variable would multiply the subset size.
      variationAxes: { wght: FONT_SOURCES[script].weight },
    })
    await writeFile(join(OUT, `${script}-subset.woff2`), buf)
    total += buf.length
    rows.push([script, `${[...text].length} glyphs`, `${(buf.length / 1024).toFixed(1)} KB`])
  }

  const pad = (s, n) => String(s).padEnd(n)
  console.log('\n  script   glyphs         size')
  console.log('  ' + '-'.repeat(40))
  for (const [a, b, c] of rows) console.log(`  ${pad(a, 8)} ${pad(b, 14)} ${c}`)
  console.log('  ' + '-'.repeat(40))
  console.log(`  TOTAL${' '.repeat(18)}${(total / 1024).toFixed(1)} KB\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
