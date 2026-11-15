// M3: results are data (ADR 003), the settle (ADR 005 + addendum), init(). The checkers
// below are written longhand on purpose: the library contains no evaluator, so the tests
// are where "a lucky seven shows a seven" is proven — name → values, never a score.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Dice from '../dice.js';

// per-die top values of a throw, keyed by DIE INDEX: bodies come in paint order (sorted by
// depth), so each is matched back to its canonical slot by position
const SLOT_PX = [[-126, 0], [126, 0], [0, -126], [0, 126], [0, 0]];
const topValues = (svg) => {
	const out = [];
	for (const seg of svg.split('<g transform="translate(').slice(1).filter((s) => s.includes('clip-path='))) {
		const head = seg.slice(0, seg.indexOf(')'));
		const nums = head.match(/-?\d+\.?\d*/g).map(Number);
		let best = 0, bd = Infinity;
		for (let s = 0; s < SLOT_PX.length; s++) {
			const d = (SLOT_PX[s][0] - nums[0]) ** 2 + (SLOT_PX[s][1] - nums[1]) ** 2;
			if (d < bd) { bd = d; best = s; }
		}
		let n = 0;
		for (const m of seg.matchAll(/<ellipse [^>]*>/g)) {
			const t = m[0];
			if (t.includes('fill-opacity')) continue;
			const g = (k) => +t.match(new RegExp(k + '="([^"]*)"'))[1];
			if (g('ry') / g('rx') > 0.65) n++;
		}
		out[best] = n;
	}
	return out;
};

const PAIRS7 = [[1, 6], [2, 5], [3, 4]];

test('lucky7: dice 0 and 1 are one of (1,6), (2,5), (3,4); the rest keep the seed', () => {
	for (const seed of ['r', 5, 77]) {
		for (const k of [2, 3, 5]) {
			const v = topValues(Dice.toss({ seed, dice: k, result: 'lucky7' }));
			assert.ok(PAIRS7.some(([a, b]) => (v[0] === a && v[1] === b) || (v[0] === b && v[1] === a)),
				`seed ${seed} k ${k}: ${v[0]} + ${v[1]} = 7`);
		}
	}
	// the other dice read the seed exactly as without the result
	const plain = topValues(Dice.toss({ seed: 'same', dice: 4 }));
	const lucky = topValues(Dice.toss({ seed: 'same', result: 'lucky7', dice: 4 }));
	assert.deepEqual(lucky.slice(2), plain.slice(2), 'dice 2+ keep the seed under lucky7');
});

test('snake and boxcars: dice 0 and 1 are aces / sixes, the rest keep the seed', () => {
	for (const seed of ['s', 9]) {
		assert.deepEqual(topValues(Dice.toss({ seed, result: 'snake' })).slice(0, 2), [1, 1]);
		assert.deepEqual(topValues(Dice.toss({ seed, result: 'boxcars' })).slice(0, 2), [6, 6]);
	}
});

test('matched: every die shows the same value, chosen by the seed', () => {
	for (const seed of ['m', 31]) {
		for (const k of [2, 4]) {
			const v = topValues(Dice.toss({ seed, dice: k, result: 'matched' }));
			assert.equal(new Set(v).size, 1, `seed ${seed} k ${k}: all ${v[0]}`);
			assert.ok(v[0] >= 1 && v[0] <= 6);
		}
	}
});

test('mixed: no two dice agree', () => {
	for (const seed of ['x', 12]) {
		for (const k of [3, 5]) {
			const v = topValues(Dice.toss({ seed, dice: k, result: 'mixed' }));
			assert.equal(new Set(v).size, v.length, `seed ${seed} k ${k}: all distinct`);
		}
	}
});

test('precedence: values pin > result > seed; null or out-of-range leaves the die alone', () => {
	const v = topValues(Dice.toss({ seed: 'p', dice: 3, result: 'snake', values: [4, null, 2] }));
	assert.deepEqual(v, [4, 1, 2], 'values pin, result names, seed decides');
	const o = topValues(Dice.toss({ seed: 'p', dice: 3, values: [9, 0, -1] }));
	assert.deepEqual(o, topValues(Dice.toss({ seed: 'p', dice: 3 })), 'out-of-range pins leave every die to the seed');
	const m = topValues(Dice.toss({ seed: 'p', dice: 3, result: 'mixed', values: [4, null, null] }));
	assert.equal(new Set(m).size, 3, 'mixed never repeats a pinned value');
	const late = topValues(Dice.toss({ seed: 'p', dice: 3, result: 'mixed', values: [null, 4, null] }));
	assert.equal(new Set(late).size, 3, 'mixed never repeats a late pin either');
});

