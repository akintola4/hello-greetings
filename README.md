# Hello

Almost none of these words mean "hello". They mean peace, health, victory,
breath — or simply: *I see you*.

A scroll-driven piece about how humans greet each other, and what each greeting
literally says. Thirty-six languages, eighteen writing systems.

**[Add your language →](CONTRIBUTING.md)**

---

## Running it

```bash
npm install
npm run fonts     # build the font subsets — needs network, once
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | The site at `localhost:3000` |
| `npm run fonts` | Re-subset the fonts after changing content |
| `npm run crowd` | Regenerate the closing artwork |
| `npm run validate` | Content rules, then the real text shaper |
| `npm run build` | Production build — runs `validate` first |

There is a plain-text version of everything at **`/index`** — no scrolling, no
animation, no sound, and no client JavaScript. It is the accessibility floor for
a site that is otherwise quite demanding, and it makes the content indexable.

## What's in it

- **36 greetings**, each with what the word *literally* says, a note on the
  custom, and an etymology.
- Every word links out to a web search for itself.
- Snap scrolling with a navigation rail that swells around your position;
  hovering a mark shows that greeting in its own script.
- An entry sequence that riffles through every greeting while the fonts load.
- Custom light and dark modes, both first-class, with a circular
  View Transitions wipe on the toggle.
- An ambient score, which starts on your first interaction and can be turned off.
- A closing doodle crowd — 67 small hand-drawn figures, every one different,
  holding hands in rows that run off both edges of the frame. Every greeting is
  listed beneath it as an index back into the site.

## How it is built

Next.js App Router, React 19, Tailwind v4 (CSS-first, no config file), GSAP +
ScrollTrigger, Lenis. Type is Geist and Geist Mono.

A few decisions worth knowing before changing things:

**Fonts are subset at build time.** Eighteen writing systems in about 80 KB,
against tens of megabytes for the full Noto families — possible only because
each greeting displays exactly one word, so the glyph set is closed and known at
build time. `scripts/check-glyph-coverage.mjs` runs the real text shaper in CI,
so tofu, broken Arabic joining and dropped Devanagari conjuncts fail the build
rather than reaching production.

**Words are measured, not clamped.** At the same font size `Hi` is about 1.1em
wide and `Здравствуйте` is about 6.8em. A single `clamp()` that fits the long
one makes the short one look like a typo, so `lib/type/fit-word.ts` measures
each word and fits it to the frame. The word sits in a fixed-height stage, so
CLS is zero by construction rather than by mitigation.

**No per-character text animation, ever.** Splitting a string into one span per
character destroys Arabic cursive joining — each span shapes in isolation, so
every letter renders in its isolated form — and separates Devanagari consonants
from their vowel signs. That breaks six of the site's writing systems. One
reveal, a travelling gradient mask on a registered `@property`, serves all of
them.

**Sections are `100svh`, never `100dvh`.** `dvh` changes continuously as a
mobile address bar collapses, which resizes every section mid-scroll and drags
the snap targets out from under your thumb.

**One ScrollTrigger, not thirty-eight.** A single trigger handles snap, with one
IntersectionObserver for the active section. Nothing is pinned: holding the page
hostage for two viewports to watch a picture assemble itself asks more of the
reader than the picture gives back, and the pin's spacer — which carries a hard
pixel width measured before the scrollbar exists — was also what forced a
horizontal scrollbar. Per-frame work goes through refs and the GSAP ticker;
nothing calls `setState` in a rAF or a mousemove handler.

**The closing artwork is generated at build time, not in the browser.**
`scripts/generate-crowd.mjs` runs Rough.js through `generator()` + `toPaths()`,
which need no DOM, and commits the result — so the browser never loads a drawing
library and the output is byte-stable between runs. Every drawable is seeded;
the script traps `Math.random` so a missing seed fails the build instead of
silently churning the committed file.

**And it never enters the client bundle.** The finale is a client component, so
importing the artwork directly would ship ~130 KB of path data twice — once in
the HTML and again in the JS. It is passed down as `children` from the server
page instead.

**Every point two things share is computed once, in root coordinates.** Bodies
are local and placed by a transform; arms are generated in root space from the
same table the hand-joins use. An earlier version drew arms inside each figure's
scaled transform while placing the joins in root space — they coincide only at
`scale === 1`, so every join had a visible gap.

**Nothing hardcodes a count.** `lib/stats.ts` derives them all, so adding a
language updates the page title, the intro, the finale headline and the loading
screen by itself.

**There are no flags.** A flag is a political object and a language is not — one
flag per language would misrepresent most of the list. Place is set in type
instead, like a museum specimen label.

## Layout

```
app/            routes, the reader route at /index, global tokens
content/        greetings.ts — the data. scripts.ts — writing systems
components/
  sections/     intro, greeting, finale (+ generated crowd-data artwork)
  scroll/       Lenis provider, the snap spine, the active-section store
  chrome/       rail, theme toggle, sound control
  boot/         the entry sequence
  fx/           the scramble effect
lib/            fonts, stats, type fitting, motion preference, audio
scripts/        font subsetting, glyph coverage, content validation, crowd art
assets/fonts/   generated subsets — committed, regenerate with `npm run fonts`
```

## Contributing

Your language is welcome. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the
shape of an entry and the house style.

Corrections to existing entries are as welcome as new languages — several were
written by someone who does not speak the language, and they will contain
errors. If you spot one, that is a pull request worth making.

If you use Claude Code, this repo ships a skill at
`.claude/skills/add-greeting/` that knows the house rules, the commands, and the
traps.
