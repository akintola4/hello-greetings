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
- A closing tableau of seven figures that assembles as you scroll, with every
  greeting listed beneath it as an index back into the site.

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

**Three ScrollTriggers, not thirty-eight.** One for snap, one pinned for the
finale, plus a single IntersectionObserver for the active section. Per-frame
work goes through refs and the GSAP ticker; nothing calls `setState` in a rAF or
a mousemove handler.

**The closing artwork computes every shared point once.** Figures own only what
is local to them; arms and clasps live in root coordinates and read their
endpoints from the same table in `chain-geometry.ts`. An earlier version drew
arms inside each figure's scaled transform while placing the clasps in root
space — they coincide only at `scale === 1`, so every join had a gap.

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
  sections/     intro, greeting, finale (+ chain-geometry for the artwork)
  scroll/       Lenis provider, the snap spine, the active-section store
  chrome/       rail, theme toggle, sound control
  boot/         the entry sequence
  fx/           the scramble effect
lib/            fonts, stats, type fitting, motion preference, audio
scripts/        font subsetting, glyph coverage, content validation
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
