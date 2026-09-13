'use client'

import { useEffect, useRef } from 'react'
import { useAmbientAudio } from '@/lib/audio/use-ambient-audio'
import { useReducedMotion } from '@/lib/motion/motion-preference'
import { ENVELOPE_HZ, levelAt } from '@/lib/audio/envelope'

/** Bars in the meter. Seven at 10 Hz is 0.7s of the score. */
const BARS = 7

/**
 * Sound control: a play button and a level meter.
 *
 * The meter shows the actual music. Reading it the obvious way — an
 * `AnalyserNode` — would mean routing the element through
 * `createMediaElementSource`, and on iOS that has historically put playback in
 * an audio session that obeys the silent switch. Since iOS 17 there is a
 * sanctioned fix (`navigator.audioSession.type = 'playback'`), so this is no
 * longer the hard block it was — but it is Safari-only, and a decorative meter
 * is not worth taking on a platform-specific workaround for. So the loudness is measured at build time by
 * `pnpm run envelope` and looked up here by `currentTime`: real data about the
 * real track, and no AudioContext.
 *
 * Each bar is one envelope sample older than the bar to its right, so the meter
 * is most of a second of the score scrolling leftwards rather than a row of bars
 * bouncing in unison.
 *
 * There is no volume slider. Play and pause is the control that matters, and a
 * stored level still applies underneath.
 */
export function SoundControl() {
  const { ref, state, toggle } = useAmbientAudio()
  const reduced = useReducedMotion()
  const playing = state === 'on'

  const bars = useRef<(HTMLSpanElement | null)[]>([])
  const shown = useRef<number[]>(Array(BARS).fill(0))

  useEffect(() => {
    if (reduced) return

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = ref.current
      // Paused: sink to the floor rather than freezing mid-waveform, which
      // reads as a bug.
      const t = playing && el ? el.currentTime : null

      for (let i = 0; i < BARS; i++) {
        const target = t === null ? 0 : levelAt(t - (BARS - 1 - i) / ENVELOPE_HZ)
        // Smoothing, because 10 Hz of raw samples steps visibly at 60 fps.
        // Falling slower than rising is what makes a meter read as a meter.
        const prev = shown.current[i]
        const next = prev + (target - prev) * (target > prev ? 0.35 : 0.12)
        shown.current[i] = next

        // A floor, so the meter stays a row of ticks when silent instead of
        // vanishing and leaving a hole in the header.
        const node = bars.current[i]
        if (node) node.style.transform = `scaleY(${(0.1 + next * 0.9).toFixed(3)})`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, reduced, ref])

  return (
    <>
      <audio ref={ref} loop preload="auto" aria-hidden="true" />

      {state !== 'unavailable' && (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause music' : 'Play music'}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-rule text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="size-[13px]" aria-hidden="true" focusable="false">
              {playing ? (
                // Pause: two bars.
                <g fill="currentColor">
                  <rect x="6.5" y="4.5" width="4" height="15" rx="1" />
                  <rect x="13.5" y="4.5" width="4" height="15" rx="1" />
                </g>
              ) : (
                // Play: a triangle sitting slightly right of geometric centre,
                // which is what makes it look centred inside a circle.
                <path d="M8.5 5 19 12 8.5 19Z" fill="currentColor" strokeLinejoin="round" />
              )}
            </svg>
          </button>

          {/* Decoration: it reports nothing the play button does not already
              say, so it is hidden from assistive technology entirely. */}
          <span aria-hidden="true" className="sound-meter" data-playing={playing ? '' : undefined}>
            {Array.from({ length: BARS }, (_, i) => (
              <span
                key={i}
                ref={(n) => {
                  bars.current[i] = n
                }}
                className="sound-bar"
              />
            ))}
          </span>
        </div>
      )}
    </>
  )
}
