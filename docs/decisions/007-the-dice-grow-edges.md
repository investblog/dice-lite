---
type: decision
status: accepted
date: 2026-11-16
tags: [architecture, rendering, colour]
project: dice-lite
---

# 007 — the dice grow edges: cut seams for paper, a frosted-glass body

## Context

Two defects converged on the same place. In the glass prototypes the interior seams were
stroked face outlines, and the user showed on screenshots that they fight the rounded corners
— the drawn quads' small rounding (RF) cannot follow the silhouette's rounding (RS), shared
edges double, lines break bluntly at the corners ("нужно срезать углы, чтобы получились
линии"). The same softness, the user then showed, exists in the shipping flat build: the
1.4-unit airbrush (`sf`) blurs the whole face group, so the boundaries between faces survive
only as tone steps and the corners read as smudges.

Prototyping also surfaced two traps that measurement, not eyes, caught (the user: "решения
лучше измерить"):

- the face quads are drawn with `HG = H + 2` — they overlap their neighbours on purpose and
  share no vertices, so matching drawn corners finds no seams; the true edges live at the
  cube's ±H corners (the silhouette's own hull points);
- a prototype bug rendered `stroke-opacity="15"` (clamped to 1) — every "subtle 0.15" judgement
  made on those renders described a full-strength line.

## Decision

**Seams.** The three interior edges of the visible faces are drawn as open segments between
the true shared corners (each pair of visible faces shares exactly one cube edge), painted on
top of the faces, and the silhouette clip cuts both rounded ends — at a rounded cube the faces
do not meet in a point, they converge through the rounding. One geometry, two paints:

- `body: 'paper'` (the default flat dice): `ink` at **0.15**, width 1.4 — measured as the
  smallest alpha whose typical edge signal clears the render noise floor twofold (raster
  subtraction against the seam-less render: p50 Δ 20/255 at 0.15 vs 31.6 at 0.25, noise <2,
  a full-strength line ≈215);
- `body: 'glass'`: `outline`, width 2.2.

**Glass.** `body: 'glass'` draws frosted acrylic: the silhouette filled with the `die` colour
pushed to near-white at **55%** opacity, stroked in `outline` at 2.6; no face gradients, no
airbrush filter, no sheen overlay; pips solid `pip`; shadows unchanged. Pure wireframe was
rejected on renders: unlike roulette's line art (concentric geometry that never occludes),
three pip planes of a die overlap in one projection and only fills — or frost — separate
them. The translucency is the realism: dice behind show through, muted, and the far-to-near
paint order does the occlusion honestly.

## Consequences

- The default output changes (paper dice gain the seams) — golden hashes re-roll before the
  0.1.0 tag; the library is unreleased, the contract is not yet public.
- No new seeded streams: seams derive from the projection; ids change with the body because
  they are keyed by what is drawn (defs carry fewer colours in glass — the unused gradients
  are not emitted).
- A `#hex`/`rgb()` pin on `pip` shades through gradients in paper and sits flat in glass —
  the solid fill cannot mix; the exception is noted where the pin rule lives.

## Addendum (2026-11-16, same day) — the seams stop at the rounding

The user caught the defect on the library's own cover image: seams ran corner-to-corner, so
each face's front corners were sharp meeting points while the silhouette corners were
rounded — "the front side reads square, the far corners read rounded". A real rounded cube's
edges never reach the vertex.

The trim is exact, not a fudge factor. At the **nose** (the interior corner the three faces
share) each seam is shortened by rquad2's own tangent rule on each adjacent wedge —
`k = min(RS, len/3, len/3)`, the nearest rounding wins. At the **silhouette** the seam ends
where it meets the rounded-corner Q-curve itself: tangent points `k` along both hull edges,
control at the corner, solved as a quadratic against the seam line — a chord-approximation
would overshoot the silhouette by the curve's sagitta (~6 units, visible).

The clip stays as a belt-and-suspenders guard; the geometry now does the cutting. Budget
consequence measured and recorded in ADR 006: 7596 → 8359 B, ceiling 8448.

The trim alone proved insufficient the same hour: bare stops at the nose read as a ragged
triple point — each face's corner still skewed, "you fixed only one face". So every pair of
stops now joins through a small Q-arc with the control point at the nose — rquad2's own
corner construction, tangent to both seams at any stop distance. One arc per face, same
paint as the seams: every corner of every face reads rounded alike, and the nose matches the
silhouette's vocabulary. Measured: 8432 B, still under the 8448 ceiling.

One more convergence remained — and it was not the nose. The user's third screenshot put
arrows on every silhouette corner: the seam ends sat ON the rounded outline and merged with
it into pointed junctions, and at overlapping dice the bold glass seams crossing the felt
read as defects. Measurement (isPointInFill/isPointInStroke over every seam end) showed the
ends exactly on the curve — geometry right, reading wrong. Two corrections:

- the Q-curve crossing now selects the root ON the seam segment nearest the corner (by the
  segment parameter s, not the curve's t — the smallest-t root can sit on the line's
  extension, outside the silhouette);
- each seam end is pulled one stroke-width back inside the boundary. A hairline gap reads
  as "the edge meets the boundary and stops" — the technical-drawing convention — and keeps
  overlapping glass dice legible.

## Addendum 2026-11-17 (0.4.0) — the far corners round like the nose

The user's next look at the glass icon put arrows on the same three silhouette junctions:
with the nose rounded, they were the last place a face kept sharp corners — a seam meeting
the outline at a straight angle, a gap or no gap. On a rounded cube every face is a rounded
square; these corners read square. Two prototypes, outside the library, decided the shape:

- **Forking at the hull vertex fails.** Two arcs from the seam into the outline's own tangent
  points, control at the hull corner, copy the nose literally — but the hull corner lies
  outside the drawn outline, so at the bottom vertex the corner patch shrank to a pinch, and
  where the seam meets the outline at a glancing angle the arc curled into a loop.
- **Fillets at the true crossing hold.** The seam stops 18 units (projection) short of X,
  its crossing with the outline Q-curve (the root chosen as above); a Q-fillet with control
  X runs from that stop to the outline point ≈ 18 units of arc length from X on each side —
  tangent to the seam at one end, to the outline at the other. On the **acute side** (seam
  to outline under 70°) the fillet curls into an "eye" at stroke width, so it is not drawn:
  the seam flows into the outline on its obtuse side alone. Measured over 200 seeds, the
  angles cluster at 43–59° and 80–115°, nothing between — 70° splits them with room; the
  bottom vertex and one side vertex take one fillet, the other side vertex two.

The fillets meet the outline tangentially, so the one-stroke pull-back above is retired:
a tangent join cannot read as the pointed junction it guarded against. Radii 10/18/26 were
rendered at the vertex scale; 10 reads as a speck, 26 widens the eye, 18 stands. Paper's
seams are quiet ink, so the change there is subtle; glass, where the user saw it, gains the
most.

Each fillet rides its seam's path as a subpath — `M far L stop M stop Q X T` — not a path of
its own: the same paint, so the same picture, without repeating the stroke attributes four
times a die (+17% raw output as separate paths, +3.6% as subpaths, ADR 006), and the quiet
paper ink no longer doubles where a fillet leaves its seam. Pinned by a longhand test (each
fillet starts at its seam's stop, its control continues the seam, its end lies on the
silhouette, its angle is ≥ 70°), seen red under four mutations.
