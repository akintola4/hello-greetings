/**
 * Build-time generator for the closing doodle crowd.
 *
 * Rough.js is used through `generator()` + `toPaths()`, which need no DOM, so
 * this runs in plain Node and emits a committed data module. The browser never
 * loads the library: no runtime cost, no hydration mismatch, and artwork that
 * can be screenshotted and iterated on.
 *
 * Everything is SEEDED. Rough.js re-randomises on every call otherwise, which
 * would churn the committed file on each run and shimmer between renders.
 *
 * The architecture rule inherited from the previous artwork: heads, bodies and
 * legs are local to a figure and placed by a transform, but ARMS are generated
 * in root coordinates from the same table the hand-joins use. Generating arms
 * inside a scaled transform while placing joins in root space is what made
 * every hand gap in the first version.
 *
 *   node scripts/generate-crowd.mjs
 */
import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import rough from 'roughjs'

// Rough.js falls back to Math.random ONLY when a drawable has no seed (or
// seed 0). Trapping it turns "the committed file silently churns on every run"
// into a loud build failure.
Math.random = () => {
  throw new Error('generate-crowd: nondeterminism — a drawable is missing its seed')
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'components', 'sections', 'finale', 'crowd-data.ts')

const gen = rough.generator()

export const WIDTH = 1470
export const HEIGHT = 232
const GROUND = 206

/** Placeholders swapped for CSS variables at emit time, so both themes work. */
const INK = '@ink'
const F = (n) => `@fill${n}`

/**
 * Rows, back to front. Back rows are smaller, lighter and solid-filled; only
 * the front rows hatch, because hachure at small scale turns to mud.
 */
const ROWS = [
  // Spacing is derived from figure width, not from the canvas: a figure is
  // about 26 units across at scale 1, so hands can only meet if neighbours sit
  // roughly 2.6 body-widths apart. Spacing them evenly across the full canvas
  // instead is what turned the arms into ropes six body-widths long.
  // Bigger scale steps than the first attempt: with only 0.85/1.15/1.5 every
  // row topped out at the same height and the crowd merged into one mass
  // instead of reading as depth.
  { y: 138, scale: 0.62, fill: F(2), hatch: false, rough: 1.1, jitter: 6 },
  { y: 172, scale: 1.0, fill: F(3), hatch: false, rough: 1.4, jitter: 8 },
  { y: 206, scale: 1.55, fill: F(4), hatch: true, rough: 1.7, jitter: 9 },
]

/** A figure is ~26 local units wide; this is the gap that lets hands meet. */
const SPACING = (scale) => 26 * scale * 3.05


/** Deterministic hash → the same index always yields the same person. */
function hash(n) {
  let h = (n + 0x9e3779b9) | 0
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad)
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97)
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}
const pick = (n, arr) => arr[Math.floor(hash(n) * arr.length) % arr.length]
const between = (n, a, b) => a + hash(n) * (b - a)

const HAIR = ['none', 'tuft', 'bun', 'long', 'spike', 'curl', 'cap']
const BODY = ['column', 'dress', 'round']
const LEGS = ['together', 'apart']

/**
 * Rough.js emits full float precision — roughly 14 significant figures per
 * coordinate, which dominated the generated file (610 KB before this). One
 * decimal place is far finer than a pixel at this scale and costs nothing
 * visually.
 */
function trim(paths) {
  return paths.map((p) => ({
    ...p,
    d: p.d.replace(/-?\d+\.\d+/g, (m) => String(Math.round(parseFloat(m)))),
    strokeWidth: Math.round((p.strokeWidth ?? 1) * 100) / 100,
  }))
}

