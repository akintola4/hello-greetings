/**
 * Geometry for the closing tableau.
 *
 * The previous version of this artwork failed for one structural reason: arms
 * were drawn inside each figure's scaled transform while the clasps were
 * positioned in root coordinates. Those two points coincide only when
 * scale === 1, which was true for exactly one of the seven figures — so every
 * join had a visible gap proportional to (1 - scale), with a clasp circle
 * floating in it.
 *
 * The rule that makes that impossible: **every point that two things must
 * share is computed once, here, in root coordinates, from one table.** Figures
 * own only what is local to them (head, torso, legs). Arms and clasps live in
 * root space and read their endpoints from the same derived arrays.
 */

export const SLOT = 210
export const COUNT = 7
export const GROUND = 360
export const WIDTH = 1470
export const HEIGHT = 380

/** Reference standing height in local figure units (7.5 heads). */
export const REF_HEIGHT = 300

export type Stance = 'together' | 'apart' | 'wide'
export type Hair = 'crop' | 'long' | 'tuft' | 'bun' | 'curl' | 'wrap' | 'ponytail'
export type Hem = 'trousers' | 'skirt' | 'coat'

export interface FigureSpec {
  i: number
  /** Root-space centreline. */
  cx: number
  scale: number
  /** Shoulder width multiplier — a distinct read from overall build. */
  shoulderMul: number
  /** Chest/waist/hip multiplier. */
  buildMul: number
  stance: Stance
  hair: Hair
  hem: Hem
  /** Ramp token. Never correlates with anything but adjacency legibility. */
  fill: string
  /** True for the child, which uses 6-head proportions, not a scaled adult. */
  child?: boolean
  /** Older figure: head and neck shift forward and down. */
  headOffset?: [number, number]
  neckShorten?: number
}

/**
 * Fill assignment.
 *
 * Three tones in a period-3 sequence rather than strict ABAB, which would read
 * as a barcode. No two neighbours share a tone, so the two arms meeting at each
 * clasp always differ.
 *
 * `--fill-1` is deliberately absent: in light mode it is L 0.900 on paper
 * L 0.972 and in dark mode L 0.265 on L 0.168 — a near-invisible tint in BOTH
 * modes, which is right for a cast shadow and wrong for a body.
 *
 * The ramp is re-mapped rather than inverted for dark mode, so tonal order is
 * preserved and this adjacency rule is mode-agnostic by construction.
 */
export const FIGURES: FigureSpec[] = [
  { i: 0, cx: 105, scale: 1.02, shoulderMul: 1.08, buildMul: 1.0, stance: 'apart', hair: 'crop', hem: 'trousers', fill: 'var(--fill-2)' },
  { i: 1, cx: 315, scale: 0.94, shoulderMul: 0.94, buildMul: 0.92, stance: 'together', hair: 'long', hem: 'skirt', fill: 'var(--fill-3)' },
  { i: 2, cx: 525, scale: 0.7, shoulderMul: 0.9, buildMul: 1.02, stance: 'together', hair: 'tuft', hem: 'trousers', fill: 'var(--fill-4)', child: true },
  { i: 3, cx: 735, scale: 1.0, shoulderMul: 1.0, buildMul: 1.0, stance: 'apart', hair: 'bun', hem: 'trousers', fill: 'var(--fill-3)' },
  { i: 4, cx: 945, scale: 1.06, shoulderMul: 1.12, buildMul: 1.1, stance: 'wide', hair: 'curl', hem: 'trousers', fill: 'var(--fill-4)' },
  { i: 5, cx: 1155, scale: 0.9, shoulderMul: 0.96, buildMul: 0.96, stance: 'together', hair: 'wrap', hem: 'coat', fill: 'var(--fill-2)' },
  { i: 6, cx: 1365, scale: 0.96, shoulderMul: 0.98, buildMul: 1.06, stance: 'together', hair: 'ponytail', hem: 'trousers', fill: 'var(--fill-3)', headOffset: [4, 4], neckShorten: 4 },
]

/** Centre-outward. Far more satisfying to watch than left to right. */
export const DRAW_ORDER = [3, 2, 4, 1, 5, 0, 6]

/** Stance x-offsets at hip, knee and ankle. */
export const STANCE: Record<Stance, { hip: number; knee: number; ankle: number }> = {
  together: { hip: 12, knee: 11, ankle: 12 },
  apart: { hip: 14, knee: 17, ankle: 24 },
  wide: { hip: 15, knee: 21, ankle: 31 },
}

export interface Landmarks {
  head: { cy: number; rx: number; ry: number }
  neck: { y1: number; y2: number; w: number }
  /** Left half of the torso, top to bottom. Mirrored to close the polygon. */
  torso: Array<[number, number]>
  legs: { hip: number; knee: number; ankle: number }
}

/** Adult: 7.5 heads. Hip line at exactly half of standing height. */
export const ADULT: Landmarks = {
  head: { cy: -280, rx: 10.5, ry: 15.5 },
  neck: { y1: -263, y2: -243, w: 15 },
  torso: [
    [-36, -240],
    [-34, -212],
    [-22, -178],
    [-27, -150],
    [-24, -140],
  ],
  legs: { hip: -150, knee: -80, ankle: -14 },
}

/**
 * Child: 6 heads, not a scaled-down adult.
 *
 * This is the whole read. A 0.70-scaled adult looks like a distant adult; a
 * proportionally larger head and shorter legs look like a child.
 */
