'use client'

import Lenis from 'lenis'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { gsap, ScrollTrigger, initGsap } from '@/lib/motion/gsap'
import { useReducedMotion } from '@/lib/motion/motion-preference'

const Ctx = createContext<{ lenis: Lenis | null }>({ lenis: null })

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
  const [lenis, setLenis] = useState<Lenis | null>(null)
  const reduced = useReducedMotion()
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  useEffect(() => {
    initGsap()

    // Reduced motion gets plain native scrolling — no smoothing, no ticker.
    if (reduced) {
      setLenis(null)
      return
    }

    const instance = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      // Native iOS momentum is better than any JS approximation, and syncing
      // touch is where Lenis's iOS bugs live.
      syncTouch: false,
    })

    const onScroll = () => ScrollTrigger.update()
    instance.on('scroll', onScroll)

    const tick = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    setLenis(instance)

    return () => {
      gsap.ticker.remove(tick)
      instance.off('scroll', onScroll)
      instance.destroy()
      setLenis(null)
    }
  }, [reduced])

  return <Ctx.Provider value={{ lenis }}>{children}</Ctx.Provider>
}

export const useLenis = () => useContext(Ctx).lenis
