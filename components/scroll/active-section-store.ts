'use client'

import { useSyncExternalStore } from 'react'

/**
 * A tiny external store for the active section index.
 *
 * This exists so that scrolling does not re-render thirty sections. Only the
 * handful of components that genuinely display the index — the HUD, the dot
 * rail, the label bar — subscribe. The sections themselves are static markup
 * whose visual state is driven by a `data-active` attribute written
 * imperatively, never by React state.
 */

let index = 0
let settled = true
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const activeSection = {
  get: () => index,
  isSettled: () => settled,
  set(next: number) {
    if (next === index) return
    index = next
    settled = false
    emit()
  },
  markSettled() {
    if (settled) return
    settled = true
    emit()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useActiveSection() {
  return useSyncExternalStore(
    activeSection.subscribe,
    activeSection.get,
    () => 0,
  )
}
