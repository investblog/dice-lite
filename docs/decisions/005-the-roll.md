---
type: decision
status: accepted
date: 2026-11-15
tags: [architecture, motion]
project: dice-lite
---

# 005 — the roll: CSS, from-only, deal order

## Context

An optional motion makes the throw read as a moment. SMIL cannot be gated by
`prefers-reduced-motion` without script (roulette's ADR 006); a `to`-keyed animation parks the
picture in a end-state that is not the static bytes; and a document-global `<style>` renames
whatever two motions share (cards-lite's review finding, re-earned in slots' M4).

## Decision

**CSS inside the SVG, `from` with no `to`, one-shot, off by default** (slots' ADR 008 pattern):

- Each die's group animates `from` a seeded start rotation — between −3 and −1 full turns plus
  its placement angle — to identity. The rest state *is* the static picture: `animation: none`
  under reduced motion leaves the reader looking at the throw, not a blur.
- Dice settle in deal order: die *i* runs `(0.8 + 0.3·i) / speed` seconds, the stagger slots
  used left to right. The overshoot lives in the timing function (`cubic-bezier(.2,.7,.3,1.08)`),
  not in extra keyframes.
- Motion names come from a stream of their own, keyed like the ids and **salted with `speed`**:
  switching the roll on renames nothing static, and two rolls differing only in speed share no
  class the later `<style>` could mistime.
- An animated element never carries a `transform` attribute — the placement sits on an outer
  `<g>` — and no type, universal or `:nth-child` selectors appear in the document-global
  `<style>`.
- `speed: 0` turns motion off and returns the static bytes exactly.

## Consequences

- The browser gate runs the roll in three engines × both motion modes, and `--mutate` includes
  "reduced motion misses a die".
- A permanent jitter, a dice cup shake or a reroll is backlog, not v0.1.

## Addendum 2026-11-16 (M1/M3) — the roll is a settle, not a spin

The subject became a projected cube (ADR 002 addendum): a 2D rotation of the baked picture
would spin it like a flat sticker, not tumble a die. The motion keeps everything else —
CSS, `from` with no `to`, deal-order stagger, the overshoot timing function, the salted
motion-name stream, `speed: 0` = the static bytes — and replaces the spin with a **settle**:
each die drops from a short height (`from translateY`, one die-em at most) and lands with
the overshoot in the cubic-bezier. Heavy casino dice do not fly; they arrive.
