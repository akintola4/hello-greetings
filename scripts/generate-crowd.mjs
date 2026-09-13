/**
 * Build-time generator for the closing crowd.
 *
 * Rough.js through `generator()` + `toPaths()`, which need no DOM, so this runs
 * in plain Node and emits a committed data module. The browser never loads a
 * drawing library: no runtime cost, no hydration mismatch, and artwork that can
 * be screenshotted and iterated on.
 *
 * ## The governing rule
 *
 * **Every face is filled `--paper`.** That is how the overlap reads — a front
 * character cleanly hides whatever is behind it — and it is also how the
 * skin-tone problem is removed. There is no per-person tonal value anywhere in
 * this data model, so a value hierarchy between individuals is not something
 * the artwork declines to express; it is something it cannot express.
 * Difference lives in hair, features, accessories and neckline.
 *
 * No feature correlates with anything else. Each hair type recurs many times,
 * at every size and in every row: repetition is what makes a feature read as
 * "some people's hair is like that" rather than as a type.
 *
 * ## Two traps
 *
 * Rough's displacement is in USER UNITS and independent of shape size, so the
 * roughness that gives a 100-unit head a pleasant wobble destroys a 10-unit
 * eye. Small features bypass Rough entirely and are emitted as plain paths.
 *
 * Rough falls back to `Math.random` when a drawable has no seed, which would
 * make the committed file churn on every run. `Math.random` is trapped below so
 * that becomes a build failure instead.
 *
 *   node scripts/generate-crowd.mjs
 */
import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import rough from 'roughjs'

Math.random = () => {
  throw new Error('generate-crowd: nondeterminism — a drawable is missing its seed')
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'components', 'sections', 'finale', 'crowd-data.ts')
const gen = rough.generator()

const WIDTH = 1400
const HEIGHT = 470
const BUDGET_KB = 145

/** Placeholders swapped for CSS variables at emit time, so both themes work. */
const INK = '@ink'
const PAPER = '@paper'
const F = (n) => `@fill${n}`

/**
 * Rows, back to front. Each is lower and larger; the shoulders of one row tuck
 * behind the heads of the next, which is what makes the depth read.
 */
const ROWS = [
  { cy: 58, scale: 0.70, pitch: 112, sw: 1.5 },
  { cy: 160, scale: 0.82, pitch: 112, sw: 1.6 },
  { cy: 272, scale: 0.95, pitch: 112, sw: 1.8 },
  { cy: 396, scale: 1.1, pitch: 112, sw: 2.0 },
]

/** Independent hash channel per parameter, so adding an axis perturbs nothing. */
function h32(s) {
  let h = 2166136261
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619)
  return h >>> 0
}
const unit = (r, i, ch) => h32(`${r}/${i}/${ch}`) / 4294967296
const span = (r, i, ch, lo, hi) => lo + unit(r, i, ch) * (hi - lo)
const pick = (r, i, ch, arr) => arr[Math.floor(unit(r, i, ch) * arr.length)]

const HAIR = ['crop', 'part', 'curly', 'afro', 'bun', 'ponytail', 'long', 'bob', 'spiky', 'bald', 'receding', 'wrap', 'cap']
const EYES = ['open', 'wide', 'happy', 'wink', 'squint']
const BROWS = ['none', 'straight', 'raised', 'angled']
const NOSE = ['none', 'dot', 'hook', 'round']
const MOUTH = ['smile', 'openSmile', 'grin', 'smallO', 'straight', 'smirk']
const BEARD = ['none', 'none', 'none', 'none', 'moustache', 'beard']
const EXTRA = ['none', 'none', 'none', 'none', 'round', 'square', 'shades', 'earring']
const NECK = ['plain', 'collar', 'vee', 'round', 'stripe']

/** The head is 92 x 104, centred on the origin. Shoulders run down to y 200. */
const RX = 46
const RY = 52

const r1 = (n) => Math.round(n * 10) / 10
const ints = (d) => d.replace(/-?\d+\.\d+/g, (m) => String(Math.round(parseFloat(m))))