test('choosing a result moves nothing it does not name: positions, yaws and untouched values', () => {
	const at = (svg) => [...svg.matchAll(/<g transform="translate\(([^ )]*) ([^ )]*)\)/g)].map((m) => `${m[1]},${m[2]}`);
	const sils = (svg) => [...svg.matchAll(/<path id="[^"]*" d="([^"]*)"\/>/g)].map((m) => m[1]);
	for (const res of ['snake', 'boxcars', 'matched', 'lucky7', 'mixed']) {
		assert.deepEqual(at(Dice.toss({ seed: 'pos', result: res })), at(Dice.toss({ seed: 'pos' })), `${res}: placements`);
		assert.deepEqual(sils(Dice.toss({ seed: 'pos', result: res })), sils(Dice.toss({ seed: 'pos' })), `${res}: yaws`);
	}
	// dice 2+ read the seed exactly as without the result — for results that name only 0–1
	const plain4 = topValues(Dice.toss({ seed: 'keep', dice: 4 }));
	for (const res of ['snake', 'boxcars']) {
		assert.deepEqual(topValues(Dice.toss({ seed: 'keep', dice: 4, result: res })).slice(2), plain4.slice(2), `${res}: dice 2+ keep the seed`);
	}
});

test('the settle: CSS from-only, staggered, salted names, reduced motion restores the bytes', () => {
	const roll = Dice.toss({ seed: 1, motion: 'roll' });
	assert.ok(roll.includes('<style>'), 'the roll carries its CSS');
	assert.match(roll, /@keyframes [a-z][a-z0-9]{5}\{from\{transform:translateY\(-/u, 'from-only settle');
	assert.ok(!/[,{}]\s*to\s*\{/.test(roll), 'no `to` block — the rest state is the static picture');
	const periods = [...roll.matchAll(/animation:[a-z][a-z0-9]{5} ([\d.]+)s cubic-bezier\(\.2,\.7,\.3,1\.08\)/g)].map((m) => +m[1]);
	assert.deepEqual(periods.map((x) => Math.round(x * 100) / 100), [0.8, 1.1, 1.4], 'deal-order stagger');
	const classes = [...roll.matchAll(/\.([a-z][a-z0-9]{5})\{animation:[a-z][a-z0-9]{5} /g)].map((m) => m[1]);
	assert.equal(classes.length, 3, 'every die animates under its own class');
	for (const cls of classes) {
		assert.ok(!new RegExp(`<g[^>]*class="${cls}"[^>]*transform=|<g[^>]*transform="[^"]*"[^>]*class="${cls}"`).test(roll),
			'the animated group never carries a transform attribute, in either order');
	}
	const reduced = roll.match(/@media\(prefers-reduced-motion:reduce\)\{([^{]+)\{animation:none\}\}/u);
	assert.ok(reduced, 'reduced motion rule');
	assert.deepEqual([...reduced[1].matchAll(/\.([a-z][a-z0-9]{5})/g)].map((m) => m[1]).sort(), classes.slice().sort(),
		'reduced motion names every animated class');
	// speed 0 and no motion are the static bytes exactly; speed, salt and the picture key salt the names
	assert.equal(Dice.toss({ seed: 1, motion: 'roll', speed: 0 }), Dice.toss({ seed: 1 }));
	assert.equal(Dice.toss({ seed: 1, motion: false }), Dice.toss({ seed: 1 }));
	const names = (o) => [...Dice.toss(o).matchAll(/@keyframes ([a-z][a-z0-9]{5})/g)].map((m) => m[1]).join(',');
	for (const tweak of [{ speed: 2 }, { salt: 'x' }, { felt: '#123456' }]) {
		assert.notEqual(names({ seed: 1, motion: 'roll' }), names({ seed: 1, motion: 'roll', ...tweak }),
			`${JSON.stringify(tweak)} renames the motion`);
	}
});

test('init(): draws into an element, merges options, destroys; null when nothing is found', () => {
	const hosts = [];
	globalThis.document = {
		querySelector: (sel) => (sel === '#table' ? hosts[hosts.length - 1] : null),
	};
	try {
		const host = { innerHTML: '' };
		hosts.push(host);
		const inst = Dice.init('#table', { seed: 'i', dice: 4 });
		assert.ok(host.innerHTML.startsWith('<svg'), 'the throw is drawn');
		assert.equal(typeof inst.get, 'function');
		inst.set({ result: 'snake' });
		assert.equal(inst.get().result, 'snake', 'set merges into the current options');
		assert.equal(inst.get().seed, 'i', 'and keeps what set did not touch');
		const snap = inst.get();
		snap.dice = 99;
		snap.result = 'hacked';
		assert.equal(inst.get().dice, 4, 'get returns a copy, not the live options');
		assert.equal(inst.get().result, 'snake');
		inst.destroy();
		assert.equal(host.innerHTML, '', 'destroy clears the element');
		assert.equal(Dice.init('#missing'), null, 'a missing element gives null');
	} finally {
		delete globalThis.document;
	}
});
