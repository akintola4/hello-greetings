'use client'

import Lenis from 'lenis'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { gsap, ScrollTrigger, initGsap } from '@/lib/motion/gsap'
import { useReducedMotion } from '@/lib/motion/motion-preference'

/**
 * The instance lives in a module store rather than in state.
 *
 * It is created in an effect — it needs the DOM — and putting it in `useState`
 * meant the provider re-rendered the entire tree the moment it appeared, to
 * hand a value to three components that only ever use it inside effects and
 * event handlers. A store re-renders those three and nobody else.
 */
let instance: Lenis | null = null
const listeners = new Set<() => void>()

function publish(next: Lenis | null) {
  if (next === instance) return
  instance = next
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Lenis, wired to the GSAP ticker.
 *
 * Three things the previous implementation of this got wrong, all fixed here:
 *
 * 1. It took an `onStageChange` callback as a prop and listed it in the effect
 *    deps. That callback got a new identity on every render, so Lenis was
 *    destroyed and rebuilt on every single stage change. This provider owns
 *    the instance and exposes it through context instead — empty deps.
 * 2. Its setup was an `async` function whose returned cleanup React silently
 *    ignored (a Promise is not a cleanup function), so every rebuild leaked a
 *    rAF loop and a scroll listener. Setup here is synchronous.
 * 3. It ran its own rAF loop, unsynchronised with GSAP, so ScrollTrigger and
 *    Lenis disagreed about the scroll position. One ticker drives both.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    initGsap()

    // Reduced motion gets plain native scrolling — no smoothing, no ticker.
    if (reduced) {
      publish(null)
      return
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      // Native iOS momentum is better than any JS approximation, and syncing
      // touch is where Lenis's iOS bugs live.
      syncTouch: false,
    })

    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)

    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    publish(lenis)

    return () => {
      gsap.ticker.remove(tick)
      lenis.off('scroll', onScroll)
      lenis.destroy()
      publish(null)
    }
  }, [reduced])

  return <>{children}</>
}

export const useLenis = () =>
  useSyncExternalStore(
    subscribe,
    () => instance,
    () => null,
  )
