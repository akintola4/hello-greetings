/**
 * Build-time generator for the Open Graph share card.
 *
 * Screenshots `/preview/og` and writes `app/opengraph-image.png`, which Next
 * picks up by file convention — it emits `og:image` plus the width, height and
 * type on its own, and reuses the same file for Twitter when no
 * `twitter-image` exists.
 *
 * **Why a browser and not `next/og`.** Satori, which backs `ImageResponse`,
 * cannot render this site. It has no `oklch()` support and every colour token
 * in `globals.css` is `oklch()`; it needs TTF/OTF/WOFF and all eighteen script
 * faces ship as WOFF2; and there is no Geist binary in this repo at all, since
 * Geist comes from `next/font/google` as CSS. Chromium has all three natively,
 * and Playwright is already a devDependency here.
 *
 * NOT wired into `prebuild`, and deliberately not diff-guarded in CI, unlike
 * the crowd and the font subsets. Those are deterministic text. A PNG is not:
 * Chromium changes text antialiasing and PNG encoding between versions, so a
 * byte comparison would fail on an unrelated browser bump — noise rather than
 * signal. CI also does not install Playwright browsers. Same footing as
 * `scripts/generate-audio-envelope.mjs`: generated, committed, run by hand.
 *
 *   npm run build && npm run og
 */
import { spawn } from 'node:child_process'
import { access, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'app', 'opengraph-image.png')

/** The OG standard. Every platform crops this predictably. */
const WIDTH = 1200
const HEIGHT = 630
/** 2 for a retina-sharp card; dropped to 1 automatically if that busts budget. */
const SCALE = 2
const BUDGET_KB = 1024

try {
  await access(join(ROOT, '.next'))
} catch {
  console.error('\n  No .next build found. Run `npm run build` first.\n')
  process.exit(1)
}

/** Ask the OS for a free port rather than hoping one is free. */
const port = await new Promise((resolve, reject) => {
  const s = createServer()
  s.once('error', reject)
  s.listen(0, () => {
    const { port } = s.address()
    s.close(() => resolve(port))
  })
})

const server = spawn('npx', ['next', 'start', '-p', String(port)], {
  cwd: ROOT,
  stdio: 'ignore',
})
// Never leave a server behind, however this exits.
const stop = () => {
  if (!server.killed) server.kill()
}
process.on('exit', stop)
process.on('SIGINT', () => {
  stop()
  process.exit(130)
})

const base = `http://127.0.0.1:${port}`
const ready = await (async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${base}/preview/og`)
      if (r.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
})()

if (!ready) {
  stop()
  console.error(`\n  next start never came up on ${base}.\n`)
  process.exit(1)
}

async function shoot(scale) {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: scale,
    // The card ships light. The platform picks the surface the card sits on,
    // not the card, so there is no theme to follow here.
    colorScheme: 'light',
  })

  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto(`${base}/preview/og`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  // The crowd is a background-image, which `document.fonts.ready` says nothing
  // about. Wait for it to actually decode or the card ships as bare paper.
  await page.waitForFunction(
    () =>
      new Promise((done) => {
        const el = document.querySelector('.crowd-art')
        if (!el) return done(false)
        const url = getComputedStyle(el).backgroundImage.match(/url\("(.+?)"\)/)?.[1]
        if (!url) return done(false)
        const img = new Image()
        img.onload = () => done(true)
        img.onerror = () => done(false)
        img.src = url
      }),
    null,
    { timeout: 20000 },
  )

  const card = page.locator('[data-og-card]')
  const buf = await card.screenshot({ type: 'png' })
  await browser.close()
  return { buf, errors }
}

let { buf, errors } = await shoot(SCALE)
let scale = SCALE

if (buf.length / 1024 > BUDGET_KB) {
  console.log(`  ${(buf.length / 1024).toFixed(0)} KB at ${SCALE}x — over budget, retrying at 1x`)
  ;({ buf, errors } = await shoot(1))
  scale = 1
}

await writeFile(OUT, buf)
stop()

const { size } = await stat(OUT)
if (errors.length) {
  console.log(`\n  ${errors.length} console error(s) while rendering:`)
  for (const e of [...new Set(errors)].slice(0, 5)) console.log(`    ${e}`)
}
console.log(`
  opengraph-image.png  ${WIDTH * scale}x${HEIGHT * scale}  ${(size / 1024).toFixed(0)} KB  (budget ${BUDGET_KB} KB)
`)
