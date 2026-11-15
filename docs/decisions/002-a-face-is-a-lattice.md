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
