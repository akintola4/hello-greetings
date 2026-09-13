'use client'

import { useEffect, type RefObject } from 'react'

interface FitOptions {
  /** Authorial multiplier applied on top of the measured fit. */
  typeScale: number
  /** Fraction of the available width the word should fill. */
  fillWidth?: number
  /** Hard ceiling. Past this, extra size stops rewarding the eye. */
  maxPx?: number
  /** Hard floor, so a two-letter word is never microscopic. */
  minPx?: number
}

/**
 * Size a word to fit its container by measuring it, not by guessing.
 *
 * A single `font-size: clamp()` cannot work across writing systems. At the same
 * font-size the advance widths differ enormously:
 *
 *   Hi            ~1.1em     こんにちは   ~5.0em
 *   مرحبا         ~2.9em     Здравствуйте ~6.8em
 *
 * A clamp tuned so `Здравствуйте` fits a 390px phone leaves `Hi` looking like a
 * typo. So: measure the word once at a reference size, scale to the target
 * width, then constrain by height as well — a tall Tamil or Tibetan word must
 * be limited by its height or it eats the rest of the composition.
 *
 * The computed size is written to a CSS custom property. The word sits in a
 * fixed-height stage and is centred within it, so changing the glyph size can
 * never change a box: CLS is zero by construction, not by mitigation.
 */
export function useFitWord(
  ref: RefObject<HTMLElement | null>,
  { typeScale, fillWidth, maxPx = 288, minPx = 40 }: FitOptions,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const REFERENCE = 100

    const measure = () => {
      // The stage, NOT el.parentElement — the immediate parent is the <h2>,
      // which shrink-wraps the word. Measuring against it would size the word
      // relative to its own width, a feedback loop that collapses it.
      const stage = el.closest<HTMLElement>('.word-stage')
      if (!stage) return

      const available = stage.clientWidth
      const heightBudget = stage.clientHeight
      if (!available || !heightBudget) return

      const fill = fillWidth ?? (available < 640 ? 0.92 : 0.74)

      // Measure at a known reference size with no constraints applied.
      const prev = el.style.fontSize
      el.style.fontSize = `${REFERENCE}px`
      const rect = el.getBoundingClientRect()
      const wRatio = rect.width / REFERENCE
      const hRatio = rect.height / REFERENCE
      el.style.fontSize = prev

      if (!wRatio || !hRatio) return

      const byWidth = (available * fill) / wRatio
      const byHeight = (heightBudget * 0.92) / hRatio

      // typeScale is applied to the fit, then re-clamped — otherwise a scale
      // above 1 pushes straight past the ceiling and the height budget.
      const fitted = Math.min(byWidth, byHeight) * typeScale
      const size = Math.max(minPx, Math.min(fitted, byHeight, maxPx))
      el.style.setProperty('--word-size', `${size.toFixed(2)}px`)
    }

    measure()

    // Re-measure once the real face lands; the fallback has different metrics.
    document.fonts.ready.then(measure).catch(() => {})

    let frame = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    const stage = el.closest<HTMLElement>('.word-stage')
    if (stage) ro.observe(stage)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [ref, typeScale, fillWidth, maxPx, minPx])
}
