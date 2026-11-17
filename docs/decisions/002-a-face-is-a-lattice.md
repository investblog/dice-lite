---
type: decision
status: accepted
date: 2026-11-15
tags: [architecture, geometry]
project: dice-lite
---

# 002 — a face is a 3×3 lattice: pips are data and the picture carries no path data

## Context

The family's no-signature rule forbids fixed path data in the output. Cards-lite needed 13
glyph paths for the card ranks; slots-lite needed 8 for the classic symbols — each bought a
counted, tested exception (cards' ADR 005, slots' ADR 004). The question dice poses: does the
subject need any fixed drawing at all?

## Decision

**No.** A die face is a value on a 3×3 lattice: the six classic values are six rows of a
position table, the body is a `<rect rx>`, each pip is a `<circle>`, the table is rects and a
pattern, and the family lattice is generated, not drawn. The output carries **zero `d`
attributes that the seed cannot change** — the first sibling with no counted exception. A
pinned test asserts the seed-invariant `d` set of every output is empty.

The single-face scope is part of the decision: a cube in perspective with three visible faces
would need real path data (the silhouette) and the opposite-sides-sum-to-seven bookkeeping. It
is backlog; one face is how dice read at hero size, and the family draws the minimum that reads
(roulette's `view: 'top'` is the same code with θ = 0; here the face is the whole die).

## Consequences

- The value-to-pips table is data in the library, readable and checkable longhand in the tests.
- `die()` and `toss()` share the same face renderer; an icon is a throw of one on a blank em.
- A future perspective view is an ADR of its own and re-opens the counted-exception question.

## Addendum 2026-11-16 (M1, decided on screen with Codex's review) — the subject is a projected cube

The single-face scope is reversed: a die reads as dice only as a **rounded cube with three
visible faces** — the casino-dice reference the art director picked. What survives of this
ADR: the picture still carries **no fixed path data** — cube, faces and pips are projected
at runtime from a seeded orientation (`die:i:orient`, signed magnitude 0.36–0.44 rad), so
the seed-invariant `d` set stays empty and its test stands unchanged. The 3×3 lattice
survives as the pip layout on each face; pips are circles in 3D, drawn as exactly projected
ellipses. Opposite-sides-sum-to-seven returns, but by construction: the die rests on the
face opposite its top value (a six-entry rest-rotation table), so visible values are always
consistent with a real die. True perspective (vanishing points) stays backlog — this is an
orthographic bake at ~52°.

## Addendum 2026-11-17 — the fifth die leaves the centre

The quincunx put die 4 at the centre slot, 126 units from the pair at its sides — on the
ground that is 126 between cubes 200 on an edge, so the centre die stood half inside its
neighbours and paint order only hid it: `dice: 5` read as a heap with pips covered. Four
candidates that keep slots 0–3 where they are (so `dice` still appends) were rendered over six
seeds, both themes and glass, each at least one cube edge (≥ 200 ground units, screen y over
sin 52°) from every neighbour; the user chose **front-right, `[1.65, 1.15]`**. The table grows
to a landscape felt, which suits a hero background; the felt stays centred, so the far-left
corner carries bare felt. From 0.3.0 `dice: 5` places die 4 there; `dice: 2–4` are untouched.

## Addendum 2026-11-17 — the lattice lies on the ground

The dice were projected at 52° and placed on the ground (screen y = ground y · sin 52°), but
the felt's lattice was still drawn in the screen plane: regular hexagons, square octagon
cells, so under a bare table (`felt`/`rail: 'transparent'`, the README's showcase) the dice
stood in front of a wall rather than on a floor. From 0.5.0 the pattern is foreshortened by
the same camera: `scale(1 sin PITCH)` outermost in its `patternTransform`, after the seeded
phase and turn — a tile turned on the ground, then seen from above. It stays orthographic,
like the cube: no convergence, since an SVG pattern is affine and true perspective remains
backlog. Seen in Chromium, Firefox and WebKit for all three kinds and both hex orientations:
the non-uniform scale opens no tile seams. The felt's corners and the rail's widths keep
their screen-plane geometry (not chosen for this change); every `toss()` changes bytes.