export const CHILD: Landmarks = {
  head: { cy: -272, rx: 14.25, ry: 20.5 },
  neck: { y1: -252, y2: -241, w: 14 },
  torso: [
    [-31, -238],
    [-30, -212],
    [-21, -182],
    [-25, -152],
    [-23, -140],
  ],
  legs: { hip: -140, knee: -88, ankle: -14 },
}

export const landmarksFor = (f: FigureSpec) => (f.child ? CHILD : ADULT)

export interface Point {
  x: number
  y: number
}

/** Root-space shoulder points. Arms attach here, never inside the figure. */
export function shoulderOf(f: FigureSpec, side: -1 | 1): Point {
  return {
    x: f.cx + side * 32 * f.shoulderMul * f.scale,
    y: GROUND - 238 * f.scale,
  }
}

/** How far an arm can reach before it is straight. */
export const reachOf = (f: FigureSpec) => 131 * f.scale

export interface Join {
  index: number
  left: FigureSpec
  right: FigureSpec
  x: number
  y: number
  /** Darker of the two figures' tokens, so the clasp can never float. */
  fill: string
}

/**
 * Hand joins, at the slot midpoints.
 *
 * The height tracks the average scale of the pair, clamped: a tall pair joins
 * hands higher, a pair including the child joins lower. The clamp stops the
 * child's join dropping so far that the adults' arms look broken.
 */
export const JOINS: Join[] = Array.from({ length: COUNT - 1 }, (_, i) => {
  const left = FIGURES[i]
  const right = FIGURES[i + 1]
  const avg = (left.scale + right.scale) / 2
  const above = Math.max(175, Math.min(192, 195 * avg))
  const rank = (t: string) => Number(t.replace(/\D/g, ''))
  return {
    index: i,
    left,
    right,
    x: SLOT + i * SLOT,
    y: GROUND - above,
    fill: rank(left.fill) >= rank(right.fill) ? left.fill : right.fill,
  }
})

export interface Arm {
  id: string
  d: string
  width: number
  fill: string
}

/**
 * One quadratic per arm, never a two-segment polyline.
 *
 * A polyline with a round join reads as a broken stick; a single curve reads as
 * a relaxed limb. The bow is slack-proportional, which is what makes the
 * child's near-full reach reads as stretching while the adults stay relaxed —
 * that contrast falls out of the arithmetic rather than being drawn in.
 *
 * The path always starts at the shoulder, because the reveal draws it
 * shoulder-to-hand.
 */
function arm(
  id: string,
  s: Point,
  h: Point,
  reach: number,
  width: number,
  fill: string,
  /** Force the bow's horizontal direction. Hanging arms must curve away from
      the body; left to itself the perpendicular bows a near-vertical arm
      inward, which fuses it to the torso as a slab. */
  bowX?: -1 | 1,
): Arm {
  const dx = h.x - s.x
  const dy = h.y - s.y
  const d = Math.hypot(dx, dy) || 1
  const bow = Math.max(3, Math.min(22, 0.34 * (reach - d)))

  const ux = dx / d
  const uy = dy / d
  // Perpendicular, chosen to bow downward (positive y is down in SVG).
  let nx = -uy
  let ny = ux
  if (bowX) {
    // Horizontal bow, away from the body.
    nx = bowX
    ny = 0
  } else if (ny < 0) {
    nx = uy
    ny = -ux
  }

  const cx = (s.x + h.x) / 2 + nx * bow
  const cy = (s.y + h.y) / 2 + ny * bow

  return {
    id,
    d: `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${h.x.toFixed(2)} ${h.y.toFixed(2)}`,
    width,
    fill,
  }
}

/** Every arm in the tableau, including the two that hang at the outer edges. */
export const ARMS: Arm[] = (() => {
  const out: Arm[] = []

  for (const j of JOINS) {
    const hand = { x: j.x, y: j.y }
    out.push(
      arm(`arm-${j.index}-l`, shoulderOf(j.left, 1), hand, reachOf(j.left), 15 * j.left.scale, j.left.fill),
    )
    out.push(
      arm(`arm-${j.index}-r`, shoulderOf(j.right, -1), hand, reachOf(j.right), 15 * j.right.scale, j.right.fill),
    )
  }

  // The outermost arms hang at their sides rather than trailing into empty
  // space, which was one of the defects in the previous version.
  const first = FIGURES[0]
  const last = FIGURES[COUNT - 1]
  const hangFirst = shoulderOf(first, -1)
  const hangLast = shoulderOf(last, 1)
  out.push(
    arm(
      'arm-hang-l',
      hangFirst,
      { x: hangFirst.x - 20 * first.scale, y: GROUND - 126 * first.scale },
      reachOf(first),
      15 * first.scale,
      first.fill,
      -1,
    ),
  )
  out.push(
    arm(
      'arm-hang-r',
      hangLast,
      { x: hangLast.x + 20 * last.scale, y: GROUND - 126 * last.scale },
      reachOf(last),
      15 * last.scale,
      last.fill,
      1,
    ),
  )

  return out
})()

/** Mobile keeps figures 2, 3 and 4 whole — the child and the two either side. */
export const VIEWBOX_MOBILE = '430 0 610 380'
export const VIEWBOX_DESKTOP = `0 0 ${WIDTH} ${HEIGHT}`
