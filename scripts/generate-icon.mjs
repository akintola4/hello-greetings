/**
 * Build-time generator for the site icon: a waving hand.
 *
 * The mark is not drawn here. It is lifted from the same artwork the closing
 * crowd is made of — **Notionists** by Zoish, CC0 — so the favicon in the tab
 * is literally one of the hands in the picture at the end of the page.
 *
 * `@dicebear/notionists` exports its gesture paths directly, keyed by name, in
 * `#000` and `#fff` only. `waveLongArm` is the open palm on a raised forearm;
 * the tab needs a square, so this crops to the hand and leaves the arm behind.
 *
 * Three things here were measured rather than guessed, each having been wrong
 * on the first attempt:
 *
 * 1. **`hand` is not a hand waving.** Of the ten gestures, the one called
 *    `hand` is a closed fist with the thumb up. The open palm only exists on
 *    `waveLongArm`. Rendering all ten and looking is what settled it.
 * 2. **`getBBox()` is pre-transform.** It reports the bounding box in the
 *    element's own coordinate system, *before* the element's own `transform`
 *    applies. The gesture group carries `translate(0 559)`, so the box has to
 *    be shifted by that or the crop lands on empty paper — which it did.
 * 3. **The crop is judged at 16px, not at 180.** Notionists draws an outlined
 *    palm with separated fingers, and the first question is whether those gaps
 *    survive at tab size. They do, but only because the hand nearly fills the
 *    frame; a looser crop turns to mush.
 *
 *   pnpm run icon
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { gesture } from '../node_modules/@dicebear/notionists/lib/components/gesture.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APP = join(ROOT, 'app')

/** The gesture group's own transform inside the 1744 avatar frame. */
const SHIFT = 559

/**
 * How much of the hand's own width the square is, and how far above the
 * fingertips it starts. Tuned by rendering at 16, 24, 32, 48, 96 and 180 and
 * looking: much looser and the finger gaps close at tab size, much tighter and
 * the fingers clip the edge.
 */
const SIDE = 1.24
const RISE = 0.07

/** The paper and ink of each theme, as `globals.css` defines them. */
const THEMES = {
  light: { paper: 'oklch(0.972 0 0)', ink: 'oklch(0.185 0 0)' },
  dark: { paper: 'oklch(0.168 0 0)', ink: 'oklch(0.94 0 0)' },
}

const PATHS = gesture.waveLongArm({}, {})

const browser = await chromium.launch()

/**
 * Measure the hand in a real renderer rather than parsing path data.
 *
 * The arm runs off the bottom of the frame, so the interesting box is the
 * whole gesture's — the crop takes its width and its top edge and ignores how
 * far down the arm continues.
 */
const probe = await browser.newPage()
await probe.setContent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1744 1744" width="600" height="600">` +
    `<g id="g" transform="translate(0 ${SHIFT})">${PATHS}</g></svg>`,
)
const bb = await probe.evaluate(() => {
  const b = document.getElementById('g').getBBox()
  return { x: b.x, y: b.y, w: b.width, h: b.height }
})
await probe.close()

const side = bb.w * SIDE
const viewBox = [
  (bb.x + bb.w / 2 - side / 2).toFixed(1),
  (bb.y + SHIFT - bb.w * RISE).toFixed(1),
  side.toFixed(1),
  side.toFixed(1),
].join(' ')

/**
 * Compose the mark onto a paper disc, in a normalised 100-unit box.
 *
 * The disc is the icon's own ground. Without it the mark borrows whatever the
 * browser chrome happens to be, which is why this used to carry a
 * `prefers-color-scheme` swap: an ink hand disappears into a dark titlebar, so
 * the whole drawing had to invert, and in dark mode the palm went near-black
 * and read heavy. A paper disc removes the problem rather than working around
 * it — the hand is ink on paper in both chromes, exactly as it is on the page,
 * and the disc is what separates it from whatever sits behind.
 *
 * `INSET` is not taste. A circle's largest inscribed square has a side of
 * 1/sqrt(2) of its diameter, so anything cropped square must sit inside about
 * 71% of the box or its corners get clipped by the disc.
 */
const BOX = 100
const INSET = 14

