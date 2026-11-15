// Types for dice-lite. The library ships as one ES5 file with a UMD tail (ADR 001), so this
// declares a single value and exports it with `export =` — `import Dice from
// '@spintax/dice-lite'` is the idiomatic use, and named imports are not the module's shape.

type Colour = string;
type Pin = Colour | 'auto';

declare namespace Dice {
	/** A name that places values. Nothing is ever scored (ADR 003). */
	type Result = 'lucky7' | 'snake' | 'boxcars' | 'matched' | 'mixed' | '';
	type Lattice = 'auto' | 'trigon' | 'hex' | 'octagon' | 'none';

	/** Shared by toss() and die(). */
	interface Common {
		/** A string (a domain name is fine) or a number taken as a 32-bit unsigned integer. */
		seed?: number | string;
		/** hex or hex[]; default the spintax triad. */
		brand?: string | string[];
		/** derived colours only. */
		theme?: 'dark' | 'light';
		/** the table style; default flat on dark, line on light. */
		style?: 'line' | 'flat';
		/** line weight multiplier. */
		weight?: number;
		felt?: Pin;
		rail?: Pin;
		trim?: Pin;
		die?: Pin;
		pip?: Pin;
		ink?: Pin;
		outline?: Pin;
		/** width; the height follows the viewBox. */
		size?: number;
		/** decimals for coordinates. */
		precision?: number;
		/** extra entropy for ids — the same picture twice on one page. */
		salt?: string;
		/** role="img" and an escaped aria-label; otherwise aria-hidden. */
		title?: string;
	}

	interface TossOptions extends Common {
		/** how many dice, 2–5, default 3; appends — dice 0..k-1 of k+1 are the k-dice throw. */
		dice?: number;
		/** names values, never scores; '' (default) lets the seed show. */
		result?: Result;
		/** pins exact top values per die; null or outside 1–6 leaves the die to the seed/result. */
		values?: Array<number | null | undefined>;
		lattice?: Lattice;
		/** 'roll' or true — a one-shot settle (ADR 005 addendum); off by default. */
		motion?: 'roll' | boolean;
		/** divides the settle periods, default 1; 0 returns the static bytes exactly. */
		speed?: number;
	}

	interface DieOptions extends Common {
		/** the top face, 1–6; the seed picks when absent. */
		value?: number;
	}

	interface Palette {
		felt: string;
		rail: string;
		trim: string;
		die: string;
		pip: string;
		ink: string;
		outline: string;
		background: string;
		halo: string;
		stroke: string[];
		[key: string]: string | string[];
	}

	interface Handle {
		el: Element;
		get(): TossOptions;
		set(opts: Partial<TossOptions>): void;
		destroy(): void;
	}
}

declare const Dice: {
	/** Pure: the whole throw — table + dice — as an SVG string. Node and browser. */
	toss(opts?: Dice.TossOptions): string;
	/** Pure: one die on its em — an icon. */
	die(opts?: Dice.DieOptions): string;
	palette(brand?: string | string[], opts?: { theme?: 'dark' | 'light' }): Dice.Palette;
	/** Browser only. Returns null when the target finds nothing. */
	init(target: string | Element, opts?: Dice.TossOptions): Dice.Handle | null;
};

export = Dice;
