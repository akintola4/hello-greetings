'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/lib/motion/motion-preference'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#'

/**
 * A character-scramble reveal, for chrome only.
 *
 * Three rules, all of them load-bearing:
 *
 * 1. **Never scramble a hero word.** Not even the Latin ones. Garbling the
 *    subject of the site is a small act of disrespect toward content that was
 *    hand-curated — and for Arabic or Devanagari it is technically broken:
 *    substituting glyphs re-runs the shaper every frame, joins change, the
 *    rendered advance width jumps, and a 280px glyph thrashes layout at 30Hz.
 * 2. **Monospaced chrome only** — indices, language names, ISO codes. Every
 *    substitution has the same advance width, so this is a repaint of a small
 *    box and never a reflow.
 * 3. **rAF writing textContent through a ref.** The original ran setInterval
 *    plus setState at 25Hz across every visible element at once, which is a
 *    render storm.
 */
export function ScrambledText({ text, durationMs = 420 }: { text: string; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (reduced) {
      el.textContent = text
      return
    }

    let raf = 0
    const start = performance.now()
    const chars = [...text]

    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      const revealed = Math.floor(p * chars.length)
      el.textContent = chars
        .map((c, i) => {
          if (i < revealed || c === ' ' || c === '/') return c
          return ALPHABET[(Math.random() * ALPHABET.length) | 0]
        })
        .join('')
      if (p < 1) raf = requestAnimationFrame(frame)
      else el.textContent = text
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [text, durationMs, reduced])

  return (
    <span ref={ref} suppressHydrationWarning>
      {text}
    </span>
  )
}
