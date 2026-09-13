import {
  CROWD_ARMS,
  CROWD_FIGURES,
  CROWD_GROUND,
  CROWD_HEIGHT,
  CROWD_WIDTH,
  ROW_COUNT,
} from './crowd-data'

/**
 * The closing tableau: six figures, hand-drawn.
 *
 * Every path here is generated at build time by `scripts/generate-crowd.mjs`
 * using Rough.js, so the browser never loads a drawing library and the output
 * is byte-stable between runs. See that file for the geometry rules.
 *
 * Arms are drawn BEFORE the figures, so joined hands tuck behind bodies rather
 * than sitting on top of them.
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
      aria-label={`${CROWD_FIGURES.length} hand-drawn figures of different heights and builds, including a child, standing in a line and holding each other's hands.`}
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
