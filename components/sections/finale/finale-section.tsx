'use client'

import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger, initGsap } from '@/lib/motion/gsap'
import { useReducedMotion } from '@/lib/motion/motion-preference'
import { GREETINGS } from '@/content/greetings'
import { SCRIPTS } from '@/content/scripts'
import { SCRIPT_FONT_STACK } from '@/lib/fonts'
import { TOTAL_WORD } from '@/lib/stats'
import { useLenis } from '@/components/scroll/smooth-scroll-provider'
import { HandChain } from './hand-chain'
import {
  DRAW_ORDER,
  GROUND,
  VIEWBOX_DESKTOP,
  VIEWBOX_MOBILE,
  WIDTH,
} from './chain-geometry'

/** Joins close centre-outward too. */
const JOIN_ORDER = [2, 3, 1, 4, 0, 5]

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
    initGsap()

    const svg = el.querySelector<SVGSVGElement>('[data-hand-chain]')

    // viewBox cannot be set from CSS, and rendering two <svg>s would duplicate
    // the DOM and collide every id. Swap the attribute instead.
    const mm = gsap.matchMedia()
    mm.add('(min-width: 768px)', () => {
      svg?.setAttribute('viewBox', VIEWBOX_DESKTOP)
    })
    mm.add('(max-width: 767.98px)', () => {
      svg?.setAttribute('viewBox', VIEWBOX_MOBILE)
    })

    // Reduced motion needs no work on the artwork at all: every element is
    // AUTHORED in its finished state, and only the full-motion branch closes
    // it. So there is nothing to undo here, and no pin — the pin is the most
    // vestibular-hostile element on the site and it gets no exceptions.
    if (reduced) {
      if (cycler.current) cycler.current.textContent = 'Hello'
      return () => mm.revert()
    }

    const ctx = gsap.context(() => {
      const wipes = el.querySelectorAll<SVGRectElement>('.fig-wipe')
      const rises = el.querySelectorAll<SVGGElement>('.fig-rise')
      const shadows = el.querySelectorAll<SVGEllipseElement>('.fig-shadow')
      const arms = el.querySelectorAll<SVGPathElement>('.chain-arm')
      const clasps = el.querySelectorAll<SVGEllipseElement>('.chain-clasp')

      // Close everything. The OPEN state needs no values at all, so nothing
      // here is measured and a ScrollTrigger refresh cannot desync it.
      gsap.set('#ground', { scaleX: 0, svgOrigin: `${WIDTH / 2} ${GROUND + 1}` })
      gsap.set(wipes, { y: 380 })
      gsap.set(rises, { y: 12 })
      gsap.set(shadows, { opacity: 0 })
      gsap.set(arms, { strokeDasharray: 1, strokeDashoffset: 1 })
      gsap.set(clasps, { opacity: 0 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: '+=240%',
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
        },
      })

      tl.to('#ground', { scaleX: 1, duration: 0.4, ease: 'power2.inOut' }, 0)

      // Figures rise out of the ground, centre-outward.
      DRAW_ORDER.forEach((figureIndex, order) => {
        const at = 0.25 + order * 0.18
        tl.to(wipes[figureIndex], { y: 0, duration: 0.5, ease: 'power2.out' }, at)
        tl.to(rises[figureIndex], { y: 0, duration: 0.5, ease: 'power2.out' }, at)
        tl.to(
          shadows[figureIndex],
          { opacity: 1, duration: 0.3, ease: 'power1.out' },
          at + 0.25,
        )
      })

      // The two hanging outer arms arrive with their own figures.
      tl.to(
        el.querySelector('[data-arm="arm-hang-l"]'),
        { strokeDashoffset: 0, duration: 0.4, ease: 'power1.out' },
        0.25 + 5 * 0.18 + 0.28,
      )
      tl.to(
        el.querySelector('[data-arm="arm-hang-r"]'),
        { strokeDashoffset: 0, duration: 0.4, ease: 'power1.out' },
        0.25 + 6 * 0.18 + 0.28,
      )

      // Then the arms reach out and the hands meet. Each arm path is authored
      // from the shoulder outward, so the dash draw reads as a limb extending
      // rather than as a line being drawn.
      //
      // This overlaps the figures still arriving, deliberately — otherwise the
      // sequence reads as two disconnected halves.
      JOIN_ORDER.forEach((joinIndex, order) => {
        const at = 1.25 + order * 0.16
        tl.to(
          [
            el.querySelector(`[data-arm="arm-${joinIndex}-l"]`),
            el.querySelector(`[data-arm="arm-${joinIndex}-r"]`),
          ],
          { strokeDashoffset: 0, duration: 0.42, ease: 'power1.out' },
          at,
        )
        const clasp = el.querySelector<SVGEllipseElement>(`[data-clasp="${joinIndex}"]`)
        if (clasp) {
          // back.out(1.6), not 2.2: under scrub, a strong overshoot played
          // backwards reads as a glitch.
          tl.to(
            clasp,
            {
              opacity: 1,
              scale: 1,
              duration: 0.22,
              ease: 'back.out(1.6)',
              svgOrigin: `${clasp.getAttribute('cx')} ${clasp.getAttribute('cy')}`,
            },
            at + 0.34,
          )
        }
      })

      // The label riffles every greeting and lands on the English one. The
      // fonts are all loaded already, so this costs nothing.
      const words = GREETINGS.map((g) => g.word)
      const state = { i: 0 }
      tl.to(
        state,
        {
          i: words.length - 1,
          duration: 1.1,
          ease: 'power2.out',
          onUpdate: () => {
            if (cycler.current) cycler.current.textContent = words[Math.round(state.i)]
          },
        },
        2.55,
      )
      tl.add(() => {
        if (cycler.current) cycler.current.textContent = 'Hello'
      }, 3.65)

      // A beat of dwell on the finished tableau before the pin releases.
      tl.to({}, { duration: 0.55 }, 3.65)
    }, el)

    return () => {
      ctx.revert()
      mm.revert()
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === el) t.kill()
      })
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

        <div className="flex min-h-0 flex-1 items-center justify-center py-6">
          <HandChain className="h-auto w-full max-w-6xl" />
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
        </div>
      </div>
    </section>
  )
}
