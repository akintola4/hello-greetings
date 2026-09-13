import { GREETINGS } from '@/content/greetings'
import { SCRIPTS } from '@/content/scripts'
import { SCRIPT_FONT_STACK } from '@/lib/fonts'
import { TOTAL } from '@/lib/stats'

/**
 * The opening panel.
 *
 * The thirty words are scattered faintly behind the title, so the shape of
 * what is coming is visible before the first section — and the fonts are all
 * preloaded anyway, so this costs nothing.
 */
export function IntroSection() {
  return (
    <section
      id="intro"
      tabIndex={-1}
      data-section-index={0}
      data-state="active"
      aria-labelledby="intro-heading"
      className="greeting-section relative h-svh focus:outline-none"
    >
      <div className="sticky top-0 flex h-svh flex-col justify-between px-[var(--frame-inset)] py-[var(--frame-inset)] md:pe-16">
        {/* ps-24 sm:ps-[184px] reserves the top-left gutter for the fixed theme and sound controls. */}
        <div className="flex items-baseline justify-between ps-24 sm:ps-[184px] font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 sm:text-[11px]">
          <span>A study of greeting</span>
          <span className="tabular-nums">{TOTAL} languages</span>
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          {/* Decorative wash of every word in the site. */}
          {/* Masked out of the centre so it never sits behind the title or the
              thesis line — the wash is atmosphere, not competition. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex select-none flex-wrap items-center justify-center gap-x-8 gap-y-4 overflow-hidden opacity-[0.09] [-webkit-mask-image:radial-gradient(ellipse_58%_46%_at_50%_50%,transparent_45%,#000_82%)] [mask-image:radial-gradient(ellipse_58%_46%_at_50%_50%,transparent_45%,#000_82%)]"
          >
            {GREETINGS.map((g) => (
              <span
                key={g.id}
                lang={g.language.iso639}
                dir={SCRIPTS[g.script].dir}
                className="text-2xl sm:text-4xl"
                style={{ fontFamily: SCRIPT_FONT_STACK[g.script] }}
              >
                {g.word}
              </span>
            ))}
          </div>

          <div className="relative text-center">
            <h1
              id="intro-heading"
              className="text-[clamp(4rem,20vw,16rem)] font-medium leading-[0.9] tracking-[-0.04em]"
            >
              Hello
            </h1>
            <p className="mx-auto mt-6 max-w-[30ch] text-balance text-sm leading-relaxed text-ink-2 sm:text-base">
              Almost none of these words mean “hello”. They mean peace, health,
              victory, breath — or simply: I see you.
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 sm:text-[11px]">
          <span className="flex items-center gap-2">
            Scroll
            <svg
              viewBox="0 0 12 16"
              className="scroll-cue size-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 1.5v11M2.2 8.8 6 12.6l3.8-3.8" />
            </svg>
          </span>
          <a href="/index" className="underline-offset-4 hover:underline hover:text-ink">
            Text version
          </a>
        </div>
      </div>
    </section>
  )
}
