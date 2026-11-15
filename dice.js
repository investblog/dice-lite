/*!
 * dice-lite — a procedural throw of dice as an SVG string.
 * MIT © 301ST (https://301.st) · for spintax.net
 *
 * One file, ES5, zero dependencies. Works as a <script> (defines `Dice`) and as a CommonJS
 * module (Node, bundlers) — ADR 001. The spec is docs/README.md: change the doc before the code.
 * The colour engine and the seed machinery are the family's, ported unchanged from cards-lite
 * (by way of slots-lite); a fixture test pins that they agree.
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.Dice = api;
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	var NS = 'http://www.w3.org/2000/svg';
	var DEFAULT_BRAND = ['#00abf3', '#d6af3c', '#a91455'];
	// machine space: origin at the centre of the table, y down (spec: Machine space). The
	// constants are provisional — looked at on screen at M1/M2 and kept or changed there.
	var EM = 200; // the die face, square, origin at its centre; dice land at M2
	var DIAS = Math.sqrt(2) * EM / 2; // its half-diagonal: room the rotation scatter needs
	var SQRT3 = Math.sqrt(3), A_REG = (2 - Math.SQRT2) / 2; // 0.29289… exact regular octagon
	var MARGIN = [90, 64]; // felt inset from the viewBox: long side, short side
	var RAIL = [22, 34]; // the padded ring's width range, one seeded draw (table:rail)

	// ── numbers and markup ──────────────────────────────────────────────────

	// Round, then String: no exponent notation, and no "-0" (it is a different string from "0").
	function n(v, d) {
		var p = Math.pow(10, d || 0), r = Math.round(v * p) / p;
		return String(r === 0 ? 0 : r);
	}
	function esc(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
	// attrs is a flat [name, value, …] list; a null value drops the attribute
	function el(tag, attrs, inner) {
		var s = '<' + tag;
		for (var i = 0; i < attrs.length; i += 2) if (attrs[i + 1] != null) s += ' ' + attrs[i] + '="' + attrs[i + 1] + '"';
		return inner == null ? s + '/>' : s + '>' + inner + '</' + tag + '>';
	}

	// ── seeds ───────────────────────────────────────────────────────────────

	function fnv(str) {
		var h = 0x811c9dc5;
		for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
		return h >>> 0;
	}
	function fmix(h) {
		h = Math.imul(h ^ h >>> 16, 0x85ebca6b);
		h = Math.imul(h ^ h >>> 13, 0xc2b2ae35);
		return (h ^ h >>> 16) >>> 0;
	}
	function mulberry(a) {
		return function () {
			a = (a + 0x6D2B79F5) >>> 0;
			var x = Math.imul(a ^ (a >>> 15), 1 | a);
			x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
			return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
		};
	}
	// Every parameter reads its OWN stream, keyed by name. Nothing shares a cursor, so adding a
	// parameter later never re-rolls an existing throw (the hexagons lesson).
	function streams(seed) {
		var s = typeof seed === 'number' ? seed >>> 0 : fnv(String(seed));
		return function (key) { return mulberry(fmix(s ^ Math.imul(fnv(key), 0x9E3779B9))); };
	}

	// ── auto-palette: sRGB <-> CIE LCh(ab), D65 — ported unchanged from hexagons ──

	function parseColor(str) {
		str = String(str).trim();
		if (str.charAt(0) === '#') {
			var h = str.slice(1);
			if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
			var v = parseInt(h, 16);
			return [v >> 16 & 255, v >> 8 & 255, v & 255];
		}
		var m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
		return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
	}
	function toHex(c) {
		return '#' + ((1 << 24) + ((c[0] | 0) << 16) + ((c[1] | 0) << 8) + (c[2] | 0)).toString(16).slice(1);
	}
	function s2l(u) { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); }
	function l2s(u) { return 255 * (u <= 0.0031308 ? u * 12.92 : 1.055 * Math.pow(u, 1 / 2.4) - 0.055); }
	function fwd(t) { return t > 216 / 24389 ? Math.pow(t, 1 / 3) : (24389 / 27 * t + 16) / 116; }
	function inv(t) { var c = t * t * t; return c > 216 / 24389 ? c : (116 * t - 16) * 27 / 24389; }

	function rgb2lch(rgb) {
		var r = s2l(rgb[0]), g = s2l(rgb[1]), b = s2l(rgb[2]);
		var x = (0.41246 * r + 0.35758 * g + 0.18044 * b) / 0.95047;
		var y = 0.21267 * r + 0.71515 * g + 0.07218 * b;
		var z = (0.01933 * r + 0.11919 * g + 0.9503 * b) / 1.08883;
		var fx = fwd(x), fy = fwd(y), fz = fwd(z);
		var L = 116 * fy - 16, A = 500 * (fx - fy), B = 200 * (fy - fz);
		var C = Math.sqrt(A * A + B * B);
		var H = Math.atan2(B, A) * 180 / Math.PI;
		return [L, C, (H + 360) % 360];
	}
	function lch2lin(L, C, H) {
		var A = C * Math.cos(H * Math.PI / 180), B = C * Math.sin(H * Math.PI / 180);
		var fy = (L + 16) / 116, fx = fy + A / 500, fz = fy - B / 200;
		var x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883;
		return [
			3.24045 * x - 1.53714 * y - 0.49853 * z,
			-0.96927 * x + 1.87601 * y + 0.04156 * z,
			0.05564 * x - 0.20403 * y + 1.05723 * z
		];
	}
	// Gamut policy: hold L and H, reduce C until inside sRGB. Never channel-clip — clipping
	// shifts hue, and hue is the brand's identity.
	function lch2rgb(L, C, H) {
		var lin = lch2lin(L, C, H), lo = 0, hi = C, i;
		if (!inGamut(lin)) {
			for (i = 0; i < 20; i++) {
				var mid = (lo + hi) / 2;
				lin = lch2lin(L, mid, H);
				if (inGamut(lin)) lo = mid; else hi = mid;
			}
			lin = lch2lin(L, lo, H);
		}
		return [clamp255(l2s(lin[0])), clamp255(l2s(lin[1])), clamp255(l2s(lin[2]))];
	}
	function inGamut(lin) {
		for (var i = 0; i < 3; i++) if (lin[i] < -0.0005 || lin[i] > 1.0005) return false;
		return true;
	}
	function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
	function lum(rgb) { return 0.2126 * s2l(rgb[0]) + 0.7152 * s2l(rgb[1]) + 0.0722 * s2l(rgb[2]); }
	function contrast(a, b) {
		var x = lum(a), y = lum(b);
		return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
	}
	// Repair by shifting L only (fidelity: hue and chroma are the brand's)
	function ensureContrast(rgb, bgRgb, min, dir) {
		if (contrast(rgb, bgRgb) >= min) return rgb;
		var lch = rgb2lch(rgb);
		for (var L = lch[0]; L >= 2 && L <= 98; L += dir * 2) {
			var c = lch2rgb(L, lch[1], lch[2]);
			if (contrast(c, bgRgb) >= min) return c;
		}
		return rgb;
	}
	// hexagons' derive(), unchanged: same input, same colours as Hexagons.palette().
	function derive(brand, theme) {
		var arr = (typeof brand === 'string' ? [brand] : brand).map(function (x) {
			return rgb2lch(parseColor(x));
		});
		var chrom = [];
		for (var i = 0; i < arr.length; i++) if (arr[i][1] >= 12) chrom.push(arr[i]);
		var neutral = chrom.length === 0;
		var prim = neutral ? [50, 0, 0] : chrom[0];
		var acc = chrom.length > 1 ? chrom[1] : [0, prim[1], (prim[2] + 40) % 360];
		var hotH = (chrom.length > 2 ? chrom[2] : prim)[2];
		var C = prim[1], H = prim[2], light = theme === 'light';

		var bg = light
			? lch2rgb(97, neutral ? 0 : 3, H)
			: lch2rgb(6, Math.min(C * 0.2, 10), H);
		var halo = light
			? lch2rgb(92, Math.min(C * 0.2, 8), H)
			: lch2rgb(12, Math.min(C * 0.3, 15), H);
		var Ls = light ? [72, 52, 32] : [32, 58, 82];
		var dir = light ? -1 : 1;
		var stops = [
			ensureContrast(lch2rgb(Ls[0], C * 0.9, H), bg, 1.5, dir),
			ensureContrast(lch2rgb(Ls[1], C, H), bg, 2.5, dir),
			ensureContrast(lch2rgb(Ls[2], C * 0.55, H), bg, 5, dir)
		];
		var accent = ensureContrast(lch2rgb(light ? 45 : 70, acc[1], acc[2]), bg, 3, dir);
		var hot = ensureContrast(
			lch2rgb(light ? 28 : 92, neutral ? 0 : (light ? 24 : 12), hotH), bg, 7, dir);

		return { colors: stops, accent: accent, hot: hot, background: bg, halo: halo };
	}

	// ── colour: a casino table from the brand (ADR 004, provisional until M1) ──

	// Dice claim almost no classic hues — the subject is paper and black — so the brand colours
	// go where a casino table puts them: the felt takes the first chromatic brand colour, the
	// trim is metal claiming a gold-hue colour (slots' formula), the rail takes the next colour
	// left. die, pip, ink and outline are derived, never brand colours.
	function roles(brand, theme) {
		var list = brand == null ? DEFAULT_BRAND : typeof brand === 'string' ? [brand] : brand;
		var chrom = [], grey = null, i;
		for (i = 0; i < list.length; i++) {
			var c = rgb2lch(parseColor(list[i]));
			if (c[1] >= 12) chrom.push({ lch: c, hex: list[i] });
			else if (!grey) grey = list[i];
		}
		var dk = theme === 'light' ? 'light' : 'dark';
		// felt: the first chromatic brand colour; else the grey one; else the spintax blue
		var feltHex = chrom.length ? chrom[0].hex : grey || '#00abf3';
		var f = rgb2lch(parseColor(feltHex));
		var bC = f[1], bH = f[2];
		var felt = derive(feltHex, dk);
		// the family's capture with the table's windows, each colour at most once: the felt
		// takes the first chromatic colour; trim claims a gold-hue colour for the brass — not
		// the felt's; the rail takes the next chromatic colour left (ADR 004: on the default
		// triad the blue is the felt, the gold tones the brass, the crimson pads the rail)
		var goldI = -1, goldD = Infinity;
		for (i = 1; i < chrom.length; i++) {
			var d = Math.abs(chrom[i].lch[2] - 85) % 360;
			d = Math.min(d, 360 - d);
			if (d < goldD) { goldD = d; goldI = i; }
		}
		if (goldD > 30) goldI = -1; // the window is ±30° around the gold centre
		var gold = goldI >= 0 ? chrom[goldI].lch : null;
		var trim = lch2rgb(66, grey || !chrom.length ? 0 : gold ? gold[1] * 0.5 : 25, gold ? gold[2] : 85);
		// rail: that leftover colour, verbatim; with nothing left, a darker derive() stop of
		// the felt — the darkest under dark, the darkest light-theme stop under light
		var railHex = null;
		for (i = 1; i < chrom.length; i++) {
			if (i !== goldI) { railHex = chrom[i].hex; break; }
		}
		var rail = railHex ? parseColor(railHex) : felt.colors[dk === 'light' ? 2 : 0];
		// the dice are the classic: paper in both themes, near-black pips and shadows (cards'
		// stock/spade/ink formulas, the paper as their contrast reference)
		var die = lch2rgb(96.5, Math.min(bC * 0.08, 4), bH);
		var pip = ensureContrast(lch2rgb(14, Math.min(bC * 0.15, 6), bH), die, 7, -1);
		var ink = ensureContrast(lch2rgb(34, Math.min(bC * 0.25, 10), bH), die, 3, -1);
		// the field the table sits on is the family's palette of the whole brand, so a throw on a
		// sibling field reads as one picture (pinned by the parity fixture)
		var field = derive(list, dk);
		return {
			felt: parseColor(feltHex),
			rail: rail,
			trim: trim,
			die: die, pip: pip, ink: ink,
			// a line table's rule: the felt hue's middle stop, which derive() holds ≥ 2.5
			// against the page
			outline: felt.colors[1],
			stroke: field.colors, background: field.background, halo: field.halo
		};
	}

	function palette(brand, opts) {
		var r = roles(brand, opts && opts.theme), out = {};
		for (var k in r) out[k] = k === 'stroke' ? r[k].map(toHex) : toHex(r[k]);
		return out;
	}

	// seeded ids: [a-z][a-z0-9]{5}, never repeated within one picture — cards-lite's, unchanged
	function tokens(S, salt) {
		var r = S('ids' + (salt || '')), used = {}, AZ = 'abcdefghijklmnopqrstuvwxyz', AZ09 = AZ + '0123456789';
		return function () {
			var tk;
			do {
				tk = AZ.charAt(Math.floor(r() * 26));
				for (var i = 0; i < 5; i++) tk += AZ09.charAt(Math.floor(r() * 36));
			} while (used[tk]);
			used[tk] = 1;
			return tk;
		};
	}

	// ── the context ─────────────────────────────────────────────────────────

	function context(o, what) {
		var S = streams(o.seed == null ? 1 : o.seed), r = roles(o.brand, o.theme), seen = {}, key = what;
		var c = {
			o: o, S: S, defs: '',
			p: o.precision == null ? 0 : o.precision,
			w: o.weight == null ? 1 : o.weight,
			// the table style: the caller's, or flat on dark and line on light (ADR 004)
			cab: o.style ? o.style !== 'line' : o.theme !== 'light',
			col: function (role) {
				var pin = o[role];
				return pin != null && pin !== 'auto' ? esc(pin) : toHex(r[role]);
			}
		};
		// Ids are keyed by WHAT IS DRAWN — the geometry and every colour a def carries — so two
		// different throws under one seed on one page never share an id (cards-lite's lesson).
		// salt remains for the same picture twice.
		for (var k in r) key += k === 'stroke' ? '' : c.col(k);
		// normalised, so passing a default ('auto', '', []) is byte-identical to leaving it out
		key += c.cab + c.w + c.p + (o.lattice || 'auto');
		c.tk = tokens(S, (o.salt || '') + key);
		c.add = function (k, make) {
			if (!seen[k]) { var id = c.tk(), m; seen[k] = id; m = make(); c.defs += m.replace('"%"', '"' + id + '"'); }
			return seen[k];
		};
		return c;
	}

	function wrap(o, c, box, inner) {
		var a11y = o.title ? ['role', 'img', 'aria-label', esc(o.title)] : ['aria-hidden', 'true'];
		var vb = box.map(function (v) { return n(v, c.p); }).join(' ');
		return el('svg', ['xmlns', NS, 'viewBox', vb, 'width', o.size == null ? null : n(o.size),
			'height', o.size == null ? null : n(o.size * box[3] / box[2])].concat(a11y),
		(c.defs ? el('defs', [], c.defs) : '') + inner);
	}

	// ── the lattice: the family's own tiles (cards-lite's back port) ────────

	// The three `d` builders are the siblings' own, copied with their seam comments — both were
	// earned by defects, and re-deriving them would re-earn them. Sources: trigons-lite.js:427,
	// octagons.js:463, hexagons.js:870, by way of cards.js.
	function lattice(kind, p2, flat) {
		var d = [];
		var q = function (v) { return Math.round(v * 1000) / 1000; };
		var seg = function (x1, y1, x2, y2) {
			// flat orientation is the same tile with x and y swapped (hexagons')
			d.push(flat ? 'M' + q(y1) + ' ' + q(x1) + 'L' + q(y2) + ' ' + q(x2)
				: 'M' + q(x1) + ' ' + q(y1) + 'L' + q(x2) + ' ' + q(y2));
		};
		if (kind === 'trigon') {
			// border segments sit on both opposite edges so the half-clipped strokes of
			// neighbouring tiles sum to full weight; butt caps keep the vertices sharp
			seg(0, 0, p2, 0); seg(0, p2, p2, p2);
			seg(0, 0, 0, p2); seg(p2, 0, p2, p2);
			seg(p2, 0, 0, p2);
		} else if (kind === 'octagon') {
			var a = A_REG * p2;
			// Flats sit exactly on the tile edge, so a stroke there is half-clipped. Drawing each on
			// BOTH opposite edges lets the neighbouring tile supply the missing half.
			seg(a, 0, p2 - a, 0); seg(a, p2, p2 - a, p2);
			seg(0, a, 0, p2 - a); seg(p2, a, p2, p2 - a);
			seg(p2 - a, 0, p2, a); seg(p2, p2 - a, p2 - a, p2);
			seg(a, p2, 0, p2 - a); seg(0, a, a, 0);
		} else {
			var sz = p2 / SQRT3;
			var cell = function (cx, cy, r) {
				var w2 = SQRT3 / 2 * r;
				var v = [[cx, cy - r], [cx + w2, cy - r / 2], [cx + w2, cy + r / 2],
					[cx, cy + r], [cx - w2, cy + r / 2], [cx - w2, cy - r / 2]];
				for (var k = 0; k < 6; k++) seg(v[k][0], v[k][1], v[(k + 1) % 6][0], v[(k + 1) % 6][1]);
			};
			// the centre cell's side walls sit on the tile edge, so both are drawn (the octagons' seam)
			cell(p2 / 2, sz, sz);
			// the one wall not on the centre cell: between the two half-cells
			seg(p2 / 2, 2 * sz, p2 / 2, 3 * sz);
		}
		return d.join('');
	}
	var KINDS = ['trigon', 'octagon', 'hex'];

	// the felt's lattice: one seeded tile in `col` at a low weight, as the pattern fill the felt
	// carries — or none at all, `lattice: 'none'`
	function tile(c, col, op) {
		var S = c.S, o = c.o;
		if (o.lattice === 'none') return ['fill', 'none'];
		var kind = KINDS.indexOf(o.lattice) >= 0 ? o.lattice : KINDS[Math.floor(S('table:lattice')() * 3)];
		var pitch = 22 + 22 * S('table:pitch')(), flatHex = kind === 'hex' && S('table:orient')() < 0.5;
		var tall = kind === 'hex' ? 3 * (pitch / SQRT3) : pitch;
		return ['fill', 'url(#' + c.add('tile' + col + op, function () {
			return el('pattern', ['id', '%', 'patternUnits', 'userSpaceOnUse',
				'width', n(flatHex ? tall : pitch, 2), 'height', n(flatHex ? pitch : tall, 2),
				'patternTransform', 'translate(' + n(pitch * S('table:phase')(), 2) + ' ' + n(pitch * S('table:phase2')(), 2) +
					') rotate(' + n(90 * S('table:turn')(), 2) + ')'],
			// butt caps (the default, never set): round caps blunt the vertices (hexagons.js:918)
			el('path', ['d', lattice(kind, pitch, flatHex), 'fill', 'none', 'stroke', col,
				'stroke-width', n((1 + 1.4 * S('table:weight')()) * c.w, 2), 'stroke-opacity', op]));
		}) + ')'];
	}

	// ── the throw ───────────────────────────────────────────────────────────

	// The canonical slots per count, in units of the slot spacing A: the felt is sized to
	// these plus margin, so `dice` appends without redrawing the table (spec: the throw
	// layout) and dice never overlap by construction — the seed only jitters inside the
	// slot at M2. Data now, the dice at M2.
	var SLOTS = {
		2: [[-1, 0], [1, 0]],
		3: [[-1, .55], [1, .55], [0, -.55]],
		4: [[-1, -.7], [1, -.7], [-1, .7], [1, .7]],
		5: [[-1, -.7], [1, -.7], [-1, .7], [1, .7], [0, 0]]
	};

	function toss(opts) {
		var o = opts || {}, k = Math.max(2, Math.min(5, Math.round(o.dice) || 3));
		var c = context(o, 'table' + k), p = c.p, S = c.S, i;
		// the felt is sized to the canonical slots plus margin (spec: Machine space); the
		// margin is the felt's inset from the viewBox — the rail lives inside it
		var sp = SLOTS[k], ax = 0, ay = 0;
		for (i = 0; i < sp.length; i++) {
			ax = Math.max(ax, Math.abs(sp[i][0]));
			ay = Math.max(ay, Math.abs(sp[i][1]));
		}
		ax *= 150; ay *= 150; // slot spacing, provisional like the slots themselves
		var fx = ax + DIAS + MARGIN[0], fy = ay + DIAS + MARGIN[1];
		// the rail: a padded ring around the felt; width and corner from table:* draws
		var rw = RAIL[0] + (RAIL[1] - RAIL[0]) * S('table:rail')();
		var rc = 28 + 40 * S('table:corner')();
		var cab = c.cab, line = c.col('outline'), trim = c.col('trim'), W4 = n(4 * c.w, 2);
		var rule = function (col) { return cab ? ['fill', col] : ['fill', 'none', 'stroke', line, 'stroke-width', W4]; };
		var rect = function (x, y, w, h, r, paint) {
			return el('rect', ['x', n(x, p), 'y', n(y, p), 'width', n(w, p), 'height', n(h, p), 'rx', r ? n(r, p) : null].concat(paint));
		};
		// the rail, then the felt, then the lattice the felt carries (spec: Anatomy of a throw)
		var out = rect(-fx - rw, -fy - rw, 2 * (fx + rw), 2 * (fy + rw), rc, rule(c.col('rail')));
		out += rect(-fx, -fy, 2 * fx, 2 * fy, Math.max(0, rc - rw), rule(c.col('felt')));
		out += rect(-fx, -fy, 2 * fx, 2 * fy, Math.max(0, rc - rw), tile(c, trim, '.25'));
		var box = [-fx - MARGIN[0], -fy - MARGIN[1], 2 * (fx + MARGIN[0]), 2 * (fy + MARGIN[1])];
		return wrap(o, c, box, out);
	}

	return { toss: toss, palette: palette };
});
