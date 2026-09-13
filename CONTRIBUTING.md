# Adding a language

This site exists because almost no greeting on earth actually means "hello". It
means peace, or health, or victory, or *I see you*. Every entry has to earn its
place by carrying one of those.

Your language is welcome here. Here is how to add it.

---

## 1. Add the entry

Everything lives in one file: **`content/greetings.ts`**. Add an object to the
`GREETINGS` array.

```ts
{
  id: 'ha-sannu',            // "<iso639>-<romanised word>", lowercase kebab-case
  word: 'Sannu',             // the artwork. Native script only, no transliteration mixed in
  romanization: 'sannu',
  ipa: '/ˈsannu/',           // optional — leave it out rather than guessing
  literal: 'gently',         // optional, but this is the best field on the site. See below
  language: {
    name: 'Hausa',           // the English exonym, for an English-reading visitor
    endonym: 'Harshen Hausa',// what speakers call it themselves
    iso639: 'ha',
  },
  script: 'latn',            // must already exist in content/scripts.ts
  region: 'Northern Nigeria, Niger, and across the Sahel',
  note: '…',                 // 30–95 words. The reason the site exists
  etymology: '…',            // one sentence
  typeScale: 1.08,           // 0.5–1.6. Optical size nudge on top of the measured fit
  tracking: -0.02,           // optional, em. Latin wants negative at display size
}
```

Do not add an `act` field, a count, or a flag — see *House rules* below.

## 2. If your language uses a script the site does not have yet

Add it to **`content/scripts.ts`** first (id, name, font variable, direction),
then add a matching Noto family to **`scripts/font-sources.mjs`**, then wire the
font in **`lib/fonts.ts`**. `next/font` requires each loader call to sit at
module scope with literal arguments, so it cannot be generated in a loop.

## 3. Run these three commands

```bash
npm run fonts      # re-subset the fonts for your new glyphs
npm run validate   # content rules + real glyph shaping
npm run dev        # look at it
```

**`npm run fonts` is not optional.** The site ships a tiny custom subset of each
font containing only the glyphs actually used — around 80 KB for eighteen
writing systems, against tens of megabytes for the full families. If you skip
it, your word renders as empty boxes. Commit the changed files in
`assets/fonts/`; CI fails if they are out of date.

---

## House rules

**The `literal` field is the whole argument.** *Namaste* is "I bow to you".
*Sawubona* is "I see you". *Shalom* is "wholeness". *Merhaba* comes from a word
meaning a wide, open space — there is room for you here. If your greeting has a
literal meaning, that is the most important thing you will write. If it
genuinely resists translation, leave the field out; do not invent one.

**The note is 30–95 words and must contain a real fact.** Something true and
specific: an etymology, a gesture, a piece of history, a thing about the script.
"A warm and vibrant greeting reflecting the rich culture of…" is not a fact, and
the validator will flag that register.

**A language is not a country.** `region` is free text precisely so it can say
"North Africa, the Levant, and the Gulf" or "The East African coast". Arabic is
not Saudi Arabia. Spanish is not Spain.

**There are no flags on this site, deliberately.** A flag is a political object;
a language is not. One flag per language would misrepresent most of the list,
and the label bar sets place in type instead — like a museum specimen label,
which carries an accession number rather than a flag.

**Every entry needs a `source`, and it is checked.** One `https://` URL that
backs up the word, the literal gloss and the etymology. `npm run validate`
rejects an entry without one; `npm run links` tells you whether it still
resolves.

This is not bureaucracy. The first thirty-six entries were written from memory
in a confident voice, and an independent fact-check found errors in eighteen of
them — folk etymologies presented as fact in `literal`, a speaker count off by
a factor of two and a half, a headword whose spelling traced only to listicles.
Prefer an academic or governmental language resource, then a dictionary written
by speakers of the language, then Wiktionary. A travel blog is not a source.

If you cannot find one, say so in the pull request rather than citing something
that merely looks authoritative — a plausible URL that 404s is worse than no
URL, because it makes an unchecked claim look checked.

**Never hardcode a count.** "Thirty-six greetings" appears nowhere in the source.
Everything derives from the data in `lib/stats.ts`. Adding your entry updates
the page title, the intro, the finale headline, and the loading screen by
itself.

**The closing artwork is Notionists by Zoish, CC0.** Don't hand-edit
`crowd-data.ts` or `public/crowd-*.svg` — all three are generated. `npm run
crowd` rebuilds them, and CI fails if the committed files are stale. Three traps
live in that generator, all commented: colours are mapped to theme tokens
everywhere *except* inside `<mask>` elements; coordinates are rounded to one
decimal but never to integers; and the back rows may only use the body variants
whose bottom edge is light, because every character is cut flat at the bottom of
its own frame and on a black shirt that cut reads as a slab in mid-air.

**Three generated files are NOT checked by CI**, unlike the fonts and the
crowd: `app/opengraph-image.png` (`npm run og`), the icons (`npm run icon`) and
`lib/audio/envelope.ts` (`npm run envelope`). The first two are PNGs, and
Chromium changes antialiasing and PNG encoding between versions, so a byte diff
would fail on an unrelated browser bump rather than on a real change; the third
needs ffmpeg, which is not on the CI image. Re-run them by hand when the thing
they are made from changes, and commit the result.

---

## What review looks for

Automation checks shape, not truth. It cannot tell whether your greeting is
right — that needs a human who speaks the language, which is usually you.

So in your pull request, please say: **who you are to this language.** Speaker,
learner, linguist, someone's grandchild. And name a source if the etymology is
contested. If two speakers disagree about the most natural everyday greeting,
that disagreement is worth a sentence in the note — it is more interesting than
picking a winner.

Corrections to existing entries are as welcome as new ones. Several were written
by someone who does not speak the language, and they will contain errors.
