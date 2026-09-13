import { CROWD_COUNT } from './crowd-data'

/**
 * The closing tableau: a crowd of hand-drawn faces, most of them waving.
 *
 * Artwork is Notionists by Zoish, from DiceBear's CC0 collection — public
 * domain, free commercially, no attribution required. Generated at build time
 * by `scripts/generate-crowd.mjs` into two files, one per theme.
 *
 * Served as a background image rather than inlined. Inlined, the drawing landed
 * in the document twice — once in the streamed HTML and again in the RSC
 * payload — which took the page to 370KB gzipped. As a background image only
 * the matching theme's file is ever fetched, it is cached, and the document
 * carries none of it.
 *
 * The theme swap is a CSS rule rather than a media query, so the in-page toggle
 * works and not just the OS setting.
 */
export function DoodleCrowd({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label={`A crowd of ${CROWD_COUNT} hand-drawn faces, packed together and overlapping, most of them waving, continuing past every edge of the frame.`}
      className={`crowd-art ${className ?? ''}`}
    />
  )
}
