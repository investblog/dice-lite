---
type: note
status: active
tags: [architecture, overview, spec]
project: dice-lite
---

# dice-lite — spec / dev source of truth

Docs for developers and agents. `index.html` will be the verification surface, `test/` the gate.
Contract-first: change the doc here **before** the code, then code.

**Status (2026-11-15): M0 done.** The spec and ADRs 001–006 are written; the engine port,
`roles()`/`palette()` and the blank `toss()` (felt, rail, the lattice) are in and the test
gate is green — 22 checks, the palette-parity fixture to the byte, the library 4025 B
gzipped against the provisional 8192 budget, and the Codex review gate has run over the diff
(six findings, all fixed and re-reviewed). Every number below is either a family
measurement carried over or a *provisional* forecast naming the milestone that replaces it
with a measurement; this line is kept true at every milestone.

## The pitch, in one paragraph

A throw of dice on a table, drawn by code. One call returns an SVG string — in Node at build
time or in the browser — so a static site gets its hero art with no script on the page. Two
knobs span the variant space: **`seed`** throws the dice (how many, where they lie, what they
show), **`brand`** colours the table (one hex, the whole felt). The dice themselves are the
classic ones — paper bodies, black pips, values one to six — placed by a seeded scatter on a
brand-coloured felt with the family's lattice. A result such as a lucky seven is a named
preset that places values; nothing is ever scored. Two styles behind one knob, `line` or
`flat`, and an optional CSS roll that settles on the picture and stops for readers who asked
for less motion. Zero dependencies, a few KB.

## The load-bearing idea

A die is read from **one face**, and a face is a **value on a 3×3 lattice**. The eye reads a
die because pips sit where a real die's pips sit, not because anything is drawn in 3D. So:

> **Every pip is a cell of a 3×3 grid; every die is a placement on the table. The value alone
> gives its pips; the seed alone gives the placement. A body is a `<rect>`, a pip is a
> `<circle>` — the picture carries no path data at all.**

Nothing else in the picture knows it is looking at dice. The value-to-pips table is six rows of
data, not drawings; the throw layout is canonical slots plus seeded jitter, so dice never
overlap by construction. That is the analogue of cards' "a spread compiles to placements" and
slots' "every cell is a reel index and an angle": the whole picture is two nested lattices and
zero `d` attributes.

A v0.1 die shows its top face only. A cube with three faces (and the opposite-sides-sum-to-seven
constraint) is backlog — the single face is how dice read at hero size, and it is the family
way: draw the minimum that reads.

## Machine space

Origin at the centre of the table, y down. Constants are looked at on screen at M2 and kept or
changed there; these are the starting numbers.

| Constant | Value | What |
|---|---|---|
| `EM` | 200 | the die face, square, origin at its centre |
| `PIP` | 11–14 | pip radius, one seeded draw per throw (`table:pips`) |
| `CORNER` | 26–40 | the body rect's `rx`, one seeded draw per die |
| `FELT` | margin 90 | felt inset from the viewBox at the long side, 64 at the short |
| `RAIL` | 22–34 | the rail width, one seeded draw (`table:rail`) |
| `JITTER` | ±0.06, ±14° | placement and rotation scatter around the canonical slot |
| `SHADOW` | α .15–.22 | one ellipse per die, `ink`, offset down-left of the die |

Pip pitch is `EM/3`: the 3×3 grid cells are centred at ±`EM/6` and 0 on both axes, so a pip at
"top left" is the same cell whatever the value. The viewBox follows `dice`: the felt is sized
to the canonical slots plus margin, so `dice` appends without redrawing the table's role.

### Anatomy of a throw

| Part | Geometry | Seeded? |
|---|---|---|
| Felt | the table surface; carries the lattice at a low weight | no |
| Rail | a padded ring around the felt in `rail` | width, corner |
| Shadow | one `<ellipse>` per die under the body, offset down-left | length, α |
| Die body | one `<rect rx>` per die in `die` — paper in both themes | corner radius |
| Pips | `<circle>`s in `pip` on the 3×3 grid | radius (per throw) |
| Shade | flat only: the body painted again in `#000` at low α, masked to where the body is **not** covered by itself shifted up and right | no |

