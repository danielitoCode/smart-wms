<script lang="ts" module>
	/**
	 * ReceiptButton — pay → water fill → thermal receipt tear (motion-brew, MIT).
	 * Ported to Svelte 5 with WAAPI (no GSAP).
	 */
	export interface ReceiptItem {
		qty: number;
		name: string;
		price: number;
	}
	export interface ReceiptButtonProps {
		items?: ReceiptItem[];
		currency?: string;
		merchant?: string;
		tagline?: string;
		orderId?: string;
		footer?: string;
		label?: string;
		paidLabel?: string;
		processing?: number;
		feedSpeed?: number;
		color?: string;
		successColor?: string;
		resetAfter?: number | null;
		onPay?: () => void;
		onComplete?: () => void;
		class?: string;
	}

	export const DEFAULT_ITEMS: ReceiptItem[] = [
		{ qty: 2, name: 'Cortado', price: 6.8 },
		{ qty: 1, name: 'Cardamom bun', price: 4.2 },
		{ qty: 1, name: 'Sparkling water', price: 2.5 }
	];

	const TEETH = 18;
	const TOOTH = 5;
	const WAVE_W = 14;

	export function paperClip(bottom: number) {
		const pts: string[] = [];
		for (let i = 0; i <= TEETH * 2; i++)
			pts.push(`${(i / (TEETH * 2)) * 100}% ${i % 2 ? 0 : TOOTH}px`);
		for (let i = TEETH * 2; i >= 0; i--)
			pts.push(
				`${(i / (TEETH * 2)) * 100}% calc(100% - ${i % 2 ? bottom : 0}px)`
			);
		return `polygon(${pts.join(', ')})`;
	}

	export function barcode(seed: string) {
		let h = 2166136261;
		for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
		const bars: { x: number; w: number }[] = [];
		let x = 0;
		while (x < 176) {
			h = Math.imul(h ^ (h >>> 13), 2654435761);
			const w = 1 + (Math.abs(h) % 3);
			const gap = 1 + (Math.abs(h >> 7) % 2);
			bars.push({ x, w });
			x += w + gap;
		}
		return bars;
	}

	export function money(n: number) {
		return n.toFixed(2);
	}

	function wavePath(amplitude: number, phase: number) {
		const pts: string[] = [];
		for (let y = 0; y <= 96; y += 4) {
			const x = WAVE_W / 2 + amplitude * Math.sin((y / 48) * Math.PI * 2 + phase);
			pts.push(`${x.toFixed(2)} ${y}`);
		}
		return `M0 0 L${pts.join(' L')} L0 96 Z`;
	}
	export const WAVE_FRONT = wavePath(4, 0);
	export const WAVE_BACK = wavePath(5, Math.PI / 1.5);
	export { WAVE_W, TOOTH };
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let {
		items = DEFAULT_ITEMS,
		currency = '$',
		merchant = 'NORTH ROAST',
		tagline = 'Coffee bar',
		orderId = '1042',
		footer = 'Thank you, come again',
		label,
		paidLabel = 'Paid',
		processing = 1200,
		feedSpeed = 0.09,
		color = '#141414',
		successColor = '#2f8a4f',
		resetAfter = 3200,
		onPay,
		onComplete,
		class: className = ''
	}: ReceiptButtonProps = $props();

	let rootEl: HTMLDivElement | null = $state(null);
	let phase: 'idle' | 'paying' | 'printed' = $state('idle');
	let stamp = $state('');
	let paperClipPath = $state(paperClip(0));
	let still = $state(false);

	let resetTimer: ReturnType<typeof setTimeout> | null = null;
	const controllers: Animation[] = [];

	const total = $derived(items.reduce((sum, i) => sum + i.qty * i.price, 0));
	const bars = $derived(barcode(orderId));
	const displayLabel = $derived(label ?? `Pay ${currency}${money(total)}`);
	const paidChars = $derived(Array.from(paidLabel));

	function track(a: Animation) {
		controllers.push(a);
		a.finished.catch(() => {}).finally(() => {
			const i = controllers.indexOf(a);
			if (i >= 0) controllers.splice(i, 1);
		});
		return a;
	}

	function killAll() {
		controllers.splice(0).forEach((a) => a.cancel());
	}

	function q(sel: string) {
		return rootEl?.querySelector(sel) as HTMLElement | null;
	}
	function qa(sel: string) {
		return Array.from(rootEl?.querySelectorAll(sel) ?? []) as HTMLElement[];
	}

	function setInitial() {
		const receipt = q('[data-receipt]');
		const fill = q('[data-fill]');
		const labelEl = q('[data-label]');
		const check = q('[data-check]');
		if (receipt) {
			receipt.style.transform = 'translateY(100%) rotate(0deg)';
			receipt.style.opacity = '1';
		}
		paperClipPath = paperClip(0);
		if (fill) fill.style.transform = `translateX(calc(-100% - ${WAVE_W}px))`;
		qa('[data-part]').forEach((el) => {
			el.style.opacity = '0';
			el.style.transform = 'translateY(8px)';
		});
		if (check) check.style.strokeDashoffset = '24';
		if (labelEl) {
			labelEl.style.opacity = '1';
			labelEl.style.transform = 'translateY(0)';
		}
	}

	async function wait(ms: number) {
		if (ms <= 0) return;
		await new Promise((r) => setTimeout(r, ms));
	}

	async function reset() {
		if (resetTimer) {
			clearTimeout(resetTimer);
			resetTimer = null;
		}
		killAll();
		const receipt = q('[data-receipt]');
		const fill = q('[data-fill]');
		const labelEl = q('[data-label]');
		if (receipt) {
			track(
				receipt.animate(
					[
						{ transform: getComputedStyle(receipt).transform, opacity: 1 },
						{ transform: 'translateY(calc(100% + 24px)) rotate(0deg)', opacity: 0 }
					],
					{ duration: still ? 0 : 350, easing: 'ease-in', fill: 'forwards' }
				)
			);
		}
		qa('[data-part]').forEach((el, i) => {
			track(
				el.animate(
					[
						{ opacity: 1, transform: 'translateY(0)' },
						{ opacity: 0, transform: 'translateY(-8px)' }
					],
					{ duration: still ? 0 : 200, delay: still ? 0 : i * 20, easing: 'ease', fill: 'forwards' }
				)
			);
		});
		await wait(still ? 0 : 100);
		if (fill) {
			track(
				fill.animate(
					[{ transform: getComputedStyle(fill).transform }, { transform: 'translateX(100%)' }],
					{ duration: still ? 0 : 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
				)
			);
		}
		await wait(still ? 0 : 350);
		if (labelEl) {
			track(
				labelEl.animate(
					[
						{ opacity: 0, transform: 'translateY(-10px)' },
						{ opacity: 1, transform: 'translateY(0)' }
					],
					{ duration: still ? 0 : 300, easing: 'ease-out', fill: 'forwards' }
				)
			);
		}
		await wait(still ? 0 : 150);
		setInitial();
		phase = 'idle';
	}

	async function pay() {
		if (phase !== 'idle' || !rootEl) return;
		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		stamp = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${String(now.getFullYear()).slice(2)} · ${pad(now.getHours())}:${pad(now.getMinutes())}`;
		phase = 'paying';
		onPay?.();

		if (still) {
			const fill = q('[data-fill]');
			const labelEl = q('[data-label]');
			const check = q('[data-check]');
			const receipt = q('[data-receipt]');
			if (labelEl) labelEl.style.opacity = '0';
			if (fill) fill.style.transform = 'translateX(0)';
			if (check) check.style.strokeDashoffset = '0';
			qa('[data-part]').forEach((el) => {
				el.style.opacity = '1';
				el.style.transform = 'translateY(0)';
			});
			paperClipPath = paperClip(TOOTH);
			if (receipt) receipt.style.transform = 'translateY(-64px) rotate(-3deg)';
			phase = 'printed';
			onComplete?.();
			if (resetAfter !== null) resetTimer = setTimeout(reset, resetAfter);
			return;
		}

		const labelEl = q('[data-label]');
		const fill = q('[data-fill]');
		const check = q('[data-check]');
		const receipt = q('[data-receipt]');
		const waveFront = q('[data-wave="front"]');
		const waveBack = q('[data-wave="back"]');

		if (labelEl) {
			track(
				labelEl.animate(
					[
						{ opacity: 1, transform: 'translateY(0)' },
						{ opacity: 0, transform: 'translateY(-10px)' }
					],
					{ duration: 250, easing: 'ease-in', fill: 'forwards' }
				)
			);
		}

		const rippleF = waveFront
			? track(
					waveFront.animate(
						[{ transform: 'translateY(0)' }, { transform: 'translateY(-50%)' }],
						{ duration: 700, easing: 'linear', iterations: Infinity }
					)
				)
			: null;
		const rippleB = waveBack
			? track(
					waveBack.animate(
						[{ transform: 'translateY(-50%)' }, { transform: 'translateY(0)' }],
						{ duration: 1100, easing: 'linear', iterations: Infinity }
					)
				)
			: null;

		if (fill) {
			await track(
				fill.animate(
					[
						{ transform: `translateX(calc(-100% - ${WAVE_W}px))` },
						{ transform: 'translateX(0)' }
					],
					{ duration: processing, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
				)
			).finished.catch(() => {});
		}
		rippleF?.cancel();
		rippleB?.cancel();

		if (check) {
			track(
				check.animate([{ strokeDashoffset: 24 }, { strokeDashoffset: 0 }], {
					duration: 350,
					easing: 'ease-out',
					fill: 'forwards'
				})
			);
		}
		qa('[data-part]').forEach((el, i) => {
			track(
				el.animate(
					[
						{ opacity: 0, transform: 'translateY(8px)' },
						{ opacity: 1, transform: 'translateY(0)' }
					],
					{
						duration: 300,
						delay: i * 30,
						easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
						fill: 'forwards'
					}
				)
			);
		});

		const rows = qa('[data-row]');
		const n = Math.max(1, rows.length);
		if (receipt) {
			for (let i = 0; i < n; i++) {
				const from = 100 - (i / n) * 100;
				const to = 100 - ((i + 1) / n) * 100;
				await track(
					receipt.animate(
						[{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }],
						{ duration: feedSpeed * 1000, easing: 'ease-out', fill: 'forwards' }
					)
				).finished.catch(() => {});
				await wait(feedSpeed * 450);
			}
		}

		await wait(200);
		if (receipt) {
			await track(
				receipt.animate(
					[
						{ transform: 'translateY(0%) translateX(0)' },
						{ transform: 'translateY(0%) translateX(-3px)' },
						{ transform: 'translateY(0%) translateX(0)' },
						{ transform: 'translateY(0%) translateX(-3px)' },
						{ transform: 'translateY(0%) translateX(0)' }
					],
					{ duration: 200, easing: 'linear', fill: 'forwards' }
				)
			).finished.catch(() => {});
		}

		const tearStart = performance.now();
		const tearDur = 120;
		await new Promise<void>((resolve) => {
			const step = (t: number) => {
				const k = Math.min(1, (t - tearStart) / tearDur);
				paperClipPath = paperClip(TOOTH * k);
				if (k < 1) requestAnimationFrame(step);
				else resolve();
			};
			requestAnimationFrame(step);
		});

		if (receipt) {
			await track(
				receipt.animate(
					[
						{ transform: 'translateY(0%) rotate(0deg)' },
						{ transform: 'translateY(-64px) rotate(-3deg)' }
					],
					{ duration: 700, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
				)
			).finished.catch(() => {});
		}

		phase = 'printed';
		onComplete?.();
		if (resetAfter !== null) resetTimer = setTimeout(reset, resetAfter);
	}

	function onReceiptActivate() {
		if (phase === 'printed') reset();
	}

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		setInitial();
		return () => {
			if (resetTimer) clearTimeout(resetTimer);
			killAll();
		};
	});
</script>

<div bind:this={rootEl} class={['rb', className].filter(Boolean).join(' ')}>
	<div class="rb__slot" aria-hidden={phase === 'idle'}>
		<div
			data-receipt
			role={phase === 'printed' ? 'button' : undefined}
			tabindex={phase === 'printed' ? 0 : -1}
			class="rb__receipt"
			class:is-clickable={phase === 'printed'}
			onclick={onReceiptActivate}
			onkeydown={(e) => {
				if (phase === 'printed' && (e.key === 'Enter' || e.key === ' ')) {
					e.preventDefault();
					reset();
				}
			}}
			aria-label={phase === 'printed' ? 'Receipt. Press to dismiss.' : undefined}
		>
			<div data-paper class="rb__paper" style:clip-path={paperClipPath}>
				<div data-row class="rb__center">
					<p class="rb__merchant">{merchant}</p>
					<p class="rb__tag">{tagline}</p>
				</div>
				<div data-row class="rb__meta">
					<span>Order #{orderId}</span>
					<span>{stamp}</span>
				</div>
				<div class="rb__rule"></div>
				{#each items as item (item.name)}
					<div data-row class="rb__line">
						<span>{item.qty}× {item.name}</span>
						<span>{money(item.qty * item.price)}</span>
					</div>
				{/each}
				<div class="rb__rule"></div>
				<div data-row class="rb__total">
					<span>TOTAL</span>
					<span>{currency}{money(total)}</span>
				</div>
				<div data-row class="rb__paymeta">
					<span>Card · tap</span>
					<span>Approved</span>
				</div>
				<div data-row class="rb__barcode-wrap">
					<svg width="176" height="36" viewBox="0 0 176 36" aria-hidden="true">
						{#each bars as bar, i}
							<rect x={bar.x} y="0" width={bar.w} height="36" fill="#18181b" />
						{/each}
					</svg>
				</div>
				<p data-row class="rb__footer">{footer}</p>
			</div>
		</div>
	</div>

	<button
		type="button"
		class="rb__btn"
		style:background={color}
		aria-disabled={phase !== 'idle'}
		aria-live="polite"
		onclick={pay}
	>
		<span data-fill class="rb__fill" style:background={successColor} aria-hidden="true">
			<span class="rb__wave-mask" style:width="{WAVE_W}px">
				<svg data-wave="back" viewBox="0 0 {WAVE_W} 96" preserveAspectRatio="none" class="rb__wave rb__wave--back">
					<path d={WAVE_BACK} fill={successColor} />
				</svg>
				<svg data-wave="front" viewBox="0 0 {WAVE_W} 96" preserveAspectRatio="none" class="rb__wave rb__wave--front">
					<path d={WAVE_FRONT} fill={successColor} />
				</svg>
			</span>
		</span>
		<span data-label class="rb__label">{displayLabel}</span>
		<span data-paid class="rb__paid" aria-hidden={phase === 'idle'}>
			<svg data-part viewBox="0 0 24 24" class="rb__check-svg" fill="none" stroke="currentColor" stroke-width="2.75">
				<path
					data-check
					d="M20 6 9 17l-5-5"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-dasharray="24"
					stroke-dashoffset="24"
				/>
			</svg>
			<span class="rb__paid-chars" aria-label={paidLabel}>
				{#each paidChars as ch, i}
					<span data-part class="rb__paid-ch" aria-hidden="true">{ch}</span>
				{/each}
			</span>
		</span>
	</button>
</div>

<style>
	.rb {
		position: relative;
		display: inline-flex;
		max-width: 100%;
		flex-direction: column;
		align-items: center;
		padding-top: 26rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.rb__slot {
		position: absolute;
		bottom: 1.75rem;
		left: 50%;
		width: 15rem;
		transform: translateX(-50%);
		clip-path: inset(-40rem -4rem 0 -4rem);
	}
	.rb__receipt {
		display: block;
		width: 100%;
		text-align: left;
		filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.14));
		outline: none;
		transform: translateY(100%);
		will-change: transform, opacity;
	}
	.rb__receipt.is-clickable {
		cursor: pointer;
	}
	.rb__paper {
		background: #fdfcf8;
		padding: 1.5rem 1.25rem 1.5rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		color: #27272a;
	}
	.rb__center {
		text-align: center;
	}
	.rb__merchant {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: #18181b;
	}
	.rb__tag {
		margin: 0.125rem 0 0;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: #71717a;
	}
	.rb__meta {
		display: flex;
		justify-content: space-between;
		margin-top: 1rem;
		color: #71717a;
	}
	.rb__rule {
		margin: 0.75rem 0;
		border-top: 1px dashed #d4d4d8;
	}
	.rb__line {
		display: flex;
		justify-content: space-between;
		padding: 0.125rem 0;
	}
	.rb__total {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-size: 0.875rem;
		font-weight: 700;
		color: #18181b;
	}
	.rb__paymeta {
		display: flex;
		justify-content: space-between;
		margin-top: 0.25rem;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}
	.rb__barcode-wrap {
		display: flex;
		justify-content: center;
		margin-top: 1rem;
	}
	.rb__footer {
		margin: 0.5rem 0 0;
		text-align: center;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: #71717a;
	}
	.rb__btn {
		position: relative;
		isolation: isolate;
		display: grid;
		place-items: center;
		height: 3.5rem;
		width: 18rem;
		max-width: 100%;
		padding: 0;
		border: 0;
		border-radius: 999px;
		color: #fff;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		overflow: hidden;
		box-shadow: 0 12px 28px -12px rgba(0, 0, 0, 0.45);
		outline: none;
	}
	.rb__btn:focus-visible {
		outline: 2px solid #a1a1aa;
		outline-offset: 2px;
	}
	.rb__btn[aria-disabled='true'] {
		cursor: default;
	}
	.rb__fill {
		position: absolute;
		inset: 0;
		z-index: -1;
		transform: translateX(calc(-100% - 14px));
		will-change: transform;
	}
	.rb__wave-mask {
		position: absolute;
		left: 100%;
		top: 0;
		height: 100%;
		overflow: hidden;
	}
	.rb__wave {
		position: absolute;
		left: 0;
		top: 0;
		height: 200%;
		width: 100%;
	}
	.rb__wave--back {
		opacity: 0.45;
	}
	.rb__label {
		grid-column: 1;
		grid-row: 1;
	}
	.rb__paid {
		grid-column: 1;
		grid-row: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.rb__check-svg {
		width: 1.25rem;
		height: 1.25rem;
	}
	.rb__paid-chars {
		display: flex;
	}
	.rb__paid-ch {
		display: inline-block;
		white-space: pre;
	}
</style>
