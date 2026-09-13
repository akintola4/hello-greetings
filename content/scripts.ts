/**
 * The script registry.
 *
 * ~17 non-Latin writing systems are reused across 30 greetings, so `dir`,
 * `lang` and the font variable live here rather than on each greeting.
 * Putting them on the greeting would mean 30 chances to typo dir="rtl".
 */

export type ScriptId =
  | 'latn'
  | 'jpan'
  | 'hans'
  | 'hang'
  | 'arab'
  | 'hebr'
  | 'deva'
  | 'beng'
  | 'taml'
  | 'thai'
  | 'khmr'
  | 'cyrl'
  | 'grek'
  | 'geor'
  | 'armn'
  | 'ethi'
  | 'tibt'
  | 'cans'

export interface ScriptDef {
  id: ScriptId
  /** Human name, used in the colophon and the reader route. */
  name: string
  /** CSS custom property holding the font family. */
  fontVar: string
  /** Drives the dir attribute, the mask-wipe direction, and label-bar mirroring. */
  dir: 'ltr' | 'rtl'
  /** Google Fonts family name — consumed by scripts/subset-fonts.mjs. */
  notoFamily: string | null
}

export const SCRIPTS: Record<ScriptId, ScriptDef> = {
  latn: { id: 'latn', name: 'Latin', fontVar: '--font-geist', dir: 'ltr', notoFamily: null },
  jpan: { id: 'jpan', name: 'Japanese', fontVar: '--font-noto-jpan', dir: 'ltr', notoFamily: 'Noto Sans JP' },
  hans: { id: 'hans', name: 'Han (Simplified)', fontVar: '--font-noto-hans', dir: 'ltr', notoFamily: 'Noto Sans SC' },
  hang: { id: 'hang', name: 'Hangul', fontVar: '--font-noto-hang', dir: 'ltr', notoFamily: 'Noto Sans KR' },
  arab: { id: 'arab', name: 'Arabic', fontVar: '--font-noto-arab', dir: 'rtl', notoFamily: 'Noto Naskh Arabic' },
  hebr: { id: 'hebr', name: 'Hebrew', fontVar: '--font-noto-hebr', dir: 'rtl', notoFamily: 'Noto Sans Hebrew' },
  deva: { id: 'deva', name: 'Devanagari', fontVar: '--font-noto-deva', dir: 'ltr', notoFamily: 'Noto Sans Devanagari' },
  beng: { id: 'beng', name: 'Bengali', fontVar: '--font-noto-beng', dir: 'ltr', notoFamily: 'Noto Sans Bengali' },
  taml: { id: 'taml', name: 'Tamil', fontVar: '--font-noto-taml', dir: 'ltr', notoFamily: 'Noto Sans Tamil' },
  thai: { id: 'thai', name: 'Thai', fontVar: '--font-noto-thai', dir: 'ltr', notoFamily: 'Noto Sans Thai' },
  khmr: { id: 'khmr', name: 'Khmer', fontVar: '--font-noto-khmr', dir: 'ltr', notoFamily: 'Noto Sans Khmer' },
  cyrl: { id: 'cyrl', name: 'Cyrillic', fontVar: '--font-noto-cyrl', dir: 'ltr', notoFamily: 'Noto Sans' },
  grek: { id: 'grek', name: 'Greek', fontVar: '--font-noto-grek', dir: 'ltr', notoFamily: 'Noto Sans' },
  geor: { id: 'geor', name: 'Georgian', fontVar: '--font-noto-geor', dir: 'ltr', notoFamily: 'Noto Sans Georgian' },
  armn: { id: 'armn', name: 'Armenian', fontVar: '--font-noto-armn', dir: 'ltr', notoFamily: 'Noto Sans Armenian' },
  ethi: { id: 'ethi', name: 'Ethiopic', fontVar: '--font-noto-ethi', dir: 'ltr', notoFamily: 'Noto Sans Ethiopic' },
  tibt: { id: 'tibt', name: 'Tibetan', fontVar: '--font-noto-tibt', dir: 'ltr', notoFamily: 'Noto Serif Tibetan' },
  cans: { id: 'cans', name: 'Canadian Aboriginal Syllabics', fontVar: '--font-noto-cans', dir: 'ltr', notoFamily: 'Noto Sans Canadian Aboriginal' },
}

export const SCRIPT_IDS = Object.keys(SCRIPTS) as ScriptId[]
