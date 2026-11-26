<script lang="ts" module>
	/**
	 * PixelFeatureCard — product feature card with dithered pixel clouds + phone mock.
	 * Port of motion-brew PixelFeatureCard (MIT). Sample avatar is Unsplash placeholder.
	 */

	export type PixelShape = 'square' | 'circle' | 'diamond';

	export interface PixelFeatureCardProps {
		/** Pixel / accent colour. Default #252528 */
		color?: string;
		/** Grid cell in px. Default 6 */
		cellSize?: number;
		shape?: PixelShape;
		/** Drift speed multiplier. Default 1 */
		speed?: number;
		/** Cloud coverage. Default 1.4 */
		coverage?: number;
		/** Cloud density. Default 0.8 */
		density?: number;
		/** Perspective floor of dots. Default false */
		floor?: boolean;
		class?: string;
	}

	const REVEAL = 1.5;
	const STEPS = [0, 0, 0.16, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86];
	const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
		(v) => (v + 0.5) / 16
	);

	const CLOUDS = [
		{ ax: 0.42, ay: 0.36, fx: 0.23, fy: 0.17, px: 0, py: 1.2, r: 0.2 },
		{ ax: 0.46, ay: 0.4, fx: 0.15, fy: 0.21, px: 2.4, py: 4.1, r: 0.17 },
		{ ax: 0.38, ay: 0.44, fx: 0.19, fy: 0.13, px: 4.6, py: 0.4, r: 0.15 }
	];

	const hash = (x: number, y: number) => {
		let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
		h = Math.imul(h ^ (h >>> 13), 1274126177);
		return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
	};
	const smooth = (t: number) => t * t * (3 - 2 * t);
	const noise = (x: number, y: number) => {
		const ix = Math.floor(x);
		const iy = Math.floor(y);
		const fx = smooth(x - ix);
		const fy = smooth(y - iy);
		const a = hash(ix, iy);
		const b = hash(ix + 1, iy);
		const c = hash(ix, iy + 1);
		const d = hash(ix + 1, iy + 1);
		return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
	};
	const fbm = (x: number, y: number) =>
		noise(x, y) * 0.6 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.1;
	const band = (lo: number, hi: number, v: number) =>
		smooth(Math.min(1, Math.max(0, (v - lo) / (hi - lo))));

	interface Ripple {
		x: number;
		y: number;
		t: number;
	}
</script>

