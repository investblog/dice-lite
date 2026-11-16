# dice-lite

**A throw of dice on a table, drawn by code.** One call returns an SVG string — in Node at
build time or in the browser — so a static site gets its hero art with no script on the page.
Two knobs span the variant space: **`seed`** throws the dice (how many, where they lie, what
they show), **`brand`** colours the table.

The dice are the classic ones — paper bodies, black pips, values one to six — each a rounded
cube projected at runtime from its own seeded orientation: three visible faces, exact
projected pips, opposite sides summing to seven by construction. A result such as a lucky
seven is a named preset that places values; nothing is ever scored. Zero dependencies, ~7 KB
minified and gzipped.

[![npm](https://img.shields.io/npm/v/@spintax/dice-lite.svg)](https://www.npmjs.com/package/@spintax/dice-lite)
[![license](https://img.shields.io/npm/l/@spintax/dice-lite.svg)](LICENSE)

**[Live demo →](https://investblog.github.io/dice-lite/)** — the throw's options on controls:
seed stepping, a 24-seed contact sheet, every result, and the six faces.

[![A lucky seven on the spintax-blue felt: three paper dice, the front two showing an ace and a six](https://investblog.github.io/dice-lite/docs/preview.svg)](https://investblog.github.io/dice-lite/)

```js
const Dice = require('@spintax/dice-lite');

Dice.toss({ seed: 'spintax.net' });
// → '<svg xmlns="http://www.w3.org/2000/svg" viewBox="…" …>…</svg>'

Dice.toss({
  seed: 'hero',            // a string or a 32-bit number; the default is 1
  brand: ['#00abf3', '#d6af3c', '#a91455'], // hex or hex[] — the site's tokens
  theme: 'dark',           // 'dark' | 'light'
  dice: 3,                 // 2–5; appends: dice 0..k-1 of k+1 are the k-dice throw
  result: 'lucky7',        // 'lucky7' | 'snake' | 'boxcars' | 'matched' | 'mixed'
  values: [4, null, 2],    // pin exact top faces; null lets the seed/result decide
  motion: 'roll',          // a one-shot settle; honours prefers-reduced-motion
  size: 960,               // width; the height follows the viewBox
});

Dice.die({ value: 5 });    // one die on its em — an icon
Dice.palette('#c2410c');   // → { felt, rail, trim, die, pip, ink, outline, … }

// browser: draw into an element and keep it drawn
const table = Dice.init('#hero', { seed: 'spintax.net' });
table.set({ result: 'snake' });
table.destroy();
```

## Why it looks the way it looks

The brand's colours become the casino table: the first chromatic colour felts it, a gold-hue
colour tones the brass trim; the dice stay paper with near-black pips in every brand. The
table's edge wears that same near-black — a dark surround, never a colour — and `rail:
'brand'` / `rail: 'felt'` / any colour pin reshapes it (`'brand'` brings back the brand-coloured
pad). Under `theme: 'light'` the table defaults to a `line` drawing — a filled felt over a
white page was a pastel field in every sibling that tried it. The picture carries **no fixed
path data**: every coordinate is computed from the seed, so same (seed, options) → identical
bytes, always.

## Install

```sh
npm install @spintax/dice-lite
```

ES5, one file, UMD tail — CommonJS, ESM default import and a plain `<script>` (global
`Dice`) all work. `dice.d.ts` ships the types. **[Playground →](https://investblog.github.io/dice-lite/)**

## The family

dice-lite is a sibling of seven zero-dependency libraries by the same hands —
[slots-lite](https://github.com/investblog/slots-lite) (its closest relative — a slot machine
drawn whole, whose colour engine and seeding it shares),
[cards-lite](https://github.com/investblog/cards-lite),
[roulette-lite](https://github.com/investblog/roulette-lite),
[trigons-lite](https://github.com/investblog/trigons-lite),
[hexagons-lite](https://github.com/investblog/hexagons-lite),
[octagons](https://github.com/investblog/octagons) and
[qr-svg](https://github.com/investblog/qr-svg).

## Licence and credits

MIT. Made in [301](https://301.st) · for [spintax.net](https://spintax.net).
