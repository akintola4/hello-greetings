'use client'

import { useRef } from 'react'
import { flushSync } from 'react-dom'
import { useTheme } from 'next-themes'
import { useReducedMotion } from '@/lib/motion/motion-preference'
import { useHydrated } from '@/lib/react/browser-state'

/**
 * Theme toggle with a circular View Transitions wipe opening from the button.
 *
 * Everything here is in percentages, deliberately. A view-transition snapshot
 * is not guaranteed to be measured in CSS pixels, so handing it pixel
 * coordinates puts the circle at 1/devicePixelRatio of its intended position —
 * on a 2x display the wipe opens from the top-centre instead of the button,
 * and the bug is invisible if you only ever test with a centred trigger.
 * Percentages resolve against whatever box actually exists.
 *
 * Two further traps avoided:
 *  - A percentage radius in circle() resolves against sqrt((W²+H²)/2), not the
 *    width, so it has to be converted or the wipe stops short of the corner.
 *  - The animation is driven from JS with `pseudoElement` rather than through
 *    a custom property, because custom properties do not dependably inherit
 *    into the view-transition pseudo tree — and getKeyframes() will happily
 *    report the origin you intended while the browser paints a fallback.
 */
export function ThemeToggle() {
  const ref = useRef<HTMLButtonElement>(null)
  const { resolvedTheme, setTheme } = useTheme()
  // The resolved theme is not known until next-themes puts the class on <html>,
  // so the label has to wait for hydration. Reading that as an external store
  // rather than a setState in an effect means one render, not two.
  const mounted = useHydrated()
  const reduced = useReducedMotion()

  const isDark = resolvedTheme === 'dark'

  const toggle = () => {
    const next = isDark ? 'light' : 'dark'
    const btn = ref.current

    const supported =
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      !reduced &&
      btn

    if (!supported) {
      setTheme(next)
      return
    }

    const { top, left, width, height } = btn.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const w = window.innerWidth
    const h = window.innerHeight

    const furthest = Math.hypot(Math.max(x, w - x), Math.max(y, h - y))
    const radius = (furthest / Math.sqrt((w * w + h * h) / 2)) * 100
    const ox = (x / w) * 100
    const oy = (y / h) * 100

    const transition = document.startViewTransition(() => {
      // Without flushSync the state change is batched past the capture window,
      // both snapshots come out identical, and nothing animates at all.
      flushSync(() => setTheme(next))
    })

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0% at ${ox}% ${oy}%)`,
              `circle(${radius}% at ${ox}% ${oy}%)`,
            ],
          },
          {
            duration: 620,
            // One curve start to finish. Segmented keyframes with different
            // easing read as a stutter rather than a style.
            easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => {})
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={toggle}
      aria-label={mounted ? `Switch to ${isDark ? 'light' : 'dark'} mode` : 'Switch colour mode'}
      className="grid size-9 place-items-center rounded-full border border-rule text-ink-2 transition-colors hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" focusable="false">
        {mounted && isDark ? (
          // Moon
          <path
            d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        ) : (
          // Sun
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
          </g>
        )}
      </svg>
    </button>
  )
}
