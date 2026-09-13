import { GREETINGS } from '@/content/greetings'
import { SCRIPTS, type ScriptId } from '@/content/scripts'

/**
 * Every number the site says out loud, derived from the content.
 *
 * This file exists because the repo is open to contributions. Counts used to be
 * written by hand in four separate places — the page metadata, the intro, the
 * finale headline and the loading screen — and a contributor adding a language
 * would have had to remember all four. They would not have. Now adding an entry
 * updates every number on the site.
 */

export const TOTAL = GREETINGS.length

/** Distinct writing systems actually in use, not the size of the registry. */
export const SCRIPT_COUNT = new Set(GREETINGS.map((g) => g.script)).size

export const SCRIPTS_USED: ScriptId[] = Array.from(
  new Set(GREETINGS.map((g) => g.script)),
)

/** Acts are derived from position, so contributors never pick one. */
export const ACT_COUNT = 3
export const ACT_SIZE = Math.ceil(TOTAL / ACT_COUNT)
export const actOf = (index: number) => Math.min(ACT_COUNT, Math.floor(index / ACT_SIZE) + 1)

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty',
  'ninety',
]

/**
 * Spell a number out for prose, so the copy reads as writing rather than as a
 * template. Falls back to digits above 99, where spelling it out stops helping.
 */
export function spellOut(n: number): string {
  if (n < 0 || !Number.isInteger(n)) return String(n)
  if (n < 20) return ONES[n]
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)]
    const o = n % 10
    return o ? `${t}-${ONES[o]}` : t
  }
  return String(n)
}

export const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Thirty-six" — the form the finale headline and the metadata want. */
export const TOTAL_WORD = capitalise(spellOut(TOTAL))
export const SCRIPT_COUNT_WORD = spellOut(SCRIPT_COUNT)

/** Guard against the registry drifting away from what the content uses. */
export const UNKNOWN_SCRIPTS = SCRIPTS_USED.filter((id) => !SCRIPTS[id])
