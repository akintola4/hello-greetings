'use client'

import { useId } from 'react'
import {
  ARMS,
  COUNT,
  FIGURES,
  GROUND,
  JOINS,
  STANCE,
  VIEWBOX_MOBILE,
  WIDTH,
  landmarksFor,
  shoulderOf,
  type FigureSpec,
} from './chain-geometry'

/**
 * The closing tableau: seven figures holding hands.
 *
 * Solid silhouettes, no outlines. Every figure is built from overlapping
 * primitives that all share one fill, so they merge into a single clean shape
 * while each individual piece stays simple geometry.
 *
 * Two techniques do the heavy lifting:
 *
 * 1. **Self-swell.** The mass group carries a `stroke` in its OWN fill colour
 *    at width 9 with round joins. Every shape inflates uniformly by 4.5 units
 *    and every corner rounds off, so a crude straight-edged polygon renders as
 *    a soft carved mass — and head, neck, torso and limbs weld together with
 *    no visible seams. That welding is the specific thing outline linework
 *    could not do.
 * 2. **Limbs are round-capped strokes.** A round-capped stroke IS a capsule,
 *    and a capsule is a limb. Shoulders and hips stop being a problem because
 *    the capsule simply overlaps the torso.
 *
 * Skin tone is deliberately not attempted. The palette is greyscale, and
 * mapping skin tone onto a grey ramp produces an explicit value hierarchy —
 * someone would be darkest and someone lightest, and the ramp would say which.
 * Difference lives in silhouette only: height, build, stance, hair, hem.
 *
 * Note for anyone running SVGO over this: its default `cleanupIds` pass will
 * rename the ids the finale timeline animates against, silently breaking it.
 * Ids are namespaced with useId() here, but `cleanupIds` must still be off.
 */

const SWELL = 9

function torsoPath(f: FigureSpec) {
  const lm = landmarksFor(f)
  const pts = lm.torso
  const mul = (idx: number) => (idx === 0 ? f.shoulderMul : f.buildMul)

  const left = pts.map(([x, y], i) => `${(x * mul(i)).toFixed(1)} ${y}`)
  const right = [...pts]
    .reverse()
    .map(([x, y], i) => `${(-x * mul(pts.length - 1 - i)).toFixed(1)} ${y}`)

  return `M ${left.join(' L ')} L ${right.join(' L ')} Z`
}

function Hair({ f }: { f: FigureSpec }) {
  const lm = landmarksFor(f)
  const [ox, oy] = f.headOffset ?? [0, 0]

  switch (f.hair) {
    case 'long':
      // Reaches below the shoulder line so it merges into the torso — a shape
      // that stops at the skull is what reads as a helmet.
      return (
        // A solid mass behind the head. The previous version carried a notch
        // for the face, which sat BELOW the head ellipse and so showed through
        // as two paper-coloured gaps.
        <path d="M -26 -240 C -30 -266 -28 -292 0 -300 C 28 -292 30 -266 26 -240 L 27 -231 L -27 -231 Z" />
      )
    case 'bun':
      // Asymmetric, and it breaks the skull silhouette.
      return <circle cx={-13} cy={-292} r={6.5} />
    case 'curl':
      // Replaces the head outright: a big round mass with a jaw notch.
      return (
        <>
          <ellipse cx={0} cy={-282} rx={19} ry={20} />
          <ellipse cx={2} cy={-268} rx={9} ry={11} />
        </>
      )
    case 'wrap':
      // Follows the skull, then flares only slightly — a steep trapezoid
      // reads as a lampshade rather than a headwrap.
      return <path d="M -21 -246 C -25 -272 -16 -299 0 -299 C 16 -299 25 -272 21 -246 L 22 -234 L -22 -234 Z" />
    case 'tuft':
      return null
    case 'ponytail':
      return null
    default:
      return null
  }
}

function HairStroke({ f }: { f: FigureSpec }) {
  if (f.hair === 'tuft') return <path d="M 3 -296 L 9 -309" strokeWidth={7} />
  if (f.hair === 'ponytail') return <path d="M -10 -286 Q -21 -274 -22 -258" strokeWidth={10} />
  return null
}

function Hem({ f }: { f: FigureSpec }) {
  if (f.hem === 'skirt') return <path d="M -26 -152 L 26 -152 L 40 -95 L -40 -95 Z" />
  if (f.hem === 'coat') return <path d="M -26 -152 L 26 -152 L 36 -70 L -36 -70 Z" />
  return null
}

function Legs({ f }: { f: FigureSpec }) {
  const lm = landmarksFor(f)
  const s = STANCE[f.stance]
  // A skirt or coat hides the thighs, so they are simply not drawn.
  const from = f.hem === 'skirt' ? -95 : f.hem === 'coat' ? -70 : lm.legs.hip
  const showThigh = f.hem === 'trousers'

  const leg = (side: -1 | 1) => {
    const hipX = side * s.hip
    const kneeX = side * s.knee
    const ankleX = side * s.ankle
    return (
      <g key={side}>
        {showThigh ? (
          <path d={`M ${hipX} ${lm.legs.hip} L ${kneeX} ${lm.legs.knee}`} strokeWidth={22} />
        ) : null}
        <path
          d={`M ${kneeX} ${Math.max(lm.legs.knee, from)} L ${ankleX} ${lm.legs.ankle}`}
          strokeWidth={15}
        />
        {/* Foot bottom edge lands exactly on the ground line. */}
        <path
          d={`M ${ankleX - side * 4} -7 L ${ankleX + side * 16} -7`}
          strokeWidth={14}
        />
      </g>
    )
  }

  return (
    <>
      {leg(-1)}
      {leg(1)}
    </>
  )
}

