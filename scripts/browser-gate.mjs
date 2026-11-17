// The browser half of the gate, run by hand: `npm run gate:browser [-- --mutate]`.
//
// It serves the repo, opens test/verify.html in every engine it can find, and does it twice —
// once normally and once under prefers-reduced-motion, because the reduced branch is where a
// lazily-created animation would hide.
//
// With --mutate it then breaks the library on purpose, one anchor at a time, and reports any
// check that never went red. That is the M5 lesson in executable form: a check is worthless
// until it has been seen to fail. Ported from slots-lite with its guards; only the mutations
// are this library's.
//
// **It writes to dice.js, so read this before changing it.** The original bytes are taken once,
// before anything is written, and put back from memory — never with `git checkout`, which
// restores the INDEX and would silently discard uncommitted work in the very file a person is
// most likely to be editing when they reach for this script. Restoration is wired to SIGINT,
// SIGTERM and exit as well as to the finally block, because a Ctrl-C between the write and
// the browser is otherwise a broken dice.js left on disk.
//
// Playwright is NOT a dependency of the package — the library ships with none, and CI runs the
// Node gate only. This script uses whatever playwright is already on the machine; if none is,
// it says so and exits 0, because a missing dev tool is not a failing library.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'dice.js');
const MUTATE = process.argv.includes('--mutate');

// taken before a single byte is written anywhere, and the only source of truth for putting it back
const ORIGINAL = fs.readFileSync(SRC);
let dirty = false;
function restore() {
	if (!dirty) return;
	fs.writeFileSync(SRC, ORIGINAL);
	dirty = false;
}
process.on('exit', restore);
for (const sig of ['SIGINT', 'SIGTERM']) {
	process.on(sig, () => { restore(); process.exit(130); });
}

function playwright() {
	const require = createRequire(import.meta.url);
	for (const id of ['playwright', 'playwright-core']) {
		try { return require(id); } catch { /* keep looking */ }
	}
	// the common case on this machine: playwright lives inside a globally installed MCP server
	try {
		// execSync, not execFileSync: npm is a .cmd on Windows, which Node refuses to spawn
		// without a shell — and a shell with an args array is the deprecated combination
		const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
		return createRequire(path.join(root, '@playwright', 'mcp', 'package.json'))('playwright-core');
	} catch { return null; }
}

const TYPES = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css' };
function serve() {
	return new Promise((res) => {
		const s = http.createServer((req, rq) => {
			let f;
			// a bad %-escape throws out of the handler, which would take the process down past
			// every finally — and the path must stay inside the repo: this server is a dev tool,
			// not a file share
			try { f = path.resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0])); } catch { f = null; }
			if (!f || (f !== ROOT && !f.startsWith(ROOT + path.sep))) { rq.writeHead(403); return rq.end('no'); }
			fs.readFile(f, (e, d) => {
				if (e) { rq.writeHead(404); return rq.end('no'); }
				// no-store, so a run never reads the previous version of the library
				rq.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
				rq.end(d);
			});
		});
		// loopback only: `listen(port)` alone binds every interface, opening the repo to the LAN
		s.listen(0, '127.0.0.1', () => res([s, s.address().port]));
	});
}

async function verify(pw, engine, port, motion) {
	const browser = await pw[engine].launch();
	try {
		const page = await (await browser.newContext({ reducedMotion: motion })).newPage();
		await page.goto(`http://localhost:${port}/test/verify.html`);
		// the page sets its title to PASS or FAIL when it is done; a suite that dies leaves the
		// original title, which is the third outcome and must not read as either
		await page.waitForFunction(() => document.title !== 'dice-lite — verify', null, { timeout: 60000 });
		/* global document -- the three lines below run inside the page, not in Node */
		return await page.evaluate(() => ({
			verdict: document.getElementById('verdict').textContent,
			all: [...document.querySelectorAll('#out li')].map((l) => l.textContent.split(' — ')[0]),
			fails: [...document.querySelectorAll('#out li.fail')].map((l) => l.textContent),
		}));
	} finally { await browser.close(); }
}