const trim = (paths, sw) =>
  paths.map((p) => ({
    d: ints(p.d),
    s: p.stroke && p.stroke !== 'none' ? p.stroke : null,
    f: p.fill && p.fill !== 'none' ? p.fill : null,
    w: r1(p.strokeWidth ?? sw),
  }))

/** A plain path: no Rough, for anything too small to survive a wobble. */
const plain = (d, { stroke = INK, fill = null, w = 1.6 } = {}) => ({
  d: d.replace(/-?\d+\.\d+/g, (m) => String(r1(parseFloat(m)))),
  s: stroke,
  f: fill,
  w: r1(w),
})

function hairPaths(kind, o, tone, sw) {
  const solid = { ...o, fill: tone, fillStyle: 'solid' }
  const back = []
  const front = []
  const add = (arr, drawable) => arr.push(...trim(gen.toPaths(drawable), sw))

  switch (kind) {
    case 'bald':
      break
    case 'receding':
      add(front, gen.path('M -40 -20 C -38 -42 -20 -50 0 -48 C 20 -50 34 -40 38 -22 C 30 -34 14 -38 0 -36 C -16 -38 -30 -32 -40 -20 Z', solid))
      break
    case 'part':
      add(front, gen.path('M -45 -14 C -45 -46 -22 -60 2 -60 C 26 -60 45 -46 45 -16 C 38 -36 26 -44 8 -46 C 2 -34 -18 -28 -45 -14 Z', solid))
      break
    case 'curly':
      add(front, gen.path('M -46 -18 C -56 -36 -44 -54 -28 -54 C -22 -66 -6 -68 0 -60 C 8 -70 26 -64 30 -52 C 48 -50 54 -30 44 -16 C 40 -38 22 -48 0 -48 C -22 -48 -40 -38 -46 -18 Z', solid))
      break
    case 'afro':
      add(back, gen.ellipse(0, -26, 124, 108, solid))
      break
    case 'bun':
      add(back, gen.circle(0, -70, 40, solid))
      add(front, gen.path('M -44 -14 C -44 -46 -24 -58 0 -58 C 24 -58 44 -46 44 -14 C 36 -36 20 -44 0 -44 C -20 -44 -36 -36 -44 -14 Z', solid))
      break
    case 'ponytail':
      add(back, gen.path('M 38 -32 C 66 -28 74 6 66 38 C 58 12 50 -10 34 -20 Z', solid))
      add(front, gen.path('M -44 -14 C -44 -46 -24 -58 0 -58 C 24 -58 44 -46 44 -14 C 36 -36 20 -44 0 -44 C -20 -44 -36 -36 -44 -14 Z', solid))
      break
    case 'long':
      add(back, gen.path('M -48 -20 C -50 -54 -26 -64 0 -64 C 26 -64 50 -54 48 -20 L 54 70 L 32 72 L 34 -6 C 20 -22 -20 -22 -34 -6 L -32 72 L -54 70 Z', solid))
      break
    case 'bob':
      add(back, gen.path('M -48 -18 C -48 -54 -24 -64 0 -64 C 24 -64 48 -54 48 -18 L 50 26 L 30 26 L 32 -6 C 18 -20 -18 -20 -32 -6 L -30 26 L -50 26 Z', solid))
      break
    case 'spiky':
      add(front, gen.path('M -44 -14 L -38 -46 L -26 -30 L -16 -58 L -4 -34 L 8 -60 L 18 -32 L 30 -48 L 38 -28 L 44 -16 C 36 -36 20 -44 0 -44 C -20 -44 -36 -36 -44 -14 Z', solid))
      break
    case 'wrap':
      add(front, gen.path('M -46 -10 C -46 -44 -24 -58 0 -58 C 24 -58 46 -44 46 -10 L 40 4 L -40 4 Z', solid))
      break
    case 'cap':
      add(front, gen.path('M -44 -18 C -44 -48 -22 -60 0 -60 C 22 -60 44 -48 44 -18 Z', solid))
      add(front, gen.path('M -46 -18 L 58 -13 L 56 -5 L -46 -10 Z', solid))
      break
    default:
      add(front, gen.path('M -44 -12 C -44 -44 -24 -58 0 -58 C 24 -58 44 -44 44 -12 C 36 -34 20 -42 0 -42 C -20 -42 -36 -34 -44 -12 Z', solid))
  }
  return { back, front }
}

