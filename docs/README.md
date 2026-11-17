---
type: note
status: active
tags: [architecture, overview, spec]
project: dice-lite
---

# dice-lite — spec / dev source of truth

Docs for developers and agents. `index.html` will be the verification surface, `test/` the gate.
Contract-first: change the doc here **before** the code, then code.

**Status (2026-11-16): v0.1.0 published.** The library is feature-complete and on npm: the
projected cube on the brand table (ADR 002 addendum), the five results (ADR 003), the settle
(ADR 005 addendum), `init()`, types — 41 tests and the 14-check browser gate green, the
library 8536 B gzipped of the budget **8704** (frozen 7424 at M3, raised three times by the
ADR 007 addenda, ADR 006), a `dice: 3` throw averaging 9347 B raw / 2345 B gzip over 60
seeds. Every number below is either a family measurement carried over or a *provisional*
forecast naming the milestone that replaces it with a measurement; this line is kept true at
every milestone.

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

A die is read from **its faces**, and a face is a **value on a 3×3 lattice** — but a die is
*believed* only as a cube. So:

> **Every die is a rounded cube, projected at runtime from its own seeded orientation. Each
> face carries its value on the 3×3 lattice; the picture carries no path data the seed cannot
> change — every coordinate is computed.**

Nothing else in the picture knows it is looking at dice. The cube is orthographic-baked at
~52°: a seeded yaw (`die:i:orient`, signed 0.36–0.44 rad — the readable range), the six
values on a real net (opposite sides sum to seven by construction: the die rests on the face
opposite its top value), the silhouette a rounded convex hull of the eight projected corners,
the pips exact projected ellipses. That is the analogue of cards' "a spread compiles to
placements" and slots' "every cell is a reel index and an angle": the whole picture is
computed geometry and zero fixed `d` attributes.

A true perspective cube (vanishing points, animated re-projection) is backlog — an ADR of
its own (ADR 002 addendum).

## Machine space

