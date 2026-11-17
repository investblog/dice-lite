// M0: the module contract (ADR 001) and the table's palette port (ADR 004, provisional until
// M1). What this file proves is that the library loads the three ways the family promises,
// and that the table's roles come out of the brand with the constants the spec names — before
// any die is drawn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import Dice from '../dice.js';

const require = createRequire(import.meta.url);
const ROLES = ['felt', 'rail', 'trim', 'die', 'pip', 'ink', 'outline', 'background', 'halo'];
const BRANDS = [undefined, '#00abf3', ['#00abf3', '#d6af3c', '#a91455'], '#8a8a8a', '#d97706', '#7c3aed', ['#2f9e44', '#8a8a8a'], []];
const SUM = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
// LCh hue of a hex, written out here so the test does not borrow the library's own conversion
const hue = (hex) => {
	const [r, g, b] = hex.slice(1).match(/../gu).map((h) => parseInt(h, 16) / 255)
		.map((u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4));
	const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
	const A = 500 * (f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.9505) - f(0.2126 * r + 0.7152 * g + 0.0722 * b));
	const B = 200 * (f(0.2126 * r + 0.7152 * g + 0.0722 * b) - f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.089));
	return (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
};
const away = (h, c) => { const d = Math.abs(h - c) % 360; return Math.min(d, 360 - d); };

test('loads as an ES module default import and as CommonJS, and they are the same object', () => {
	const cjs = require('../dice.js');
	assert.equal(typeof Dice.toss, 'function');
	assert.equal(typeof Dice.palette, 'function');
	assert.equal(Dice.toss, cjs.toss);
});

test('as a <script>: the UMD tail defines exactly one global and touches nothing else', () => {
	const src = readFileSync(new URL('../dice.js', import.meta.url), 'utf8');
	// run the source for real in an empty context: an added `root.Other = …` would show up here
	const sandbox = {};
	vm.runInNewContext(src, sandbox, { filename: 'dice.js' });
	assert.deepEqual(Object.keys(sandbox), ['Dice'], 'exactly one global, named Dice');
	assert.equal(typeof sandbox.Dice.toss, 'function');
	assert.match(src, /root\.Dice = api;/u);
	assert.match(src, /typeof module === 'object' && module\.exports/u);
	assert.doesNotMatch(src, /window\.\w+\s*=/u);
	assert.doesNotMatch(src, /Math\.random|\bDate\b/u, 'determinism is a source-level rule too');
});

