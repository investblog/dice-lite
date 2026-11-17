# Changelog

All notable changes to `@spintax/dice-lite`. The version is the contract: same (seed,
options) → identical bytes within a minor version; any change to the output bytes is a minor
bump.

## 0.2.0 — 2026-11-16

- The seams finish where the corner rounding starts. Both ends are trimmed — at the nose by
  the tangent rule on each adjacent wedge, at the silhouette by intersection with the
  rounded-corner Q-curve, the crossing chosen on the segment nearest the corner — and every
  nose corner closes through a small arc, one per face, so every corner of every face reads
  rounded alike. Each seam end stops one stroke-width short of the outline: an edge meets
  the boundary and stops (ADR 007 addenda).
- `body` is part of the id key: paper and glass on one page never share an id.
- An arbitrary CSS colour pin on `die` frosts the glass verbatim, like `dieUnder` in paper.
- Library 8536 B gzipped, budget 8704 (ADR 006 addenda).

## 0.1.0 — 2026-11-16

- First release. A throw of dice on a table as an SVG string: the projected rounded cube
  (three visible faces, exact projected pips, opposite sides sum to seven by construction),
  seeded placement and values, the brand-coloured felt/rail/trim cascade with the light-theme
  `line` escape, five results (`lucky7`, `snake`, `boxcars`, `matched`, `mixed`) as data,
  `values` pins, the one-shot CSS settle with `prefers-reduced-motion` support, `palette()`,
  `die()`, `init()` and `dice.d.ts`. The rail is a mode: `'auto'` (default) the dark surround,
  `'brand'` the leftover brand colour, `'felt'` no edge, any colour pins it (ADR 004 addendum).
  The dice gained edges: cut seams in quiet ink on the paper body, and `body: 'glass'` draws
  frosted acrylic — silhouette fill at 55%, outline seams, solid pips, no gradients emitted
  (ADR 007; the alpha measured by raster subtraction). The seams were then trimmed to stop
  where the corner rounding starts — nose and silhouette alike — after the square-front-corner
  defect was caught on the cover image (ADR 007 addendum). Library 8536 B gzipped (budget
  8704, ADR 006 addendum); a `dice: 3` throw averages 9347 B raw / 2345 B gzip over 60 seeds.
