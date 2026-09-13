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
  accentHue: 118,            // 0–360. Only the hue varies; lightness and chroma are locked
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

**Never hardcode a count.** "Thirty-six greetings" appears nowhere in the source.
Everything derives from the data in `lib/stats.ts`. Adding your entry updates
the page title, the intro, the finale headline, and the loading screen by
itself.

**Every face in the closing crowd is filled with the paper colour.** There is no
per-person tonal value in that drawing at all — faces are the paper the drawing
sits on, and the only things carrying tone are hair, clothing and hats, assigned
by hash with no correlation to anything else. So skin tone is not depicted by
construction rather than by convention: there is nothing to rank. The same fill
is also what makes sixty-eight overlapping heads legible — it is the occluder.

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
