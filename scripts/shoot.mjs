/**
 * Screenshot harness.
 *
 *   node scripts/shoot.mjs <url> <out.png> [width] [height] [theme] [fullPage]
 *
 * Also reports any console errors and, for the reader route, checks that every
 * hero word actually rendered in its intended family rather than falling back.
 */
import { chromium } from 'playwright'

const [, , url, out, w = '1440', h = '900', theme = 'light', full = 'false'] = process.argv

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 2,
  colorScheme: theme === 'dark' ? 'dark' : 'light',
})

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
if (process.env.ANCHOR) {
  // Jump to the exact section top, then wait for snap to settle — otherwise
  // the shot catches the page mid-tween, halfway between two sections.
  await page.evaluate((a) => {
    const el = document.getElementById(a)
    if (el) window.scrollTo(0, el.offsetTop)
  }, process.env.ANCHOR)
  await page.waitForTimeout(1800)
}
await page.evaluate(() => document.fonts.ready)

// Tofu detection.
//
// Comparing rendered widths does not work: full-width CJK measures identically
// in any CJK font, so it reports false positives. Ask the font-loading API
// directly whether the first family in the element's stack is actually loaded
// and able to render this exact text.
const fallbacks = await page.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('[data-word]')) {
    const text = el.textContent ?? ''
    const first = getComputedStyle(el).fontFamily.split(',')[0].trim()
    if (!document.fonts.check(`500 64px ${first}`, text)) {
      out.push({ id: el.getAttribute('data-word'), text, family: first })
    }
  }
  return out
})

await page.screenshot({ path: out, fullPage: full === 'true' })
await browser.close()

if (fallbacks.length) {
  console.log(`\n  ${fallbacks.length} word(s) may have fallen back to a system font:`)
  for (const f of fallbacks) console.log(`    ${f.id}: "${f.text}"`)
}
if (errors.length) {
  console.log(`\n  ${errors.length} console error(s):`)
  for (const e of [...new Set(errors)].slice(0, 10)) console.log(`    ${e}`)
}
console.log(`\n  wrote ${out} (${w}x${h}, ${theme})\n`)