<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	let {
		color = '#252528',
		cellSize = 6,
		shape = 'square' as PixelShape,
		speed = 1,
		coverage = 1.4,
		density = 0.8,
		floor = false,
		children,
		class: className = ''
	}: PixelFeatureCardProps & { children?: Snippet } = $props();

	let rootEl: HTMLDivElement | null = $state(null);
	let canvasEl: HTMLCanvasElement | null = $state(null);
	let still = $state(false);
	let shown = $state(false);
	let scoreText = $state('0');
	let barsReady = $state(false);
	let rotateX = $state(0);
	let rotateY = $state(0);

	const cell = $derived(Math.max(4, cellSize));
	const cov = $derived(Math.max(0.3, coverage));
	const dens = $derived(Math.max(0.2, density));

	const bars = [0.42, 0.58, 0.5, 0.72, 0.64, 0.8, 0.92];
	const rows = [
		{ label: 'Sleep', value: '7h 40m', path: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' },
		{
			label: 'Steps',
			value: '8,214',
			path: 'M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.68 1.5-5 4-5 1.5 0 2.5.5 3 1.5S11.5 6 13 6c2.5 0 4 2.32 4 5 .03 2.5-1 3.5-1 5.62V16M8 16h8M9 20h6'
		},
		{
			label: 'Resting heart',
			value: '62 bpm',
			path: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'
		}
	];

	const pointer = { x: -999, y: -999, on: false };
	const ripples: Ripple[] = [];
	let revealStart = -1;

	function local(e: PointerEvent) {
		const r = rootEl!.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
	}
	function onMove(e: PointerEvent) {
		const p = local(e);
		pointer.x = p.x;
		pointer.y = p.y;
		pointer.on = true;
		if (still) return;
		rotateY = (p.x / p.w - 0.5) * 14;
		rotateX = -(p.y / p.h - 0.5) * 10;
	}
	function onLeave() {
		pointer.on = false;
		rotateX = 0;
		rotateY = 0;
	}
	function onDown(e: PointerEvent) {
		const p = local(e);
		ripples.push({ x: p.x, y: p.y, t: -1 });
	}

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const root = rootEl;
		const el = canvasEl;
		if (!root || !el) return;

		const io = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting && !shown) {
					shown = true;
					revealStart = -2;
					if (!still) {
						const start = performance.now();
						const from = 0;
						const to = 88;
						const tick = (now: number) => {
							const t = Math.min(1, (now - start - 500) / 1200);
							if (t < 0) {
								requestAnimationFrame(tick);
								return;
							}
							scoreText = String(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
							if (t < 1) requestAnimationFrame(tick);
						};
						requestAnimationFrame(tick);
						setTimeout(() => (barsReady = true), 600);
					} else {
						scoreText = '88';
						barsReady = true;
					}
				}
			},
			{ threshold: 0.3 }
		);
		io.observe(root);

		const ctx = el.getContext('2d')!;
		let w = 0;
		let h = 0;
		let raf = 0;
		let visible = true;
		let last = performance.now();
		let time = 0;
		const glow = { x: 0, y: 0, a: 0 };
		let idle = 0;
		const phases = new Float32Array(4096).map((_, k) => hash(k, 17) * Math.PI * 2);

		const size = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			w = el.clientWidth;
			h = el.clientHeight;
			el.width = Math.round(w * dpr);
			el.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		const dot = (x: number, y: number, s: number) => {
			if (s < 0.6) return;
			if (shape === 'circle') {
				ctx.beginPath();
				ctx.arc(x, y, s / 2, 0, Math.PI * 2);
				ctx.fill();
			} else if (shape === 'diamond') {
				const r = s * 0.62;
				ctx.beginPath();
				ctx.moveTo(x, y - r);
				ctx.lineTo(x + r, y);
				ctx.lineTo(x, y + r);
				ctx.lineTo(x - r, y);
				ctx.fill();
			} else {
				ctx.fillRect(x - s / 2, y - s / 2, s, s);
			}
		};

		const light = (x: number, y: number) => {
			let l = 0;
			if (glow.a > 0.01) {
				const dx = x - glow.x;
				const dy = y - glow.y;
				l += glow.a * 0.55 * Math.exp(-(dx * dx + dy * dy) / (2 * 54 * 54));
			}
			for (const r of ripples) {
				const age = time - r.t;
				const radius = age * 240;
				const d = Math.hypot(x - r.x, y - r.y) - radius;
				const fade = Math.max(0, 1 - age / 1.6);
				l += 0.6 * fade * Math.exp(-(d * d) / (2 * 14 * 14));
			}
			return l;
		};

		const draw = () => {
			ctx.clearRect(0, 0, w, h);
			ctx.fillStyle = color;
			const start = revealStart;
			const pr = still
				? 1
				: start === -1 || start === -2
					? 0
					: Math.min(1, (time - start) / REVEAL);
			if (pr === 0) return;
			const eased = 1 - Math.pow(1 - pr, 3);
			const reach = (Math.hypot(w, h) / 2 + 90) * eased;
			const cx = w / 2;
			const cy = h / 2;
			const opened = (x: number, y: number) => {
				if (pr >= 1) return { m: 1, edge: 0 };
				const d = Math.hypot(x - cx, y - cy);
				const e = d - reach;
				return {
					m: Math.min(1, Math.max(0, -e / 70)),
					edge: 0.6 * (1 - pr) * Math.exp(-(e * e) / (2 * 14 * 14))
				};
			};
			const horizon = floor ? h * 0.66 : h * 2;
			const t = time * speed;
			const cols = Math.ceil(w / cell);
			const rowsN = Math.ceil(h / cell);
			const bodies = CLOUDS.map((c) => ({
				x: w * (0.5 + c.ax * Math.sin(t * c.fx + c.px)),
				y: h * (0.5 + c.ay * Math.sin(t * c.fy + c.py)),
				r2: 2 * (c.r * cov * Math.max(w, h)) ** 2
			}));

			for (let j = 0; j < rowsN; j++) {
				for (let i = 0; i < cols; i++) {
					const x = i * cell + cell / 2;
					const y = j * cell + cell / 2;
					const n = fbm(x * 0.0062 + t * 0.045, y * 0.0062 - t * 0.03);
					let body = 0;
					for (const b of bodies) {
						const dx = x - b.x;
						const dy = y - b.y;
						body += Math.exp(-(dx * dx + dy * dy) / b.r2);
					}
					let v = band(0.3, 0.95, body * (0.45 + 0.9 * n) * dens);
					v *= 1 - 0.55 * band(horizon - 30, horizon + 30, y);
					v *= 0.82 + 0.18 * Math.sin(t * 2.4 + phases[(j * cols + i) % phases.length]!);
					const o = opened(x, y);
					v = v * o.m + o.edge + light(x, y) * o.m;
					if (v < 0.04) continue;
					const th = BAYER[(j & 3) * 4 + (i & 3)]!;
					const q = Math.min(1, v + (th - 0.5) * 0.32);
					const step = STEPS[Math.min(STEPS.length - 1, Math.floor(q * STEPS.length))]!;
					if (!step) continue;
					ctx.globalAlpha = 0.3 + Math.min(1, v) * 0.7;
					dot(x, y, cell * step);
				}
			}

			if (floor) {
				const near = 1;
				const depth = 9;
				const roll = (t * 0.5) % 1;
				const spacing = cell * 3.2;
				const span = Math.ceil(w / spacing) * 3;
				for (let k = depth; k >= 0; k--) {
					const z = near + (k - roll) * 0.8;
					if (z < near * 0.6) continue;
					const p = near / z;
					const y = horizon + (h - horizon) * p * 0.98;
					const fade = Math.pow(Math.min(1, p * 1.1), 1.6);
					for (let c = -span; c <= span; c++) {
						const x = w / 2 + c * spacing * p;
						if (x < -cell || x > w + cell) continue;
						const shimmer = 0.8 + 0.2 * Math.sin(t * 2 + hash(c, k + 99) * 6.28);
						const o = opened(x, y);
						const v = (fade * 0.75 * shimmer + light(x, y) * p) * o.m;
						ctx.globalAlpha = Math.min(1, v);
						dot(x, y, cell * 0.8 * p);
					}
				}
			}
			ctx.globalAlpha = 1;
		};

		const frame = (now: number) => {
			raf = requestAnimationFrame(frame);
			const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
			last = now;
			if (!visible) return;
			time += dt;
			if (revealStart === -2) revealStart = time;
			const k = 1 - Math.pow(0.0015, dt);
			glow.x += (pointer.x - glow.x) * k;
			glow.y += (pointer.y - glow.y) * k;
			glow.a += ((pointer.on ? 1 : 0) - glow.a) * (1 - Math.pow(0.02, dt));
			idle = pointer.on ? 0 : idle + dt;
			if (idle > 3.2) {
				idle = 0;
				ripples.push({
					x: w * (0.15 + Math.random() * 0.7),
					y: h * (0.15 + Math.random() * 0.45),
					t: time
				});
			}
			for (let i = ripples.length - 1; i >= 0; i--) {
				const r = ripples[i]!;
				if (r.t < 0) r.t = time;
				if (time - r.t >= 1.6) ripples.splice(i, 1);
			}
			draw();
		};

		size();
		const ro = new ResizeObserver(() => {
			size();
			if (still) draw();
		});
		ro.observe(el);
		const io2 = new IntersectionObserver(([e]) => {
			visible = !!e?.isIntersecting;
		});
		io2.observe(el);

		if (still) {
			time = 3;
			draw();
		} else {
			raf = requestAnimationFrame(frame);
		}

		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			io2.disconnect();
		};
	});
