import { DoodleCrowd } from '@/components/sections/finale/doodle-crowd'

/**
 * Isolated preview of the closing artwork.
 *
 * The artwork normally lives behind thirty-eight scroll sections inside a
 * pinned, scrubbed ScrollTrigger — which means judging it through the real page
 * means judging it mid-animation, at whatever state the scroll position
 * happened to leave it in. That is a bad way to look at a drawing.
 *
 * This renders it alone, static, at full width. No scroll, no pin, no GSAP.
 */
export default function CrowdPreview() {
  return (
    <main className="min-h-svh bg-paper p-8">
      <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
        Finale artwork — isolated preview
      </p>
      <div className="border border-rule">
        <DoodleCrowd className="h-auto w-full" />
      </div>
    </main>
  )
}
