---
type: decision
status: accepted
date: 2026-11-15
tags: [process, size]
project: dice-lite
---

# 006 — size budget, provisional at M0

## Context

The family measures the library gzipped and freezes the budget per version: cards-lite set the
method (terser in process + Node `gzipSync`, never the `gzip` CLI) and slots-lite froze its
budget at the measured size + 2.5% rounded up to 128. Dice is the smallest subject yet — no
glyph set, no cabinet — so a smaller budget is tempting.

## Decision

**Provisional budget 8192 B at M0**, the siblings' number, frozen after M3 at the measured
size + 2.5% rounded up to 128. The subject being small is a forecast, not a measurement —
"measure the claim, do not reason about it" — and an over-warm budget at M0 is harmless: every
trim is measured with `npm run size` before it is kept, and the freeze replaces the guess.

Forecast from the siblings' M0s (cards 3108 B, slots 3347 B, both measured): the engine port,
`roles()` and the blank table land near **3.4 KB**.

## Consequences

- `npm run size` reports against `config.sizeBudget` in package.json; CI fails over it.
- The freeze is recorded here as an addendum at M3, with the measured number and the forecast
  error, as slots' ADR 007 recorded its M4 freeze.

## Addendum 2026-11-16 (M3) — frozen at 7424 B

Measured `npm run size` at M3: **7227 B gzipped** → frozen budget **7424 B**
(+2.5% = 7407.7, rounded up to 128). `config.sizeBudget` set to 7424.

Forecast error, recorded as the family records them: the M0 forecast of 3.4 KB assumed the
flat one-face die. The on-screen ritual (ADR 002 addendum) made the subject a projected cube
with gradients, a settle and a seam pool; the honest number is ~2.1× the forecast. The
output forecast missed the same way: `dice: 3` measures **9347 B raw / 2345 B gzip** on
average over 60 seeds (worst seed 10584 / 2517) — ~2.4× the 4 KB forecast, and still a
two-kilobyte hero picture. The trims that survive are measured, never reasoned.

## Addendum 2026-11-16 (ADR 007) — raised to 7680 B

The cut seams and the glass body (ADR 007) added geometry and a body branch; measured
`npm run size`: **7596 B gzipped** → budget raised to **7680 B** (7596 + 84 of headroom, the
smallest 128-rounded ceiling that covers it). The raise is deliberate, not drift: the seams
are the user's measured readability fix, and the glass branch buys a whole body mode for
~120 B — both measured with `npm run size` before being kept, per this ADR's own rule.

## Addendum 2026-11-16 (ADR 007 addendum, same day) — raised to 8448 B

The cover image caught the square-front-corner defect: seams ran corner-to-corner, so the
front face read square against the rounded silhouette corners. The fix — both seam ends stop
where the corner rounding begins, meeting rquad2's rounded-corner Q-curve exactly — added the
trim geometry: **8359 B gzipped** → budget raised to **8448 B** (8359 + 89, the smallest
128-rounded ceiling). Two raises in a day, each measured, each bought with a user-visible
defect fix; the M0 provisional 8192 is finally crossed, which the M0 text anticipated as
harmless.

## Addendum 2026-11-16 (ADR 007 addendum, part two) — raised to 8704 B

The seam trim then gained two corrections, both found by measurement: the Q-curve crossing
must choose the root ON the seam segment nearest the corner (the other root lies on the
line's extension, outside the silhouette — silently picked before), and the seam end is
pulled one stroke-width back inside the boundary so the line reads "meets the boundary and
stops" instead of merging into the outline — decisive in glass, where bold seams cross
overlapping transparent dice. Measured **8528 B gzipped** → budget raised to **8704 B**
(8528 + 76, the smallest 128-rounded ceiling). Three raises on the ADR 007 day, each
measured, each a user-visible defect fix.

## Addendum 2026-11-17 (0.3.0) — the budget holds; the output numbers re-measured

0.3.0 (trim, results completing pins, the fifth slot, the contact shadow under glass only)
measures **8572 B gzipped** — inside 8704, no raise. The output numbers above were taken at M3,
before the seams and the glass body, and were never re-measured; they had drifted ~27% by
0.2.0. Measured today over seeds 1–60, gzip level 9:

| Throw | Average raw / gzip | Worst seed |
|---|---|---|
| `dice: 3`, paper | 11836 / 2568 B | 13083 / 2737 B |
| `dice: 3`, glass | 8179 / 1654 B | 9359 / 1812 B |
| `dice: 5`, paper | 18527 / 3645 B | 19858 / 3867 B |

Removing the hidden contact shadow saved ~294 B raw per paper `dice: 3` throw (zero pixels
changed by raster subtraction). A hero picture stays a two-and-a-half-kilobyte transfer.

## Addendum 2026-11-17 (0.4.0, ADR 007 addendum) — raised to 8832 B

The silhouette fillets (ADR 007's 0.4.0 addendum) add the crossing-tangent arithmetic and the
acute-side rule: measured **8784 B gzipped**, 80 over 8704 → budget raised to **8832 B**
(the smallest 128-rounded ceiling). The seam strokes were folded into one helper on the way,
which paid for part of it. No golfing was tried with `Math.hypot`: the spec does not require
it to be correctly rounded, so engines may disagree in the last bit — and byte-identical
output across engines is the contract. Raise number four, each a user-visible fix.

The output was measured twice. Fillets as their own `<path>`s cost +17% raw on a paper
`dice: 3` (13805 B); riding the seam's path as subpaths — one paint, so it is the same
picture, and the quiet paper ink no longer doubles where a fillet leaves its seam — brings it
to 12257 / 2714 B. Rounding the depth scale (it leaked as `0.9500000000000001`) then
saved 56 B a throw and cost the library 2 B: **8786 B gzipped**; a paper `dice: 3` averages
**12201 / 2711 B** (+3.1% raw, +5.6% gzip over 0.3.0; worst seed 13458 / 2881), glass
8544 / 1802, paper `dice: 5` 19173 / 3883.
