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
	// machine space: origin at the centre of the table, y down. The die is a rounded cube,
	// orthographic-baked (ADR 002 addendum); constants tuned to the reference at M1.
	var H = 100;             // the die's half-edge — the cube is 2H on a side
	var PITCH = 0.91;        // camera elevation ≈ 52°
	var RS = 44, RF = 9;     // silhouette rounding / face-quad rounding (projection units)
	var RPIP = 19;           // pip radius in 3D units — drawn as the exact projected ellipse
	var HG = H + 2;          // faces overlap 2 units at the seams, clipped by the silhouette
	var YAW = [0.36, 0.08];  // yaw = sign × (0.36 + 0.08·u) — the readable range (Codex's math)
	var SQRT3 = Math.sqrt(3), A_REG = (2 - Math.SQRT2) / 2; // 0.29289… exact regular octagon
	var MARGIN = [90, 64];   // felt inset from the viewBox: long side, short side
	var RAIL = [22, 34];     // the padded ring's width range, one seeded draw (table:rail)
	var SLOT_A = 126;        // canonical slot distance from the centre (0.9 × 140)
	var JIT = 0.06;          // positional scatter as a fraction of the slot distance
	var HX = 145, HY = 176;  // projected half-extents of a die (yaw range + jitter room)

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
		c.key = key;
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

	// ── the die: a rounded cube, projected at runtime ───────────────────────

	// Nothing here is drawn in 3D — the cube, its faces and its pips are computed and baked
	// flat, so the output still carries no path data the seed cannot change (ADR 002 addendum).
	// The values live on a real net: opposite sides sum to seven by construction, because the
	// die RESTS on the face opposite its top value (REST, six entries).
	var rotY = function (p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
	var rotX = function (p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
	var add3 = function (a, b, s) { return [a[0] + b[0] * (s == null ? 1 : s), a[1] + b[1] * (s == null ? 1 : s), a[2] + b[2] * (s == null ? 1 : s)]; };
	var cross3 = function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; };
	var norm3 = function (v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

	// the six faces: normal, centre, u axis, v axis, value (opposites sum to seven)
	var CUBE = [
		{ n: [0, 1, 0], c: [0, H, 0], u: [1, 0, 0], v: [0, 0, 1], val: 1 },
		{ n: [0, -1, 0], c: [0, -H, 0], u: [1, 0, 0], v: [0, 0, -1], val: 6 },
		{ n: [0, 0, 1], c: [0, 0, H], u: [1, 0, 0], v: [0, 1, 0], val: 2 },
		{ n: [0, 0, -1], c: [0, 0, -H], u: [-1, 0, 0], v: [0, 1, 0], val: 5 },
		{ n: [1, 0, 0], c: [H, 0, 0], u: [0, 0, -1], v: [0, 1, 0], val: 3 },
		{ n: [-1, 0, 0], c: [-H, 0, 0], u: [0, 0, 1], v: [0, 1, 0], val: 4 }
	];
	var rotZ = function (p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
	// rest-rotations per top value: which face the die lies on
	var REST = {
		1: function (p) { return p; }, 6: function (p) { return rotX(p, Math.PI); },
		2: function (p) { return rotX(p, -Math.PI / 2); }, 5: function (p) { return rotX(p, Math.PI / 2); },
		3: function (p) { return rotZ(p, Math.PI / 2); }, 4: function (p) { return rotZ(p, -Math.PI / 2); }
	};
	// the value-to-pips table on the 3×3 lattice — face units (±1 = ±H/3)
	var LAYOUT = {
		1: [[0, 0]],
		2: [[-1, -1], [1, 1]],
		3: [[-1, -1], [0, 0], [1, 1]],
		4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
		5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
		6: [[-1, -1.25], [1, -1.25], [-1, 0], [1, 0], [-1, 1.25], [1, 1.25]]
	};

	// 2D helpers: convex hull (monotone chain) and a quad with rounded corners
	function hull2(ps) {
		var pts = ps.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }), lo = [], hi = [], i;
		var cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
		for (i = 0; i < pts.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 1e-8) lo.pop(); lo.push(pts[i]); }
		for (i = pts.length - 1; i >= 0; i--) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], pts[i]) <= 1e-8) hi.pop(); hi.push(pts[i]); }
		return lo.slice(0, -1).concat(hi.slice(0, -1));
	}
	function rquad2(pts, r) {
		var d = '', i;
		for (i = 0; i < pts.length; i++) {
			var p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length];
			var l0 = Math.sqrt((p1[0] - p0[0]) * (p1[0] - p0[0]) + (p1[1] - p0[1]) * (p1[1] - p0[1]));
			var l1 = Math.sqrt((p2[0] - p1[0]) * (p2[0] - p1[0]) + (p2[1] - p1[1]) * (p2[1] - p1[1]));
			if (l0 < 1e-6 || l1 < 1e-6) continue;
			var k = Math.min(r, l0 / 3, l1 / 3);
			var a1 = [p1[0] - (p1[0] - p0[0]) / l0 * k, p1[1] - (p1[1] - p0[1]) / l0 * k];
			var a2 = [p1[0] + (p2[0] - p1[0]) / l1 * k, p1[1] + (p2[1] - p1[1]) / l1 * k];
			d += (i ? 'L' + n(a1[0], 1) + ' ' + n(a1[1], 1) : 'M' + n(a1[0], 1) + ' ' + n(a1[1], 1)) +
				'Q' + n(p1[0], 1) + ' ' + n(p1[1], 1) + ' ' + n(a2[0], 1) + ' ' + n(a2[1], 1);
		}
		return d + 'Z';
	}

	// face gradients from the die role colour and the pip gradient from `pip`: when a pin is
	// a plain #hex/rgb() colour its LCh light and shade build the stops; any other string is
	// used verbatim for every stop (flat), escaped like every pin — nothing else is parsed
	function dieDefs(c) {
		var colMix = function (pin, dl) {
			var lch = rgb2lch(parseColor(pin));
			return toHex(lch2rgb(Math.max(2, Math.min(99, lch[0] + dl)), lch[1], lch[2]));
		};
		// exactly the grammar the family's parseColor can read — anything else passes verbatim
		var usable = function (x) {
			return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(x) || /^rgba?\(\s*[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+/i.test(x);
		};
		var die = c.o.die && c.o.die !== 'auto' ? c.o.die : c.col('die');
		var pip = c.o.pip && c.o.pip !== 'auto' ? c.o.pip : c.col('pip');
		var t = !usable(die), p = !usable(pip);
		var stops = t ? [die, die, die] : [colMix(die, 14), colMix(die, 5), die];
		var sl = t ? [die, die, die] : [colMix(die, 4), die, colMix(die, -11)];
		var sr = t ? [die, die, die] : [die, colMix(die, -13), colMix(die, -21)];
		var ps = p ? [pip, pip, pip, pip] : [colMix(pip, 24), colMix(pip, 9), pip, colMix(pip, -9)];
		var g = function (id, list, a1, a2) {
			var s = '', i;
			for (i = 0; i < list.length; i++) s += el('stop', ['offset', i === 0 ? 0 : n(i / (list.length - 1), 2), 'stop-color', esc(list[i])]);
			return el('linearGradient', ['id', id, 'x1', a1[0], 'y1', a1[1], 'x2', a2[0], 'y2', a2[1]], s);
		};
		return c.add('dice:defs', function () {
			var gt = c.tk(), gl = c.tk(), gr = c.tk(), gp = c.tk(), ga = c.tk(), b14 = c.tk(), b5 = c.tk(), sf = c.tk();
			c.die = { t: gt, l: gl, r: gr, p: gp, a: ga, b14: b14, b5: b5, sf: sf };
			c.dieUnder = t ? die : colMix(die, -20);
			return g(gt, stops, ['.25', 0], ['.6', 1]) + g(gl, sl, ['.2', 0], ['.7', 1]) + g(gr, sr, ['.2', 0], ['.7', 1]) +
				el('radialGradient', ['id', gp, 'cx', '.31', 'cy', '.27', 'r', '.78'],
					el('stop', ['offset', 0, 'stop-color', esc(ps[0])]) + el('stop', ['offset', '.1', 'stop-color', esc(ps[1])]) +
					el('stop', ['offset', '.35', 'stop-color', esc(ps[2])]) + el('stop', ['offset', 1, 'stop-color', esc(ps[3])])) +
				el('radialGradient', ['id', ga, 'cx', '.34', 'cy', '.24', 'r', '.88'],
					el('stop', ['offset', 0, 'stop-color', '#fff', 'stop-opacity', '.22']) +
					el('stop', ['offset', '.48', 'stop-color', '#fff', 'stop-opacity', '.04']) +
					el('stop', ['offset', '.72', 'stop-color', '#000', 'stop-opacity', 0]) +
					el('stop', ['offset', 1, 'stop-color', '#000', 'stop-opacity', '.09'])) +
				el('filter', ['id', b14, 'x', '-60%', 'y', '-60%', 'width', '220%', 'height', '220%'], el('feGaussianBlur', ['stdDeviation', 14])) +
				el('filter', ['id', b5, 'x', '-60%', 'y', '-60%', 'width', '220%', 'height', '220%'], el('feGaussianBlur', ['stdDeviation', 5])) +
				el('filter', ['id', sf, 'x', '-20%', 'y', '-20%', 'width', '140%', 'height', '140%'], el('feGaussianBlur', ['stdDeviation', 1.4]));
		});
	}

	// one die as {shadow, content} — no placement wrapper: the caller owns the transform, so
	// the motion group can sit between the placement and the content (ADR 005 addendum)
	function die(c, top, yaw) {
		var pre = REST[top], F = [], i;
		for (i = 0; i < 6; i++) {
			var f = CUBE[i];
			F.push({ c: pre(f.c), u: pre(f.u), v: pre(f.v), n: pre(f.n), val: f.val });
		}
		var pt = function (p) { var q = rotX(rotY(p, yaw), PITCH); return [q[0], -q[1]]; };
		// pips/axes are computed in the yawed frame already — project with the pitch only
		var pj = function (p) { var q = rotX(p, PITCH); return [q[0], -q[1]]; };
		var corners = [];
		for (i = 0; i < 8; i++) corners.push(pt(pre([i & 1 ? H : -H, i & 2 ? H : -H, i & 4 ? H : -H])));
		var sil = rquad2(hull2(corners), RS);
		var d = c.die;
		// visible faces, far first (depth = H × normal.z)
		var vis = [];
		for (i = 0; i < 6; i++) {
			var rn = rotX(rotY(F[i].n, yaw), PITCH);
			if (rn[2] > 0.02) vis.push({ f: F[i], rn: rn, z: rn[2] });
		}
		vis.sort(function (a, b) { return a.z - b.z; });
		var viewT = [0, Math.sin(PITCH), Math.cos(PITCH)];
		var faces = '', face = '';
		for (i = 0; i < vis.length; i++) {
			var fc = vis[i].f, cs = [], j;
			for (j = 0; j < 4; j++) {
				var I = j === 1 || j === 2 ? 1 : -1, J = j >= 2 ? 1 : -1;
				cs.push(pt(add3(add3(fc.c, fc.u, I * HG), fc.v, J * HG)));
			}
			face = el('path', ['d', rquad2(cs, RF), 'fill', 'url(#' + (vis[i].rn[1] > 0.4 ? d.t : vis[i].rn[0] > 0 ? d.r : d.l) + ')']);
			// the pips: circles in 3D on the face plane, drawn as their exact projection —
			// major axis along face∩image-plane (true length), minor foreshortened
			var nT = rotY(fc.n, yaw);
			var dM = norm3(cross3(nT, viewT)), dm = norm3(cross3(nT, dM));
			var L = LAYOUT[fc.val];
			for (j = 0; j < L.length; j++) {
				var pT = rotY(add3(add3(fc.c, fc.u, L[j][0] * H / 3), fc.v, L[j][1] * H / 3), yaw);
				var cc = pj(pT), mj = pj(add3(pT, dM, RPIP)), mn = pj(add3(pT, dm, RPIP));
				var ax = [mj[0] - cc[0], mj[1] - cc[1]];
				face += el('ellipse', ['cx', n(cc[0], 1), 'cy', n(cc[1], 1),
					'rx', n(Math.sqrt(ax[0] * ax[0] + ax[1] * ax[1]), 1),
					'ry', n(Math.sqrt((mn[0] - cc[0]) * (mn[0] - cc[0]) + (mn[1] - cc[1]) * (mn[1] - cc[1])), 1),
					'transform', 'rotate(' + n(Math.atan2(ax[1], ax[0]) * 180 / Math.PI, 1) + ' ' + n(cc[0], 1) + ' ' + n(cc[1], 1) + ')',
					'fill', 'url(#' + d.p + ')']);
			}
			faces += face; // face and its pips stay one unit, far-to-near
		}
		var sid = c.tk(), cid = c.tk();
		// the silhouette lives in defs with NO fill of its own: a fill set on the source would
		// beat the uses' paints (and would render if the path sat in the body) — so the uses
		// own every paint, and its d is computed from the yaw, keeping zero-d honest
		c.defs += el('path', ['id', sid, 'd', sil]) + el('clipPath', ['id', cid], el('use', ['href', '#' + sid]));
		return {
			shadow: el('ellipse', ['cx', 0, 'cy', 118, 'rx', 132, 'ry', 24, 'fill', c.col('ink'), 'fill-opacity', '.16', 'filter', 'url(#' + d.b14 + ')']) +
				el('ellipse', ['cx', 0, 'cy', 112, 'rx', 62, 'ry', 11, 'fill', c.col('ink'), 'fill-opacity', '.18', 'filter', 'url(#' + d.b5 + ')']),
			content: el('use', ['href', '#' + sid, 'fill', esc(c.dieUnder)]) +
				el('g', ['clip-path', 'url(#' + cid + ')', 'filter', 'url(#' + d.sf + ')'], faces) +
				el('use', ['href', '#' + sid, 'fill', 'url(#' + d.a + ')']) +
				el('use', ['href', '#' + sid, 'fill', 'none', 'stroke', '#00000010', 'stroke-width', 2])
		};
	}

	// ── the throw ───────────────────────────────────────────────────────────

	// The canonical slots: one nested list — count k takes the first k, so `dice` appends
	// without moving a die already on the table (values, yaws and placements all hold). The
	// pair is the constant core; the triangle, the diamond and the quincunx grow from it.
	var SLOTS = [[-1, 0], [1, 0], [0, -1], [0, 1], [0, 0]];
	var RESULTS = ['lucky7', 'snake', 'boxcars', 'matched', 'mixed'];
	var BELT7 = [[1, 6], [2, 5], [3, 4]];

	// Results are data (ADR 003): a name places values, nothing is scored. Each result reads
	// its own streams; dice it does not name keep the seed's values.
	function resultValue(r, i, S, used) {
		if (r === 'snake') return i < 2 ? 1 : 0;
		if (r === 'boxcars') return i < 2 ? 6 : 0;
		if (r === 'lucky7' && i < 2) {
			// one pair draw for the throw, one swap draw — both dice name it
			if (!used.l7) {
				var p = BELT7[Math.floor(S('result:lucky7')() * 3)];
				used.l7 = S('result:lucky7:swap')() < 0.5 ? p : [p[1], p[0]];
			}
			return used.l7[i];
		}
		if (r === 'matched') return 1 + Math.floor(S('result:matched')() * 6);
		if (r === 'mixed') {
			var avail = [];
			for (var v = 1; v <= 6; v++) if (!used[v]) avail.push(v);
			var val = avail[Math.floor(S('result:mixed:' + i)() * avail.length)];
			used[val] = 1;
			return val;
		}
		return 0; // the seed decides
	}

	function toss(opts) {
		var o = opts || {}, k = Math.max(2, Math.min(5, Math.round(o.dice) || 3));
		var c = context(o, 'table' + k), p = c.p, S = c.S, i;
		dieDefs(c);
		// the felt is sized to the projected dice at the canonical slots (spec: Machine space)
		var ax = 0, ay = 0;
		for (i = 0; i < k; i++) {
			ax = Math.max(ax, Math.abs(SLOTS[i][0]));
			ay = Math.max(ay, Math.abs(SLOTS[i][1]));
		}
		var fx = ax * SLOT_A + HX, fy = ay * SLOT_A + HY;
		// the rail: a padded ring around the felt; width and corner from table:* draws
		var rw = RAIL[0] + (RAIL[1] - RAIL[0]) * S('table:rail')();
		var rc = 28 + 40 * S('table:corner')();
		var cab = c.cab, line = c.col('outline'), trim = c.col('trim'), W4 = n(4 * c.w, 2);
		var rule = function (col) { return cab ? ['fill', col] : ['fill', 'none', 'stroke', line, 'stroke-width', W4]; };
		var rect = function (x, y, w, h, r, paint) {
			return el('rect', ['x', n(x, p), 'y', n(y, p), 'width', n(w, p), 'height', n(h, p), 'rx', r ? n(r, p) : null].concat(paint));
		};
		// values: values pin > result names > the seed decides (spec: Results). ALL valid pins
		// mark `used` before any result draw — mixed must never repeat one, early or late
		var pins = o.values || [], res = RESULTS.indexOf(o.result) >= 0 ? o.result : '', used = {};
		var seeded = function (i) { return 1 + Math.floor(S('die:' + i + ':value')() * 6); };
		var values = [];
		for (i = 0; i < k; i++) {
			var pin = Math.round(pins[i]);
			if (pin >= 1 && pin <= 6) { values[i] = pin; used[pin] = 1; }
		}
		for (i = 0; i < k; i++) {
			if (values[i] != null) continue;
			if (res) { var rv = resultValue(res, i, S, used); values[i] = rv || seeded(i); }
			else values[i] = seeded(i);
		}
		// the roll (ADR 005 + addendum): a settle, off by default. Names from a stream of their
		// own salted with speed; the animated group never carries a transform attribute
		var speed = o.speed == null ? 1 : o.speed, mo = !!o.motion && speed > 0, css = '', tk = null;
		if (mo) tk = tokens(S, 'motion' + (o.salt || '') + c.key + speed);
		// the dice: value, yaw and placement each from their own stream; depth from the slot,
		// so appending never re-rolls a die. Light overlap is allowed — dice touch like on a
		// real table; shadows sit in a layer below, dice paint far-to-near by ground position
		var dice = [];
		for (i = 0; i < k; i++) {
			var yaw = (S('die:' + i + ':orient')() < 0.5 ? -1 : 1) * (YAW[0] + YAW[1] * S('die:' + i + ':orient:yaw')());
			var px = SLOTS[i][0] * SLOT_A + (S('die:' + i + ':place')() - 0.5) * 2 * JIT * SLOT_A;
			var py = SLOTS[i][1] * SLOT_A + (S('die:' + i + ':place:v')() - 0.5) * 2 * JIT * SLOT_A;
			var scale = 0.9 + 0.1 * (SLOTS[i][1] + 1) / 2;
			var g = 'translate(' + n(px, 1) + ' ' + n(py, 1) + ')' + (scale !== 1 ? ' scale(' + scale + ')' : '');
			var dd = die(c, values[i], yaw);
			var inner = dd.content, cls = null;
			if (mo) {
				var kf = tk(), drop = 30 + 40 * S('die:' + i + ':drop')();
				cls = tk();
				css += '@keyframes ' + kf + '{from{transform:translateY(' + n(-drop, 1) + 'px)}}.' + cls +
					'{animation:' + kf + ' ' + n((0.8 + 0.3 * i) / speed, 2) + 's cubic-bezier(.2,.7,.3,1.08)}';
				inner = el('g', ['class', cls], inner);
			}
			dice.push({ x: px, y: py, cls: cls, shadow: el('g', ['transform', g], dd.shadow), body: el('g', ['transform', g], inner) });
		}
		dice.sort(function (a, b) { return a.y - b.y; });
		var shadows = '', bodies = '';
		for (i = 0; i < k; i++) { shadows += dice[i].shadow; bodies += dice[i].body; }
		// seam AO where dice touch: a small dark pool under the contact point, in the shadow layer
		for (i = 0; i < k; i++) {
			for (var j = i + 1; j < k; j++) {
				var dx = dice[i].x - dice[j].x, dy = dice[i].y - dice[j].y;
				if (Math.sqrt(dx * dx + dy * dy) < 240) shadows += el('ellipse',
					['cx', n((dice[i].x + dice[j].x) / 2, 1), 'cy', n((dice[i].y + dice[j].y) / 2 + 54, 1),
						'rx', 36, 'ry', 9, 'fill', c.col('ink'), 'fill-opacity', '.14', 'filter', 'url(#' + c.die.b5 + ')']);
			}
		}
		// the rail, the felt, the lattice; then the shadows and the dice. The roll's <style>
		// leads the picture (document-global CSS); reduced motion restores the static bytes
		var out = '';
		if (mo) {
			var clss = [];
			for (i = 0; i < k; i++) if (dice[i].cls) clss.push('.' + dice[i].cls);
			out = el('style', [], css + '@media(prefers-reduced-motion:reduce){' + clss.join(',') + '{animation:none}}');
		}
		out += rect(-fx - rw, -fy - rw, 2 * (fx + rw), 2 * (fy + rw), rc, rule(c.col('rail')));
		out += rect(-fx, -fy, 2 * fx, 2 * fy, Math.max(0, rc - rw), rule(c.col('felt')));
		out += rect(-fx, -fy, 2 * fx, 2 * fy, Math.max(0, rc - rw), tile(c, trim, '.25'));
		out += shadows + bodies;
		var box = [-fx - MARGIN[0], -fy - MARGIN[1], 2 * (fx + MARGIN[0]), 2 * (fy + MARGIN[1])];
		return wrap(o, c, box, out);
	}

	// One die on its em — an icon. The value is the caller's, or the seed's.
	function one(opts) {
		var o = opts || {};
		var c = context(o, 'die'), S = c.S;
		dieDefs(c);
		var value = Math.round(o.value) >= 1 && Math.round(o.value) <= 6 ? Math.round(o.value) : 1 + Math.floor(S('die:0:value')() * 6);
		var yaw = (S('die:0:orient')() < 0.5 ? -1 : 1) * (YAW[0] + YAW[1] * S('die:0:orient:yaw')());
		var d = die(c, value, yaw);
		return wrap(o, c, [-HX, -HY, 2 * HX, 2 * HY + 42], el('g', ['transform', 'translate(0 0)'], d.shadow + d.content));
	}

	// Browser convenience: draw a throw into an element and keep it drawn. Options merge
	// across set(), so pins stay pinned; a settle plays once per draw (cards-lite's init).
	function init(target, opts) {
		var host = typeof target === 'string' ? document.querySelector(target) : target, cur = {};
		if (!host) return null;
		var set = function (o) {
			for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) cur[k] = o[k];
			host.innerHTML = toss(cur);
		};
		set(opts || {});
		return {
			el: host,
			get: function () { var g = {}; for (var k in cur) g[k] = cur[k]; return g; },
			set: set,
			destroy: function () { host.innerHTML = ''; }
		};
	}

	return { toss: toss, die: one, palette: palette, init: init };
});
