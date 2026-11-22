<script lang="ts">
	/**
	 * AnimatedCounter — contador con rueda de dígitos (CSS ease + mask).
	 * Port Svelte 5 del AnimatedCounter React (sin Motion).
	 */
	import type { Snippet } from 'svelte';

	export type Grouping = 'western' | 'indian';

	interface Props {
		value: number;
		decimals?: number;
		/** Segundos de la transición por dígito */
		duration?: number;
		padStart?: number;
		separator?: string;
		decimalSeparator?: string;
		grouping?: Grouping;
		prefix?: Snippet | string;
		suffix?: Snippet | string;
		class?: string;
	}

	let {
		value,
		decimals = 0,
		duration = 0.6,
		padStart = 1,
		separator = ',',
		decimalSeparator = '.',
		grouping = 'western',
		prefix,
		suffix,
		class: className = ''
	}: Props = $props();

	const FACES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
	/** 0..9 + 0 final para wrap 9→0 hacia arriba */
	const WHEEL = [...FACES, 0] as const;
	const LINE = 1.5;
	const WHEEL_LEN = WHEEL.length;
	const MAX_DECIMALS = 15;
	const MAX_PAD = 24;

	const EVERY_THREE = /\B(?=(\d{3})+(?!\d))/g;
	const EVERY_TWO = /\B(?=(\d{2})+(?!\d))/g;

	const mod = (n: number, m: number) => ((n % m) + m) % m;
	const clamp = (n: number, low: number, high: number) =>
		Math.min(high, Math.max(low, Number.isFinite(n) ? n : low));
	const isDigit = (char: string) => char >= '0' && char <= '9';

	function group(whole: string, sep: string, g: Grouping) {
		if (!sep) return whole;
		if (g !== 'indian') return whole.replace(EVERY_THREE, sep);
		const head = whole.slice(0, -3);
		if (!head) return whole;
		return `${head.replace(EVERY_TWO, sep)}${sep}${whole.slice(-3)}`;
	}

	type Shape = {
		amount: number;
		scaled: number;
		places: number;
		pace: number;
		width: number;
	};

	function measure(val: number, dec: number, pad: number, dur: number): Shape {
		const amount = Number.isFinite(val) ? val : 0;
		const places = clamp(Math.trunc(dec), 0, MAX_DECIMALS);
		const padClamped = clamp(Math.trunc(pad), 1, MAX_PAD);
		const scaled = Math.min(
			Number.MAX_SAFE_INTEGER,
			Math.round(Math.abs(amount) * 10 ** places)
		);
		return {
			amount,
			scaled,
			places,
			pace: clamp(dur, 0.01, 60),
			width: Math.max(String(scaled).length, places + padClamped)
		};
	}

	function format(
		{ scaled, places, width }: Shape,
		sep: string,
		decSep: string,
		g: Grouping
	) {
		const raw = String(scaled).padStart(width, '0');
		const whole = group(raw.slice(0, raw.length - places) || '0', sep, g);
		return places ? `${whole}${decSep}${raw.slice(raw.length - places)}` : whole;
	}

	type Cell =
		| { kind: 'digit'; key: number; digit: number }
		| { kind: 'mark'; key: string; char: string };

	function toCells(chars: string, width: number): Cell[] {
		const cells: Cell[] = [];
		let seen = 0;
		let run = 0;
		for (const char of chars) {
			if (isDigit(char)) {
				run = 0;
				cells.push({ kind: 'digit', key: width - seen++, digit: Number(char) });
			} else {
				cells.push({ kind: 'mark', key: `mark-${width - seen}-${run++}`, char });
			}
		}
		return cells;
	}

	const shape = $derived(measure(value, decimals, padStart, duration));
	const chars = $derived(format(shape, separator, decimalSeparator, grouping));
	const cells = $derived(toCells(chars, shape.width));
	const negative = $derived(shape.amount < 0 && shape.scaled > 0);

	let previous = $state<number | null>(null);
	let dir = $state(1);
	let reduced = $state(false);

	/** Índice de cara en el WHEEL (0..10) por columna */
	let faceIndex = $state<Record<number, number>>({});

	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => {
			reduced = mq.matches;
		};
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});

	$effect(() => {
		const amount = shape.amount;
		const list = cells;

		if (previous === null) {
			const init: Record<number, number> = {};
			for (const cell of list) {
				if (cell.kind === 'digit') init[cell.key] = cell.digit;
			}
			faceIndex = init;
			previous = amount;
			return;
		}

		let heading = dir;
		if (previous !== amount) {
			heading = amount >= previous ? 1 : -1;
			dir = heading;
			previous = amount;
		}

		const next: Record<number, number> = { ...faceIndex };
		let changed = false;

		for (const cell of list) {
			if (cell.kind !== 'digit') continue;
			const digit = cell.digit;
			const at = next[cell.key] ?? digit;
			const atFace = mod(at, 10);

			if (atFace === digit) {
				if (at !== digit && at === 10 && digit === 0) {
					continue;
				}
				if (at !== digit) {
					next[cell.key] = digit;
					changed = true;
				}
				continue;
			}

			const goal =
				heading < 0 ? at - mod(at - digit, 10) : at + mod(digit - at, 10);
			next[cell.key] = goal;
			changed = true;
		}

		for (const k of Object.keys(next)) {
			const key = Number(k);
			if (!list.some((c) => c.kind === 'digit' && c.key === key)) {
				delete next[key];
				changed = true;
			}
		}

		if (changed) faceIndex = next;
	});

	function yFor(key: number, digit: number) {
		if (reduced) return (-digit * 100) / WHEEL_LEN;
		const idx = faceIndex[key] ?? digit;
		return (-idx * 100) / WHEEL_LEN;
	}