const hand = (paper, ink) => {
  const [vx, vy, vs] = viewBox.split(' ').map(Number)
  const side = BOX - INSET * 2
  const k = side / vs
  return (
    `<g transform="translate(${(INSET - vx * k).toFixed(3)} ${(INSET - vy * k).toFixed(3)}) scale(${k.toFixed(5)})">` +
    `<g transform="translate(0 ${SHIFT})">${PATHS}</g>`
      .replace(/#fff(?![0-9a-f])/gi, paper)
      .replace(/#000(?![0-9a-f])/gi, ink) +
    `</g>`
  )
}

/**
 * @param disc  true for the disc on transparency (tab and SVG), false for a
 *              full paper square (iOS, which applies its own rounded mask and
 *              would otherwise show bare corners around the circle).
 */
const markup = ({ paper, ink }, { attrs = '', disc = true } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}"${attrs}>` +
  (disc
    ? `<circle cx="${BOX / 2}" cy="${BOX / 2}" r="${BOX / 2}" fill="${paper}"/>`
    : `<rect x="0" y="0" width="${BOX}" height="${BOX}" fill="${paper}"/>`) +
  hand(paper, ink) +
  `</svg>`

/* --------------------------------------------------------------------------
   app/icon.svg — the primary icon for every modern browser.

   One set of colours, not two. The disc carries its own paper, so the mark no
   longer needs to follow the OS theme to stay legible.
-------------------------------------------------------------------------- */
await writeFile(join(APP, 'icon.svg'), markup(THEMES.light))

/* --------------------------------------------------------------------------
   Raster sizes.
-------------------------------------------------------------------------- */
async function png(size, theme, opts = {}) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  })
  // The colour is painted INSIDE the svg and the capture omits the page
  // background. That combination is deliberate: Next's image pipeline rejects
  // an .ico whose PNGs are RGB ("The PNG is not in RGBA format!"), and a
  // screenshot over an opaque page background comes out RGB. Omitting the
  // background keeps the alpha channel — which the disc needs anyway, since
  // the corners outside it must be transparent.
  await page.setContent(
    `<body style="margin:0">` +
      markup(theme, { ...opts, attrs: ` width="${size}" height="${size}"` }) +
      `</body>`,
  )
  const buf = await page.screenshot({ omitBackground: true })
  await page.close()
  return buf
}

// iOS masks the home-screen icon to its own rounded square, so this one is
// a full paper field rather than a disc — a circle inside would leave four
// bare corners inside Apple's mask.
await writeFile(join(APP, 'apple-icon.png'), await png(180, THEMES.light, { disc: false }))

/**
 * favicon.ico, written by hand.
 *
 * The format is small enough not to justify a dependency: a 6-byte directory
 * header, one 16-byte entry per size, then the payloads. Entries may be raw
 * PNG rather than a BMP bitmap — every browser and every Windows since Vista
 * reads that — so the PNGs Chromium just produced go in unmodified.
 *
 * `sharp` would be the obvious alternative and is present in node_modules, but
 * only as an OPTIONAL TRANSITIVE of next. Importing it directly would work
 * today and break the moment that hoist changes.
 */
const ICO_SIZES = [16, 32, 48]
const images = []
for (const s of ICO_SIZES) images.push(await png(s, THEMES.light))

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // 1 = icon
header.writeUInt16LE(images.length, 4)

let offset = 6 + images.length * 16
const entries = images.map((buf, i) => {
  const e = Buffer.alloc(16)
  // 0 means 256; every size here is smaller, so a plain byte is right.
  e.writeUInt8(ICO_SIZES[i] % 256, 0)
  e.writeUInt8(ICO_SIZES[i] % 256, 1)
  e.writeUInt8(0, 2) // palette size — 0 for truecolour
  e.writeUInt8(0, 3) // reserved
  e.writeUInt16LE(1, 4) // colour planes
  e.writeUInt16LE(32, 6) // bits per pixel
  e.writeUInt32LE(buf.length, 8)
  e.writeUInt32LE(offset, 12)
  offset += buf.length
  return e
})

await writeFile(join(APP, 'favicon.ico'), Buffer.concat([header, ...entries, ...images]))
await browser.close()

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log(`
  source   Notionists waveLongArm, cropped to the hand
  bbox     ${bb.w.toFixed(0)}x${bb.h.toFixed(0)} -> viewBox ${viewBox}

  icon.svg         ${kb((await readFile(join(APP, 'icon.svg'))).length)}  (paper disc)
  apple-icon.png   180x180
  favicon.ico      ${ICO_SIZES.join('/')}  ${kb(offset)}
`)