All of it is built from the seeded numbers and the family engine, so the picture contributes
**no fixed `d` at all** — the inverted counted exception of ADR 002, pinned by test.

The table follows the **table style**: `style` when given, otherwise `flat` in the dark theme
and `line` in the light one — the felt is the large flat area, and a filled body over a white
page was a pastel field in every sibling that tried it. A `line` table draws felt and rail as
rules in `outline`. The dice follow `style` only in their bodies' treatment: paper with black
pips reads as dice in both themes either way.

### The throw layout

`dice` is 3 (default), 2–5, and it **appends**: under one seed, dice 0–1 of a four-dice throw
are the two dice of `dice: 2` — same values, same rotations, same jitter. Each die draws its
own placement from `die:i:place` as `(u, v)` in the felt's unit square plus a rotation in
±14°, so the count never moves another die's stream.

Overlaps are ruled out by construction, not by rejection: the felt carries **canonical slots**
per count (2: a pair at the thirds; 3: a triangle; 4: a square; 5: a quincunx), and the seed
jitters each die inside its slot. Painting never learns the layout — the slots are data, the
renderer reads placements (cards' rule, slots' inheritance).

**Judge a die at table size, not at icon size** — cards-lite's club lesson, which here means
the pips stay readable at 360 px wide.

## Values — what the seed shows

Each die shows one face, a value 1–6 drawn from `die:i:value`. The value-to-pips table is
fixed data, the classic layouts every reader already knows:

| Value | Pips (3×3 cells) |
|---|---|
| 1 | centre |
| 2 | top-left, bottom-right |
| 3 | top-left, centre, bottom-right |
| 4 | four corners |
| 5 | four corners, centre |
| 6 | two columns of three |

The seed may set any value on any die: a random throw shows doubles every sixth seed on
average, and that is fine — a throw is a picture, not odds (ADR 003). `die()` draws one die on
its em, value pinned by option or by the seed.

## Results — presets are data

A result names **what the dice show**. The library contains no evaluator: nothing computes a
total, nothing pays, nothing weights a die, and there is no game state. The arrow runs one way
only — name → values. Each result is correct **by construction**.

| Result | Construction |
|---|---|
| `lucky7` | dice 0 and 1 are a pair summing to seven — (1,6), (2,5) or (3,4), chosen by the seed on `result:lucky7`; dice 2+ keep the seed's values |
| `snake` | dice 0 and 1 are aces |
| `boxcars` | dice 0 and 1 are sixes |
| `matched` | every die shows the same value, the value by the seed on `result:matched` |
| `mixed` | no two dice agree; each draws from the values not yet used, appending like the dice do |

`values` pins exact values per die (an array, die 0 first; `null` or anything outside 1–6
leaves that die to the seed/result). Precedence is `values` > `result` > seed. Each result
reads its own stream (`result:lucky7`, `result:matched`, `result:mixed:i`), so choosing one
moves nothing else.

> **The seed never changes what a six looks like. It may change whether the six is showing.**

## Motion — the roll

Off by default. `motion: 'roll' | true`, `speed` divides the periods, `0` turns motion off and
returns the static bytes exactly.

- **CSS, not SMIL** (roulette's ADR 006): `prefers-reduced-motion` cannot gate SMIL without script.
- **`from` with no `to`.** Each die's group animates `from` a seeded start rotation (between
  −3 and −1 full turns plus its placement angle) to identity, so the rest state *is* the
  static picture and `animation: none` under reduced motion leaves the reader looking at the
  throw, not at a blur.
- Dice settle in deal order: die *i* runs `(0.8 + 0.3·i) / speed` seconds, staggered like
  slots' reels stopped left to right. The overshoot is in the timing function
  (`cubic-bezier(.2,.7,.3,1.08)`), not in extra keyframes.
- Motion names — keyframes and classes — come from a stream of their own, keyed like the ids
  and salted with `speed`: switching the roll on renames nothing in the static picture, and two
  rolls that differ only in speed do not share a class whose timing the later `<style>` would win.
- **An animated element never carries a `transform` attribute**; the placement sits on an outer
  `<g>`. No type, universal or `:nth-child` selectors — the inline `<style>` is document-global.
