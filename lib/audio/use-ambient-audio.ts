'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/motion/gsap'

const STATE_KEY = 'hello:sound'
const VOLUME_KEY = 'hello:volume'
const TRACK = '/audio/ambient-loop.mp3'
const DEFAULT_VOLUME = 0.32

export type SoundState = 'idle' | 'on' | 'off' | 'unavailable'

/**
 * The ambient bed.
 *
 * Plain <audio>, not Web Audio: with no voice clips there is nothing that
 * needs a graph, and Web Audio would cost real behaviour — on iOS it routes
 * through the ringer channel and is silenced by the hardware mute switch,
 * so a share of iPhone users would enable sound and hear nothing.
 *
 * ## Autoplay
 *
 * Every major browser refuses to start audible playback on a cold visit,
 * regardless of what the markup asks for. So this attempts playback
 * immediately and, when that is refused, arms a ONE-SHOT listener that starts
 * the track on the first interaction of any kind — including a scroll, which
 * on this site is the first thing anyone does. The practical result is
 * autoplay; the difference is that it degrades into a gesture instead of
 * failing silently the way `.play().catch(noop)` does.
 *
 * Loading is deferred until the fonts have landed so a 3.3MB stream never
 * competes with the entry sequence.
 */
export function useAmbientAudio() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [state, setState] = useState<SoundState>('idle')
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME)
  const volumeRef = useRef(DEFAULT_VOLUME)
  const stateRef = useRef<SoundState>('idle')
  stateRef.current = state

  const fade = useCallback((to: number, ms: number, then?: () => void) => {
    const el = ref.current
    if (!el) return
    gsap.killTweensOf(el)
    gsap.to(el, { volume: to, duration: ms / 1000, ease: 'power2.out', onComplete: then })
  }, [])

  const start = useCallback(async () => {
    const el = ref.current
    if (!el) return false
    try {
      el.volume = 0
      const p = el.play()
      if (p) await p
      fade(volumeRef.current, 900)
      setState('on')
      try {
        window.localStorage.setItem(STATE_KEY, 'on')
      } catch {}
      return true
    } catch {
      return false
    }
  }, [fade])

  // Restore the stored preference before anything else runs.
  useEffect(() => {
    try {
      const v = Number(window.localStorage.getItem(VOLUME_KEY))
      if (Number.isFinite(v) && v > 0 && v <= 1) {
        volumeRef.current = v
        setVolumeState(v)
      }
    } catch {}
  }, [])

  // Attempt autoplay, then fall back to the first interaction.
  useEffect(() => {
    let cancelled = false
    let armed = false
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const

    const onFirstInteraction = () => {
      if (cancelled) return
      disarm()
      void start()
    }

    const disarm = () => {
      if (!armed) return
      armed = false
      for (const e of events) {
        window.removeEventListener(e, onFirstInteraction)
      }
    }

    const arm = () => {
      if (armed || cancelled) return
      armed = true
      for (const e of events) {
        // `once` plus passive: this must never delay a scroll.
        window.addEventListener(e, onFirstInteraction, { passive: true })
      }
    }

    const begin = async () => {
      if (cancelled) return
      const el = ref.current
      if (!el) return

      // Someone who explicitly turned sound off should stay off.
      let stored: string | null = null
      try {
        stored = window.localStorage.getItem(STATE_KEY)
      } catch {}
      if (stored === 'off') {
        setState('off')
        return
      }

      el.src = TRACK
      el.load()

      // A missing or broken file should hide the control, not leave a button
      // that does nothing.
      el.addEventListener(
        'error',
        () => {
          if (!cancelled) setState('unavailable')
        },
        { once: true },
      )

      const ok = await start()
      if (!ok && !cancelled) {
        setState('off')
        arm()
      }
    }

    // Let the fonts win the network first.
    const ready = document.fonts?.ready ?? Promise.resolve()
    const timer = window.setTimeout(() => void begin(), 2500)
    ready
      .then(() => {
        window.clearTimeout(timer)
        void begin()
      })
      .catch(() => {})

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      disarm()
    }
  }, [start])

  const stop = useCallback(() => {
    const el = ref.current
    if (!el) return
    fade(0, 400, () => el.pause())
    setState('off')
    try {
      window.localStorage.setItem(STATE_KEY, 'off')
    } catch {}
  }, [fade])

  const toggle = useCallback(() => {
    if (stateRef.current === 'on') stop()
    else void start()
  }, [start, stop])

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.min(1, Math.max(0, v))
      volumeRef.current = clamped
      setVolumeState(clamped)
      const el = ref.current
      if (el && stateRef.current === 'on') {
        gsap.killTweensOf(el)
        el.volume = clamped
      }
      try {
        window.localStorage.setItem(VOLUME_KEY, String(clamped))
      } catch {}
    },
    [],
  )

  // Playing to a backgrounded tab is rude and burns battery.
  useEffect(() => {
    const onVisibility = () => {
      const el = ref.current
      if (!el) return
      if (document.hidden) {
        if (!el.paused) el.pause()
      } else if (stateRef.current === 'on' && el.paused) {
        el.play().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return { ref, state, toggle, volume, setVolume }
}
