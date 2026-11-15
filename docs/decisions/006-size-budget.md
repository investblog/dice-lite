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
