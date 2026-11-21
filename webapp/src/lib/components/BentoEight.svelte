<script lang="ts">
	/**
	 * BentoEight — grid 8 celdas (Animata “Eight” → Svelte 5).
	 * Sub-widgets mínimos: Counter, Ticker, TypingText, BarChart, AvatarList, skeletons.
	 * Contenido orientado a Smart WMS / Abellis.
	 */
	import { onMount } from 'svelte';

	function useCounter(target: number, duration = 1400) {
		let value = $state(0);
		onMount(() => {
			const start = performance.now();
			let raf = 0;
			const tick = (t: number) => {
				const p = Math.min(1, (t - start) / duration);
				const eased = 1 - Math.pow(1 - p, 3);
				value = target * eased;
				if (p < 1) raf = requestAnimationFrame(tick);
			};
			raf = requestAnimationFrame(tick);
			return () => cancelAnimationFrame(raf);
		});
		return {
			get value() {
				return value;
			}
		};
	}

	const students = useCounter(179);

	let tickerReady = $state(false);
	onMount(() => {
		const id = requestAnimationFrame(() => {
			tickerReady = true;
		});
		return () => cancelAnimationFrame(id);
	});

	const typingFull = 'SKU-88: 240 u. en Nave 2';
	let typed = $state('');
	onMount(() => {
		let i = 0;
		let timer: ReturnType<typeof setTimeout>;
		const wait = 900;
		const step = () => {
			if (i <= typingFull.length) {
				typed = typingFull.slice(0, i);
				i += 1;
				timer = setTimeout(step, 55);
			} else {
				timer = setTimeout(() => {
					i = 0;
					typed = '';
					timer = setTimeout(step, wait);
				}, 2200);
			}
		};
		timer = setTimeout(step, wait);
		return () => clearTimeout(timer);
	});

	const bars = [
		{ progress: 30, label: 'L' },
		{ progress: 70, label: 'M' },
		{ progress: 60, label: 'X' },
		{ progress: 90, label: 'J' },
		{ progress: 45, label: 'V' },
		{ progress: 20, label: 'S' },
		{ progress: 55, label: 'D' }
	];
	let barsOn = $state(false);
	onMount(() => {
		const t = setTimeout(() => {
			barsOn = true;
		}, 120);
		return () => clearTimeout(t);
	});

	const avatars = [
		'https://i.pravatar.cc/80?u=wms1',
		'https://i.pravatar.cc/80?u=wms2',
		'https://i.pravatar.cc/80?u=wms3',
		'https://i.pravatar.cc/80?u=wms4',
		'https://i.pravatar.cc/80?u=wms5'
	];
</script>

