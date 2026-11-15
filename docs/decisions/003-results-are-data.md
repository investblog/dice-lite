---
type: decision
status: accepted
date: 2026-11-15
tags: [architecture, contract]
project: dice-lite
---

# 003 — results are data: an illustration, never a game

## Context

Dice are the gambling device par excellence: a throw begs to be scored. Slots-lite already
ruled on this (its ADR 006) — a result is a name that constructs symbols; the library has no
evaluator. Dice re-opens the question only because "roll" as a motion name tempts a game loop
even harder.

## Decision

Adopted from slots-lite, unchanged: **the library draws a throw and never plays.** A result —
`lucky7`, `snake`, `boxcars`, `matched`, `mixed` — is a named preset that places values on the
dice, correct by construction. Nothing computes a total, nothing decides a win, nothing weighs
a die by odds, there is no game state, and `init()` exposes only `get`/`set`/`destroy`. Values
pin per die; precedence is `values` > `result` > seed.

The motion is named `roll`, but it is a settling animation, not a play action: one-shot, CSS
only, off by default (ADR 005 here).

## Consequences

- Every result is checked by a decoder and a checker **written longhand in the test file** — the
  library must not grow an evaluator to make its own tests convenient.
- A totals row, odds, betting or a reroll API is out of scope for every version until an ADR
  says otherwise.
