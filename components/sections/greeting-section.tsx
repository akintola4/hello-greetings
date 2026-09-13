import type { Greeting } from '@/content/greetings'
import { SCRIPTS } from '@/content/scripts'
import { SCRIPT_FONT_STACK } from '@/lib/fonts'
import { GreetingWord } from './greeting-word'
import { ScrambledText } from '@/components/fx/scrambled-text'

interface Props {
  greeting: Greeting
  /** Position in the whole scroll spine — the intro occupies index 0. */
  sectionIndex: number
  /** Position within the thirty greetings, for the label bar. */
  ordinal: number
  total: number
}

/**
 * One greeting, one viewport.
 *
 * A Server Component: all the prose lives in the RSC payload rather than being
 * duplicated into a client JS chunk. Only the word and the scrambling label
 * fragments cross into the client.
 *
 * Height is `100svh`, not `100dvh`. `dvh` changes continuously as the iOS
 * address bar collapses, which resizes every section mid-scroll and drags the
 * snap targets out from under the user's thumb. `svh` is stable; the cost is a
 * strip of unused screen when the bar hides, which is the right trade.
 */
export function GreetingSection({ greeting: g, sectionIndex, ordinal, total }: Props) {
  const script = SCRIPTS[g.script]
  const n = String(ordinal).padStart(2, '0')

  // Only `q` matters. A copied Google URL carries a long tail of session and
  // telemetry parameters that would be meaningless — and slightly invasive —
  // to hardcode into a static site.
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(g.word)}`

  return (
    <section
      id={g.id}
      tabIndex={-1}
      data-section-index={sectionIndex}
      data-state="upcoming"
      aria-labelledby={`${g.id}-heading`}
      style={{ ['--accent-hue' as string]: g.accentHue }}
      className="greeting-section relative h-svh [content-visibility:auto] [contain-intrinsic-size:auto_100svh] focus:outline-none"
    >
      <div className="sticky top-0 flex h-svh flex-col px-[var(--frame-inset)] py-[var(--frame-inset)] md:pe-16">
        {/* Specimen label. Museum accession line, not a flag: a language is
            not a country, and most of these span many. */}
        <div className="label-bar flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule pb-3 ps-24 sm:ps-[184px] font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 sm:text-[11px]">
          <span className="tabular-nums">
            <ScrambledText text={`${n}/${total}`} />
          </span>
          <span
            className="text-ink-2"
            lang={g.language.iso639}
            dir={script.dir}
            style={{ fontFamily: SCRIPT_FONT_STACK[g.script] }}
          >
            {g.language.endonym}
          </span>
          <span className="text-ink-2">
            <ScrambledText text={g.language.name} />
          </span>
          <span className="hidden sm:inline">{g.region}</span>
          <span className="ml-auto tabular-nums">{g.language.iso639}</span>
        </div>

        {/* The word. Fixed-height stage, word centred inside it, so a font
            swap can change glyphs but never a box. */}
        <div className="word-stage relative flex min-h-0 flex-[1.1] items-center justify-center overflow-hidden">
          <h2 id={`${g.id}-heading`} className="m-0 w-full text-center leading-none">
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="word-link relative inline-block max-w-full"
            >
              <GreetingWord
                word={g.word}
                lang={g.language.iso639}
                dir={script.dir}
                script={g.script}
                typeScale={g.typeScale}
                tracking={g.tracking}
              />
              <span className="sr-only">
                {' '}
                — {g.romanization}, {g.language.name}. Opens a web search in a
                new tab.
              </span>
              <span aria-hidden="true" className="word-underline" />
            </a>
          </h2>

          <span
            aria-hidden="true"
            className="word-hint font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3"
          >
            Look it up
            <svg
              viewBox="0 0 12 12"
              className="ms-1.5 inline-block size-[9px] align-baseline"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M3.2 8.8 8.8 3.2M4.4 3.2h4.4v4.4" />
            </svg>
          </span>
        </div>

        {/* Romanization is aria-hidden: the sr-only span above already carries
            it, better phrased, and we do not want it read twice. */}
        <div
          aria-hidden="true"
          className="reveal-1 shrink-0 text-center font-mono text-[11px] tracking-[0.22em] text-ink-2 sm:text-sm"
        >
          {g.romanization}
          {g.ipa ? <span className="ml-3 hidden text-ink-3 xs:inline">{g.ipa}</span> : null}
        </div>

        <div className="mt-auto shrink-0 pt-6">
          <div className="reveal-2 mb-5 h-px w-full bg-rule" />
          <div className="grid gap-x-10 gap-y-4 md:grid-cols-[minmax(0,1fr)_minmax(0,34ch)]">
            {g.literal ? (
              <p className="reveal-3 text-balance text-lg leading-snug sm:text-xl md:text-2xl">
                <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
                  Literally
                </span>
                <span className="italic">{g.literal}</span>
              </p>
            ) : (
              <div />
            )}
            <div className="reveal-4">
              <p className="text-[13px] leading-relaxed text-ink-2 sm:text-sm">{g.note}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-3 sm:text-[13px]">
                {g.etymology}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
