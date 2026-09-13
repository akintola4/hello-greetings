/**
 * Content validation.
 *
 * This repo takes contributions, which means a stranger's pull request has to
 * be safe to merge without anyone reading every line of it. This catches the
 * mistakes that are easy to make and hard to see in review.
 *
 * It deliberately does NOT check whether a greeting is correct — no script can.
 * That is what a human reviewer who speaks the language is for.
 *
 *   node scripts/validate-content.mjs
 */
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const REQUIRED = [
  'id',
  'word',
  'romanization',
  'language',
  'script',
  'region',
  'note',
  'etymology',
  'source',
  'typeScale',
]

const NOTE_MIN_WORDS = 30
const NOTE_MAX_WORDS = 95

/** Phrases that mean the entry was not actually finished. */
const PLACEHOLDERS = [/\bTODO\b/i, /\bTBD\b/i, /\blorem ipsum\b/i, /\bFIXME\b/i, /\bXXX\b/i]

/** Tourist-brochure register. The house style is specific facts, not vibes. */
const BROCHURE = [
  /\bvibrant\b/i,
  /\brich (?:culture|heritage|tapestry)\b/i,
  /\bmelting pot\b/i,
  /\bbreathtaking\b/i,
  /\bwarm and welcoming\b/i,
]

const fail = []
const warn = []

function words(s) {
  return s.trim().split(/\s+/).filter(Boolean).length
}

async function main() {
  const src = await readFile(join(ROOT, 'content', 'greetings.ts'), 'utf8')
  const scriptsSrc = await readFile(join(ROOT, 'content', 'scripts.ts'), 'utf8')

  const knownScripts = new Set(
    [...scriptsSrc.matchAll(/^\s{2}([a-z]{4}): \{ id:/gm)].map((m) => m[1]),
  )
  if (knownScripts.size === 0) {
    fail.push('could not parse any script ids from content/scripts.ts')
  }

  const entries = src.split(/\n {2}\{\n/).slice(1)
  if (entries.length === 0) fail.push('no greeting entries found')

  const seenIds = new Set()
  const seenWords = new Map()

  for (const entry of entries) {
    const get = (key) =>
      entry.match(new RegExp(`^ {4}${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'm'))?.[1]

    const id = get('id') ?? '(missing id)'

    for (const key of REQUIRED) {
      const present = new RegExp(`^ {4}${key}:`, 'm').test(entry)
      if (!present) fail.push(`${id}: missing required field "${key}"`)
    }

    if (!/^[a-z]{2,4}-[a-z0-9-]+$/.test(id)) {
      fail.push(`${id}: id must be lowercase kebab-case, "<iso639>-<word>" — e.g. "ha-sannu"`)
    }
    if (seenIds.has(id)) fail.push(`${id}: duplicate id`)

    // A citation has to be a URL, not a book title or a note to self: the whole
    // point of the field is that the next reader can click it and check. Run
    // `pnpm run links` to find out whether it still resolves.
    const source = get('source')
    if (source && !/^https:\/\/[^\s']+$/.test(source)) {
      fail.push(`${id}: source must be a single https:// URL (got "${source}")`)
    }
    seenIds.add(id)

    const script = entry.match(/^ {4}script: '([a-z]+)'/m)?.[1]
    if (script && !knownScripts.has(script)) {
      fail.push(
        `${id}: script "${script}" is not in content/scripts.ts — add it there first, ` +
          `with a Noto family in scripts/font-sources.mjs`,
      )
    }

    const iso = entry.match(/iso639: '([a-z]{2,3})'/)?.[1]
    if (!iso) fail.push(`${id}: language.iso639 missing or malformed (expected 2-3 lowercase letters)`)

    const word = get('word')
    if (word) {
      const prev = seenWords.get(word)
      if (prev) warn.push(`${id}: word "${word}" also appears in ${prev}`)
      else seenWords.set(word, id)
    }

    const note = get('note')
    if (note) {
      const n = words(note)
      if (n < NOTE_MIN_WORDS) fail.push(`${id}: note is ${n} words, minimum ${NOTE_MIN_WORDS}`)
      if (n > NOTE_MAX_WORDS) fail.push(`${id}: note is ${n} words, maximum ${NOTE_MAX_WORDS}`)
      for (const re of BROCHURE) {
        if (re.test(note)) warn.push(`${id}: note uses brochure language (${re.source})`)
      }
    }


    const scale = Number(entry.match(/typeScale: (-?[\d.]+)/)?.[1])
    if (!Number.isFinite(scale) || scale < 0.5 || scale > 1.6) {
      fail.push(`${id}: typeScale must be between 0.5 and 1.6 (got ${scale})`)
    }

    for (const re of PLACEHOLDERS) {
      if (re.test(entry)) fail.push(`${id}: contains placeholder text (${re.source})`)
    }

    // A region naming exactly one country for a language spoken in many is the
    // single most common factual error in a contribution.
    const region = get('region')
    if (region && /^[A-Z][a-z]+$/.test(region) && iso && ['ar', 'es', 'fr', 'pt', 'sw', 'en'].includes(iso)) {
      warn.push(`${id}: region "${region}" names one country for a language spoken in many`)
    }
  }

  for (const w of warn) console.warn(`  warn  ${w}`)

  if (fail.length) {
    console.error(`\n  ${fail.length} content error(s):\n`)
    for (const f of fail) console.error(`  FAIL  ${f}`)
    console.error('\n  See CONTRIBUTING.md for the shape of an entry.\n')
    process.exit(1)
  }

  console.log(`\n  OK — ${entries.length} greetings, ${knownScripts.size} scripts registered.\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