function facePaths(r, i, sw) {
  const out = []
  const eyes = pick(r, i, 'eyes', EYES)
  const brows = pick(r, i, 'brows', BROWS)
  const nose = pick(r, i, 'nose', NOSE)
  let mouth = pick(r, i, 'mouth', MOUTH)
  const ex = span(r, i, 'ex', 15, 19)
  const ey = -6
  const w = sw * 0.85

  // Closed eyes with a wide-open mouth reads as pain rather than laughter.
  if ((eyes === 'happy' || eyes === 'squint') && mouth === 'smallO') mouth = 'smile'

  if (eyes === 'open' || eyes === 'wide') {
    const rr = eyes === 'wide' ? 7 : 5
    for (const s of [-1, 1]) {
      out.push(plain(`M ${s * ex - rr} ${ey} a ${rr} ${rr} 0 1 0 ${rr * 2} 0 a ${rr} ${rr} 0 1 0 ${-rr * 2} 0 Z`, { fill: INK, stroke: null, w }))
    }
  } else if (eyes === 'happy') {
    for (const s of [-1, 1]) out.push(plain(`M ${s * ex - 8} ${ey + 3} q 8 -10 16 0`, { w: w * 1.4 }))
  } else if (eyes === 'wink') {
    out.push(plain(`M ${-ex - 5} ${ey} a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 Z`, { fill: INK, stroke: null, w }))
    out.push(plain(`M ${ex - 8} ${ey + 2} q 8 -9 16 0`, { w: w * 1.4 }))
  } else {
    for (const s of [-1, 1]) out.push(plain(`M ${s * ex - 7} ${ey} h 14`, { w: w * 1.5 }))
  }

  if (brows !== 'none') {
    const by = ey - span(r, i, 'by', 15, 20)
    for (const s of [-1, 1]) {
      if (brows === 'straight') out.push(plain(`M ${s * ex - 9} ${by} h 18`, { w }))
      else if (brows === 'raised') out.push(plain(`M ${s * ex - 9} ${by + 2} q 9 -7 18 0`, { w }))
      else out.push(plain(`M ${s * ex - 9} ${by + (s < 0 ? -3 : 3)} l 18 ${s < 0 ? 6 : -6}`, { w }))
    }
  }

  if (nose === 'dot') out.push(plain('M -2 8 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0 Z', { fill: INK, stroke: null, w }))
  else if (nose === 'hook') out.push(plain('M 0 -4 l 5 14 l -7 2', { w }))
  else if (nose === 'round') out.push(plain('M -4 6 q 5 7 9 0', { w }))

  const my = span(r, i, 'my', 24, 29)
  if (mouth === 'smile') out.push(plain(`M -13 ${my} q 13 12 26 0`, { w: w * 1.25 }))
  else if (mouth === 'openSmile') out.push(plain(`M -14 ${my - 2} q 14 20 28 0 q -14 6 -28 0 Z`, { fill: INK, w }))
  else if (mouth === 'grin') {
    out.push(plain(`M -15 ${my - 3} q 15 19 30 0 Z`, { fill: PAPER, w }))
    out.push(plain(`M -15 ${my - 3} h 30`, { w }))
  } else if (mouth === 'smallO') out.push(plain(`M -5 ${my} a 5 6 0 1 0 10 0 a 5 6 0 1 0 -10 0 Z`, { fill: INK, stroke: null, w }))
  else if (mouth === 'straight') out.push(plain(`M -11 ${my + 2} h 22`, { w: w * 1.25 }))
  else out.push(plain(`M -12 ${my + 3} q 12 8 24 -4`, { w: w * 1.25 }))

  return out
}

