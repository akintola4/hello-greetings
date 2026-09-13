import { CROWD_HEIGHT, CROWD_PEOPLE, CROWD_WIDTH, VIEWBOX_MOBILE } from './crowd-data'

/**
 * The closing tableau: a crowd of hand-drawn faces.
 *
 * Artwork is Notionists from DiceBear's CC0 collection — public domain, free
 * commercially, no attribution required. Generated and inlined at build time,
 * so the browser never loads a drawing library.
 *
 * Drawn strictly in array order — back row first — because the overlap depends
 * on it: each character sits on an opaque plate, so whoever is drawn later
 * cleanly hides whoever is behind. The plate is necessary because these avatars
 * have transparent backgrounds; without it the crowd shows heads through heads.
 *
 * Colours were mapped to theme tokens at generation time. Notionists uses only
 * black and white, so `--ink` and `--paper` carry it in both themes and the
 * line art inverts correctly in dark mode rather than vanishing.
 */
export function DoodleCrowd({
  className,
  viewBox,
}: {
  className?: string
  /** Override for the isolated preview, which has no matchMedia swap. */
  viewBox?: string
}) {
  return (
    <svg
      // Mobile is the authored default: it is the safer no-JS fallback, and the
      // desktop viewBox is swapped in from matchMedia in finale-section.
      viewBox={viewBox ?? VIEWBOX_MOBILE}
      data-hand-chain
      className={className}
      role="img"
      aria-label={`A crowd of ${CROWD_PEOPLE.length} hand-drawn faces, packed together and overlapping, every one of them different, continuing past every edge of the frame.`}
      preserveAspectRatio="xMidYMid slice"
    >
      {CROWD_PEOPLE.map((p) => (
        <g key={p.id}>
          <ellipse cx={p.px} cy={p.py} rx={p.pr} ry={p.pr * 1.12} fill="var(--paper)" />
          <g transform={p.t} dangerouslySetInnerHTML={{ __html: p.svg }} />
        </g>
      ))}
    </svg>
  )
}

export { CROWD_WIDTH, CROWD_HEIGHT }
