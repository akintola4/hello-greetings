/**
 * Build-time generator for the closing crowd.
 *
 * The artwork is **Notionists**, a hand-drawn character library from DiceBear's
 * CC0 collection — public domain, free commercially, no attribution required.
 * It is used rather than anything authored here because authoring cartoon faces
 * as SVG coordinates produces geometry that approximates a face, not drawing.
 *
 * Two properties of Notionists make it fit this site exactly:
 *
 * 1. **It uses only #000 and #fff.** No colour at all, so both themes are a
 *    token swap rather than a CSS filter: black becomes `--ink`, white becomes
 *    `--paper`. In dark mode the line art inverts properly instead of
 *    disappearing into the background.
 * 2. **Every character is generated from a seed**, so the crowd is
 *    deterministic and the committed output is byte-stable between runs.
 *
 * Generated in Node at build time; the browser never loads DiceBear.
 *
 *   node scripts/generate-crowd.mjs
 */
import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { createAvatar } from '@dicebear/core'
import { notionists } from '@dicebear/collection'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'components', 'sections', 'finale', 'crowd-data.ts')

const WIDTH = 1400
const HEIGHT = 430

/**
 * Rows, back to front. Each is lower and larger; the row in front overlaps the
 * shoulders of the row behind, which is what makes the depth read.
 */
const ROWS = [
  // Three rows, packed and large. Each Notionists character costs ~12KB of path
  // data, so the count is a real payload decision — and this artwork has far
  // too much detail to spend at thumbnail size.
  // Packed so that neighbours overlap. Each character's own white fills
  // occlude whoever is drawn before it, and the plate covers the transparent
  // gaps the avatar leaves between arm and body.
  // Vertical placement is not free composition: each row's torso is cut flat
  // at the bottom of its own avatar viewBox, and a flat cut that lands in open
  // paper reads as a mistake — a black slab hanging in mid-air. So every row's
  // cut has to fall behind the heads of the row in front, and the last row's
  // has to fall off the bottom of the canvas. That fixes the spacing more than
  // taste does.
  //
  // Horizontal pitch is tighter than the heads strictly need, for the same
  // reason: the cuts showed through the gaps BETWEEN the heads in front.
  { cy: 58, scale: 1.0, pitch: 94 },
  { cy: 182, scale: 1.2, pitch: 94 },
  { cy: 312, scale: 1.45, pitch: 94 },
]

/**
 * Body variants whose bottom edge is light.
 *
 * Every Notionists character ends flat at the bottom of its own frame — the art
 * is drawn to be cropped into a square, not to stand in a crowd — and in a back
 * row that cut shows wherever no head in front happens to cover it. On a light
 * shirt the cut is a hairline and nobody sees it. On a solid black one it is a
 * black slab hanging in mid-air.
 *
 * So the back rows draw only from the variants that end light, and the front
 * row draws from all twenty-five, because its cut falls off the canvas. The
 * crowd keeps its solid blacks where they can do no harm.
 *
 * The six excluded were measured, not guessed: each variant was rasterised and
 * the bottom 12% of its covered pixels counted for ink. The rest come in under
 * 30%; these come in at 38, 39, 87, 88, 89 and 90.
 *
 *   excluded — variant02, variant04, variant06, variant08, variant09, variant17
 */
const LIGHT_HEM = [
  'variant01', 'variant03', 'variant05', 'variant07', 'variant10', 'variant11',
  'variant12', 'variant13', 'variant14', 'variant15', 'variant16', 'variant18',
  'variant19', 'variant20', 'variant21', 'variant22', 'variant23', 'variant24',
  'variant25',
]

function h32(s) {
  let h = 2166136261
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619)
  return h >>> 0
}
const U = (k) => h32(k) / 4294967296

/**
 * Namespace every id in an avatar.
 *
 * DiceBear does not guarantee ids are unique across separately generated
 * avatars, and `url(#a)` resolves to the FIRST match in the document — so
 * without this, one character's clipPath silently captures another's.
 */
