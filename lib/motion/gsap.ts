import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/**
 * Single registration point for GSAP plugins and global config.
 *
 * `ignoreMobileResize` is the specific fix for iOS: when the address bar
 * collapses, the viewport height changes and ScrollTrigger would otherwise
 * refresh and move every snap target out from under the user's thumb.
 */
export function initGsap() {
  if (registered || typeof window === 'undefined') return { gsap, ScrollTrigger }
  gsap.registerPlugin(ScrollTrigger)
  ScrollTrigger.config({ ignoreMobileResize: true })
  registered = true
  return { gsap, ScrollTrigger }
}

export { gsap, ScrollTrigger }
