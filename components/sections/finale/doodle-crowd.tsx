import {
  CROWD_HEIGHT,
  CROWD_PEOPLE,
  CROWD_WIDTH,
  VIEWBOX_MOBILE,
} from './crowd-data'

/**
 * The closing tableau: a crowd of faces.
 *
 * Every path is generated at build time by `scripts/generate-crowd.mjs` using
 * Rough.js, so the browser never loads a drawing library and the output is
 * byte-stable between runs.
 *
 * Drawn strictly in array order — back row first — because the overlap depends
 * on it: each character's head and shoulders are filled with the paper colour,
 * so whoever is drawn later cleanly hides whoever is behind.
 *
 * That paper fill is also why there is no skin tone here. It is not that the
 * artwork declines to depict one; there is no per-person tonal value in the
 * data at all, so a hierarchy between individuals cannot be expressed.
 * Difference lives in hair, features, accessories and neckline.
 *
 * Everything is authored in its finished state, which is what lets reduced
 * motion and a no-JS render need no extra code.
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
        <g key={p.id} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          {p.paths.map((path, j) => (
            <path
              key={j}
              d={path.d}
              stroke={path.s ?? 'none'}
              fill={path.f ?? 'none'}
              strokeWidth={path.w}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      ))}
    </svg>
  )
}

export { CROWD_WIDTH, CROWD_HEIGHT }
