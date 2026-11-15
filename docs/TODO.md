---
type: note
status: active
tags: [backlog]
project: dice-lite
---

# Backlog

The single list of open work: the v0.1 milestones, and what is outside them or was decided
along the way. The milestones are the v0.1 plan; this list is its public index.

## v0.1

- [ ] M0 — bootstrap, spec, ADRs 001–006, the engine port, `palette()`, the blank `toss()`.
- [ ] M1 — the felt/rail/trim cascade prototyped outside the library and decided by the user
  (ADR 004 addendum).
- [ ] M2 — the dice: the face renderer, the shade, the canonical slots and the jitter, the
  shadows, `dice` appending, `die()`. Contact sheet at M2.
- [ ] M3 — the five results with their longhand checker, the roll (ADR 005), `init()`,
  `dice.d.ts`, output size measured, the budget frozen (ADR 006 addendum).
- [ ] M4 — `test/verify.html` + `--mutate` in three engines × two motion modes; `index.html`;
  CI/release/bootstrap-publish workflows; README, CHANGELOG, RELEASING.
- [ ] M5 — integration in a static site, then `0.1.0` on the user's go: repo, bootstrap
  publish, Trusted Publisher, token deleted.

## Outside v0.1

- A perspective die — three visible faces, the silhouette as real path data, opposite sides
  sum to seven (ADR 002's backlog; re-opens the counted-exception question).
- A dice cup (backgammon) and a craps table's betting layout — illustration-only, and each an
  ADR of its own.
- More than six values (polyhedral dice, d8/d20) — a different subject, not a variant.
- A permanent jitter or a reroll API (ADR 005).