function extraPaths(r, i, sw) {
  const out = []
  const kind = pick(r, i, 'extra', EXTRA)
  const ex = span(r, i, 'ex', 15, 19)
  const w = sw * 0.9
  if (kind === 'round' || kind === 'square' || kind === 'shades') {
    const fill = kind === 'shades' ? INK : null
    for (const s of [-1, 1]) {
      if (kind === 'square') out.push(plain(`M ${s * ex - 12} -16 h 24 v 20 h -24 Z`, { fill, w }))
      else out.push(plain(`M ${s * ex - 11} -6 a 11 10 0 1 0 22 0 a 11 10 0 1 0 -22 0 Z`, { fill, w }))
    }
    out.push(plain(`M ${-ex + 11} -6 h ${2 * ex - 22}`, { w }))
  } else if (kind === 'earring') {
    out.push(plain(`M ${RX - 4} 18 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0 Z`, { fill: INK, stroke: null, w }))
  }
  return out
}

function beardPaths(r, i, sw, tone) {
  const kind = pick(r, i, 'beard', BEARD)
  const w = sw * 0.9
  if (kind === 'moustache') return [plain('M -12 18 q 12 -7 24 0 q -12 5 -24 0 Z', { fill: tone, w })]
  // Filled mass hugging the jaw. An unfilled arc here reads as a huge grin.
  if (kind === 'beard') {
    return [plain('M -38 2 C -36 40 -20 54 0 54 C 20 54 36 40 38 2 L 30 8 C 26 30 14 40 0 40 C -14 40 -26 30 -30 8 Z', { fill: tone, w })]
  }
  return []
}

function character(r, i, row) {
  const seed = 1 + (h32(`${r}/${i}/seed`) % 2000000)
  const sw = row.sw
  const o = {
    seed,
    roughness: 0.55,
    bowing: 0.6,
    strokeWidth: sw,
    stroke: INK,
    disableMultiStroke: true,
    disableMultiStrokeFill: true,
    curveStepCount: 6,
  }

  // Hair, hats and clothing carry the only tones here, scattered so the crowd
  // stays predominantly light with a few dark accents.
  const hairTone = pick(r, i, 'htone', [F(4), F(3), F(2), F(4), PAPER, F(3)])
  const neckTone = pick(r, i, 'ntone', [PAPER, PAPER, F(2), PAPER, F(3)])

  const hair = pick(r, i, 'hair', HAIR)
  const neck = pick(r, i, 'neck', NECK)
  const { back, front } = hairPaths(hair, o, hairTone, sw)

  const paths = []
  const shoulderTop = span(r, i, 'sh', 74, 82)
  const halfW = span(r, i, 'shw', 60, 74)

  // Shoulders first, filled, so this character occludes the row behind it.
  paths.push(
    ...trim(
      gen.toPaths(
        gen.path(
          `M ${-halfW} 200 C ${-halfW + 6} ${shoulderTop + 44} -34 ${shoulderTop} -22 ${shoulderTop - 8} L 22 ${shoulderTop - 8} C 34 ${shoulderTop} ${halfW - 6} ${shoulderTop + 44} ${halfW} 200 Z`,
          { ...o, fill: neckTone, fillStyle: 'solid' },
        ),
      ),
      sw,
    ),
  )
  if (neck === 'collar') paths.push(plain(`M -22 ${shoulderTop - 6} l 20 26 l 20 -26`, { w: sw }))
  else if (neck === 'vee') paths.push(plain(`M -20 ${shoulderTop - 4} l 20 30 l 20 -30`, { w: sw }))
  else if (neck === 'round') paths.push(plain(`M -22 ${shoulderTop - 2} q 22 20 44 0`, { w: sw }))
  else if (neck === 'stripe') {
    for (let k = 0; k < 3; k++) {
      paths.push(plain(`M ${-halfW + 12 + k * 5} ${118 + k * 28} h ${2 * halfW - 24 - k * 10}`, { w: sw * 0.9 }))
    }
  }

  paths.push(...back)

  // Ears, then the head — paper filled, which is the governing rule.
  for (const s of [-1, 1]) {
    paths.push(plain(`M ${s * (RX - 4)} -4 a 9 11 0 1 ${s < 0 ? 1 : 0} 0 20 Z`, { fill: PAPER, w: sw }))
  }
  const hw = span(r, i, 'hw', 0.94, 1.08)
  const hh = span(r, i, 'hh', 0.94, 1.08)
  paths.push(...trim(gen.toPaths(gen.ellipse(0, 0, RX * 2 * hw, RY * 2 * hh, { ...o, fill: PAPER, fillStyle: 'solid' })), sw))

  paths.push(...front)
  paths.push(...beardPaths(r, i, sw, hairTone === PAPER ? F(3) : hairTone))
  paths.push(...facePaths(r, i, sw))
  paths.push(...extraPaths(r, i, sw))

  return paths
}

