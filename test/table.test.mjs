// M0: the blank table. Determinism (spec: Determinism), the brand/seed independence, the
// dice-count viewBox, and ADR 002's inverted counted exception — the seed-invariant `d` set
// of every output is empty, because the only `d` the picture carries is the lattice, and the
// lattice is generated from a seeded pitch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Dice from '../dice.js';

// colours and ids masked, so two pictures that differ only in brand read as one string
const norm = (svg) => svg
	.replace(/#[0-9a-f]{6}\b/gi, '#C')
	.replace(/ id="[^"]*"/gu, '')
	.replace(/ href="#[^"]*"/gu, ' href="#"')
	.replace(/url\(#[^)]+\)/gu, 'url(#)');
const ids = (svg) => [...svg.matchAll(/ id="([^"]*)"/gu)].map((m) => m[1]);
const ds = (svg) => [...svg.matchAll(/ d="([^"]*)"/gu)].map((m) => m[1]);
const colours = (svg) => [...svg.matchAll(/#[0-9a-f]{6}\b/giu)].map((m) => m[0]).sort();

test('same (seed, options) → identical bytes; the default seed is fixed at 1', () => {
	assert.equal(Dice.toss({ seed: 'spintax.net' }), Dice.toss({ seed: 'spintax.net' }));
	assert.equal(Dice.toss(), Dice.toss({}));
	assert.equal(Dice.toss(), Dice.toss({ seed: 1 }));
	assert.notEqual(Dice.toss({ seed: 1 }), Dice.toss({ seed: 2 }), 'a different seed re-rolls the table');
});

test('brand never touches geometry: colours and ids masked, every brand draws the same table', () => {
	const brands = [undefined, '#00abf3', ['#d6af3c'], '#8a8a8a', ['#2f9e44', '#8a8a8a']];
	const base = norm(Dice.toss({ seed: 'geometry' }));
	for (const brand of brands.slice(1)) {
		assert.equal(norm(Dice.toss({ seed: 'geometry', brand })), base,
			`${brand} moves no coordinate`);
		assert.notEqual(Dice.toss({ seed: 'geometry', brand }), Dice.toss({ seed: 'geometry' }),
			`${brand} still changes the picture`);
	}
});

test('seed never touches colour: the colour set is seed-invariant', () => {
	const base = colours(Dice.toss({ seed: 1 })).join(' ');
	for (const seed of [2, 3, 7, 42, 'spintax.net']) {
		assert.equal(colours(Dice.toss({ seed })).join(' '), base, `seed ${seed} changes no colour`);
	}
});

test('ids are keyed by what is drawn: a different brand or salt never shares an id', () => {
	const a = ids(Dice.toss({ seed: 5 }));
	const byBrand = ids(Dice.toss({ seed: 5, brand: '#d97706' }));
	const bySalt = ids(Dice.toss({ seed: 5, salt: 'again' }));
	assert.ok(a.length > 0, 'the table carries ids');
	assert.ok(byBrand.every((t) => !a.includes(t)), 'a different brand renames every id');
	assert.ok(bySalt.every((t) => !a.includes(t)), 'a different salt renames every id');
	assert.equal(Dice.toss({ seed: 5 }), Dice.toss({ seed: 5, salt: '' }), "an empty salt is the default");
});

test('the only `d` is the lattice, and the lattice is seeded: the seed-invariant d set is empty (ADR 002)', () => {
	const combos = [{}, { theme: 'light' }, { theme: 'light', style: 'flat' },
		{ lattice: 'trigon' }, { lattice: 'octagon' }, { weight: 2 }];
	for (const opts of combos) {
		// per options set: what survives in EVERY seed's output must be nothing. A constant
		// `d` added anywhere in this picture — however conditional — lands in the intersection
		// and fails; intersecting across different options would let a style-conditional d slip
		let common = null;
		for (let seed = 1; seed <= 8; seed++) {
			const set = new Set(ds(Dice.toss({ ...opts, seed })));
			assert.ok(set.size > 0, `${JSON.stringify(opts)} seed ${seed} carries its lattice — the assertion must not pass against empty output`);
			common = common === null ? set : new Set([...common].filter((d) => set.has(d)));
		}
		assert.equal(common.size, 0, `${JSON.stringify(opts)}: a d the seed cannot change: "${[...common][0] || ''}"`);
	}
	// the icon too: per value, no d survives across seeds — a value-conditional fixed d fails
	for (let v = 1; v <= 6; v++) {
		let icon = null;
		for (let seed = 1; seed <= 6; seed++) {
			const set = new Set(ds(Dice.die({ value: v, seed })));
			icon = icon === null ? set : new Set([...icon].filter((d) => set.has(d)));
		}
		assert.equal(icon.size, 0, `die(${v}): a d the seed cannot change: "${[...icon][0] || ''}"`);
	}
	// sanity, so the assertion above cannot pass against a broken renderer: a throw repeats
	// its own d under the same seed; lattice: none drops the pattern, not the dice
	assert.deepEqual(ds(Dice.toss({ seed: 9 })), ds(Dice.toss({ seed: 9 })));
	assert.ok(!Dice.toss({ seed: 9, lattice: 'none' }).includes('<pattern'));
});

test('no signature: the output names nothing, describes nothing, fingerprints nothing', () => {
	// roulette's ADR 005, this family's way: no comments, metadata, desc, data-*, xlink,
	// version, library names — and every id is a seeded token of the family's shape
	const svgs = [
		Dice.toss({ seed: 1 }),
		Dice.toss({ seed: 'spintax.net', theme: 'light' }),
		Dice.toss({ seed: 3, style: 'line', lattice: 'octagon', title: 'a throw' }),
		Dice.toss({ seed: 4, size: 360, salt: 'sig' }),
		Dice.toss({ seed: 5, motion: 'roll' }),
		Dice.toss({ seed: 6, motion: 'roll', speed: 2, result: 'lucky7' }),
		Dice.die({ seed: 2, value: 4 }),
		Dice.die({ seed: 'icon', value: 6, theme: 'light' }),
	];
	for (const svg of svgs) {
		assert.doesNotMatch(svg, /<!--|<metadata|<desc[\s>]|\sdata-|\bxlink|\bversion\s*=|dice|spintax|301/iu,
			'no comments, metadata, desc, data-*, xlink, version, library or promotion names in the output');
		for (const id of ids(svg)) assert.match(id, /^[a-z][a-z0-9]{5}$/u, `every id is a seeded token: ${id}`);
		if (svg.includes('<style>')) {
			// the settle adds classes — each must be a seeded token too (the M0 comment's rule)
			for (const cls of [...svg.matchAll(/\sclass="([^"]*)"/gu)].map((m) => m[1])) {
				assert.match(cls, /^[a-z][a-z0-9]{5}$/u, `every class is a seeded token: ${cls}`);
			}
			assert.doesNotMatch(svg, /--/u, 'no custom properties in a motion picture');
		} else {
			// M0 carries no classes and no custom properties at all; the motion work adds them,
			// and its check above asserts the seeded-token shape
			assert.doesNotMatch(svg, /\sclass=|--/u, 'M0 carries no classes and no custom properties');
		}
	}
});

test('the viewBox follows dice: 2–5, default 3, clamped', () => {
	assert.equal(Dice.toss(), Dice.toss({ dice: 3 }));
	assert.equal(Dice.toss({ dice: 1 }), Dice.toss({ dice: 2 }), 'below the range clamps to 2');
	assert.equal(Dice.toss({ dice: 9 }), Dice.toss({ dice: 5 }), 'above the range clamps to 5');
	const vb = (opts) => Dice.toss(opts).match(/viewBox="([^"]*)"/u)[1];
	assert.notEqual(vb({ dice: 2 }), vb({ dice: 3 }), 'a third die grows the felt');
	assert.equal(vb({ dice: 4 }), vb({ dice: 5 }), 'the quincunx fits the square');
});

test('lattice kinds and none', () => {
	assert.ok(Dice.toss().includes('<pattern'), 'auto draws the lattice');
	assert.ok(Dice.toss({ lattice: 'trigon' }).includes('<pattern'));
	assert.ok(!Dice.toss({ lattice: 'none' }).includes('<pattern'));
});

test('size sets the width and the height follows the viewBox; precision rounds coordinates', () => {
	const svg = Dice.toss({ size: 360 });
	const [, , w, h] = Dice.toss({ size: 360 }).match(/viewBox="([^"]*)"/u)[1].split(' ').map(Number);
	assert.match(svg, /width="360"/u);
	assert.match(svg, new RegExp(`height="${Math.round(360 * h / w)}"`, 'u'));
	// the dice always carry one decimal, so the probe reads only what precision governs: the
	// viewBox and the table's rects (the old `/\.\d/` over the whole string could never fail)
	const tableNums = (s) => [s.match(/viewBox="([^"]*)"/u)[1], ...[...s.matchAll(/<rect ([^>]*)\/>/gu)].map((m) => m[1])]
		.join(' ').match(/-?\d+(?:\.\d+)?/gu);
	for (const seed of [1, 'p', 9]) {
		assert.ok(tableNums(Dice.toss({ seed })).every((v) => !v.includes('.')), `seed ${seed}: precision 0 draws whole numbers`);
		const two = tableNums(Dice.toss({ seed, precision: 2 }));
		assert.ok(two.some((v) => /\.\d/u.test(v)), `seed ${seed}: precision 2 exposes the seeded rail's decimals`);
		assert.ok(two.every((v) => !/\.\d{3}/u.test(v)), `seed ${seed}: …and never more than two`);
	}
});