// Each entry breaks one thing the page claims to check. The label says what was broken, never
// which check should notice — a mutation that reddens a check nobody expected is information.
// `reduce: true` runs it under prefers-reduced-motion, and in every engine rather than one,
// because that branch is where a lazily-created animation would hide.
const MUTATIONS = [
	{ label: 'toss is not a function', edits: [['return { toss: toss,', 'return { toss: 0,']] },
	{ label: 'the lattice never drawn', edits: [["if (o.lattice === 'none') return ['fill', 'none'];", "if (true) return ['fill', 'none'];"]] },
	{ label: 'the lattice stands as a wall', edits: [["'patternTransform', 'scale(1 ' + n(Math.sin(PITCH), 3) + ') translate('", "'patternTransform', 'translate('"]] },
	{ label: 'the lattice squashed before its turn', edits: [["'patternTransform', 'scale(1 ' + n(Math.sin(PITCH), 3) + ') translate('", "'patternTransform', 'translate('"], ["') rotate(' + n(90 * S('table:turn')(), 2) + ')'],", "') rotate(' + n(90 * S('table:turn')(), 2) + ') scale(1 ' + n(Math.sin(PITCH), 3) + ')'],"]] },
	{ label: 'id key without the table style', edits: [['key += c.cab + c.w + c.p', 'key += c.w + c.p']] },
	{ label: 'salt ignored for ids', edits: [['tokens(S, (o.salt || \'\') + key)', 'tokens(S, key)']] },
	// re-anchored in 0.3.0: the rail modes rewrote this line in dfe8d9a and the mutation sat SKIPped since
	{ label: 'pins ignored', edits: [["return pin != null && pin !== 'auto' && !(role === 'rail' && (pin === 'brand' || pin === 'felt')) ? esc(pin) : toHex(r[role]);", 'return toHex(r[role]);']] },
	{ label: 'a neutral turns the brass to chrome', edits: [['var trim = lch2rgb(66, !chrom.length ? 0', 'var trim = lch2rgb(66, grey || !chrom.length ? 0']] },
	{ label: 'the airbrush painted clear', edits: [["'stop-opacity', '.22'", "'stop-opacity', '0'"]] },
	{ label: 'the rest table lies', edits: [['6: function (p) { return rotX(p, Math.PI); }', '6: function (p) { return p; }']] },
	{ label: 'a lucky7 of ones', edits: [['return used.l7[i];', 'return 1;']] },
	{ label: 'a lucky7 of doubles', edits: [['if (vals[1 - i]) return 7 - vals[1 - i];', 'if (vals[1 - i]) return vals[1 - i];']] },
	{ label: 'mixed repeats itself', edits: [['used[val] = 1;', '']] },
	{ label: 'the settle travels up', edits: [["'{from{transform:translateY(' + n(-drop, 1) + 'px)}}.'", "'{from{transform:translateY(' + n(drop, 1) + 'px)}}.'"]] },
	// the settle check guards `from` with no `to`, so breaking it takes both halves: something to
	// travel toward, and a forwards fill to keep it there once the settle has finished
	{ label: 'a to-based settle that stays', edits: [["'{from{transform:translateY(' + n(-drop, 1) + 'px)}}.'", "'{from{transform:translateY(' + n(-drop, 1) + 'px)}to{transform:translateY(40px)}}.'"],
		["'s cubic-bezier(.2,.7,.3,1.08)}'", "'s cubic-bezier(.2,.7,.3,1.08) forwards}'"]] },
	{ label: 'reduced-motion gate cut', reduce: true, edits: [["'@media(prefers-reduced-motion:reduce){'", "'@media(BROKEN:reduce){'"]] },
	// the other half of the reduced-motion promise: nothing animates AND nothing is adrift
	{ label: 'reduced motion leaves dice adrift', reduce: true, edits: [["'{animation:none}}'", "'{animation:none;transform:translateY(40px)}}'"]] },
	{ label: 'destroy() leaves markup', edits: [["destroy: function () { host.innerHTML = ''; }", "destroy: function () { host.innerHTML = 'x'; }"]] },
];

