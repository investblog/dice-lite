// The colour engine and derive() are the family's, ported unchanged from cards-lite by way of
// slots-lite (plan M0), and the family's promise is that a brand reads the same across the
// siblings — a page can put a throw of dice on a hexagon field and expect one palette, not two
// that nearly agree.
//
// "Byte-identical" is pinned by the fixture beside this file, holding what the sibling really
// returns, captured from `hexagons.js @ 9f9b933` — the same fixture cards-lite and slots-lite
// pin. Regenerating it silently is how a drift becomes the new truth: if this fails, find out
// WHICH engine drifted first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Dice from '../dice.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/palette-parity.json', import.meta.url), 'utf8'));

test('palette parity with hexagons-lite: stroke, background and halo, to the byte', () => {
	assert.ok(fixture.cases.length >= 16, 'the fixture still covers the brands it was made for');
	for (const c of fixture.cases) {
		const p = Dice.palette(c.brand, { theme: c.theme });
		const where = `${c.brand} ${c.theme}`;
		assert.deepEqual(p.stroke, c.colors, `${where}: the three stroke colours`);
		assert.equal(p.background, c.background, `${where}: background`);
		assert.equal(p.halo, c.halo, `${where}: halo`);
	}
});

test('and the table roles are NOT the sibling palette: this library adds its own', () => {
	// parity is about the shared engine, not about the whole palette — a guard against someone
	// "fixing" the test above by making palette() return hexagons' object
	const p = Dice.palette('#7c5cff');
	for (const role of ['felt', 'rail', 'trim', 'die', 'pip', 'ink', 'outline']) {
		assert.match(p[role], /^#[0-9a-f]{6}$/u, `${role} is a colour of this library's own`);
	}
	assert.notEqual(p.felt, p.background, 'the felt is the brand on the table, not the field behind it');
});