function Figure({ f }: { f: FigureSpec }) {
  const lm = landmarksFor(f)
  const [ox, oy] = f.headOffset ?? [0, 0]
  const neckTop = lm.neck.y1 + (f.neckShorten ?? 0)

  return (
    <g transform={`translate(${f.cx} ${GROUND}) scale(${f.scale})`}>
      {/* Masses. The same-colour stroke is the self-swell. */}
      <g
        fill={f.fill}
        stroke={f.fill}
        strokeWidth={SWELL}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d={torsoPath(f)} />
        <Hem f={f} />
        <g transform={ox || oy ? `translate(${ox} ${oy})` : undefined}>
          {f.hair !== 'curl' ? (
            <ellipse
              cx={0}
              cy={lm.head.cy}
              rx={lm.head.rx + (f.hair === 'crop' ? 1 : 0)}
              ry={lm.head.ry}
            />
          ) : null}
          <Hair f={f} />
        </g>
      </g>

      {/* Limbs, as capsules. */}
      <g fill="none" stroke={f.fill} strokeLinecap="round" strokeLinejoin="round">
        <path
          d={`M ${ox} ${neckTop + oy} L ${ox} ${lm.neck.y2 + oy}`}
          strokeWidth={lm.neck.w}
        />
        <g transform={ox || oy ? `translate(${ox} ${oy})` : undefined}>
          <HairStroke f={f} />
        </g>
        <Legs f={f} />
      </g>
    </g>
  )
}

export function HandChain({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '')

  return (
    <svg
      // Mobile is the authored default: it is the safer no-JS fallback, and the
      // desktop viewBox is swapped in from matchMedia in finale-section.
      viewBox={VIEWBOX_MOBILE}
      data-hand-chain
      className={className}
      role="img"
      aria-label="Seven figures of different heights and builds standing in a line, including a child, each holding the hands of the people beside them."
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        {FIGURES.map((f) => (
          <clipPath key={f.i} id={`${uid}-wipe-${f.i}`} clipPathUnits="userSpaceOnUse">
            {/* Authored OPEN. The animation closes it and reopens it, so the
                finished tableau is the default state — which is also what
                reduced motion and a no-JS render get, for free. */}
            <rect className="fig-wipe" x={f.cx - 120} y={-20} width={240} height={400} />
          </clipPath>
        ))}
      </defs>

      {/* Ground. */}
      <rect id="ground" x={0} y={GROUND} width={WIDTH} height={2} fill="var(--fill-2)" />

      {/* Contact shadows sit outside the figure clips so the wipe cannot chop
          them at the ground line. --fill-1 is a near-invisible tint in both
          themes, which is exactly right for a shadow. */}
      {FIGURES.map((f) => (
        <ellipse
          key={f.i}
          className="fig-shadow"
          cx={f.cx}
          cy={GROUND + 1}
          rx={(STANCE[f.stance].ankle + 16) * f.scale + 12}
          ry={5}
          fill="var(--fill-1)"
        />
      ))}

      {FIGURES.map((f) => (
        <g key={f.i} id={`figure-${f.i}`} clipPath={`url(#${uid}-wipe-${f.i})`}>
          <g className="fig-rise">
            <Figure f={f} />
          </g>
        </g>
      ))}

      {/* Arms live in ROOT space, not inside a figure transform. This is the
          whole fix: their endpoints are the same numbers the clasps use, so a
          gap is structurally impossible at any scale. */}
      <g fill="none" strokeLinecap="round">
        {ARMS.map((a) => (
          <path
            key={a.id}
            className="chain-arm"
            data-arm={a.id}
            d={a.d}
            stroke={a.fill}
            strokeWidth={a.width}
            pathLength={1}
          />
        ))}
      </g>

      {/* Clasps. Placed exactly where both arms terminate, so they can never
          float — and filled with the darker of the two tones. */}
      {JOINS.map((j) => {
        const sl = shoulderOf(j.left, 1)
        const sr = shoulderOf(j.right, -1)
        const angle = (Math.atan2(sr.y - sl.y, sr.x - sl.x) * 180) / Math.PI
        const avg = (j.left.scale + j.right.scale) / 2
        return (
          <ellipse
            key={j.index}
            className="chain-clasp"
            data-clasp={j.index}
            cx={j.x}
            cy={j.y}
            rx={11 * avg}
            ry={9 * avg}
            transform={`rotate(${angle.toFixed(2)} ${j.x} ${j.y})`}
            fill={j.fill}
          />
        )
      })}
    </svg>
  )
}

export { COUNT }