/** One figure, in local units: y = 0 at the feet, negative upward, height 100. */
function figure(uid, spec) {
  // disableMultiStroke halves every outline path; the front row keeps its
  // double stroke because that second pass is what reads as "sketched".
  const o = {
    seed: uid * 7919 + 13,
    roughness: spec.rough,
    bowing: 1.4,
    strokeWidth: 1.6,
    stroke: INK,
    disableMultiStroke: !spec.hatch,
    disableMultiStrokeFill: true,
    curveStepCount: spec.hatch ? 9 : 6,
  }
  const fillOpts = spec.hatch
    ? { ...o, fill: spec.fill, fillStyle: 'hachure', hachureGap: 5.2, hachureAngle: -41 + hash(uid) * 82, fillWeight: 0.9 }
    : { ...o, fill: spec.fill, fillStyle: 'solid' }

  const drawables = []
  const headR = between(uid + 101, 9.5, 12.5)
  const headY = -86
  const bodyTop = headY + headR + 2
  const hipY = between(uid + 202, -40, -32)
  const build = between(uid + 303, 0.85, 1.25)

  // Head.
  drawables.push(gen.ellipse(0, headY, headR * 2 * build, headR * 2.05, fillOpts))

  // Hair, as an extra mass so the silhouette differs person to person.
  const hair = pick(uid + 404, HAIR)
  if (hair === 'bun') drawables.push(gen.circle(-headR * 0.7, headY - headR, 7, fillOpts))
  if (hair === 'tuft') drawables.push(gen.linearPath([[2, headY - headR], [6, headY - headR - 8]], o))
  if (hair === 'spike')
    drawables.push(gen.linearPath([[-6, headY - headR + 1], [-4, headY - headR - 7], [0, headY - headR - 1], [4, headY - headR - 8], [7, headY - headR + 1]], o))
  if (hair === 'long')
    drawables.push(gen.polygon([[-headR - 1, headY - 4], [headR + 1, headY - 4], [headR + 3, hipY + 14], [-headR - 3, hipY + 14]], fillOpts))
  if (hair === 'curl') drawables.push(gen.ellipse(0, headY - headR * 0.5, headR * 2.7, headR * 1.7, fillOpts))
  if (hair === 'cap') drawables.push(gen.polygon([[-headR - 2, headY - headR * 0.3], [headR + 2, headY - headR * 0.3], [headR * 0.6, headY - headR - 4], [-headR * 0.6, headY - headR - 4]], fillOpts))

  // Body.
  const bw = 11 * build
  const body = pick(uid + 505, BODY)
  if (body === 'dress') drawables.push(gen.polygon([[-bw, bodyTop], [bw, bodyTop], [bw * 1.9, hipY], [-bw * 1.9, hipY]], fillOpts))
  else if (body === 'round') drawables.push(gen.ellipse(0, (bodyTop + hipY) / 2, bw * 2.3, hipY - bodyTop + 6, fillOpts))
  else drawables.push(gen.polygon([[-bw, bodyTop], [bw, bodyTop], [bw * 0.9, hipY], [-bw * 0.9, hipY]], fillOpts))

  // Legs.
  const spread = pick(uid + 606, LEGS) === 'apart' ? 9 : 4
  drawables.push(gen.linearPath([[-spread * 0.5, hipY], [-spread, 0]], { ...o, strokeWidth: 3.6 }))
  drawables.push(gen.linearPath([[spread * 0.5, hipY], [spread, 0]], { ...o, strokeWidth: 3.6 }))
  drawables.push(gen.linearPath([[-spread - 3, 0], [-spread + 3, 0]], { ...o, strokeWidth: 3.2 }))
  drawables.push(gen.linearPath([[spread - 3, 0], [spread + 3, 0]], { ...o, strokeWidth: 3.2 }))

  return trim(drawables.flatMap((d) => gen.toPaths(d)))
}

/** Root-space arm, so its endpoints are exactly the join the neighbour uses. */
function arm(uid, sx, sy, hx, hy, rough) {
  const mx = (sx + hx) / 2
  const my = (sy + hy) / 2 + 4
  return trim(gen.toPaths(
    gen.path(`M ${sx} ${sy} Q ${mx} ${my} ${hx} ${hy}`, {
      seed: uid * 104729 + 7,
      roughness: rough,
      bowing: 1.2,
      strokeWidth: 2.7,
      stroke: INK,
    }),
  ))
}