</script>

<span
	data-slot="animated-counter"
	class="ac inline-flex items-center tabular-nums {className}"
	style="--ac-line: {LINE}em; --ac-dur: {shape.pace}s"
>
	{#if prefix != null}
		<span class="ac-fixed inline-block">
			{#if typeof prefix === 'string'}
				{prefix}
			{:else}
				{@render prefix()}
			{/if}
		</span>
	{/if}

	<span class="sr-only">{negative ? '-' : ''}{chars}</span>

	<span aria-hidden="true" class="inline-flex select-none items-center">
		{#if negative}
			<span class="ac-fixed inline-block">−</span>
		{/if}

		{#each cells as cell (cell.key)}
			{#if cell.kind === 'digit'}
				<span
					data-slot="animated-counter-digit"
					class="ac-digit relative inline-grid overflow-hidden"
					style="height: var(--ac-line); line-height: {LINE}"
				>
					{#each FACES as face}
						<span class="invisible [grid-area:1/1]" aria-hidden="true">{face}</span>
					{/each}
					<span
						class="ac-wheel absolute inset-x-0 top-0"
						style="transform: translateY({yFor(cell.key, cell.digit)}); transition: {reduced
							? 'none'
							: `transform var(--ac-dur) cubic-bezier(0.22, 1, 0.36, 1)`}"
					>
						{#each WHEEL as face}
							<span class="flex items-center justify-center" style="height: var(--ac-line)">
								{face}
							</span>
						{/each}
					</span>
				</span>
			{:else}
				<span data-slot="animated-counter-mark" class="ac-mark inline-block">
					{cell.char}
				</span>
			{/if}
		{/each}
	</span>

	{#if suffix != null}
		<span class="ac-fixed inline-block">
			{#if typeof suffix === 'string'}
				{suffix}
			{:else}
				{@render suffix()}
			{/if}
		</span>
	{/if}
</span>

<style>
	.ac-digit {
		mask-image: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0) 0%,
			rgba(0, 0, 0, 0.06) 5.5%,
			rgba(0, 0, 0, 0.5) 11%,
			rgba(0, 0, 0, 0.94) 16.5%,
			#000 22%,
			#000 78%,
			rgba(0, 0, 0, 0.94) 83.5%,
			rgba(0, 0, 0, 0.5) 89%,
			rgba(0, 0, 0, 0.06) 94.5%,
			rgba(0, 0, 0, 0) 100%
		);
		-webkit-mask-image: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0) 0%,
			rgba(0, 0, 0, 0.06) 5.5%,
			rgba(0, 0, 0, 0.5) 11%,
			rgba(0, 0, 0, 0.94) 16.5%,
			#000 22%,
			#000 78%,
			rgba(0, 0, 0, 0.94) 83.5%,
			rgba(0, 0, 0, 0.5) 89%,
			rgba(0, 0, 0, 0.06) 94.5%,
			rgba(0, 0, 0, 0) 100%
		);
	}

	.ac-wheel {
		will-change: transform;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.ac-wheel {
			transition: none !important;
		}
	}
</style>
