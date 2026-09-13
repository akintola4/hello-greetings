import {
  CROWD_ARMS,
  CROWD_FIGURES,
  CROWD_GROUND,
  CROWD_HEIGHT,
  CROWD_WIDTH,
  ROW_COUNT,
} from './crowd-data'

/**
 * The closing tableau: a crowd, hand-drawn.
 *
 * Every path here is generated at build time by `scripts/generate-crowd.mjs`
 * using Rough.js, so the browser never loads a drawing library and the output
 * is byte-stable between runs. See that file for the geometry rules.
 *
 * Rendered back row to front: within each row the arms are drawn BEFORE the
 * figures, so joined hands tuck behind bodies rather than sitting on top of
 * them. Depth comes from scale and tone — back rows smaller and lighter — not
 * from drawn perspective.
 *
 * Everything is authored in its FINISHED state. Only the full-motion branch of
 * the timeline closes it, which is why reduced motion and a no-JS render need
 * no extra code at all.
 */
export function DoodleCrowd({ className }: { className?: string }) {
  const rows = Array.from({ length: ROW_COUNT }, (_, r) => r)

  return (
    <svg
      viewBox={`0 0 ${CROWD_WIDTH} ${CROWD_HEIGHT}`}
      data-hand-chain
      className={className}
      role="img"
      aria-label={`A crowd of ${CROWD_FIGURES.length} small hand-drawn figures in three rows, every one of them different, each holding the hands of the people beside them, the rows running off both edges of the frame.`}
      preserveAspectRatio="xMidYMax meet"
    >
      <rect
        id="ground"
        x={0}
        y={CROWD_GROUND + 2}
        width={CROWD_WIDTH}
        height={1.5}
        fill="var(--fill-3)"
      />

      {rows.map((r) => (
        <g key={r} data-crowd-row={r}>
          {CROWD_ARMS.filter((a) => a.row === r).map((a, i) => (
            <g key={i} className="crowd-arm">
              {a.paths.map((p, j) => (
                <path
                  key={j}
                  d={p.d}
                  stroke={p.stroke}
                  fill={p.fill}
                  strokeWidth={p.strokeWidth}
                  strokeLinecap="round"
                />
              ))}
            </g>
          ))}

          {CROWD_FIGURES.filter((f) => f.row === r).map((f) => (
            <g
              key={f.id}
              className="crowd-figure"
              data-row={r}
              data-cx={f.x}
              data-cy={f.y}
            >
              <g transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
                {f.paths.map((p, j) => (
                  <path
                    key={j}
                    d={p.d}
                    stroke={p.stroke}
                    fill={p.fill}
                    strokeWidth={p.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}
