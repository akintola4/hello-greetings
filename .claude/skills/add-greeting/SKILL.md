---
name: add-greeting
description: Use when adding a language or greeting to this site, correcting an existing entry, or adding support for a new writing system. Triggers on "add a language", "add a greeting", "add <language name>", "fix the entry for", "add a new script".
---

# Adding a greeting to this site

This site shows how people greet each other in many languages. Its argument is
that almost no greeting actually means "hello" — it means peace, health,
victory, or *I see you*. Every entry has to carry one of those.

## Before writing anything: research

Do not write a greeting from memory. Model recall of low-resource languages is
unreliable and confidently wrong, and native speakers read this site.

1. Search for the everyday greeting, its literal meaning, and its etymology.
2. Prefer sources with a named author over content farms. Wiktionary
   etymologies, university language resources, and national broadcasters are
   better than "10 ways to say hello in X".
3. **Distinguish the everyday greeting from the formal one.** This is the most
   common error. Igbo *Kedu* is what people say; *Ndeewo* is respectful and more
   formal. Getting this backwards makes the entry read as a phrasebook.
4. If sources disagree, say so in the note. Disagreement is more interesting
   than a false clean answer.
5. **If you cannot confirm a literal meaning, omit the `literal` field.** Never
   invent an etymology. Tell the user which fields you were unsure about.

## Where things live

| What | File |
|---|---|
| The entries | `content/greetings.ts` |
| Writing systems | `content/scripts.ts` |
| Noto source fonts | `scripts/font-sources.mjs` |
| Font loading | `lib/fonts.ts` |
| Derived counts | `lib/stats.ts` |

## The entry

```ts
{
  id: 'ha-sannu',            // "<iso639>-<romanised>", lowercase kebab-case, unique
  word: 'Sannu',             // native script ONLY — never mixed with transliteration
  romanization: 'sannu',
  ipa: '/ˈsannu/',           // optional; omit rather than guess
  literal: 'gently',         // optional; the single best field on the site
  language: { name: 'Hausa', endonym: 'Harshen Hausa', iso639: 'ha' },
  script: 'latn',            // MUST already exist in content/scripts.ts
  region: 'Northern Nigeria, Niger, and across the Sahel',
  note: '…',                 // 30–95 words, must contain a real specific fact
  etymology: '…',            // one sentence
  accentHue: 118,            // 0–360; pick one not already crowded
  typeScale: 1.08,           // 0.5–1.6; long words go lower, short words higher
  tracking: -0.02,           // optional, em; Latin wants negative, Arabic must be 0
}
```

## Editorial bar

- **`literal` is the argument.** *Sawubona* = "I see you". *Shalom* =
  "wholeness". If it has one, it is the most important thing in the entry.
- **The note needs one true, specific fact** — an etymology, a gesture, a piece
  of script history. Not atmosphere. The validator rejects brochure register
  ("vibrant", "rich culture", "melting pot").
- **A language is not a country.** `region` is free text so it can say "North
  Africa, the Levant, and the Gulf". Never reduce a multi-country language to
  one nation.
- **Never add a flag.** There are none on this site, deliberately: a flag is a
  political object and a language is not.
- **Never hardcode a count.** No string anywhere says how many greetings there
  are; `lib/stats.ts` derives all of it. Adding an entry updates the metadata,
  the intro, the finale headline, and the loading screen automatically.
- **Do not add an `act` field.** Acts are derived from position.

## Run these, in this order

```bash
npm run fonts      # re-subset fonts for the new glyphs — NOT OPTIONAL
npm run validate   # content rules, then the real text shaper
npm run build
```

## Traps

**Forgetting `npm run fonts`.** The site ships a per-script subset containing
only the glyphs actually used (~80 KB for eighteen writing systems). A new word
introduces new glyphs; without re-subsetting it renders as empty boxes. Commit
the changed files in `assets/fonts/`. CI fails if they drift.

**A script that is not registered.** If `script` names an id absent from
`content/scripts.ts`, validation fails. Adding a new writing system means:
`content/scripts.ts` → `scripts/font-sources.mjs` → `lib/fonts.ts`. In
`lib/fonts.ts` each `localFont()` call must sit at module scope with literal
arguments — next/font rejects a helper or a loop.

**Latin is not only ASCII.** Hausa has `ɓ ɗ ƙ`, Igbo has `ọ ụ ị ṅ`, Vietnamese
stacks tone marks. Geist covers only latin + latin-ext, so these fall through to
a Noto Sans fallback subset. The glyph collector sweeps Latin Extended
automatically, but you must still re-run `npm run fonts`.

**`\uXXXX` escapes.** Several entries use them. Any script that reads content as
text must decode them — `scripts/subset-fonts.mjs` and
`scripts/check-glyph-coverage.mjs` both do, for `word` and `endonym`.

## Verify by looking

`npm run dev`, then open the section. Check the word renders in the right script
(not boxes), that a long word has not overflowed, and that it looks optically
the same size as its neighbours — tune `typeScale` if not. For a right-to-left
script, confirm the label bar mirrors.

## Finally

Tell the user which facts you could not verify and where you would want a native
speaker to check. Do not present a researched entry as certain when it is not.