- The roll is one-shot. A permanent jitter or a dice cup shake is backlog, not v0.1.

## Colour — a casino table from the brand

The capture algorithm is the family's (cards-lite's ADR 006, roulette's ADR 011): chromatic
brand colours (LCh chroma ≥ 12) take the nearest hue role, nearest pairs settle first, each
colour and each role at most once, ties broken by colour order then role order. Dice claim
almost no classic hues — the subject is paper and black — so the brand colours go where a
casino table puts them:

| Role | Where it comes from | Draws |
|---|---|---|
| `felt` | the first chromatic brand colour (chroma ≥ 12); else the grey one; else the spintax blue | the table surface |
| `rail` | the next chromatic brand colour once the felt and the trim's gold are claimed; else a darker `derive()` stop of the felt | the table's padded edge |
| `trim` | metal, as in slots: brass from a gold-hue brand colour at lower chroma, chrome for a grey brand | the lattice's fine lines, the table line |
| `die` | the family's paper formula, lch(96.5, min(C·0.08, 4), H) — **both themes** | the die bodies |
| `pip` | near-black, cards' `spade` formula | the pips |
| `ink` | near-black at the shadow α | the shadows |
| `outline` | the `line` table's rule: the felt hue's middle `derive()` stop, guaranteed ≥ 2.5 against the page | felt and rail rules |

With the default spintax triad the **blue is the felt** — the brand's main colour becomes the
table, which is what a hero background wants; the crimson pads the rail, the gold tones the
brass. Derived roles (`die`, `pip`, `ink`, `outline`) are never brand colours.