test('every role resolves to a colour, for every brand in both themes', () => {
	for (const brand of BRANDS) {
		for (const theme of ['dark', 'light']) {
			const p = Dice.palette(brand, { theme });
			for (const k of ROLES) assert.match(p[k], /^#[0-9a-f]{6}$/u, `${k} for ${brand} ${theme}`);
			assert.equal(p.stroke.length, 3);
		}
	}
});

test('the default triad: blue is the felt, the edge is the dark surround, gold tones the brass', () => {
	const p = Dice.palette();
	assert.equal(p.felt, '#00abf3', 'the brand main colour becomes the table');
	assert.equal(p.rail, p.pip, 'the default edge is the pip-family near-black, not a colour');
	assert.equal(Dice.palette(undefined, { rail: 'brand' }).rail, '#a91455',
		"'brand' keeps the cascade: the second chromatic colour pads the rail, verbatim");
	const ch = p.trim.slice(1).match(/../gu).map((h) => parseInt(h, 16));
	assert.ok(Math.max(...ch) - Math.min(...ch) > 8, 'the triad trim is brass, not chrome');
});

test('the rail modes: dark surround by default, leftover colour on demand, felt for no edge', () => {
	for (const theme of ['dark', 'light']) {
		const p = Dice.palette(undefined, { theme });
		assert.equal(p.rail, p.pip, `the default rail is the near-black surround (${theme})`);
		assert.equal(Dice.palette(undefined, { theme, rail: 'felt' }).rail, p.felt,
			`'felt' paints the rail the felt — no visible edge (${theme})`);
	}
	const brand = Dice.palette(['#00abf3', '#d6af3c', '#a91455'], { rail: 'brand' });
	assert.equal(brand.rail, '#a91455', "'brand' claims the leftover colour verbatim");
});

test('the felt cascade: first chromatic, else the grey, else the spintax blue', () => {
	assert.equal(Dice.palette('#2f9e44').felt, '#2f9e44', 'a lone chromatic colour is the felt');
	assert.equal(Dice.palette('#8a8a8a').felt, '#8a8a8a', 'a grey brand felts the table grey');
	assert.equal(Dice.palette([]).felt, '#00abf3', 'no colours at all fall back to the spintax blue');
});

test('the brass claims the NEAREST gold-hue colour, not the first one listed (spec: Colour)', () => {
	// nearest pairs settle first, ties by colour order: the further gold is listed first on
	// purpose — with the old first-in-window loop it would have won
	const near = '#eab308', far = '#c47a2a';
	const t = Dice.palette(['#00abf3', far, near]).trim;
	assert.ok(away(hue(t), hue(near)) <= 3, `the nearer gold tones the brass: ${t}`);
	assert.ok(away(hue(t), 85) < away(hue(far), 85), 'not the first-listed gold');
});

test('a grey brand gets chrome trim; under rail: brand a lone colour falls back to a felt stop', () => {
	const chrome = Dice.palette('#8a8a8a').trim;
	const ch = chrome.slice(1).match(/../gu).map((h) => parseInt(h, 16));
	assert.ok(Math.max(...ch) - Math.min(...ch) <= 1, `chrome is achromatic: ${chrome}`);
	for (const theme of ['dark', 'light']) {
		const p = Dice.palette('#00abf3', { theme, rail: 'brand' });
		assert.ok(SUM(p.rail) < SUM(p.felt), `the brand-mode fallback rail is darker than the felt (${theme})`);
	}
});

test('a neutral colour in a chromatic brand never turns the brass to chrome (ADR 004 addendum)', () => {
	const triad = ['#00abf3', '#d6af3c', '#a91455'];
	const chromatic = (hex) => {
		const ch = hex.slice(1).match(/../gu).map((h) => parseInt(h, 16));
		return Math.max(...ch) - Math.min(...ch) > 8;
	};
	for (const neutral of ['#ffffff', '#000000', '#8a8a8a']) {
		assert.equal(Dice.palette([...triad, neutral]).trim, Dice.palette(triad).trim,
			`a ${neutral} beside the gold leaves the brass alone`);
	}
	assert.ok(chromatic(Dice.palette(['#00abf3', '#d6af3c', '#111111']).trim), 'blue + gold + black is still brass');
	assert.ok(chromatic(Dice.palette(['#2f9e44', '#ffffff']).trim), 'no gold, one neutral: the default brass, not chrome');
	assert.ok(!chromatic(Dice.palette(['#8a8a8a', '#ffffff']).trim), 'an all-neutral brand is still chrome');
});

test('the dice are the classic in both themes: paper, near-black pips, an ink between them', () => {
	for (const brand of BRANDS) {
		const dark = Dice.palette(brand, { theme: 'dark' }), light = Dice.palette(brand, { theme: 'light' });
		assert.equal(dark.die, light.die, `the die is paper in both themes for ${brand}`);
		assert.ok(SUM(dark.die) > 700, `the die is light for ${brand}`);
		assert.ok(SUM(dark.pip) < 150, `the pips are near-black for ${brand}`);
		assert.ok(SUM(dark.pip) < SUM(dark.ink) && SUM(dark.ink) < SUM(dark.die),
			`ink sits between pip and paper for ${brand}`);
	}
});

test('pins win, and are escaped rather than parsed', () => {
	const svg = Dice.toss({ felt: 'var(--x, "#123")', rail: 'auto' });
	assert.match(svg, /fill="var\(--x, &quot;#123&quot;\)"/u);
	assert.ok(svg.includes(`fill="${Dice.palette().rail}"`), "'auto' unpins the rail");
	assert.ok(Dice.toss({ rail: 'brand' }).includes(`fill="${Dice.palette(undefined, { rail: 'brand' }).rail}"`),
		"'brand' is a mode resolved by the cascade, not a pasted colour word");
	// the OUTER rect is the rail (dice.js paints rail, felt, lattice in that order) — a whole-svg
	// includes() would stay green if 'felt' were pasted literally onto the rail, because the
	// inner felt rect still carries the felt colour
	assert.equal(Dice.toss({ rail: 'felt' }).match(/<\/defs><rect[^>]*fill="([^"]+)"/u)[1],
		'#00abf3', "'felt' paints the rail rect the felt — a mode, not a pasted word");
	assert.equal(Dice.palette(undefined, { rail: '#ff0000' }).rail, '#ff0000',
		'palette() reflects an arbitrary colour pin, as the renderer does');
});

test('the table style: flat fills by default, line draws rules under a light theme', () => {
	assert.ok(Dice.toss().includes(`fill="${Dice.palette().felt}"`), 'dark default is a filled felt');
	const light = Dice.toss({ theme: 'light' });
	const outline = Dice.palette(undefined, { theme: 'light' }).outline;
	assert.doesNotMatch(light, new RegExp(`fill="${Dice.palette().felt}"`, 'u'),
		'light default leaves the felt empty');
	assert.ok(light.includes(`stroke="${outline}"`), '…and rules it in outline instead');
	const flat = Dice.toss({ theme: 'light', style: 'flat' });
	assert.ok(flat.includes(`fill="${Dice.palette().felt}"`), 'an explicit flat still fills it');
});

test('title sets the label and escapes it; without a title the picture is hidden from AT', () => {
	assert.match(Dice.toss({ title: 'a "lucky" seven' }), /role="img" aria-label="a &quot;lucky&quot; seven"/u);
	assert.match(Dice.toss(), /aria-hidden="true"/u);
});
