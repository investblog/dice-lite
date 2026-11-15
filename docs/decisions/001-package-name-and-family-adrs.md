---
type: decision
status: accepted
date: 2026-11-15
tags: [process, naming]
project: dice-lite
---

# 001 — package name `@spintax/dice-lite`, global `Dice`; the family ADRs adopted

## Context

dice-lite is the ninth library in the family and the fourth that emits an SVG string. Re-deriving
decisions the family already paid for would waste the payment. And the name has a known trap:
npm's typosquatting guard runs only at publish time — `slots-lite` answered E404 on `npm view`
the same morning the registry rejected it as too similar to `stats-lite`, costing a bootstrap
run.

## Decision

The package is **`@spintax/dice-lite`** — scoped from the start, never published under the
unscoped `dice-lite` — with global `Dice`, repo `investblog/dice-lite`, source `dice.js`,
generated `dice.min.js` (never committed), types `dice.d.ts`. The `spintax` scope is the
account the siblings use.

Adopted by reference, as slots-lite's ADR 001 did: **002** (an SVG string, not a canvas),
**005** (no signature in the output — here it needs no counted exception, see ADR 002 here),
**006** (motion through CSS inside the SVG), **007** (module format: ES5 IIFE with a UMD tail),
**008** (Node tests alongside a browser verify page), **009**'s measurement method (terser in
process + Node `gzipSync`), **010** (output stability is a contract), **011**'s capture
algorithm; from cards-lite **006**'s paper/ink formulas and **010** (presets are data); from
further up: contract-first, auto-palette from `brand` in CIE LCh, `author: 301st`, OIDC trusted
publishing after a one-time token bootstrap, and "gzip beats clever — trim only by measurement".

## Consequences

- Where this project extends an inherited decision it does so in its own numbered ADR and cites
  the parent rather than editing it.
- The npm account must be publish-ready before the bootstrap publish; the Trusted Publisher is
  configured the same day and the token deleted (AGENTS.md, "the five failures").
