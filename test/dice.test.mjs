// M2: the projected cube. What this file proves, through the public API only: the top face
// carries the value (exact projected pips — the top face is the round one, ry/rx ≈ .79,
// side faces flatten to ≤ .57, so the aspect alone splits them at any yaw); the die rests on
// the face opposite its top value (a real net — the visible side values come from the belt,
// never the top value nor its opposite); `dice` appends without moving a die already on the
// table; the brand never changes a value; pins reach the dice; and the whole projection is
// pinned by golden snapshots against silent drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Dice from '../dice.js';

// pip ellipses of one picture — shadows excluded by their fill-opacity
const pips = (svg) => [...svg.matchAll(/<ellipse [^>]*>/g)].map((m) => m[0])
	.filter((t) => !t.includes('fill-opacity'))
	.map((t) => {
		const g = (k) => +t.match(new RegExp(k + '="([^"]*)"'))[1];
		return { x: g('cx'), y: g('cy'), aspect: g('ry') / g('rx') };
	});
// the top face is the round one (top plane ≈ frontal); side pips flatten below .65
const topValue = (svg) => pips(svg).filter((e) => e.aspect > 0.65).length;
// per-die groups in a throw, in paint order — the body groups carry the clipped faces
const dice = (svg) => svg.split('<g transform="translate(').slice(1)
	.filter((seg) => seg.includes('clip-path='))
	.map((seg) => {
		const head = seg.slice(0, seg.indexOf('">'));
		const nums = head.match(/-?\d+\.?\d*/g).map(Number);
		return { at: [nums[0], nums[1]], scale: nums[2] || 1, value: topValue(seg) };
	});
// the faces of one die in paint order (far-to-near): each face path followed by its pips.
// the top face is ALWAYS drawn last (its depth cos > any side's at pitch > 45°)
const faces = (svg) => {
	const g = svg.match(/<g clip-path="url\(#[^)]*\)" filter="url\(#[^)]*\)">([\s\S]*?)<\/g>/);
	const out = [];
	const re = /<path d="[^"]*" fill="url\(#[^"]*\)"\/>|<ellipse [^>]*\/>/g;
	let m, cur = null;
	while ((m = re.exec(g[1]))) {
		if (m[0].startsWith('<path')) { cur = { pips: 0 }; out.push(cur); }
		else if (cur && !m[0].includes('fill-opacity')) cur.pips++;
	}
	return out;
};
const sha = (s) => createHash('sha256').update(s).digest('hex');

test('the top face carries the value: exact pips on every value, several seeds', () => {
	for (const seed of ['m2', 1, 42, 977]) {
		for (let v = 1; v <= 6; v++) {
			const svg = Dice.die({ value: v, seed });
			assert.equal(topValue(svg), v, `die(${v}, seed ${seed}) shows ${v} on top`);
		}
	}
});

test('a real net: three faces, the top drawn last, sides from the belt — distinct, never opposite', () => {
	for (let v = 1; v <= 6; v++) {
		const belt = [1, 2, 3, 4, 5, 6].filter((x) => x !== v && x !== 7 - v);
		for (const seed of [3, 17, 'net']) {
			const fs = faces(Dice.die({ value: v, seed }));
			assert.equal(fs.length, 3, `top ${v}: three visible faces`);
			assert.equal(fs[2].pips, v, `top ${v}: the last-drawn face is the top`);
			const sides = [fs[0].pips, fs[1].pips];
			for (const s of sides) assert.ok(belt.includes(s), `top ${v}: a side shows ${s} from the belt`);
			assert.notEqual(sides[0], sides[1], 'the two sides differ');
		}
	}
});

test('same (seed, options) → identical bytes; different seeds re-roll', () => {
	assert.equal(Dice.die({ seed: 'x' }), Dice.die({ seed: 'x' }));
	assert.ok(new Set(['x', 'y', 'z'].map((s) => Dice.die({ seed: s }))).size > 1);
});

