import { DoodleCrowd } from '@/components/sections/finale/doodle-crowd'
import { TOTAL, TOTAL_WORD } from '@/lib/stats'

/**
 * The share card, as a route.
 *
 * `scripts/generate-og.mjs` screenshots this at exactly 1200×630 and writes
 * `app/opengraph-image.png`. Keeping it a route rather than an `ImageResponse`
 * means the card is rendered by the same browser that renders the site, so it
 * gets the real `next/font` Geist, the real `oklch()` tokens and the real
 * crowd SVG. Satori — which is what `next/og` runs on — supports none of those
 * three: it has no `oklch()`, it cannot read the WOFF2 the script faces ship
 * as, and there is no Geist binary in this repo for it to load.
 *
 * It is also the thing you can look at while getting the composition right,
 * which is the only reason the crowd artwork was ever fixable. See
 * `app/preview/crowd/page.tsx`.
 *
 * Nothing here is a count typed by hand. `TOTAL_WORD` drives the headline the
 * same way it drives the finale, so adding a language updates the share card.
 */
export default function OgPreview() {
  return (
    // Fixed pixels, not viewport units: this has to be 1200×630 regardless of
    // the window it happens to be opened in.
    <main
      data-og-card
      className="flex flex-col overflow-hidden bg-paper"
      style={{ width: 1200, height: 630, padding: 48 }}
    >
      {/* The site's own header line, which is what makes the card read as
          this site rather than as a stock illustration. */}
      <div className="flex shrink-0 items-baseline justify-between border-b border-rule pb-4 font-mono text-[15px] uppercase tracking-[0.18em] text-ink-3">
        <span className="text-ink">Hello</span>
        <span>A study of greeting &middot; {TOTAL} languages</span>
      </div>

      {/* The crowd takes whatever height is left and crops, exactly as it does
          in the finale — running off both edges is what says there are more of
          these than fit in the frame. */}
      <div className="relative min-h-0 flex-1 overflow-hidden py-6">
        <DoodleCrowd className="h-full w-full" />
      </div>

      <p className="shrink-0 pb-1 text-center text-[44px] leading-[1.12] tracking-[-0.02em] text-balance">
        {TOTAL_WORD} different words. One thing being said.
      </p>
    </main>
  )
}
