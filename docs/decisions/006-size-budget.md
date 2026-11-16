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