function isolate(svg, prefix) {
  const ids = [...new Set([...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))]
  let out = svg
  for (const id of ids) {
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out
      .replace(new RegExp(`id="${safe}"`, 'g'), `id="${prefix}${id}"`)
      .replace(new RegExp(`url\\(#${safe}\\)`, 'g'), `url(#${prefix}${id})`)
      .replace(new RegExp(`href="#${safe}"`, 'g'), `href="#${prefix}${id}"`)
  }
  return out
}

/**
 * Map the two colours onto theme tokens — but NOT inside `<mask>` elements.
 *
 * SVG masks work on luminance: white passes, black blocks. Substituting a
 * token for `#fff` inside a mask changes what that mask does, and in dark mode
 * `--paper` is near-black, so every masked element would disappear completely.
 * Mask contents keep literal white and black; everything else gets tokens.
 */
function tokenise(svg) {
  const parts = svg.split(/(<mask[\s\S]*?<\/mask>)/g)
  return parts
    .map((part) =>
      part.startsWith('<mask')
        ? part
        : part
            .replace(/#fff(?![0-9a-f])/gi, 'var(--paper)')
            .replace(/#000(?![0-9a-f])/gi, 'var(--ink)'),
    )
    .join('')
}

function clean(svg) {
  return tokenise(
    svg
      // An RDF licence block per character, repeated over and over.
      .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
      // Lift the avatar's own frame.
      //
      // Every Notionists character is wrapped in a `viewboxMask` — a rect the
      // size of the viewBox — because the art is drawn to be cropped into a
      // square or a circle. The torso does not stop at that edge; it is cut by
      // it. In a crowd that cut is a flat horizontal line across the chest, and
      // on a dark shirt it reads as a black slab hanging in mid-air wherever no
      // head in front happens to cover it.
      //
      // Removing the mask lets the body draw the way it was drawn, so it runs
      // on down behind the row in front and there is no edge to hide. This is
      // why no fade or feathering is needed — and a fade was tried, and read as
      // a smear.
      .replace(/<mask id="viewboxMask">[\s\S]*?<\/mask>/g, '')
      .replace(/ mask="url\(#viewboxMask\)"/g, '')
      // ONE decimal place, never zero. Notionists' line art is thin FILLED
      // geometry rather than strokes, so rounding to integers closes the gaps
      // that read as lines and the faces collapse into black blobs. One
      // decimal is safe and still saves about a fifth of the payload.
      .replace(/-?\d+\.\d+/g, (m) => String(Math.round(parseFloat(m) * 10) / 10)),
  )
}

const innerOf = (svg) => svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'))

function build() {
  const people = []
  ROWS.forEach((row, r) => {
    const step = row.pitch * row.scale
    const count = Math.ceil(WIDTH / step) + 2
    for (let i = 0; i < count; i++) {
      const key = `hello/${r}/${i}`
      const raw = createAvatar(notionists, {
        seed: key,
        backgroundColor: ['transparent'],
        // Only the front row may wear a solid black shirt; see LIGHT_HEM.
        ...(r === ROWS.length - 1 ? {} : { body: LIGHT_HEM }),
        // Everyone is waving. On a site about greeting, a crowd of people
        // standing with their arms down — several of them on their phones —
        // is not saying hello. Notionists ships ten gestures, four of which
        // read as a wave; this forces the single-arm one on every character. The two-armed variants put every hand in the
        // air at once and the crowd reads as a class answering a question
        // rather than as people greeting you; the `point` ones raise an index
        // finger, which reads the same way.
        gesture: ['waveLongArm'],
        // Most of them, not all. A raised arm on every single character is a
        // wall of hands, and packed tightly the arms cross each other's faces.
        // Two in three waving still reads unmistakably as a crowd greeting you,
        // and the ones with their arms down are what lets it pack close.
        gestureProbability: 66,
        // The chest graphics are among the most detailed shapes in the set and
        // are unreadable at this size — pure payload.
        bodyIconProbability: 0,
      }).toString()

      const vb = raw.match(/viewBox="([\d.\-\s]+)"/)
      const [, , vw, vh] = vb ? vb[1].trim().split(/\s+/).map(Number) : [0, 0, 100, 100]

      const x = step * i - step * 0.6 + (r % 2 ? step * 0.45 : 0) + (U(key + 'x') - 0.5) * step * 0.18
      const y = row.cy + (U(key + 'y') - 0.5) * 22
      const s = (152 * row.scale) / vh

      people.push({
        id: key,
        row: r,
        // An opaque plate behind the head only. These avatars are transparent,
        // so something must occlude the person behind — but the plate has to
        // stay inside the head: any wider and it slices through the raised
        // hand of the neighbour drawn before it.
        px: Math.round(x),
        py: Math.round(y - 6 * row.scale),
        pr: Math.round(31 * row.scale),
        t: `translate(${(x - (s * vw) / 2).toFixed(1)} ${(y - s * vh * 0.42).toFixed(1)}) scale(${s.toFixed(4)})`,
        svg: isolate(clean(innerOf(raw)), `n${r}x${i}_`),
      })
    }
  })
  return people
}

const people = build()

/**
 * Two standalone files rather than an inline module.
 *
 * Inlined, this artwork landed in the document TWICE — once in the streamed
 * HTML and again in the RSC payload — which took the page to 370KB gzipped.
 * As a file it is fetched once, cached, and costs the document nothing.
 *
 * Colours are written as the literal `oklch()` values from globals.css rather
 * than converted to hex, so the paper behind each head matches the page
 * exactly. Any drift would show as a faint disc behind every head.
 */
const THEMES = {
  light: { paper: 'oklch(0.972 0.008 85)', ink: 'oklch(0.185 0.012 60)' },
  dark: { paper: 'oklch(0.168 0.008 60)', ink: 'oklch(0.94 0.006 85)' },
}

/**
 * One person: an opaque head plate, then the character on top of it.
 *
 * `use` for a pooled character, `svg` for a one-off. The crowd embeds each
 * character once because every one of its forty-five is different; the 404
 * places fourteen seventy times and cannot afford to.
 */
const drawPerson = (p, paper) =>
  `<g><ellipse cx="${p.px}" cy="${p.py}" rx="${p.pr}" ry="${(p.pr * 1.12).toFixed(1)}" fill="${paper}"/>` +
  (p.use
    ? `<use href="#${p.use}" transform="${p.t}"/>`
    : `<g transform="${p.t}">${p.svg}</g>`) +
  `</g>`

/**
 * Write one scene as a pair of files, one per theme.
 *
 * Shared by both scenes rather than copied, because the three subtleties above
 * — id isolation, mask-safe tokenising, one-decimal rounding — are exactly the
 * things a second generator would get wrong, and the `oklch()` values are
 * already duplicated from globals.css once and must not be duplicated again.
 */
async function writeScene(name, width, height, cast, defs = '') {
  for (const [themeName, theme] of Object.entries(THEMES)) {
    const file = (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
      (defs ? `<defs>${defs}</defs>` : '') +
      `<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.paper}"/>` +
      cast.map((p) => drawPerson(p, theme.paper)).join('') +
      `</svg>`
    )
      .replace(/var\(--paper\)/g, theme.paper)
      .replace(/var\(--ink\)/g, theme.ink)
    await writeFile(join(ROOT, 'public', `${name}-${themeName}.svg`), file)
    const gz = gzipSync(Buffer.from(file)).length / 1024
    console.log(
      `  ${name}-${themeName}.svg  ${(file.length / 1024).toFixed(0)} KB  (${gz.toFixed(0)} KB gzip)`,
    )
  }
}

await writeScene('crowd', WIDTH, HEIGHT, people)

/* --------------------------------------------------------------------------
   The second scene: the 404, made of people.

   The site's argument is that wherever you go, someone greets you. On the one
   page where there is nothing to greet you, the people are the error — they
   stand in the shape of the number.

   Three things here are worth knowing before changing any of the constants.

   1. THE DIGITS ARE GEOMETRY, NOT A FONT. Each is a few thick strokes, and a
      grid point belongs to a digit if it falls within half a stroke width of
      one. There is no font to read outlines from — Geist arrives from
      `next/font/google` as CSS, not a file — and defining the strokes directly
      gives exact control over the number that actually matters: how many
      characters fit ACROSS a stroke.

   2. STROKE THICKNESS SETS THE HEADCOUNT, AND BIGGER DIGITS DO NOT HELP. The
      count is stroke area over pitch squared, so scaling the whole numeral up
      raises it. Two characters across a stroke costs about 130 people; about
      1.3 across costs 60-75, still reads, and looks like a formation rather
      than a filled shape.

   3. THE CHARACTERS ARE A POOL, INSTANCED. Seventy unique Notionists is about
      840 KB of path data, which is indefensible on a 404. A pool of fourteen
      placed with `<use>` costs about 60 bytes an instance instead of 12 KB,
      and mirroring half of them doubles the apparent variety for nothing.
      `isolate()` is what makes the pool safe: without per-character id
      namespacing the pool members' clipPaths would capture each other.
-------------------------------------------------------------------------- */

/** Grid pitch. Every other number in this scene is expressed against it. */
const P = 96
/**
 * Half the stroke width: about 1.1 characters, so a stroke is mostly a
 * single file of people.
 *
 * Measured against the counter of the four, which is what breaks first. At
 * 0.65 the diagonal and the stem left 24 units of clear space between them at
 * mid-height — less than a third of a head — and both fours filled in as solid
 * triangles. The zero looked fine throughout, which is why this has to be
 * checked on the four.
 */
const HW = P * 0.55
/** Nominal character height, matching the crowd's front row. */
const FIG = P * 1.6
const POOL_SIZE = 14

/** Wide enough that the four's counter survives the stroke width. */
const DW = P * 7
const DH = P * 9
/* Tight. Each digit box already carries side padding of its own — the ring
   of the zero is inset inside its box — so a generous gap on top of that reads
   as three separate pictures rather than one number. */
const DGAP = P * 0.15
const MARGIN_X = P * 0.95
const MARGIN_TOP = P * 0.85
/** Deeper than the top: a character hangs further below its head than above. */
const MARGIN_BOTTOM = P * 1.25

const FOUR_WIDTH = Math.round(DW * 3 + DGAP * 2 + MARGIN_X * 2)
const FOUR_HEIGHT = Math.round(DH + MARGIN_TOP + MARGIN_BOTTOM)

const distToSeg = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * The ring of the zero, as a ring of sampled points.
 *
 * The closed-form distance from a point to an ellipse has no elementary
 * solution, and the usual cheap substitute — scaling the radial error by the
 * smaller axis — thins the ring at the top and bottom of a tall ellipse, which
 * is exactly where this one needs to stay solid. Sampling the outline and
 * taking the nearest sample is exact enough and obviously correct.
 */
const ellipseSamples = (cx, cy, rx, ry, n = 360) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]
  })