function build() {
  const figures = []
  const arms = []
  let uid = 0

  ROWS.forEach((row, r) => {
    // Offset alternate rows and jitter each figure so it reads as a crowd
    // rather than as wallpaper.
    const step = SPACING(row.scale)
    // Overhang by one either side so the chain runs off both frame edges and
    // implies the crowd continues past the view.
    const count = Math.ceil(WIDTH / step) + 2
    const slots = Array.from({ length: count }, (_, i) => {
      const j = (hash(uid + i * 31 + r * 977) - 0.5) * row.jitter * 2
      return step * i - step + (r % 2 ? step * 0.5 : 0) + j
    })

    slots.forEach((x, i) => {
      const id = uid + i
      const s = row.scale * between(id + 808, 0.9, 1.1)
      const baseY = row.y + (hash(id + 909) - 0.5) * 4
      figures.push({
        id: `f${r}-${i}`,
        row: r,
        x: +x.toFixed(2),
        y: +baseY.toFixed(2),
        s: +s.toFixed(3),
        paths: figure(id, row),
      })

      // Join hands with the next figure in this row.
      if (i < slots.length - 1) {
        const sNext = row.scale * between(id + 1 + 808, 0.9, 1.1)
        const shoulderY = baseY - 66 * s
        const shoulderYNext = baseY - 66 * sNext
        const hx = (x + slots[i + 1]) / 2
        const hy = (shoulderY + shoulderYNext) / 2 + 9 * row.scale
        arms.push({ row: r, paths: arm(id * 2, x + 11 * s, shoulderY, hx, hy, row.rough) })
        arms.push({ row: r, paths: arm(id * 2 + 1, slots[i + 1] - 11 * sNext, shoulderYNext, hx, hy, row.rough) })
      }
    })
    uid += slots.length + 50
  })

  return { figures, arms }
}

const { figures, arms } = build()

const pathCount =
  figures.reduce((n, f) => n + f.paths.length, 0) + arms.reduce((n, a) => n + a.paths.length, 0)

const body = `// GENERATED by scripts/generate-crowd.mjs — do not edit by hand.
// Regenerate with \`npm run crowd\`. Seeded, so output is byte-stable.

export interface CrowdPath {
  d: string
  stroke: string
  fill: string
  strokeWidth: number
}

export interface CrowdFigure {
  id: string
  row: number
  x: number
  y: number
  s: number
  paths: CrowdPath[]
}

export const CROWD_WIDTH = ${WIDTH}
export const CROWD_HEIGHT = ${HEIGHT}
export const CROWD_GROUND = ${GROUND}
export const ROW_COUNT = ${ROWS.length}

export const CROWD_FIGURES: CrowdFigure[] = ${JSON.stringify(figures)}

export const CROWD_ARMS: { row: number; paths: CrowdPath[] }[] = ${JSON.stringify(arms)}

/**
 * Mobile crops to the middle of the crowd. The chain runs off both edges at
 * either size, so the crowd reads as continuing past the frame rather than as
 * a finite group that happens to fit.
 */
export const VIEWBOX_DESKTOP = '0 0 ${WIDTH} ${HEIGHT}'
export const VIEWBOX_MOBILE = '${Math.round(WIDTH * 0.34)} 0 ${Math.round(WIDTH * 0.33)} ${HEIGHT}'
`
  .replaceAll('"@ink"', '"var(--ink)"')
  .replaceAll('"@fill1"', '"var(--fill-1)"')
  .replaceAll('"@fill2"', '"var(--fill-2)"')
  .replaceAll('"@fill3"', '"var(--fill-3)"')
  .replaceAll('"@fill4"', '"var(--fill-4)"')

await writeFile(OUT, body)

console.log(`
  figures  ${figures.length}
  arms     ${arms.length}
  paths    ${pathCount}
  size     ${(body.length / 1024).toFixed(1)} KB
`)