Origin at the centre of the table, y down. Constants were tuned to the reference at M1
(with Codex's review); M2 looks at them on the real table and keeps or changes them there.

| Constant | Value | What |
|---|---|---|
| `H` | 100 | the die's half-edge — the cube is 2H on a side, centred on its origin |
| `PITCH` | 0.91 rad | camera elevation ≈ 52°, orthographic bake |
| `YAW` | ±(0.36–0.44) | a die's yaw: a sign draw and a magnitude draw (`die:i:orient`) |
| `RS` / `RF` | 44 / 9 | silhouette rounding / face-quad rounding (projection units) |
| `PIP` | 19 | pip radius in 3D units — a circle on the face, drawn as the exact projected ellipse |
| `FELT` | margin 90 | felt inset from the viewBox at the long side, 64 at the short |
| `RAIL` | 22–34 | the rail width, one seeded draw (`table:rail`) |
| `JITTER` | ±0.06 | positional scatter around the canonical slot (yaw is the orientation) |
| `SHADOW` | broad + contact + seam | broad ellipse α .16 blur 14; a seam pool α .14 where dice touch; the contact ellipse α .18 blur 5 only under a glass body — a paper body hides every pixel of it (raster subtraction, 0.3.0) |

The felt is sized to the **projected** dice: the cube's half-extents at the yaw range are
≈131 × 164, ~17% over the flat half-diagonal, and the canonical slot clearance accounts for
it. The viewBox follows `dice`: the felt is sized to the canonical slots plus margin, so
`dice` appends without redrawing the table's role.

### Anatomy of a throw

| Part | Geometry | Seeded? |
|---|---|---|
| Felt | the table surface; carries the lattice at a low weight | no |
| Rail | a padded ring around the felt in `rail` | width, corner |
| Shadow | a broad `<ellipse>` per die (plus a contact one under glass), a seam pool where dice touch | — |
| Die | a rounded cube: silhouette = rounded hull of the 8 projected corners; faces = projected quads under a shared airbrush | yaw, value |
| Seams | the three interior edges of the visible faces — open segments between the **true** corners (the drawn quads use HG = H + 2 and overlap on purpose, so they cannot serve); both ends stop where the corner rounding starts — at the silhouette the seam meets rquad2's rounded-corner Q-curve, at the nose a same-radius tangent trim — and every pair of nose stops joins through a small Q-arc, one per face, so no corner reads skewed and every face rounds alike (ADR 007 addendum: the cover-image corner defects) | — |
| Pips | exact projected ellipses in `pip` on each visible face's 3×3 lattice — solid, unshaded, in a glass body | — |

**The body.** `body: 'paper'` (default) is the classic dice: paper gradients, pips in shaded
`pip`, and the seams a quiet `ink` line at **0.15** — the smallest alpha whose edge signal
clears the render noise twofold, measured by raster subtraction (ADR 007). `body: 'glass'` is
frosted acrylic: the silhouette filled with the `die` colour pushed to near-white at **55%**,
stroked in `outline`; no face gradients, no airbrush, no sheen; pips solid `pip`; seams the
same cut segments in `outline`, wider. Wireframe-without-fills was prototyped and rejected —
on dice, unlike roulette's line art, three pip planes overlap in one projection and only the
fills (or the frost) keep them apart. The glass is paint, not optics: no refraction, and the
subject stays an illustration (ADR 003).

All of it is computed from the seeded numbers, so the picture contributes **no fixed `d` at
all** — the inverted counted exception of ADR 002 (addendum 2026-11-16), pinned by test.

The table follows the **table style**: `style` when given, otherwise `flat` in the dark theme
and `line` in the light one — the felt is the large flat area, and a filled body over a white
page was a pastel field in every sibling that tried it. A `line` table draws felt and rail as
rules in `outline`. The dice are the same paper in both themes.

### The throw layout

`dice` is 3 (default), 2–5, and it **appends**: under one seed, dice 0–1 of a four-dice throw
are the two dice of `dice: 2` — same values, same yaws, same placements. Each die draws its
own placement from `die:i:place` as `(u, v)` around its canonical slot, and its orientation
from `die:i:orient`, so the count never moves another die's stream.

The felt carries **canonical slots** per count (2: a pair at the thirds; 3: a triangle; 4: a
diamond; 5: the diamond plus a die at front-right, `[1.65, 1.15]` slot units, on a landscape
felt — ADR 002 addendum), and the seed jitters each die inside its slot. Light overlap is
allowed — dice touch like on a real table, but no two slots sit closer than one cube edge on
the ground (screen y over sin 52°), so no die stands inside another: the paint order sorts whole dice by their
screen-ground position (far first), shadows sit in a layer below all dice. Painting never
learns the layout — the slots are data, the renderer reads placements (cards' rule, slots'
inheritance).

**Judge a die at table size, not at icon size** — cards-lite's club lesson, which here means
the pips stay readable at 360 px wide.

## Values — what the seed shows

Each die's **top face** is a value 1–6, drawn from `die:i:value`. The value-to-pips table is
fixed data, the classic layouts every reader already knows — on every face:

| Value | Pips (3×3 cells) |
|---|---|
| 1 | centre |
| 2 | top-left, bottom-right |
| 3 | top-left, centre, bottom-right |
| 4 | four corners |
| 5 | four corners, centre |
| 6 | two columns of three |

The visible side values follow a real net: opposite sides sum to seven **by construction** —
the die rests on the face opposite its top value (ADR 002 addendum). The seed may set any
value on any die: a random throw shows doubles every sixth seed on average, and that is fine —
a throw is a picture, not odds (ADR 003). `die()` draws one die on its em, value pinned by
option or by the seed.

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
leaves that die to the seed/result). Precedence is `values` > `result` > seed, and a result
**completes the pins** (ADR 003 addendum): under `lucky7` a die whose pair partner is pinned
shows the partner's complement to seven; under `matched` every unpinned die shows the first
pinned value; `mixed` never repeats a pin. A pin is never overwritten, so pins that contradict
a result win and the result shapes only the dice left to it. Each result reads its own stream
(`result:lucky7`, `result:matched`, `result:mixed:i`), so choosing one moves nothing else.

