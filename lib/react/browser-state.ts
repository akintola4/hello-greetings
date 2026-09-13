'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Reading browser state without a setState in an effect.
 *
 * The tempting shape for "what does the OS say?" is `useState(false)` plus an
 * effect that measures and sets. It works, but it renders twice and the first
 * render is always a lie — a frame of full motion before reduced motion takes
 * hold, a frame of the wrong theme icon. `useSyncExternalStore` is the sanctioned
 * answer: it reads the real value during render on the client, takes a separate
 * snapshot for the server, and subscribes for changes.
 */

/** Subscriptions that never fire; the value only differs between environments. */
const neverChanges = () => () => {}

/**
 * False while rendering on the server and during hydration, true afterwards.
 *
 * For markup that genuinely cannot be produced on the server — anything keyed
 * to the resolved theme, which is not known until the class lands on <html>.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  )
}

/**
 * A media query as a reactive boolean.
 *
 * The server snapshot is `false` for every query, which is the right default
 * here: it means "no preference expressed", and the real value arrives on the
 * first client render rather than a frame later.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