/** A digit as a list of inside-tests, in its own 0..DW by 0..DH box. */
function digitShape(glyph) {
  if (glyph === '0') {
    const pts = ellipseSamples(DW / 2, DH / 2, P * 2.25, P * 3.4)
    return (x, y) => {
      let best = Infinity
      for (const [ex, ey] of pts) {
        const d = Math.hypot(x - ex, y - ey)
        if (d < best) best = d
      }
      return best <= HW
    }
  }
  // A four: the stem full height, the diagonal down to the crossbar, and the
  // crossbar itself.
  const stem = [DW * 0.72, 0, DW * 0.72, DH]
  const diag = [DW * 0.72, 0, DW * 0.12, DH * 0.66]
  const bar = [DW * 0.12, DH * 0.66, DW * 0.95, DH * 0.66]
  return (x, y) =>
    distToSeg(x, y, ...stem) <= HW ||
    distToSeg(x, y, ...diag) <= HW ||
    distToSeg(x, y, ...bar) <= HW
}

function buildFourOhFour() {
  // The pool. Arms down throughout: a raised arm breaks the silhouette of the
  // stroke it is standing in, and the shape is the whole point here.
  const pool = []
  for (let i = 0; i < POOL_SIZE; i++) {
    const raw = createAvatar(notionists, {
      seed: `404/pool/${i}`,
      backgroundColor: ['transparent'],
      // LIGHT_HEM, unlike the `nobody` strip: a formation is only one or two
      // people deep, so most torso cuts are NOT covered by someone in front.
      // On a light shirt that cut is a hairline; on a black one it is a slab.
      body: LIGHT_HEM,
      gestureProbability: 0,
      bodyIconProbability: 0,
    }).toString()
    const vb = raw.match(/viewBox="([\d.\-\s]+)"/)
    const [, , vw, vh] = vb ? vb[1].trim().split(/\s+/).map(Number) : [0, 0, 100, 100]
    pool.push({ id: `f${i}`, vw, vh, svg: isolate(clean(innerOf(raw)), `f${i}_`) })
  }

  // Hex grid over each digit's box, jittered, filtered by the inside test.
  const slots = []
  const rowH = P * 0.866
  '404'.split('').forEach((glyph, d) => {
    const inside = digitShape(glyph)
    const ox = MARGIN_X + d * (DW + DGAP)
    for (let r = 0; ; r++) {
      const ly = r * rowH
      if (ly > DH) break
      for (let c = 0; ; c++) {
        const lx = c * P + (r % 2 ? P / 2 : 0)
        if (lx > DW) break
        const key = `404/${d}/${r}/${c}`
        const jx = (U(key + 'x') - 0.5) * P * 0.3
        const jy = (U(key + 'y') - 0.5) * rowH * 0.3
        if (!inside(lx + jx, ly + jy)) continue
        slots.push({ key, x: ox + lx + jx, y: MARGIN_TOP + ly + jy })
      }
    }
  })

  // Back to front, so a character in a lower row occludes the one behind it —
  // the same draw order the crowd depends on.
  slots.sort((a, b) => a.y - b.y || a.x - b.x)

  const cast = slots.map((s) => {
    const m = pool[h32(s.key + 'p') % POOL_SIZE]
    const flip = U(s.key + 'm') > 0.5
    const sc = (FIG / m.vh) * (0.94 + U(s.key + 's') * 0.12)
    const k = (sc * m.vh) / 152
    // Mirrored characters need the x translate on the other side of the head,
    // so that both land the head centre on the same point.
    const tx = flip ? s.x + (sc * m.vw) / 2 : s.x - (sc * m.vw) / 2
    return {
      px: Math.round(s.x),
      py: Math.round(s.y - 6 * k),
      pr: Math.round(31 * k),
      use: m.id,
      t:
        `translate(${tx.toFixed(1)} ${(s.y - sc * m.vh * 0.42).toFixed(1)}) ` +
        `scale(${(flip ? -sc : sc).toFixed(4)} ${sc.toFixed(4)})`,
    }
  })

  const defs = pool.map((m) => `<g id="${m.id}">${m.svg}</g>`).join('')
  return { cast, defs, pool }
}

const four = buildFourOhFour()
await writeScene('fourohfour', FOUR_WIDTH, FOUR_HEIGHT, four.cast, four.defs)

const meta = `// GENERATED by scripts/generate-crowd.mjs — do not edit by hand.
// Regenerate with \`npm run crowd\`. Seeded, so output is byte-stable.
//
// The artwork itself lives in public/crowd-light.svg and public/crowd-dark.svg.
// Inlining it put the drawing in the document twice — streamed HTML plus the
// RSC payload — so it is served as a cached file instead and this module holds
// only what the page needs to describe it.
//
// Artwork: Notionists by Zoish, from DiceBear's CC0 collection. Public domain,
// free commercially, no attribution required.

export const CROWD_WIDTH = ${WIDTH}
export const CROWD_HEIGHT = ${HEIGHT}
export const CROWD_COUNT = ${people.length}
`
await writeFile(OUT, meta)

const kb = (cast) => cast.reduce((n, p) => n + (p.svg?.length ?? 0), 0) / 1024
console.log(`
  crowd    ${people.length} people, all different, ${kb(people).toFixed(0)} KB
  404      ${four.cast.length} placements from a pool of ${four.pool.length}
  both served as files — 0 KB in the document
`)
