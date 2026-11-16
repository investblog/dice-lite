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