async function main() {
	const pw = playwright();
	if (!pw) {
		console.log('no playwright on this machine — skipping the browser gate.');
		console.log('install one with:  npm i -g playwright  &&  npx playwright install');
		return 0;
	}
	const [server, port] = await serve();
	// an engine that is not installed is not a failing library: counted apart, so it neither
	// fails the run nor silently cancels the mutation pass
	let red = 0; const missing = [], engines = [];
	let names = [];
	try {
		for (const engine of ['chromium', 'firefox', 'webkit']) {
			let ran = false;
			for (const motion of ['no-preference', 'reduce']) {
				let r;
				try { r = await verify(pw, engine, port, motion); } catch (e) {
					console.log(`${engine} / ${motion}: could not run — ${e.message.split('\n')[0]}`);
					missing.push(`${engine}/${motion}`); continue;
				}
				ran = true;
				names = [...new Set([...names, ...r.all])];
				console.log(`${(engine + ' / ' + motion).padEnd(26)} ${r.verdict}`);
				r.fails.forEach((f) => console.log('     ✘ ' + f));
				if (!r.verdict.startsWith('ALL GREEN')) red++;
			}
			if (ran) engines.push(engine);
		}
		if (missing.length) console.log(`(not run: ${missing.join(', ')})`);

		if (MUTATE && !red && engines.length) {
			console.log('\n── mutations: break the library, watch the page go red ──');
			const seen = new Set();
			for (const m of MUTATIONS) {
				let src = ORIGINAL.toString(), ok = true;
				for (const [a, b] of m.edits) {
					// a mutation that lands twice, or not at all, proves nothing
					if (src.split(a).length !== 2) { ok = false; break; }
					src = src.replace(a, b);
				}
				if (!ok) { console.log(`SKIP  ${m.label.padEnd(34)} the anchor has moved; fix this mutation`); red++; continue; }
				fs.writeFileSync(SRC, src);
				dirty = true;
				// a reduce mutation runs everywhere: that branch is where an engine difference
				// would hide
				const where = m.reduce ? engines : [engines[0]];
				let caught = false, note = '';
				for (const engine of where) {
					let r;
					try { r = await verify(pw, engine, port, m.reduce ? 'reduce' : 'no-preference'); } catch (e) {
						note = ` (${engine}: ${e.message.split('\n')[0]})`; continue;
					}
					// a mutation that kills the suite outright shows no failing <li> at all, and
					// counting only those would read it as "nobody noticed"
					if (r.fails.length || !r.verdict.startsWith('ALL GREEN')) caught = true;
					r.fails.map((f) => f.split(' — ')[0]).forEach((f) => seen.add(f));
				}
				console.log(`${caught ? 'RED  ' : '.... '} ${m.label.padEnd(34)} ${where.join(', ')}${note}`);
				// a mutation nobody noticed is a missing check, not a detail of the log: it fails the
				// run (the first slots-lite run printed one "...." under a green verdict)
				if (!caught) red++;
				restore();
			}
			const never = names.filter((n) => !seen.has(n));
			if (never.length) {
				console.log(`\nchecks never seen red: ${never.join(', ')}`);
				console.log('a green check that no mutation reddens is a missing test — write the mutation that breaks it.');
				red++;
			}
		}
	} finally {
		restore();
		server.close();
	}
	console.log(red ? `gate: ${red} problem(s)` : 'gate: ALL GREEN');
	return red ? 1 : 0;
}

// exitCode rather than exit(): on a Windows TTY stdout is asynchronous, and exiting on the heels
// of the last console.log can cut the summary off
process.exitCode = await main();