<div class="be">
	<div class="be-grid">
		<article class="be-card be-card--yellow">
			<div class="be-kicker be-kicker--yellow">Alta valoración</div>
			<div class="be-rating">
				<span class="be-ticker" class:be-ticker--on={tickerReady}>
					<span class="be-ticker__digit">4</span>
					<span class="be-ticker__digit">.</span>
					<span class="be-ticker__digit">8</span>
				</span>
				<sup class="be-star">★</sup>
			</div>
		</article>

		<article class="be-card be-card--violet be-span-2">
			<strong class="be-counter">
				{Math.ceil(students.value)}k+ movimientos / día
			</strong>
			<div class="be-avatars">
				{#each avatars as src, i (src)}
					<img class="be-avatar" style="z-index: {avatars.length - i}" {src} alt="" width="32" height="32" />
				{/each}
				<span class="be-avatar be-avatar--more">+12</span>
			</div>
		</article>

		<article class="be-card be-card--orange">
			<svg class="be-bot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
				<path d="M12 8V4H8" />
				<rect width="16" height="12" x="4" y="8" rx="2" />
				<path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
			</svg>
			<strong class="be-ai-title">IA integrada</strong>
			<div class="be-ai-body">
				<div class="be-ai-q">¿Stock de SKU-88?</div>
				<div class="be-ai-a">
					<span>{typed}</span><span class="be-caret" aria-hidden="true"></span>
				</div>
			</div>
		</article>

		<article class="be-card be-card--lime be-span-2 be-row">
			<div class="be-lime-title">Generar informe de progreso</div>
			<div class="be-report" aria-hidden="true">
				<div class="be-report__bar"></div>
				<div class="be-report__line"></div>
				<div class="be-report__line be-report__line--short"></div>
				<div class="be-report__rows"><span></span><span></span><span></span></div>
			</div>
		</article>

		<article class="be-card be-card--zinc be-span-2 be-center">
			<div class="be-bold">
				<span class="be-bold__bg">WMS</span>
				<span class="be-bold__fg">WMS</span>
			</div>
		</article>

		<article class="be-card be-card--green">
			<div class="be-bars" style="height: 100px">
				{#each bars as b (b.label)}
					<div class="be-bar">
						<span class="be-bar__fill" style="height: {barsOn ? b.progress : 0}%"></span>
						<span class="be-bar__label">{b.label}</span>
					</div>
				{/each}
			</div>
			<div class="be-bars-caption">Revisión semanal</div>
		</article>

		<article class="be-card be-card--rose">
			<div class="be-pill be-pill--l">Receiving</div>
			<div class="be-pill be-pill--r">Picking</div>
			<div class="be-pill">Shipping</div>
		</article>

		<article class="be-card be-card--blue be-span-2">
			<div class="be-wide" aria-hidden="true">
				<div class="be-wide__row">
					<span class="be-wide__chip"></span>
					<span class="be-wide__line"></span>
				</div>
				<div class="be-wide__row">
					<span class="be-wide__chip be-wide__chip--2"></span>
					<span class="be-wide__line be-wide__line--mid"></span>
				</div>
				<div class="be-wide__row">
					<span class="be-wide__chip be-wide__chip--3"></span>
					<span class="be-wide__line be-wide__line--short"></span>
				</div>
			</div>
			<div class="be-wide-copy">
				<div class="be-wide-title">Recordatorios diarios</div>
				<p class="be-wide-desc">Mantén el foco en olas, conteos y cierres de muelle.</p>
			</div>
		</article>
	</div>
</div>

<style>
	.be { width: 100%; min-width: 0; }
	.be-grid {
		display: grid; width: 100%; min-width: 0;
		grid-template-columns: 1fr; gap: 0.75rem;
	}
	@media (min-width: 640px) {
		.be-grid {
			grid-template-columns: repeat(4, 1fr);
			grid-auto-rows: minmax(8.5rem, auto);
		}
		.be-span-2 { grid-column: span 2; }
	}
	.be-card {
		position: relative; height: 100%; width: 100%; overflow: hidden;
		border-radius: 1rem; padding: 1rem; display: flex; flex-direction: column;
	}
	.be-card--yellow { background: #fde047; }
	.be-card--violet { background: #8b5cf6; overflow: visible; }
	.be-card--orange { background: #fdba74; }
	.be-card--lime { background: #bef264; }
	.be-card--zinc { background: #d4d4d8; align-items: center; justify-content: center; }
	.be-card--green { background: #bbf7d0; }
	.be-card--rose { background: #fda4af; gap: 0.45rem; justify-content: center; }
	.be-card--blue { background: #bfdbfe; }
	.be-row { flex-direction: column; align-items: stretch; gap: 0.75rem; }
	@media (min-width: 768px) {
		.be-row { flex-direction: row-reverse; align-items: center; gap: 1rem; }
	}
	.be-center { align-items: center; justify-content: center; }
	.be-kicker { font-weight: 700; font-size: 0.9rem; }
	.be-kicker--yellow { color: #a16207; }
	.be-rating {
		margin-top: auto; display: flex; justify-content: flex-end;
		align-items: flex-start; gap: 0.15rem;
	}
	.be-ticker {
		display: inline-flex;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 900; font-size: clamp(2.25rem, 6vw, 4.25rem);
		line-height: 1; color: rgba(0, 0, 0, 0.55); letter-spacing: -0.04em;
	}
	.be-ticker__digit {
		display: inline-block; transform: translateY(0.4em); opacity: 0;
		transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
	}
	.be-ticker--on .be-ticker__digit { transform: translateY(0); opacity: 1; }
	.be-ticker--on .be-ticker__digit:nth-child(2) { transition-delay: 0.06s; }
	.be-ticker--on .be-ticker__digit:nth-child(3) { transition-delay: 0.12s; }
	.be-star { font-size: 1.25rem; color: #a16207; margin-top: 0.35rem; }
	.be-counter {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 3vw, 1.75rem); font-weight: 700;
		color: #fff; letter-spacing: -0.02em;
	}
	.be-avatars {
		margin-top: auto; margin-left: 0.5rem;
		display: flex; align-items: center; padding: 0.25rem 0;
	}
	.be-avatar {
		width: 2rem; height: 2rem; border-radius: 999px; border: 2px solid #8b5cf6;
		object-fit: cover; margin-left: -0.55rem; background: #ede9fe;
	}
	.be-avatar--more {
		display: grid; place-items: center; font-size: 0.65rem;
		font-weight: 700; color: #5b21b6; background: #ede9fe;
	}
	.be-bot { width: 2rem; height: 2rem; color: #9a3412; }
	@media (min-width: 768px) { .be-bot { width: 2.75rem; height: 2.75rem; } }
	.be-ai-title { margin-top: 0.35rem; font-size: 0.875rem; color: #7c2d12; }
	.be-ai-body { margin-top: auto; }
	.be-ai-q { font-size: 0.8rem; font-weight: 600; color: #9a3412; }
	.be-ai-a { font-weight: 700; color: #431407; min-height: 1.25rem; }
	.be-caret {
		display: inline-block; width: 0.45em; height: 1em; margin-left: 1px;
		background: currentColor; vertical-align: text-bottom;
		animation: be-blink 1s steps(1) infinite;
	}
	@keyframes be-blink { 50% { opacity: 0; } }
	.be-lime-title {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.15rem, 2.5vw, 1.5rem); font-weight: 900;
		color: #3f6212; letter-spacing: -0.02em; flex: 1;
	}
	.be-report {
		flex-shrink: 0; width: 9.5rem; max-height: 7rem; padding: 0.75rem;
		border-radius: 0.75rem; background: color-mix(in srgb, #fff 70%, transparent);
		display: flex; flex-direction: column; gap: 0.45rem;
	}
	.be-report__bar { height: 0.55rem; width: 55%; border-radius: 999px; background: #65a30d; }
	.be-report__line {
		height: 0.4rem; border-radius: 999px;
		background: color-mix(in srgb, #365314 18%, transparent);
	}
	.be-report__line--short { width: 70%; }
	.be-report__rows { display: flex; gap: 0.35rem; margin-top: 0.25rem; }
	.be-report__rows span {
		flex: 1; height: 2rem; border-radius: 0.4rem;
		background: color-mix(in srgb, #65a30d 25%, transparent);
	}
	.be-bold {
		position: relative; display: flex; align-items: center;
		justify-content: center; padding: 0.5rem 1rem;
	}
	.be-bold__bg, .be-bold__fg {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 900; text-transform: uppercase; letter-spacing: -0.04em; line-height: 1;
	}
	.be-bold__bg {
		font-size: clamp(2.5rem, 8vw, 5.5rem);
		color: color-mix(in srgb, #27272a 14%, transparent);
		transition: opacity 0.25s ease;
	}
	.be-bold__fg {
		position: absolute; font-size: clamp(1.1rem, 2.5vw, 1.75rem); color: #27272a;
		transition: font-size 0.3s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.be-bold:hover .be-bold__bg { opacity: 0.55; }
	.be-bold:hover .be-bold__fg { font-size: clamp(2.5rem, 8vw, 5.5rem); }
	.be-bars {
		display: flex; align-items: flex-end; justify-content: space-between;
		gap: 0.35rem; width: 100%;
	}
	.be-bar {
		flex: 1; display: flex; flex-direction: column; align-items: center;
		height: 100%; justify-content: flex-end; gap: 0.25rem;
	}
	.be-bar__fill {
		width: 100%; border-radius: 0.5rem 0.5rem 0.25rem 0.25rem;
		background: #4ade80; min-height: 2px;
		transition: height 0.7s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.be-bar__label { font-size: 0.65rem; font-weight: 700; color: #166534; }
	.be-bars-caption {
		margin-top: 0.5rem; text-align: center; font-weight: 700;
		color: #14532d; font-size: 0.9rem;
	}
	.be-pill {
		width: 100%; border-radius: 999px; background: #fb7185; border: 1px solid #fb7185;
		padding: 0.45rem 0.75rem; text-align: center; font-weight: 650; color: #fff; font-size: 0.875rem;
	}
	.be-pill--l { transform: rotate(-2deg); }
	.be-pill--r { transform: rotate(2deg); }
	@media (min-width: 768px) {
		.be-pill--l { transform: rotate(-4deg); }
		.be-pill--r { transform: rotate(4deg); }
	}
	.be-wide {
		display: flex; flex-direction: column; gap: 0.45rem; padding: 0.65rem;
		border-radius: 0.75rem; background: color-mix(in srgb, #fff 55%, transparent);
	}
	.be-wide__row { display: flex; align-items: center; gap: 0.5rem; }
	.be-wide__chip {
		width: 1.5rem; height: 1.5rem; border-radius: 0.4rem; background: #3b82f6; flex-shrink: 0;
	}
	.be-wide__chip--2 { background: #60a5fa; }
	.be-wide__chip--3 { background: #93c5fd; }
	.be-wide__line {
		height: 0.45rem; flex: 1; border-radius: 999px;
		background: color-mix(in srgb, #1e40af 18%, transparent);
	}
	.be-wide__line--mid { width: 75%; flex: 0 1 75%; }
	.be-wide__line--short { width: 50%; flex: 0 1 50%; }
	.be-wide-copy { margin-top: 0.85rem; }
	.be-wide-title {
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.05rem; font-weight: 900; color: #1e3a8a;
	}
	.be-wide-desc {
		margin: 0.2rem 0 0; font-size: 0.8125rem; color: #1e40af; line-height: 1.4;
	}
	@media (prefers-reduced-motion: reduce) {
		.be-ticker__digit, .be-bar__fill, .be-bold__fg, .be-caret {
			transition: none !important; animation: none !important;
		}
		.be-ticker__digit { opacity: 1; transform: none; }
	}
</style>
