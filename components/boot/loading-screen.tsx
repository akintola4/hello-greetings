'use client'

import { useEffect, useRef, useState } from 'react'
import { GREETINGS } from '@/content/greetings'
import { SCRIPTS, SCRIPT_IDS } from '@/content/scripts'
import { SCRIPT_FONT_STACK } from '@/lib/fonts'
import { useReducedMotion } from '@/lib/motion/motion-preference'

/** Never trap anyone behind a slow network. */
const HARD_TIMEOUT_MS = 4000
/** Long enough to read as intentional rather than a flash of overlay. */
const MIN_VISIBLE_MS = 1100
const CYCLE_MS = 85

/**
 * The entry sequence.
 *
 * The loader is the content: it riffles through every greeting in its
 * own script and lands on "Hello". That is not decoration — a word can only
 * be shown once its script's font has actually arrived, so what you are
 * watching IS the progress.
 *
 * There is no progress bar and no percentage. Loading is still measured for
 * real — `document.fonts.load()` per writing system gates which words may be
 * riffled and when the overlay lifts — but the measurement drives the word
 * rather than a separate readout narrating it. A bar beside a word that is
 * already the progress is the same fact told twice.
 */
export function LoadingScreen() {
  const [done, setDone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const reduced = useReducedMotion()

  const wordRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const startedAt = performance.now()
    let raf = 0
    let cancelled = false

    // Lock scrolling while the overlay is up.
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'

    const styles = getComputedStyle(document.documentElement)
    const total = SCRIPT_IDS.length
    let loaded = 0

    // next/font generates hashed family names; the CSS variable is the only
    // way to get the real name at runtime.
    for (const id of SCRIPT_IDS) {
      const family = styles.getPropertyValue(SCRIPTS[id].fontVar).trim()
      const sample = GREETINGS.find((g) => g.script === id)?.word ?? 'a'
      const tick = () => {
        loaded += 1
      }
      if (!family) {
        tick()
        continue
      }
      document.fonts
        .load(`500 64px ${family}`, sample)
        .then(tick)
        .catch(tick)
    }

    const words = [...GREETINGS.map((g) => g.word), 'Hello']
    const stacks = [
      ...GREETINGS.map((g) => SCRIPT_FONT_STACK[g.script]),
      SCRIPT_FONT_STACK.latn,
    ]
    const dirs = [...GREETINGS.map((g) => SCRIPTS[g.script].dir), 'ltr' as const]

    let shown = 0
    let lastCycle = 0

    const finish = () => {
      if (cancelled) return
      // Land on the English word, hold a beat, then lift the overlay.
      if (wordRef.current) {
        wordRef.current.textContent = 'Hello'
        wordRef.current.style.fontFamily = SCRIPT_FONT_STACK.latn
        wordRef.current.dir = 'ltr'
      }
      window.setTimeout(() => {
        if (cancelled) return
        setLeaving(true)
        window.setTimeout(() => {
          if (cancelled) return
          document.documentElement.style.overflow = prevOverflow
          setDone(true)
        }, reduced ? 120 : 760)
      }, reduced ? 80 : 320)
    }

    const frame = (now: number) => {
      const elapsed = now - startedAt
      const real = loaded / total
      const timedOut = elapsed > HARD_TIMEOUT_MS

      if (!reduced && now - lastCycle > CYCLE_MS && wordRef.current) {
        lastCycle = now
        // Only riffle through the words whose fonts have actually landed.
        const reach = Math.max(1, Math.floor(real * words.length))
        shown = (shown + 1) % reach
        wordRef.current.textContent = words[shown]
        wordRef.current.style.fontFamily = stacks[shown]
        wordRef.current.dir = dirs[shown]
      }

      const ready = (real >= 1 || timedOut) && elapsed > MIN_VISIBLE_MS
      if (ready) {
        finish()
        return
      }
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      document.documentElement.style.overflow = prevOverflow
    }
  }, [reduced])

  if (done) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      data-leaving={leaving ? '' : undefined}
      className="boot-screen fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-paper px-[var(--frame-inset)] py-[var(--frame-inset)]"
    >
      <span
        ref={wordRef}
        aria-hidden="true"
        className="boot-word block text-center text-[clamp(2.5rem,10vw,7rem)] leading-[1.3]"
        style={{ fontFamily: SCRIPT_FONT_STACK.latn }}
      >
        Hello
      </span>
    </div>
  )
}
