'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useMediaQuery } from '@/lib/react/browser-state'

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
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * The in-page override, as a module-level store.
 *
 * It cannot be `useState` seeded from an effect without rendering once with the
 * wrong answer, and it cannot be a lazy `useState` initialiser either, because
 * that would read `localStorage` while rendering on the server. An external
 * store reads it on the client only, at the first render that needs it.
 *
 * The `storage` listener is a small bonus rather than the point: change the
 * setting in one tab and the others follow.
 */
let override: boolean | null = null
let loaded = false
const listeners = new Set<() => void>()

function readStored(): boolean | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'true' ? true : v === 'false' ? false : null
  } catch {
    // Private mode, or site data blocked. The OS query still works.
    return null
  }
}

function getOverride(): boolean | null {
  if (!loaded) {
    override = readStored()
    loaded = true
  }
  return override
}

function subscribeOverride(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return
    override = readStored()
    loaded = true
    for (const l of listeners) l()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function writeOverride(v: boolean | null) {
  override = v
  loaded = true
  try {
    if (v === null) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, String(v))
  } catch {
    // Non-fatal: the preference just won't survive a reload.
  }
  for (const l of listeners) l()
}

/**
 * Resolves reduced motion from the OS query *plus* an in-page toggle.
 *
 * The manual override matters: a snap-scrolling site is a vestibular hazard,
 * and plenty of people who want it turned off have never touched the OS
 * setting. The resolved mode is written to `data-motion` on <html> so CSS can
 * branch once globally instead of every component testing a media query.
 */
export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const systemReduced = useMediaQuery(REDUCED_QUERY)
  const stored = useSyncExternalStore(subscribeOverride, getOverride, () => null)

  const mode: MotionMode = (stored ?? systemReduced) ? 'reduced' : 'full'

  useEffect(() => {
    document.documentElement.dataset.motion = mode
  }, [mode])

  const setOverride = useCallback((v: boolean | null) => writeOverride(v), [])

  return <Ctx.Provider value={{ mode, override: stored, setOverride }}>{children}</Ctx.Provider>
}

export const useMotionPreference = () => useContext(Ctx)
export const useReducedMotion = () => useContext(Ctx).mode === 'reduced'