> **The seed never changes what a six looks like. It may change whether the six is showing.**

## Motion — the roll

Off by default. `motion: 'roll' | true`, `speed` divides the periods, `0` turns motion off and
returns the static bytes exactly.

- **CSS, not SMIL** (roulette's ADR 006): `prefers-reduced-motion` cannot gate SMIL without script.
- **`from` with no `to`.** Each die settles — drops from at most one die-em and lands — to
  identity, so the rest state *is* the static picture and `animation: none` under reduced
  motion leaves the reader looking at the throw (ADR 005 addendum: the projected cube cannot
  spin; the motion is a settle, the overshoot lives in the timing function).
- Dice settle in deal order: die *i* runs `(0.8 + 0.3·i) / speed` seconds, staggered like
  slots' reels stopped left to right. The overshoot is in `cubic-bezier(.2,.7,.3,1.08)`,
  not in extra keyframes.
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
| `rail` | a **mode**, not a colour: `'auto'` (default) the pip family's near-black — the table's dark surround; `'brand'` the cascade below; `'felt'` paints the rail the felt — no visible edge. Any CSS colour pins it | the table's padded edge |
| `trim` | metal, as in slots: brass from a gold-hue brand colour at lower chroma, the default brass when no colour sits in the gold window, chrome only for an all-neutral brand — a neutral listed beside chromatic colours never turns the brass to chrome (ADR 004 addendum) | the lattice's fine lines, the table line |
| `die` | the family's paper formula, lch(96.5, min(C·0.08, 4), H) — **both themes** | the die bodies |
| `pip` | near-black, cards' `spade` formula | the pips |
| `ink` | near-black at the shadow α | the shadows |
| `outline` | the `line` table's rule: the felt hue's middle `derive()` stop, guaranteed ≥ 2.5 against the page | felt and rail rules |

With the default spintax triad the **blue is the felt** — the brand's main colour becomes the
table, which is what a hero background wants; the gold tones the brass; and the edge wears the
near-black surround, not a colour. Derived roles (`die`, `pip`, `ink`, `outline`) are never
brand colours, and under the default rail mode neither is the edge — `rail: 'brand'` opts back
into the cascade (on the triad: the crimson pads the rail), `rail: 'felt'` removes the edge.

**The table was decided at M1** on renders — five rail treatments against the default throw,
by the user (ADR 004's addendum): a loud colour band reads as a design frame, no edge loses the
table, the dark surround reads as what a casino table wears. The addendum is decided; the
light-theme `line` default stands.

**Pins win.** Any role accepts any CSS colour string; the renderer never parses a pin, only
escapes `" < > &`. `'auto'` unpins. `rail` additionally accepts its named modes `'brand'` and
`'felt'` — modes resolve inside the cascade, never as literal colours. One deliberate exception, because dice shade with
gradients: a `#hex`/`rgb()` pin on `die` or `pip` is mixed in LCh into that part's light and
shade; any other string (`var(…)`, named colours) is used verbatim for every stop, escaped.
In a glass body the pips are solid, so a `#hex`/`rgb()` pin sits flat there — there is no
gradient to mix into.

**The invariant:** *every throw reads as dice on a table whatever the brand — paper dice, black
pips, a brand-coloured felt; and the brand lands on the table — the first chromatic colour
felts it. The edge is never a colour by default: a leftover brand colour goes unused unless
`rail: 'brand'` claims it (ADR 004's addendum) — the question this invariant used to leave open
is answered: "or nothing", by default.*

## Determinism

- Every seeded parameter draws from its **own** sub-seed:
  `u(k) = mulberry32(fmix32(seed32 ^ imul(fnv(k), 0x9E3779B9)))`; a string seed goes through
  FNV-1a — the family's `streams()`, ported unchanged.
- **Namespaces:** `die:i:value` its top face · `die:i:orient` its yaw (a sign draw and a
  magnitude draw) · `die:i:place` its slot jitter (a u and a v draw) · `die:i:drop` its settle
  height · `table:*` the rail width and corner, the lattice · `result:*` a preset's choices
  (`result:lucky7` a pair + `result:lucky7:swap` its order, `result:matched`,
  `result:mixed:i`) · `ids` (+ `salt`) tokens. The pip radius and the shadows are constants
  (Machine space), not seeded draws.
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
  process + gzip level 9, never the `gzip` CLI). **8704 B (ADR 006 addenda)**: frozen at 7424
  when M3 measured 7227 B gzipped; the ADR 007 day (seams, glass, the corner-trim corrections
  and their review fixes) raised it three times with measurements — 7596 → 8359 → 8528 →
  **8536 B gzipped** today, each ceiling the smallest 128-rounded number that covers the
  measured size.
- Output, **measured at M3 over 60 seeds** for `dice: 3`: average **9347 B raw / 2345 B
  gzip**, worst seed 10584 / 2517. The M-forecast of 4 KB raw was the flat die again; the
  projected cube runs ~2.4× it — and still ~2.3 KB gzipped for a hero picture. `line`
  changes the felt and rail treatment only; the dice are identical in both styles.

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
Dice.palette(brand, {theme, rail}) // → {felt, rail, trim, die, pip, ink, outline, background, halo, stroke}
Dice.init(el, opts)          // browser → {el, get(), set(opts), destroy()}, or null when el finds nothing
```

### Options

| Option | Default | What |
|---|---|---|
| `seed` | `1` | a string (a domain name is fine), or a number taken as a 32-bit unsigned integer |
| `brand` | spintax triad `['#00abf3','#d6af3c','#a91455']` | `#rgb`/`#rrggbb` or `rgb()`, one or a list — the family's parser; anything else (a named colour, `var()`) reads as white, so a brand is never a CSS keyword. Pins (below) take any CSS colour |
| `theme` | `'dark'` | `'dark'` \| `'light'` — derived colours only |
| `style` | `'flat'` | `'line'` \| `'flat'`; the table defaults to `line` under `theme: 'light'` |
| `weight` | `1` | line weight multiplier |
| `felt trim die pip ink outline` | `'auto'` | any CSS colour string |
| `rail` | `'auto'` | `'auto'` \| `'brand'` \| `'felt'` — the edge mode (above), or any CSS colour string |
| `body` | `'paper'` | `'paper'` \| `'glass'` — the dice bodies (above) |
| `size` | — | width; the height follows the viewBox |
| `precision` | `0` | decimals for the table's coordinates and the viewBox; the dice geometry is always written to one decimal — rounding a die's ellipses and seams any coarser shakes the projection |
| `salt` | `''` | extra entropy for ids — the same picture twice on one page |
| `title` | — | `role="img"` + escaped `aria-label`; otherwise `aria-hidden="true"` |

`toss()` adds `dice` (2–5, default 3), `result` (`''`, one of `'lucky7' | 'snake' |
'boxcars' | 'matched' | 'mixed'`), `values` (`[]` — pins exact top values; `null` or outside
1–6 leaves the die to the seed/result), `lattice` (`'auto'` — or `'trigon' | 'hex' |
'octagon' | 'none'`), `motion` (off — `'roll' | true` is a one-shot settle) and `speed`
(`1` — divides the settle periods; `0` returns the static bytes exactly).
`die()` adds `value` (1–6; the seed picks one when absent).

## Acceptance criteria (v0.1)

- `toss()` and `die()` run in Node ESM, CommonJS and a `<script>`.
- Same (seed, options) → identical bytes; the brand/seed independence tests pass, including
  "brand never changes which value is shown", and `dice` appends.
- The no-fixed-path test passes: the seed-invariant `d` set of every output is empty — every
  coordinate is computed from the seed (ADR 002 addendum).
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
