'use client'

import { useAmbientAudio } from '@/lib/audio/use-ambient-audio'

/**
 * Sound control: mute toggle plus volume.
 *
 * The level meter is three CSS-animated bars rather than a real AnalyserNode —
 * an analyser is the only remaining reason to construct an AudioContext, and
 * it is not worth the iOS ringer-channel problem that comes with one.
 *
 * The slider is always present rather than revealed on hover: a control that
 * only exists on hover is unreachable by keyboard and invisible on touch.
 */
export function SoundControl() {
  const { ref, state, toggle, volume, setVolume } = useAmbientAudio()
  const playing = state === 'on'

  return (
    <>
      <audio ref={ref} loop preload="auto" aria-hidden="true" />

      {state !== 'unavailable' && (
        <div className="flex items-center gap-2">
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

          <label className="hidden items-center sm:flex">
            <span className="sr-only">Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.currentTarget.value) / 100)}
              aria-label="Volume"
              className="volume-range"
              style={{ ['--fill' as string]: `${Math.round(volume * 100)}%` }}
            />
          </label>
        </div>
      )}
    </>
  )
}
