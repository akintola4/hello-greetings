'use client'

import { useEffect, useRef } from 'react'
import { ScrollTrigger, initGsap } from '@/lib/motion/gsap'
import { useReducedMotion } from '@/lib/motion/motion-preference'
import { useLenis } from './smooth-scroll-provider'
import { activeSection } from './active-section-store'

/**
 * The scroll orchestrator.
 *
 * Deliberately three ScrollTriggers on the whole site rather than one per
 * section: a naive build makes thirty snap configs that each try to claim the
 * scroll position, and gets slow and jumpy doing it.
 *
 *  - ONE ScrollTrigger carrying a snap point array derived from real section
 *    offsets (act breaks make the spacing non-uniform, so `1/(n-1)` is wrong).
 *  - ONE IntersectionObserver deciding which section is active. Browser-native,
 *    off the scroll handler, and correct during momentum scrolling where GSAP's
 *    snap callbacks have not fired yet.
 *  - Keyboard navigation on a single window listener.
 */
export function ScrollSpine() {
  const lenis = useLenis()
  const reduced = useReducedMotion()
  const snapRef = useRef<ScrollTrigger | null>(null)

  // Active section, via IntersectionObserver against the viewport midline.
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-section-index]'),
    )
    if (!sections.length) return

    let settleTimer: number | undefined

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const i = Number((entry.target as HTMLElement).dataset.sectionIndex)
          activeSection.set(i)

          for (const s of sections) {
            const si = Number(s.dataset.sectionIndex)
            s.dataset.state = si === i ? 'active' : si < i ? 'passed' : 'upcoming'
          }

          window.clearTimeout(settleTimer)
          // A section must hold the midline briefly before we call it settled;
          // this is what stops the reveal firing during a fast flick.
          settleTimer = window.setTimeout(() => activeSection.markSettled(), 140)
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    )

    for (const s of sections) io.observe(s)
    return () => {
      window.clearTimeout(settleTimer)
      io.disconnect()
    }
  }, [])

  // Snap. Skipped entirely under reduced motion — free scrolling.
  useEffect(() => {
    initGsap()
    if (reduced) return

    const spine = document.getElementById('spine')
    if (!spine) return

    /**
     * Snap targets are computed live, inside snapTo, rather than cached.
     *
     * Caching them is subtly wrong: the finale's pin inserts a spacer that
     * changes the document height after the trigger is created, so any array
     * built earlier is measured against a stale maxScroll and every section
     * lands tens of pixels off its own top. Measuring at snap time costs one
     * layout read per settle and is always correct.
     *
     * The spacing is genuinely non-uniform (the intro and the pinned finale
     * are not the same height as a greeting), so `1 / (n - 1)` would be wrong
     * even without the pin.
     */
    const nearestSection = (value: number, self?: ScrollTrigger) => {
      const trigger = self ?? snapRef.current
      if (!trigger) return value

      // The value snapTo receives is progress across THIS TRIGGER's range, not
      // across the document. Dividing offsetTop by maxScroll instead produces
      // an error that scales with distance — the last section lands over two
      // thousand pixels short. Map through start/end.
      const { start, end } = trigger
      const range = end - start
      if (range <= 0) return value

      const sections = Array.from(
        document.querySelectorAll<HTMLElement>('[data-section-index]'),
      )
      if (!sections.length) return value

      let best = value
      let bestDelta = Infinity
      for (const s of sections) {
        const point = Math.max(0, Math.min(1, (s.offsetTop - start) / range))
        const delta = Math.abs(point - value)
        if (delta < bestDelta) {
          bestDelta = delta
          best = point
        }
      }
      return best
    }

    const st = ScrollTrigger.create({
      trigger: spine,
      start: 'top top',
      end: 'bottom bottom',
      snap: {
        snapTo: nearestSection,
        duration: { min: 0.2, max: 0.5 },
        delay: 0.06,
        ease: 'power2.inOut',
        directional: true,
        inertia: false,
      },
    })
    snapRef.current = st

    return () => {
      st.kill()
      snapRef.current = null
    }
  }, [reduced])

  // Keyboard navigation.
  useEffect(() => {
    const go = (delta: number) => {
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>('[data-section-index]'),
      )
      const next = Math.max(0, Math.min(sections.length - 1, activeSection.get() + delta))
      const target = sections[next]
      if (!target) return
      if (lenis) lenis.scrollTo(target, { offset: 0 })
      else target.scrollIntoView({ behavior: 'smooth' })
      // Move focus with the view so screen reader position follows.
      target.focus({ preventScroll: true })
    }

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      // Never swallow keys meant for a control — Space must still press buttons.
      if (t?.closest('a, button, input, textarea, select, [contenteditable]')) return

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault()
          go(1)
          break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          go(-1)
          break
        case ' ':
          e.preventDefault()
          go(e.shiftKey ? -1 : 1)
          break
        case 'Home':
          e.preventDefault()
          go(-Infinity)
          break
        case 'End':
          e.preventDefault()
          go(Infinity)
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lenis])

  return null
}
