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
const BUDGET_KB = 700

/**
 * Rows, back to front. Each is lower and larger; the row in front overlaps the
 * shoulders of the row behind, which is what makes the depth read.
 */
const ROWS = [
  // Two rows, packed and large. Each Notionists character costs ~12KB of path
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
        // is not saying hello. Notionists ships ten gestures; these are the
        // four that read as a wave, forced on every character.
        // Single-arm wave only. The two-armed variants put every hand in the
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
 * exactly. Any drift would show as a faint disc behind all thirty-nine.
 */
const THEMES = {
  light: { paper: 'oklch(0.972 0.008 85)', ink: 'oklch(0.185 0.012 60)' },
  dark: { paper: 'oklch(0.168 0.008 60)', ink: 'oklch(0.94 0.006 85)' },
}

/** One person: an opaque head plate, then the character on top of it. */
const drawPerson = (p, paper) =>
  `<g><ellipse cx="${p.px}" cy="${p.py}" rx="${p.pr}" ry="${(p.pr * 1.12).toFixed(1)}" fill="${paper}"/>` +
  `<g transform="${p.t}">${p.svg}</g></g>`

/**
 * Write one scene as a pair of files, one per theme.
 *
 * Shared by both scenes rather than copied, because the three subtleties above
 * — id isolation, mask-safe tokenising, one-decimal rounding — are exactly the
 * things a second generator would get wrong, and the `oklch()` values are
 * already duplicated from globals.css once and must not be duplicated again.
 */
async function writeScene(name, width, height, cast) {
  for (const [themeName, theme] of Object.entries(THEMES)) {
    const file = (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
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
   The second scene: nobody.

   For the 404. The site's argument is that wherever you go, someone greets
   you — forty-five people wave at you on the last screen. This is the one page
   where nobody does: the same characters, standing with their arms down, one
   of them on their phone.

   The joke is structural, which is what lets the copy on that page stay to one
   dry line.

   Notionists has no "looking away" and no shrug — every face is drawn
   front-on, and none of the five `eyes` variants turns the head. So the
   reading has to come from posture and from the phone, not from gaze.
-------------------------------------------------------------------------- */
const NOBODY_WIDTH = 1000
const NOBODY_HEIGHT = 235
/** Nominal character height: about twice the crowd's front row. */
const NOBODY_SIZE = 300
const NOBODY_PITCH = 190
const NOBODY_COUNT = 5
/**
 * Baseline. Chosen so every torso runs off the bottom edge — the same reason
 * the crowd's front row can wear a solid black shirt and its back rows cannot:
 * each character is cut flat at the bottom of its own frame, and a cut that
 * lands in open paper reads as a slab hanging in mid-air. Here all five cuts
 * sit at the same height, so one number settles it.
 *
 * Measured, not derived. The obvious arithmetic — baseline plus 58% of the
 * nominal height — puts the cut about 45 units lower than it actually lands,
 * because `clean()` lifts each character's `viewboxMask` and the body then
 * ends where it was drawn rather than where the frame was. The first attempt
 * used the arithmetic and left a band of paper under every torso.
 */
const NOBODY_BASE = 130
/** Which one is on their phone. Middle, so it survives a mobile crop. */
const PHONE_AT = 2

function buildNobody() {
  const cast = []
  const k = NOBODY_SIZE / 152 // the crowd's plate sizes are relative to 152

  for (let i = 0; i < NOBODY_COUNT; i++) {
    const key = `nobody/${i}`
    const raw = createAvatar(notionists, {
      seed: key,
      backgroundColor: ['transparent'],
      // Per character, not a probability roll: which one is on their phone is
      // the whole gag, so it is chosen rather than left to the seed.
      ...(i === PHONE_AT
        ? { gesture: ['handPhone'], gestureProbability: 100 }
        : { gestureProbability: 0 }),
      bodyIconProbability: 0,
      // No LIGHT_HEM restriction here: every cut is off-canvas, so solid black
      // shirts are safe and the group keeps some tonal variety.
    }).toString()

    const vb = raw.match(/viewBox="([\d.\-\s]+)"/)
    const [, , vw, vh] = vb ? vb[1].trim().split(/\s+/).map(Number) : [0, 0, 100, 100]

    const x = (i - (NOBODY_COUNT - 1) / 2) * NOBODY_PITCH + NOBODY_WIDTH / 2
    const y = NOBODY_BASE + (U(key + 'y') - 0.5) * 18
    const sc = NOBODY_SIZE / vh

    cast.push({
      px: Math.round(x),
      py: Math.round(y - 6 * k),
      pr: Math.round(31 * k),
      t: `translate(${(x - (sc * vw) / 2).toFixed(1)} ${(y - sc * vh * 0.42).toFixed(1)}) scale(${sc.toFixed(4)})`,
      svg: isolate(clean(innerOf(raw)), `b${i}_`),
    })
  }
  return cast
}

const nobody = buildNobody()
await writeScene('nobody', NOBODY_WIDTH, NOBODY_HEIGHT, nobody)

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

const kb = (cast) => cast.reduce((n, p) => n + p.svg.length, 0) / 1024
console.log(`
  crowd    ${people.length} people, ${kb(people).toFixed(0)} KB
  nobody   ${nobody.length} people, ${kb(nobody).toFixed(0)} KB
  both served as files — 0 KB in the document
`)
