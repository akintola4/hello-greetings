'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/motion/motion-preference'
import { GREETINGS } from '@/content/greetings'
import { SCRIPTS } from '@/content/scripts'
import { SCRIPT_FONT_STACK } from '@/lib/fonts'
import { TOTAL_WORD } from '@/lib/stats'
import { useLenis } from '@/components/scroll/smooth-scroll-provider'
import { DoodleCrowd } from './doodle-crowd'

export function FinaleSection({ sectionIndex }: { sectionIndex: number }) {
  const root = useRef<HTMLElement>(null)
  const cycler = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const lenis = useLenis()

  /**
   * Jump to a greeting.
   *
   * Lenis owns the scroll position, so letting the browser handle the hash
   * would fight it and land in the wrong place. The href stays real, though —
   * middle-click, copy-link and a no-JS visit all still work.
   */
  const goToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id)
    if (!target) return
    e.preventDefault()
    if (lenis) lenis.scrollTo(target)
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
    // Move focus with the view so screen reader position follows.
    target.focus({ preventScroll: true })
    history.replaceState(null, '', `#${id}`)
  }

  useEffect(() => {
    const el = root.current
    if (!el) return

    // The artwork is simply there. There is no pinned, scrubbed assembly:
    // holding the page hostage for two and a half viewports to watch a picture
    // build itself asks more of the reader than the picture gives back, and the
    // pin was also what forced a horizontal scrollbar via its spacer width.
    //
    // The one beat kept is the label riffling every greeting and landing on
    // "Hello", fired once when the section first comes into view. The fonts are
    // all loaded by then, so it costs nothing.
    let fired = false
    let raf = 0
    const words = GREETINGS.map((g) => g.word)

    const riffle = () => {
      if (fired || reduced) return
      fired = true
      const start = performance.now()
      const DURATION = 1100
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION)
        const eased = 1 - Math.pow(1 - t, 3)
        const i = Math.min(words.length - 1, Math.round(eased * (words.length - 1)))
        if (cycler.current) cycler.current.textContent = t < 1 ? words[i] : 'Hello'
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) riffle()
      },
      { threshold: 0.35 },
    )
    io.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [reduced])

  return (
    <section
      ref={root}
      id="finale"
      tabIndex={-1}
      data-section-index={sectionIndex}
      data-state="upcoming"
      aria-labelledby="finale-heading"
      className="relative h-svh overflow-hidden focus:outline-none"
    >
      <div className="flex h-svh flex-col px-[var(--frame-inset)] py-[var(--frame-inset)] md:pe-16">
        <div className="flex shrink-0 items-baseline justify-between border-b border-rule pb-3 ps-24 sm:ps-[184px] font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3 sm:text-[11px]">
          <span>Every one of them</span>
          <span
            ref={cycler}
            aria-hidden="true"
            className="text-ink-2"
            style={{ fontFamily: SCRIPT_FONT_STACK.latn }}
          >
            Hello
          </span>
        </div>

        {/* The crowd fills whatever height is left and crops, rather than
            shrinking to fit — a crowd that runs off the edges reads as
            continuing past the frame. */}
        <div className="relative min-h-0 flex-1 overflow-hidden py-5">
          <DoodleCrowd className="h-full w-full" />
        </div>

        <div className="shrink-0 text-center">
          <h2
            id="finale-heading"
            className="mx-auto max-w-[26ch] text-balance text-2xl leading-tight sm:text-3xl md:text-4xl"
          >
            {TOTAL_WORD} different words. One thing being said.
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-balance text-[13px] leading-relaxed text-ink-2 sm:text-sm">
            Peace be upon you. Be healthy. Victory to you. I see you. There is
            room here. Every greeting on earth is a small wish handed to a
            stranger.
          </p>
          {/* Every greeting, as an index back into the site. Real links, so
              this works without JavaScript and is reachable by keyboard. */}
          <nav
            aria-label="All greetings"
            className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
          >
            {GREETINGS.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                onClick={(e) => goToSection(e, g.id)}
                lang={g.language.iso639}
                dir={SCRIPTS[g.script].dir}
                className="word-index text-[11px]"
                style={{ fontFamily: SCRIPT_FONT_STACK[g.script] }}
              >
                {g.word}
                <span className="sr-only"> — {g.language.name}</span>
              </a>
            ))}
          </nav>

          {/* CC0 requires no attribution. Crediting anyway, because someone
              drew these and the site is about acknowledging people. */}
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
            Faces by{' '}
            <a
              href="https://heyzoish.gumroad.com/l/notionists"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-ink-2"
            >
              Zoish
            </a>{' '}
            &middot; Notionists &middot; CC0
          </p>
        </div>
      </div>
    </section>
  )
}
