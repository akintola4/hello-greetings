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

/**
 * Where each row's torso is cut off, and where to start fading it out.
 *
 * Every Notionists character ends flat at the bottom of its own viewBox — the
 * body is drawn to be cropped into a circle, not to stand in a crowd. Packed
 * into rows, that flat edge shows wherever no head in front happens to cover
 * it, and on the dark-shirted characters it reads as a black slab hanging in
 * mid-air. It is the single most obviously wrong thing in the drawing.
 *
 * Packing cannot fix it. The cut is exposed in the vertical band BETWEEN the
 * heads of the row in front — above their shoulders, beside their heads — and
 * closing that band needs heads packed edge to edge, which nearly doubles the
 * character count.
 *
 * So the cut is faded instead: each back row dissolves over the last stretch of
 * its torso. That reads as depth rather than as damage, and it costs one
 * gradient per row. The front row needs none — its cut is off-canvas already.
 */
const rowFade = (row) => {
  const cut = row.cy + 152 * row.scale * 0.58
  return { from: Math.round(cut - 34 * row.scale), to: Math.round(cut) }
}

const svgFor = ({ paper, ink }) => {
  const fades = ROWS.map((row, r) => {
    const { from, to } = rowFade(row)
    // Off-canvas cuts need no fade, and fading one would eat a torso that is
    // simply running off the bottom edge as intended.
    if (to >= HEIGHT) return ''
    return (
      `<linearGradient id="fg${r}" gradientUnits="userSpaceOnUse" x1="0" y1="${from}" x2="0" y2="${to}">` +
      `<stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
      `<mask id="fm${r}" maskUnits="userSpaceOnUse" x="0" y="0" width="${WIDTH}" height="${HEIGHT}">` +
      `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#fg${r})"/></mask>`
    )
  })

  const rows = ROWS.map((row, r) => {
    const body = people
      .filter((p) => p.row === r)
      .map(
        (p) =>
          `<g><ellipse cx="${p.px}" cy="${p.py}" rx="${p.pr}" ry="${(p.pr * 1.12).toFixed(1)}" fill="${paper}"/>` +
          `<g transform="${p.t}">${p.svg}</g></g>`,
      )
      .join('')
    // Masking the row as a whole, not each person: a per-person mask would fade
    // each character against its own neighbours inside the row, and the row
    // would stop being one plane.
    return fades[r] ? `<g mask="url(#fm${r})">${body}</g>` : body
  }).join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">` +
    `<defs>${fades.join('')}</defs>` +
    `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${paper}"/>` +
    rows +
    `</svg>`
  )
}

for (const [name, theme] of Object.entries(THEMES)) {
  const file = svgFor(theme)
    .replace(/var\(--paper\)/g, theme.paper)
    .replace(/var\(--ink\)/g, theme.ink)
  await writeFile(join(ROOT, 'public', `crowd-${name}.svg`), file)
  const gz = gzipSync(Buffer.from(file)).length / 1024
  console.log(`  crowd-${name}.svg  ${(file.length / 1024).toFixed(0)} KB  (${gz.toFixed(0)} KB gzip)`)
}

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

const total = people.reduce((n, p) => n + p.svg.length, 0) / 1024
console.log(`
  people   ${people.length}
  artwork  ${total.toFixed(0)} KB, served as a file — 0 KB in the document
`)
