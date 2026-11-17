---
type: decision
status: accepted
date: 2026-11-15
tags: [architecture, colour]
project: dice-lite
---

# 004 — the table takes the brand: felt cascade and the light-theme escape

## Context

The classic slot machine carries classic colours — a red seven, a gold bell — so slots-lite
ran the family's hue capture and kept four hue roles. A casino table carries almost none: dice
are paper with black pips, and the colour lives in the table itself. The questions are where
the brand colours go, and what happens to a large filled felt on a white page — the failure
paid for in roulette, cards and slots alike.

## Decision

**The table is the brand, the dice are the classic.** The first chromatic brand colour (LCh
chroma ≥ 12) is the `felt`; the second, when present, pads the `rail`; a gold-hue brand colour
tones the brass `trim` (slots' trim formula); the dice stay paper (`die`, the family's strip
formula, both themes) with near-black `pip`s (cards' spade formula). Every brand colour given
is used; the dice read as dice whatever the brand.

Under `theme: 'light'` the **table defaults to `line`** — felt and rail drawn as rules in
`outline`, the felt hue's middle `derive()` stop guaranteed ≥ 2.5 against the page — because a
filled felt over a white page was a pastel field in every sibling that tried it. An explicit
`style: 'flat'` still fills it; the dice are unaffected.

The concrete table — seven brands × both themes, marks at 360 px — is prototyped **outside the
library** at M1 and decided by the user; this ADR then gains its addendum, as slots' ADR 005
did. Until then the cascade above is provisional.

## Consequences

- `palette()` exposes `felt rail trim die pip ink outline` plus the field colours; pins win over
  every role, the renderer never parses a pin.
- A third brand colour and beyond are used by the lattice/trim cascade or not at all — the M1
  addendum records the decision on the default triad (blue felt, crimson rail, gold brass).

## Addendum (2026-11-16) — the rail is a mode; the default edge is not a colour

The concrete-table ritual happened on renders — five rail treatments of the default throw
(seed 1, three dice, dark), judged by the user: a loud colour band reads as a design frame,
not a table; no edge at all loses the table; a dark surround reads as what a casino table
actually wears. Decision:

- **`rail` is a mode, not a colour.** `'auto'` (the default) paints the padded edge in the pip
  family's near-black — a dark leather surround, in both themes. `'brand'` keeps the cascade
  above verbatim: the leftover chromatic colour pads the rail, a darker `derive()` stop of the
  felt when nothing is left. `'felt'` paints the rail the felt — no visible edge. Any CSS
  colour still pins the role, as with every role.
- **The leftover question is answered: "or nothing".** Under the default mode a third brand
  colour goes unused; the brand lands on the felt and the brass, the edge stays dark.
- The `line` table is untouched — felt and rail draw as rules in `outline` either way, so the
  mode changes only the flat table's fill.

## Addendum (2026-11-17) — chrome means an all-neutral brand

"Chrome for a grey brand" means a brand with **no chromatic colour** — not a brand that lists
one neutral among chromatic ones. Through 0.2.0 any neutral entry (a white, a black, a grey —
which nearly every real brand palette carries) dropped the trim to chroma 0, so the triad plus
`#ffffff` lost its brass with the gold present. From 0.3.0 neutral entries are ignored by the
trim: a gold-hue colour tones the brass at half its chroma; a chromatic brand without one gets
the default brass (chroma 25 at hue 85); only an all-neutral brand is chrome. Pinned by test.
