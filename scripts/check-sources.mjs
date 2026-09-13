/**
 * Check that every greeting's `source` is a URL that actually resolves.
 *
 * This exists because of a specific failure. The site's cultural notes and
 * etymologies were originally written from memory in an authoritative voice,
 * and an independent fact-check found errors in eighteen of thirty-six
 * entries — several of them folk etymologies stated as fact in the `literal`
 * field, which is the one field the site defines as what the word actually
 * says. A citation per entry is the structural fix: a claim with a source
 * behind it can be checked by the next person.
 *
 * A link checker is the smaller, dumber half of that. It cannot tell you the
 * source supports the claim — only a reader can — but it does catch the two
 * failures that need no judgement: a citation invented wholesale, and one that
 * has rotted. While writing the field I proposed a Wiktionary page for the
 * Wolof entry that sounded entirely plausible and returned 404.
 *
 * NOT wired into `prebuild` or CI. It talks to the open internet, so it fails
 * on a flaky connection, on rate limits, and on sites that block anything
 * without a browser — none of which are the contributor's fault or a reason
 * to reject a pull request. Run it by hand.
 *
 *   npm run links
 */
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TIMEOUT_MS = 25_000

const text = await readFile(join(ROOT, 'content', 'greetings.ts'), 'utf8')

// The file is read as text rather than imported, for the same reason the font
// subsetter reads it as text: this has to run in plain Node with no TypeScript
// toolchain in the way.
const entries = text
  .split(/\n {2}\{\n/)
  .slice(1)
  .map((block) => ({
    id: block.match(/^ {4}id: '([^']+)'/m)?.[1],
    source: block.match(/^ {4}source: '([^']+)'/m)?.[1],
  }))
  .filter((e) => e.id)

const missing = entries.filter((e) => !e.source)
if (missing.length) {
  console.error(`\n  ${missing.length} entries have no source:`)
  for (const e of missing) console.error(`    ${e.id}`)
  console.error('')
  process.exit(1)
}

/** Percent-encode the path so non-Latin citations survive the request. */
function normalise(url) {
  const u = new URL(url)
  u.pathname = encodeURI(decodeURI(u.pathname))
  return u.toString()
}

async function attempt({ id, source }) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(normalise(source), {
      redirect: 'follow',
      signal: ac.signal,
      // Some hosts refuse HEAD, and some refuse anything without a UA.
      headers: { 'user-agent': 'Mozilla/5.0 (+hello-greetings link check)' },
    })
    return { id, source, status: res.status }
  } catch (e) {
    return { id, source, status: e.name === 'AbortError' ? 'timeout' : 'unreachable' }
  } finally {
    clearTimeout(timer)
  }
}

/** One retry: a connection that fails once often succeeds a second later. */
async function check(entry) {
  const first = await attempt(entry)
  if (typeof first.status === 'number') return first
  await new Promise((r) => setTimeout(r, 1200))
  return attempt(entry)
}

const results = []
// Six at a time: enough to finish quickly, few enough not to look like a
// scraper to any one host.
for (let i = 0; i < entries.length; i += 6) {
  results.push(...(await Promise.all(entries.slice(i, i + 6).map(check))))
}

const ok = results.filter((r) => r.status >= 200 && r.status < 400)
// Only a server saying so proves a link is dead. 403 and 429 usually mean the
// host blocks anything without a browser; a timeout usually means the network.
// Neither is the contributor's fault, and failing on them would train people to
// ignore this script — which is how a real 404 gets waved through.
const blocked = results.filter((r) => r.status === 403 || r.status === 429)
const unreachable = results.filter((r) => typeof r.status !== 'number')
const dead = results.filter(
  (r) => typeof r.status === 'number' && !ok.includes(r) && !blocked.includes(r),
)

for (const r of dead) console.log(`  DEAD         ${String(r.status).padEnd(12)} ${r.id}  ${r.source}`)
for (const r of blocked) console.log(`  BLOCKED      ${String(r.status).padEnd(12)} ${r.id}  ${r.source}`)
for (const r of unreachable) console.log(`  UNREACHABLE  ${String(r.status).padEnd(12)} ${r.id}  ${r.source}`)

const notes = [
  blocked.length && `${blocked.length} blocked the checker`,
  unreachable.length && `${unreachable.length} could not be reached`,
].filter(Boolean)
console.log(`
  ${ok.length}/${results.length} sources resolve${notes.length ? ` (${notes.join(', ')})` : ''}
`)

// Dead only. Blocked and unreachable are reported for a human to glance at.
if (dead.length) process.exit(1)