</script>

<div
	bind:this={rootEl}
	class={['pfc', className].filter(Boolean).join(' ')}
	class:is-in={shown || still}
	style:perspective="1200px"
	onpointermove={onMove}
	onpointerleave={onLeave}
	onpointerdown={onDown}
>
	<canvas bind:this={canvasEl} aria-hidden="true" class="pfc__field"></canvas>

	<div
		class="pfc__phone"
		class:is-in={shown || still}
		style:transform="rotateX({rotateX}deg) rotateY({rotateY}deg)"
		style:transform-style="preserve-3d"
	>
		<span class="pfc__side pfc__side--l1" aria-hidden="true"></span>
		<span class="pfc__side pfc__side--l2" aria-hidden="true"></span>
		<span class="pfc__side pfc__side--r" aria-hidden="true"></span>
		<div class="pfc__body">
			<div class="pfc__screen">
				<span class="pfc__island" aria-hidden="true">
					<span class="pfc__cam"></span>
				</span>
				{#if children}
					{@render children()}
				{:else}
					<div class="pfc__app" class:is-in={shown || still}>
						<div class="pfc__app-head">
							<div class="pfc__user">
								<img
									src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=faces"
									alt=""
									draggable="false"
									class="pfc__avatar"
								/>
								<div>
									<p class="pfc__hi">Good morning</p>
									<p class="pfc__name">Alex Morgan</p>
									</div>
							</div>
							<span class="pfc__bell" aria-hidden="true">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
									><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg
								>
							</span>
						</div>

						<div class="pfc__score-card">
							<div class="pfc__score-top">
								<p class="pfc__score-label">Health score</p>
								<span class="pfc__delta">+4</span>
							</div>
							<p class="pfc__score">
								<span class="pfc__score-num">{scoreText}</span>
								<span class="pfc__score-max">/100</span>
							</p>
							<div class="pfc__bars">
								{#each bars as v, i}
									<span
										class="pfc__bar"
										class:on={barsReady}
										style:height="{v * 100}%"
										style:background-color={i === bars.length - 1 ? color : 'rgba(36,36,35,0.12)'}
										style:transition-delay="{0.05 * i}s"
									></span>
								{/each}
							</div>
						</div>

						<div class="pfc__rows">
							{#each rows as r, i}
								<div class="pfc__row" class:on={shown || still} style:transition-delay="{0.8 + i * 0.08}s">
									<span class="pfc__row-icon" aria-hidden="true">
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
											><path d={r.path} /></svg
										>
									</span>
									<span class="pfc__row-label">{r.label}</span>
									<span class="pfc__row-val">{r.value}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.pfc {
		position: relative;
		height: 440px;
		width: 560px;
		max-width: 100%;
		overflow: hidden;
		border-radius: 24px;
		background: #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 32px -16px rgba(0, 0, 0, 0.18);
		opacity: 0;
		transform: translateY(24px) scale(0.97);
		transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.pfc.is-in { opacity: 1; transform: none; }
	:global(.dark) .pfc,
	:global([data-theme='dark']) .pfc { background: #18181b; }
	.pfc__field {
		position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;
	}
	.pfc__phone {
		position: absolute; left: 50%; top: 48px; margin-left: -130px;
		width: 260px; height: 520px; opacity: 0; transform: translateY(80px);
		transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.25s,
			transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.25s;
	}
	.pfc__phone.is-in { opacity: 1; transform: translateY(0); }
	.pfc__side { position: absolute; background: #242423; }
	.pfc__side--l1 { left: -3px; top: 112px; width: 3px; height: 32px; border-radius: 2px 0 0 2px; }
	.pfc__side--l2 { left: -3px; top: 160px; width: 3px; height: 56px; border-radius: 2px 0 0 2px; }
	.pfc__side--r { right: -3px; top: 144px; width: 3px; height: 80px; border-radius: 0 2px 2px 0; }
	.pfc__body {
		width: 100%; height: 100%; border-radius: 46px; background: #242423; padding: 9px;
		box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.5);
	}
	.pfc__screen {
		position: relative; width: 100%; height: 100%; overflow: hidden;
		border-radius: 38px; background: #fff;
	}
	.pfc__island {
		position: absolute; left: 50%; top: 10px; z-index: 10;
		display: flex; align-items: center; justify-content: flex-end;
		width: 88px; height: 28px; padding-right: 10px; border-radius: 999px;
		background: #242423; transform: translateX(-50%);
	}
	.pfc__cam {
		width: 10px; height: 10px; border-radius: 999px; background: #3a3a48;
		box-shadow: 0 0 0 2px #1b1b22;
	}
	.pfc__app {
		display: flex; flex-direction: column; height: 100%;
		padding: 48px 16px 0; color: #242423;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.pfc__app-head {
		display: flex; align-items: center; justify-content: space-between;
		opacity: 0; transform: translateY(10px);
		transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.35s,
			transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.35s;
	}
	.pfc__app.is-in .pfc__app-head { opacity: 1; transform: none; }
	.pfc__user { display: flex; align-items: center; gap: 10px; }
	.pfc__avatar { width: 32px; height: 32px; border-radius: 999px; object-fit: cover; }
	.pfc__hi { margin: 0; font-size: 12px; color: #71717a; line-height: 1.2; }
	.pfc__name { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; }
	.pfc__bell {
		display: grid; place-items: center; width: 32px; height: 32px;
		border-radius: 999px; background: rgba(36, 36, 35, 0.06);
	}
	.pfc__score-card {
		margin-top: 16px; padding: 14px; border-radius: 16px;
		background: rgba(36, 36, 35, 0.05); opacity: 0; transform: translateY(10px);
		transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.43s,
			transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.43s;
	}
	.pfc__app.is-in .pfc__score-card { opacity: 1; transform: none; }
	.pfc__score-top { display: flex; align-items: flex-start; justify-content: space-between; }
	.pfc__score-label { margin: 0; font-size: 12px; color: #71717a; }
	.pfc__delta {
		padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 500;
		color: #269a5a; background: rgba(38, 154, 90, 0.1);
	}
	.pfc__score {
		margin: 4px 0 0; font-size: 32px; font-weight: 500; line-height: 1; letter-spacing: -0.03em;
	}
	.pfc__score-num { font-variant-numeric: tabular-nums; }
	.pfc__score-max { font-size: 16px; color: #a1a1aa; }
	.pfc__bars { display: flex; align-items: flex-end; gap: 6px; height: 48px; margin-top: 12px; }
	.pfc__bar {
		flex: 1; border-radius: 4px; transform-origin: bottom; transform: scaleY(0);
		transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.pfc__bar.on { transform: scaleY(1); }
	.pfc__rows { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
	.pfc__row {
		display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 16px;
		background: #fff;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.04);
		opacity: 0; transform: translateX(16px);
		transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.pfc__row.on { opacity: 1; transform: none; }
	.pfc__row-icon {
		display: grid; place-items: center; width: 32px; height: 32px;
		border-radius: 999px; background: rgba(36, 36, 35, 0.06); flex-shrink: 0;
	}
	.pfc__row-label { flex: 1; font-size: 14px; }
	.pfc__row-val { font-size: 14px; font-weight: 500; font-variant-numeric: tabular-nums; }
	@media (prefers-reduced-motion: reduce) {
		.pfc, .pfc__phone, .pfc__app-head, .pfc__score-card, .pfc__bar, .pfc__row {
			transition: none; opacity: 1; transform: none;
		}
	}
</style>