function build() {
  const people = []
  ROWS.forEach((row, r) => {
    const step = row.pitch * row.scale
    const count = Math.ceil(WIDTH / step) + 2
    for (let i = 0; i < count; i++) {
      const x = step * i - step * 0.6 + (r % 2 ? step * 0.45 : 0) + (unit(r, i, 'jx') - 0.5) * step * 0.2
      const y = row.cy + (unit(r, i, 'jy') - 0.5) * 30
      people.push({
        id: `r${r}c${i}`,
        x: Math.round(x),
        y: Math.round(y),
        s: r1(row.scale * span(r, i, 'sc', 0.94, 1.06) * 100) / 100,
        paths: character(r, i, row),
      })
    }
  })
  return people
}

const people = build()
const pathCount = people.reduce((n, p) => n + p.paths.length, 0)

const body = `// GENERATED by scripts/generate-crowd.mjs — do not edit by hand.
// Regenerate with \`npm run crowd\`. Seeded, so output is byte-stable.
//
// Every face is filled with the paper colour. That is how the overlap reads,
// and it is why there is no per-person tonal value anywhere in this data — so
// no value hierarchy between individuals is expressible at all.

export interface CrowdPath {
  d: string
  /** Stroke colour, or null for a fill-only path. */
  s: string | null
  /** Fill colour, or null. */
  f: string | null
  /** Stroke width. */
  w: number
}

export interface CrowdPerson {
  id: string
  x: number
  y: number
  s: number
  paths: CrowdPath[]
}

export const CROWD_WIDTH = ${WIDTH}
export const CROWD_HEIGHT = ${HEIGHT}

/** In draw order: back row first, so each character occludes the one behind. */
export const CROWD_PEOPLE: CrowdPerson[] = ${JSON.stringify(people)}

export const VIEWBOX_DESKTOP = '0 0 ${WIDTH} ${HEIGHT}'
export const VIEWBOX_MOBILE = '${Math.round(WIDTH * 0.3)} 0 ${Math.round(WIDTH * 0.4)} ${HEIGHT}'
`
  .replaceAll('"@ink"', '"var(--ink)"')
  .replaceAll('"@paper"', '"var(--paper)"')
  .replaceAll('"@fill2"', '"var(--fill-2)"')
  .replaceAll('"@fill3"', '"var(--fill-3)"')
  .replaceAll('"@fill4"', '"var(--fill-4)"')

await writeFile(OUT, body)

const kb = body.length / 1024
const gz = gzipSync(Buffer.from(body)).length / 1024
console.log(`
  people   ${people.length}
  paths    ${pathCount}
  size     ${kb.toFixed(1)} KB   (${gz.toFixed(1)} KB gzip)   budget ${BUDGET_KB} KB
`)

if (kb > BUDGET_KB) {
  console.error(`  OVER BUDGET by ${(kb - BUDGET_KB).toFixed(1)} KB — cut the character count.\n`)
  process.exit(1)
}