**The table was decided at M1** on a prototype outside the library — seven brands × both
themes, the marks at 360 px — by the user (ADR 004's addendum), the same ritual as slots'
cabinet. Provisional until then: the `rail` cascade above, and the light-theme `line` default.

**Pins win.** Any role accepts any CSS colour string; the renderer never parses a pin, only
escapes `" < > &`. `'auto'` unpins.

**The invariant:** *every throw reads as dice on a table whatever the brand — paper dice, black
pips, a brand-coloured felt; and the brand lands on the table — the first chromatic colour
felts it, the next colour left pads the rail. What a third colour does — the lattice/trim
cascade or nothing — is the M1 addendum's question (ADR 004), and until it is answered such a
colour may go unused.*

## Determinism

- Every seeded parameter draws from its **own** sub-seed:
  `u(k) = mulberry32(fmix32(seed32 ^ imul(fnv(k), 0x9E3779B9)))`; a string seed goes through
  FNV-1a — the family's `streams()`, ported unchanged.
- **Namespaces:** `die:i:place` a die's slot jitter and rotation · `die:i:value` its face ·
  `table:*` pip radius, rail, lattice and the shadow · `result:*` a preset's choices · `ids`
  (+ `salt`) tokens.
- Ids are keyed by what is drawn, not only by the seed, so two different throws under one seed
  on one page never share an id (cards-lite's lesson; `salt` is for the same picture twice).
- No `Math.random`, no `Date`. The default seed is fixed: a build must reproduce.
- **Contract:** same (seed, options) → byte-identical string within a minor version (roulette's
  ADR 010). **`brand` never touches geometry, `seed` never touches colour, and `brand` never
  changes which value is shown.**

## No signature

Nothing in the output names or fingerprints the tool (roulette's ADR 005): no comments,
`<desc>`/`<metadata>`, `data-*`, `xlink`, `version`, library names. Every id, class and
custom-property name is a seeded token. Unlike cards and slots, **no counted exception is
needed** — there is no fixed `d` to count (ADR 002); a pinned test asserts the seed-invariant
`d` set of every output is empty.

## Performance and size

- Library: budget in `package.json` `config.sizeBudget`, measured by `npm run size` (terser in
  process + gzip level 9, never the `gzip` CLI). **Provisional 8192 B at M0** (ADR 006) — the
  siblings' number; frozen after M3 at the measured size + 2.5% rounded up to 128.
  Forecast from the siblings' M0s (cards 3108, slots 3347): the engine port, `roles()` and the
  blank table should land near **3.4 KB**.
- Output, forecast for `dice: 3` (measured at M3 over 60 seeds): the felt, rail, lattice and
  three dice should stay under **4 KB raw / 1.5 KB gzip**. `line` output drops the shade and
  runs smaller, as it did in slots.

## Promotion

Credits live only in the README, the demo and package.json — never in the output. Demo panel
and footer: "Made in [301](https://301.st) · for [spintax.net](https://spintax.net)".

## Naming, layout, release

- Package `@spintax/dice-lite` (ADR 001: scoped from the start — npm's typosquatting guard
  cost slots-lite the unscoped name), global `Dice`, repo `investblog/dice-lite`, source
  `dice.js`, generated `dice.min.js` (not committed), types `dice.d.ts` (M3) — ADR 001.
- ES5 IIFE with a UMD tail: CommonJS gets `module.exports`, a browser gets `window.Dice`;
  default import only (roulette's ADR 007). ES5 is the syntax, not the runtime: `Math.imul` is fine.
- ESLint 10 and terser 5 — the family's pinned toolchain.
- Release: OIDC trusted publishing after the house token bootstrap — `RELEASING.md` at M4,
  copied from slots-lite. The npm account must be publish-ready before the first publish.

## API

```js
Dice.toss(opts)              // → string. The whole throw: table + dice. Pure; Node and browser.
Dice.die(opts)               // → string. One die on its em — an icon. Pure.
Dice.palette(brand, {theme}) // → {felt, rail, trim, die, pip, ink, outline, background, halo, stroke}
Dice.init(el, opts)          // browser → {el, get(), set(opts), destroy()}, or null when el finds nothing
```

### Options

| Option | Default | What |
|---|---|---|
| `seed` | `1` | a string (a domain name is fine), or a number taken as a 32-bit unsigned integer |
| `brand` | spintax triad `['#00abf3','#d6af3c','#a91455']` | hex or hex[] |
| `theme` | `'dark'` | `'dark'` \| `'light'` — derived colours only |
| `style` | `'flat'` | `'line'` \| `'flat'`; the table defaults to `line` under `theme: 'light'` |
| `weight` | `1` | line weight multiplier |
| `felt rail trim die pip ink outline` | `'auto'` | any CSS colour string |
| `size` | — | width; the height follows the viewBox |
| `precision` | `0` | decimals for coordinates |
| `salt` | `''` | extra entropy for ids — the same picture twice on one page |
| `title` | — | `role="img"` + escaped `aria-label`; otherwise `aria-hidden="true"` |

`toss()` adds `dice` (2–5, default 3), `result` (`''`), `values` (`[]`), `lattice`
(`'auto'` \| `'trigon'` \| `'hex'` \| `'octagon'` \| `'none'`) and `motion` / `speed`.
`die()` adds `value` (1–6; the seed picks one when absent).

## Acceptance criteria (v0.1)

- `toss()` and `die()` run in Node ESM, CommonJS and a `<script>`.
- Same (seed, options) → identical bytes; the brand/seed independence tests pass, including
  "brand never changes which value is shown", and `dice` appends.
- The no-fixed-path test passes: the seed-invariant `d` set of every output is empty — pips are
  circles, bodies are rects.
- Every result satisfies a check **written longhand in the test file** — the library has no
  evaluator and must not grow one.
- Both styles × both themes look right in a browser — a contact sheet shown to the user at M1
  and M2.
- `npm run lint`, `npm test`, `npm run size` pass; the browser gate (cache-busted) is ALL GREEN
  in Chromium, Firefox and WebKit, with and without `prefers-reduced-motion`, and every check
  in it has been seen to fail against a deliberately broken library.

## See also

- `docs/decisions/` — the ADRs; `docs/TODO.md` — the backlog.
- Siblings: [slots-lite](https://github.com/investblog/slots-lite) (the closest relative),
  [cards-lite](https://github.com/investblog/cards-lite) (the engine's parent),
  [roulette-lite](https://github.com/investblog/roulette-lite),
  [qr-svg](https://github.com/investblog/qr-svg) (the toolchain template),
  [trigons-lite](https://github.com/investblog/trigons-lite),
  [hexagons-lite](https://github.com/investblog/hexagons-lite),
  [octagons](https://github.com/investblog/octagons).
