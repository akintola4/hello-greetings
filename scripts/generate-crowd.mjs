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
const HEIGHT = 470
const BUDGET_KB = 320

/**
 * Rows, back to front. Each is lower and larger; the row in front overlaps the
 * shoulders of the row behind, which is what makes the depth read.
 */
const ROWS = [
  // Two rows, packed and large. Each Notionists character costs ~12KB of path
  // data, so the count is a real payload decision — and this artwork has far
  // too much detail to spend at thumbnail size.
  { cy: 158, scale: 1.15, pitch: 152 },
  { cy: 348, scale: 1.45, pitch: 152 },
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
      }).toString()

      const vb = raw.match(/viewBox="([\d.\-\s]+)"/)
      const [, , vw, vh] = vb ? vb[1].trim().split(/\s+/).map(Number) : [0, 0, 100, 100]

      const x = step * i - step * 0.6 + (r % 2 ? step * 0.45 : 0) + (U(key + 'x') - 0.5) * step * 0.18
      const y = row.cy + (U(key + 'y') - 0.5) * 22
      const s = (152 * row.scale) / vh

      people.push({
        id: key,
        // These avatars have transparent backgrounds, so without an opaque
        // plate behind each head the crowd shows heads through heads.
        px: Math.round(x),
        py: Math.round(y),
        pr: Math.round(44 * row.scale),
        t: `translate(${(x - (s * vw) / 2).toFixed(1)} ${(y - s * vh * 0.42).toFixed(1)}) scale(${s.toFixed(4)})`,
        svg: isolate(clean(innerOf(raw)), `n${r}x${i}_`),
      })
    }
  })
  return people
}

const people = build()

const body = `// GENERATED by scripts/generate-crowd.mjs — do not edit by hand.
// Regenerate with \`npm run crowd\`. Seeded, so output is byte-stable.
//
// Artwork: Notionists, from DiceBear's CC0 collection. Public domain, free
// commercially, no attribution required. It uses only black and white, so both
// themes are a token swap — #000 becomes --ink and #fff becomes --paper — and
// the line art inverts correctly in dark mode instead of vanishing.

export interface CrowdPerson {
  id: string
  /** Opaque plate behind the head: these avatars are transparent. */
  px: number
  py: number
  pr: number
  /** Baked placement transform. */
  t: string
  /** Inner SVG, ids already namespaced. */
  svg: string
}

export const CROWD_WIDTH = ${WIDTH}
export const CROWD_HEIGHT = ${HEIGHT}

/** In draw order: back row first, so each character occludes the one behind. */
export const CROWD_PEOPLE: CrowdPerson[] = ${JSON.stringify(people)}

export const VIEWBOX_DESKTOP = '0 0 ${WIDTH} ${HEIGHT}'
export const VIEWBOX_MOBILE = '${Math.round(WIDTH * 0.3)} 0 ${Math.round(WIDTH * 0.4)} ${HEIGHT}'
`

await writeFile(OUT, body)

const kb = body.length / 1024
const gz = gzipSync(Buffer.from(body)).length / 1024
console.log(`
  people   ${people.length}
  size     ${kb.toFixed(1)} KB   (${gz.toFixed(1)} KB gzip)   budget ${BUDGET_KB} KB
`)

if (kb > BUDGET_KB) {
  console.error(`  OVER BUDGET by ${(kb - BUDGET_KB).toFixed(1)} KB — reduce the row counts.\n`)
  process.exit(1)
}
