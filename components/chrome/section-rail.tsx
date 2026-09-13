'use client'

import { useEffect, useRef } from 'react'
import { gsap } from '@/lib/motion/gsap'
import { useActiveSection } from '@/components/scroll/active-section-store'
import { useLenis } from '@/components/scroll/smooth-scroll-provider'
import { useReducedMotion } from '@/lib/motion/motion-preference'

/** Mark length in px, from resting to fully extended. */
const BASE_W = 8
const PEAK_W = 30
/** Falloff width, in section units. Larger = more neighbours lift. */
const SIGMA = 1.7

export interface RailItem {
  /** Language name, or "Start" / "Finale" for the bookends. */
  label: string
  /** The greeting in its own script, if this section has one. */
  word?: string
  /** Font stack resolved on the server, so this stays a light client bundle. */
  font?: string
  dir?: 'ltr' | 'rtl'
}

/**
 * Section navigation.
 *
 * The marks behave like a dock: the one you are on extends fully and its
 * neighbours lift by a gaussian falloff, so the rail reads as a travelling
 * swell rather than a single jumping highlight.
 *
 * The position driving it is a FLOAT derived from real scroll offset, not the
 * integer active index, so the swell slides continuously between marks instead
 * of stepping.
 *
 * Every per-frame write goes through a ref on the gsap ticker. Thirty-two
 * elements re-rendering through React each frame would be a render storm for a
 * decoration.
 */
export function SectionRail({ items }: { items: RailItem[] }) {
  const total = items.length
  const active = useActiveSection()
  // The finale lists every greeting across the full width of the frame, and
  // the rail sits on top of the last row of it — the active mark lands in the
  // middle of a word and reads as a stray underline. The rail is also simply
  // redundant there: the thing it navigates to is already on screen, spelled
  // out. So it withdraws for that one section.
  const atFinale = active === total - 1
  const lenis = useLenis()
  const reduced = useReducedMotion()
  const marks = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (reduced) return

    let offsets: number[] = []
    const measure = () => {
      offsets = Array.from(
        document.querySelectorAll<HTMLElement>('[data-section-index]'),
      ).map((s) => s.offsetTop)
    }
    measure()

    /** Scroll position expressed as a fractional section index. */
    const floatIndex = () => {
      if (offsets.length < 2) return 0
      const y = window.scrollY
      if (y <= offsets[0]) return 0
      for (let i = 0; i < offsets.length - 1; i++) {
        const a = offsets[i]
        const b = offsets[i + 1]
        if (y < b) return i + (y - a) / Math.max(1, b - a)
      }
      return offsets.length - 1
    }

    let last = -1
    const render = () => {
      const pos = floatIndex()
      if (Math.abs(pos - last) < 0.0005) return
      last = pos

      for (let i = 0; i < marks.current.length; i++) {
        const el = marks.current[i]
        if (!el) continue
        const d = Math.abs(i - pos)
        const lift = Math.exp(-(d * d) / (2 * SIGMA * SIGMA))
        el.style.width = `${(BASE_W + (PEAK_W - BASE_W) * lift).toFixed(2)}px`
        el.style.opacity = (0.28 + 0.72 * lift).toFixed(3)
        el.style.backgroundColor = lift > 0.86 ? 'var(--ink)' : 'var(--ink-3)'
      }
    }

    gsap.ticker.add(render)
    window.addEventListener('resize', measure)
    return () => {
      gsap.ticker.remove(render)
      window.removeEventListener('resize', measure)
    }
  }, [reduced, lenis, total])

  const go = (i: number) => {
    const el = document.querySelector<HTMLElement>(`[data-section-index="${i}"]`)
    if (!el) return
    if (lenis) lenis.scrollTo(el)
    else el.scrollIntoView({ behavior: 'smooth' })
    el.focus({ preventScroll: true })
  }

  return (
    <>
      {/* Phone: a hairline progress bar. Thirty-two marks along a phone edge
          would be untappable, and there is no hover to reveal a label. */}
      <div aria-hidden="true" className="fixed inset-x-0 bottom-0 z-40 h-px bg-rule md:hidden">
        <div
          className="h-px bg-ink transition-[width] duration-300 ease-out"
          style={{ width: `${(active / Math.max(1, total - 1)) * 100}%` }}
        />
      </div>

      <nav
        aria-label="Greetings"
        // `inert` rather than only a class: a rail faded to zero is still
        // focusable, and tabbing into an invisible list of thirty-eight
        // buttons is worse than not having it.
        inert={atFinale}
        className={`fixed right-[var(--frame-inset)] top-1/2 z-40 hidden -translate-y-1/2 transition-opacity duration-500 ease-out md:block ${
          atFinale ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <ol className="flex flex-col items-end gap-[7px]">
          {items.map((item, i) => {
            const isActive = i === active
            return (
              <li key={i} className="flex justify-end">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={
                    item.word
                      ? `${item.label} — ${item.word}`
                      : item.label
                  }
                  className="rail-item group relative flex h-3 w-[34px] items-center justify-end"
                >
                  {/* Hover/focus label, so a specific greeting can be found
                      without scrolling the whole spine looking for it. */}
                  <span
                    aria-hidden="true"
                    className="rail-label pointer-events-none absolute right-[calc(100%+12px)] top-1/2 flex -translate-y-1/2 items-baseline gap-2 whitespace-nowrap"
                  >
                    {item.word ? (
                      <span
                        className="text-[15px] leading-none text-ink"
                        style={{ fontFamily: item.font }}
                        dir={item.dir}
                      >
                        {item.word}
                      </span>
                    ) : null}
                    <span className="font-mono text-[10px] uppercase leading-none tracking-[0.14em] text-ink-3">
                      {item.label}
                    </span>
                  </span>

                  <span
                    ref={(el) => {
                      marks.current[i] = el
                    }}
                    // No CSS transition in full-motion mode: the ticker is
                    // already writing a new width every frame, and a
                    // transition on top of that smears rather than smooths.
                    className={
                      reduced
                        ? 'block h-px rounded-full transition-[width,opacity] duration-200 ease-out'
                        : 'block h-px rounded-full'
                    }
                    style={{
                      width: reduced ? (isActive ? PEAK_W : BASE_W) : BASE_W,
                      opacity: reduced ? (isActive ? 1 : 0.3) : 0.3,
                      backgroundColor:
                        reduced && isActive ? 'var(--ink)' : 'var(--ink-3)',
                    }}
                  />
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
