# Changelog

All notable changes to `@spintax/dice-lite`. The version is the contract: same (seed,
options) → identical bytes within a minor version; any change to the output bytes is a minor
bump.

## 0.5.0 — 2026-11-17

- **The lattice lies on the ground.** The felt's pattern was drawn in the screen plane, so
  under the 52° camera the dice stood before a wall of regular hexagons — plainest on the bare
  table of the README's showcase. It is now foreshortened by the camera's own pitch
  (`scale(1 0.79)`, outermost: the seeded turn happens on the floor, then the floor is seen
  from above). Orthographic, like the dice; no convergence (ADR 002 addendum). Every `toss()`
  changes bytes (+14 B a throw); `die()` is unchanged.
- Library 8801 B gzipped, inside the 8832 budget.

## 0.4.0 — 2026-11-17

- **Every face corner is rounded.** Where a seam meets the silhouette it now stops 18 units
  short of the crossing and fillets into the outline — a Q-arc tangent to both, on each side
  where they meet at 70° or more; on the acute side the seam flows in alone. With the nose
  arcs, no face of a die keeps a square corner (ADR 007 addendum). Most visible in `glass`;
  quiet in `paper`. The one-stroke pull-back at the seam end is retired.
- The fillets ride their seam's `<path>` as subpaths: one paint, no doubled ink where a
  fillet leaves its seam. A `dice: 3` paper throw grows 3.1% raw (12201 B average).
- The depth scale is rounded like every other number: `scale(0.9500000000000001)` is now
  `scale(0.95)` (0 pixels changed; a new test fails on any 5th decimal in the output).
- Library 8786 B gzipped, budget raised to 8832 (ADR 006 addendum).

## 0.3.0 — 2026-11-17

Every change below alters output bytes; unpinned throws of `dice: 2–4` change only by the
removed contact shadow.

- **Trim:** a neutral colour listed beside chromatic ones (a white, a black, a grey) no
  longer turns the brass to chrome; chrome is for an all-neutral brand only (ADR 004
  addendum).
- **Results complete the pins:** under `lucky7` a die whose pair partner is pinned shows its
  complement to seven; under `matched` every unpinned die shows the first pinned value. A pin
  is never overwritten (ADR 003 addendum).
- **`dice: 5`:** the fifth die moves from the centre, where it stood half inside the pair, to
  front-right on a landscape felt; every pair of slots is one cube edge apart on the ground
  (ADR 002 addendum). `dice` still appends.
- **Shadows:** the contact shadow is drawn only under a glass body — a paper body hid every
  pixel of it (raster subtraction); ~98 B less per paper die. `die()` loses an empty
  `translate(0 0)` wrapper (0 pixels changed).
- **Docs:** `precision` governs the table and the viewBox, the dice are always one decimal;
  `brand` reads `#hex`/`rgb()` only; output sizes re-measured (ADR 006 addendum).
- **Gate:** the `pins ignored` mutation was silently skipped since the rail modes; it is
  re-anchored, three mutations and two checks are added, and the precision test can fail now.
- Library 8572 B gzipped, budget 8704.

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
