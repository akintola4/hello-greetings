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
 *   npm run icon
 */
import { writeFile } from 'node:fs/promises'
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
  light: { paper: 'oklch(0.972 0.008 85)', ink: 'oklch(0.185 0.012 60)' },
  dark: { paper: 'oklch(0.168 0.008 60)', ink: 'oklch(0.94 0.006 85)' },
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
 * The mark, at a given size, in one theme's colours.
 *
 * Notionists fills the palm `#fff` and outlines it `#000`, so the same
 * substitution the crowd generator makes works here: white becomes paper,
 * black becomes ink. In dark mode that inverts the drawing properly instead of
 * leaving an ink-coloured hand invisible against dark browser chrome.
 */
const body = (paper, ink) =>
  `<g transform="translate(0 ${SHIFT})">${PATHS}</g>`
    .replace(/#fff(?![0-9a-f])/gi, paper)
    .replace(/#000(?![0-9a-f])/gi, ink)

const markup = ({ paper, ink }, attrs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${attrs}>${body(paper, ink)}</svg>`

/* --------------------------------------------------------------------------
   app/icon.svg — the primary icon for every modern browser.

   Theme-aware from the inside. A favicon is painted onto the browser's own
   chrome, which follows the OS theme and not the page, so an ink-coloured
   hand vanishes in a dark titlebar. `prefers-color-scheme` inside the file is
   the only hook available — the page's `.dark` class cannot reach here.
-------------------------------------------------------------------------- */
// Custom properties rather than classes. Notionists sets some fills on a
// parent `<g>` and some on the path, and a class selector only reaches the
// element it is on — `fill="var(--p)"` works at either level because the
// property cascades.
const themed =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">` +
  `<style>` +
  `svg{--p:${THEMES.light.paper};--i:${THEMES.light.ink}}` +
  `@media(prefers-color-scheme:dark){svg{--p:${THEMES.dark.paper};--i:${THEMES.dark.ink}}}` +
  `</style>` +
  body('var(--p)', 'var(--i)') +
  `</svg>`

await writeFile(join(APP, 'icon.svg'), themed)

/* --------------------------------------------------------------------------
   Raster sizes.

   Rendered on solid paper rather than transparent: iOS composites a
   transparent home-screen icon onto black, and a `.ico` with an alpha channel
   is the one thing old Windows shells reliably get wrong.
-------------------------------------------------------------------------- */
async function png(size, theme) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  })
  // The paper is a rect INSIDE the svg, and the capture omits the page
  // background. That combination is deliberate: Next's image pipeline rejects
  // an .ico whose PNGs are RGB ("The PNG is not in RGBA format!"), and a
  // screenshot over an opaque page background comes out RGB. Omitting the
  // background keeps the alpha channel; painting the paper inside the artwork
  // keeps every pixel opaque anyway.
  await page.setContent(
    `<body style="margin:0">` +
      markup(theme, ` width="${size}" height="${size}"`).replace(
        '>',
        `><rect x="0" y="0" width="100%" height="100%" fill="${theme.paper}"/>`,
      ) +
      `</body>`,
  )
  const buf = await page.screenshot({ omitBackground: true })
  await page.close()
  return buf
}

await writeFile(join(APP, 'apple-icon.png'), await png(180, THEMES.light))

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

  icon.svg         ${kb(themed.length)}  (theme-aware)
  apple-icon.png   180x180
  favicon.ico      ${ICO_SIZES.join('/')}  ${kb(offset)}
`)