test('dice appends: the first k dice of k+1 keep value, place, scale and yaw', () => {
	// the silhouette d carries the yaw — comparing it pins the orientation, not just the slot
	const sils = (svg) => [...svg.matchAll(/<path id="[^"]*" d="([^"]*)"\/>/g)].map((m) => m[1]);
	for (const [a, b] of [[2, 3], [2, 4], [2, 5], [3, 4], [4, 5]]) {
		const small = dice(Dice.toss({ seed: 'append', dice: a }));
		const big = dice(Dice.toss({ seed: 'append', dice: b }));
		const smallSil = sils(Dice.toss({ seed: 'append', dice: a }));
		const bigSil = sils(Dice.toss({ seed: 'append', dice: b }));
		assert.equal(big.length, b, `dice: ${b} draws ${b} dice`);
		for (let i = 0; i < a; i++) {
			const kept = big.find((bd) => Math.abs(bd.at[0] - small[i].at[0]) < 1e-9 && Math.abs(bd.at[1] - small[i].at[1]) < 1e-9);
			assert.ok(kept, `die at (${small[i].at}) is still on the table`);
			assert.equal(kept.value, small[i].value, `die ${i} keeps its value`);
			assert.equal(kept.scale, small[i].scale, `die ${i} keeps its depth scale`);
			assert.equal(bigSil[i], smallSil[i], `die ${i} keeps its yaw`);
		}
	}
});

test('depth comes from the slot: a back die is smaller than a front die', () => {
	const t = dice(Dice.toss({ seed: 'depth', dice: 3 }));
	const byY = t.slice().sort((p, q) => p.at[1] - q.at[1]);
	assert.ok(byY[0].scale < byY[2].scale, `back (${byY[0].scale}) < front (${byY[2].scale})`);
});

test('brand never changes which value is shown — the seed alone shows them', () => {
	for (const seed of ['brand', 9]) {
		const base = dice(Dice.toss({ seed })).map((d) => d.value);
		for (const brand of ['#00abf3', ['#d6af3c'], '#8a8a8a', ['#2f9e44', '#8a8a8a']]) {
			assert.deepEqual(dice(Dice.toss({ seed, brand })).map((d) => d.value), base,
				`${brand} changes no value for seed ${seed}`);
		}
	}
});

test('pins reach the dice: hex pins mix into the gradients, other strings pass verbatim, escaped', () => {
	const hex = Dice.die({ value: 5, seed: 1, die: '#102030', pip: '#405060' });
	assert.ok(hex.includes('#102030'), 'the die pin colours the faces');
	assert.ok(hex.includes('#405060'), 'the pip pin colours the pips');
	const css = Dice.die({ value: 5, seed: 1, die: 'var(--paper, "#123")' });
	assert.ok(css.includes('fill="var(--paper, &quot;#123&quot;)"'), 'a var() pin is used verbatim, escaped');
});

test('the projection is pinned: golden snapshots of a throw and an icon', () => {
	assert.equal(sha(Dice.toss({ seed: 'golden' })), '85320423faa7f39891d6f0311e0d1aacf71784c5ab327835556dc740bd0af3e5');
	assert.equal(sha(Dice.die({ seed: 'golden', value: 5 })), 'e7bbc0f0489c13b0f5531d450a58bf523cdf0d46159f9c691c0c1eb5d2bee083');
});

test('the paper body draws cut seams: open segments in quiet ink, three per die, joined at the nose by corner arcs', () => {
	const svg = Dice.toss({ seed: 1 });
	const seams = svg.match(/<path clip-path="url\(#[a-z][a-z0-9]{5}\)" d="M-?[\d.]+ -?[\d.]+L-?[\d.]+ -?[\d.]+" fill="none" stroke="#[0-9a-f]+" stroke-opacity=".15" stroke-width="[\d.]+" stroke-linecap="round"\/>/gu);
	assert.equal(seams && seams.length, 9, 'three dice × three shared edges');
	const arcs = svg.match(/d="M-?[\d.]+ -?[\d.]+Q-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+" fill="none" stroke="#[0-9a-f]+" stroke-opacity=".15"/gu);
	assert.equal(arcs && arcs.length, 9, 'the nose corners close through small Q-arcs — three dice × one per face');
	const one = Dice.die({ seed: 1 });
	assert.equal(one.match(/stroke-linecap="round"/gu).length, 6, 'one die: three seams + three nose arcs');
	assert.equal(Dice.toss({ seed: 7, body: 'paper' }), Dice.toss({ seed: 7 }), "'paper' is the default, byte-identical");
});

test('the glass body: frost fill, outline strokes, solid pips, and no dice gradients at all', () => {
	const svg = Dice.toss({ seed: 1, body: 'glass' });
	assert.doesNotMatch(svg, /[lr]inearGradient|adialGradient/u, 'glass draws no gradients — unused defs are not emitted');
	assert.equal((svg.match(/fill-opacity=".55"/gu) || []).length, 3, 'the three silhouettes carry the frost');
	assert.equal((svg.match(/stroke-width="2.2"/gu) || []).length, 18, 'nine seams + nine nose arcs at the seam weight');
	assert.equal((svg.match(/stroke-width="2.6"/gu) || []).length, 3, 'the three silhouettes at the outline weight');
	assert.ok((svg.match(new RegExp('fill="' + Dice.palette().pip + '"', 'gu')) || []).length > 1,
		'solid pips — the rail alone would be exactly one fill of the pip colour');
	const cssDie = Dice.die({ body: 'glass', die: 'var(--paper, "#123")' });
	assert.ok(cssDie.includes('fill="var(--paper, &quot;#123&quot;)"'),
		'an arbitrary CSS die pin frosts the glass verbatim, escaped');
	const ids = (s) => new Set([...s.matchAll(/ id="([a-z][a-z0-9]{5})"/gu)].map((m) => m[1]));
	const paperIds = ids(Dice.toss({ seed: 'mix' })), glassIds = ids(Dice.toss({ seed: 'mix', body: 'glass' }));
	const shared = [...paperIds].filter((x) => glassIds.has(x));
	assert.equal(shared.length, 0, 'paper and glass share no id — the body is part of the id key');
	const paper = Dice.toss({ seed: 7 }), glass = Dice.toss({ seed: 7, body: 'glass' });
	assert.notEqual(sha(paper), sha(glass), 'the body changes the picture');
	assert.equal(Dice.toss({ seed: 7, body: 'glass' }), glass, 'glass is deterministic');
});
