'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type MotionMode = 'full' | 'reduced'

interface MotionPreference {
  mode: MotionMode
  /** null means "follow the OS"; true/false is an explicit in-page override. */
  override: boolean | null
  setOverride: (v: boolean | null) => void
}

const Ctx = createContext<MotionPreference>({
  mode: 'full',
  override: null,
  setOverride: () => {},
})

const STORAGE_KEY = 'hello:reduced-motion'

/**
 * Resolves reduced motion from the OS query *plus* an in-page toggle.
 *
 * The manual override matters: a snap-scrolling site is a vestibular hazard,
 * and plenty of people who want it turned off have never touched the OS
 * setting. The resolved mode is written to `data-motion` on <html> so CSS can
 * branch once globally instead of every component testing a media query.
 */
export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [systemReduced, setSystemReduced] = useState(false)
  const [override, setOverrideState] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSystemReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSystemReduced(e.matches)
    mq.addEventListener('change', onChange)

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'true' || stored === 'false') setOverrideState(stored === 'true')
    } catch {
      // Private mode, or site data blocked. The OS query still works.
    }

    return () => mq.removeEventListener('change', onChange)
  }, [])

  const mode: MotionMode = (override ?? systemReduced) ? 'reduced' : 'full'

  useEffect(() => {
    document.documentElement.dataset.motion = mode
  }, [mode])

  const setOverride = useCallback((v: boolean | null) => {
    setOverrideState(v)
    try {
      if (v === null) window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, String(v))
    } catch {
      // Non-fatal: the preference just won't survive a reload.
    }
  }, [])

  return <Ctx.Provider value={{ mode, override, setOverride }}>{children}</Ctx.Provider>
}

export const useMotionPreference = () => useContext(Ctx)
export const useReducedMotion = () => useContext(Ctx).mode === 'reduced'
