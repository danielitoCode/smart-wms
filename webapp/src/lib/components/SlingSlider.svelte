<script lang="ts">
	/**
	 * Sling slider — bars + red ball. Drag bars, or pull the ball back to aim and release.
	 * One rAF loop writes to the DOM; physics in fixed 1/240 s steps. No Motion.
	 */
	import { onMount } from 'svelte';
	import './sling-slider.css';

	const N = 59;
	const PITCH = 10;
	const BAR_W = 3;
	const BAR_H = 48;
	const DIM_W = 1;
	const DIM_H = 32;
	const BALL = 12;
	const BALL_GAP = 8;
	const STAGE_H = 96;
	const TRACK = (N - 1) * PITCH;
	const REST_Y = -(BAR_H / 2 + BALL_GAP + BALL / 2);

	const STEP = 1 / 240;
	const WAKE_K = 320;
	const WAKE_C = 12;
	const BASE_K = 520;
	const BASE_C = 26;
	const FOLLOW_K = 1100;
	const FOLLOW_C = 62;
	const LEAN_K = 260;
	const LEAN_C = 11;
	const LEAN_MAX = 30;
	const RIDE_K = 900;
	const RIDE_C = 40;

	const GRAB_R = 22;
	const FINGER_R = 24;
	const PULL_MAX = 96;
	const PULL_MIN = 10;
	const POWER = 5;
	const GRAVITY = 5200;
	const LIFT = 46;
	const LIFT_PER_PX = 0.28;
	const LIFT_PER_DOWN = 0.9;
	const BOUNCE = 0.38;
	const CEIL = 150;
	const HOP_MIN = 140;

	const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
	const headOf = (x: number) => Math.floor(x / PITCH + 1e-6);
	const toValue = (x: number) => Math.round((x / TRACK) * 100);

	type Mode = 'idle' | 'drag' | 'aim' | 'flight' | 'hop';

	function aimAt(x: number, pullX: number, pullY: number) {
		const value = clamp(x - pullX * POWER, 0, TRACK);
		const land = headOf(value) * PITCH;
		const lift = LIFT + Math.abs(land - x) * LIFT_PER_PX + Math.max(0, pullY) * LIFT_PER_DOWN;
		return { value, land, lift };
	}

	function solve(fx: number, fy: number, tx: number, lift: number) {
		const apex = Math.max(Math.min(fy, REST_Y) - lift, -CEIL);
		const vy = -Math.sqrt(2 * GRAVITY * (fy - apex));
		const up = -vy / GRAVITY;
		const down = Math.sqrt((2 * (REST_Y - apex)) / GRAVITY);
		return { vx: (tx - fx) / (up + down), vy, time: up + down };
	}

	export type SlingSliderProps = {
		defaultValue?: number;
		onChange?: (value: number) => void;
		label?: string;
		theme?: 'light' | 'dark';
		hint?: boolean;
	};

	let {
		defaultValue = 36,
		onChange,
		label = 'Value',
		theme = 'dark',
		hint = true
	}: SlingSliderProps = $props();

	const start = (clamp(defaultValue, 0, 100) / 100) * TRACK;
	const lit0 = headOf(start) + 1;

	let stageEl: HTMLDivElement | null = null;
	let fitEl: HTMLDivElement | null = null;
	let bodyEl: HTMLDivElement | null = null;
	let ballEl: HTMLSpanElement | null = null;
	let ghostEl: HTMLSpanElement | null = null;
	let arcEl: SVGPathElement | null = null;
	let bandEl: SVGPathElement | null = null;
	let trailEl: SVGPathElement | null = null;
	let readingEl: HTMLSpanElement | null = null;
	const barEls: (HTMLSpanElement | null)[] = Array.from({ length: N }, () => null);
	function setBar(node: HTMLSpanElement, i: number) {
		barEls[i] = node;
		return {
			destroy() {
				barEls[i] = null;
			}
		};
	}

	const s = {
		mode: 'idle' as Mode,
		raf: 0,
		acc: 0,
		last: 0,
		reduced: false,
		pointer: -1,
		x: start,
		vx: 0,
		target: start,
		h: new Float32Array(N),
		hv: new Float32Array(N),
		b: Float32Array.from({ length: N }, (_, i) => (i < lit0 ? 1 : 0)),
		bv: new Float32Array(N),
		lit: lit0,
		instant: false,
		lean: 0,
		leanV: 0,
		bx: (lit0 - 1) * PITCH,
		by: REST_Y,
		bvx: 0,
		bvy: 0,
		grabX: 0,
		grabY: 0,
		pullX: 0,
		pullY: 0,
		aim: { value: start, land: 0, lift: 0 },
		aimAlpha: 0,
		fromX: 0,
		flyFrom: 0,
		landX: 0,
		landValue: 0,
		trail: [] as number[],
		value: toValue(start)
	};

	function tip(extra: number) {
		const head = (s.lit - 1) * PITCH;
		const r = (s.lean * Math.PI) / 180;
		const half = (BAR_H / 2) * (1 + s.h[s.lit - 1]) + extra;
		return { x: head + Math.sin(r) * half, y: -Math.cos(r) * half };
	}

	function impact(x: number, vy: number) {
		if (s.reduced) return;
		const c = x / PITCH;
		const force = clamp(vy / 260, 0, 6);
		for (let i = Math.max(0, Math.floor(c - 7)); i <= Math.min(N - 1, Math.ceil(c + 7)); i++) {
			s.hv[i] -= force * Math.exp(-Math.abs(i - c) / 2.4);
		}
	}

	function step(dt: number) {
		if (s.mode === 'drag' || s.mode === 'idle') {
			s.vx += (FOLLOW_K * (s.target - s.x) - FOLLOW_C * s.vx) * dt;
			s.x += s.vx * dt;
		} else if (s.mode === 'flight') {
			s.bvy += GRAVITY * dt;
			s.bx += s.bvx * dt;
			s.by += s.bvy * dt;
			const span = s.landX - s.flyFrom;
			const t = span === 0 ? 1 : clamp((s.bx - s.flyFrom) / span, 0, 1);
			s.x = lerp(s.fromX, s.landValue, t);
			s.vx = s.bvx;
			if (s.by >= REST_Y && s.bvy > 0) {
				s.bx = s.landX;
				s.by = REST_Y;
				s.x = s.target = s.landValue;
				impact(s.bx, s.bvy);
				s.bvx = 0;
				s.bvy = -s.bvy * BOUNCE;
				s.mode = Math.abs(s.bvy) < HOP_MIN ? 'idle' : 'hop';
			}
		} else if (s.mode === 'hop') {
			s.bvy += GRAVITY * dt;
			s.by += s.bvy * dt;
			s.vx = 0;
			if (s.by >= REST_Y && s.bvy > 0) {
				s.by = REST_Y;
				impact(s.bx, s.bvy * 0.6);
				s.bvy = -s.bvy * BOUNCE;
				if (Math.abs(s.bvy) < HOP_MIN) {
					s.bvy = 0;
					s.mode = 'idle';
				}
			}
		}
		s.x = clamp(s.x, 0, TRACK);

		const lit = headOf(s.x) + 1;
		if (lit !== s.lit) {
			const lo = Math.min(lit, s.lit);
			const hi = Math.max(lit, s.lit);
			const push = s.instant || s.reduced ? 0 : (1 - Math.exp(-Math.abs(s.vx) / 900)) * 7;
			for (let i = lo - 1; i < hi; i++) {
				if (i < 0 || i >= N) continue;
				s.hv[i] += push;
				if (s.instant) {
					s.b[i] = i < lit ? 1 : 0;
					s.bv[i] = 0;
				}
			}
			s.lit = lit;
		}

		let energy = 0;
		for (let i = 0; i < N; i++) {
			const to = i < s.lit ? 1 : 0;
			s.bv[i] += (BASE_K * (to - s.b[i]) - BASE_C * s.bv[i]) * dt;
			s.b[i] += s.bv[i] * dt;
			s.hv[i] += (-WAKE_K * s.h[i] - WAKE_C * s.hv[i]) * dt;
			s.h[i] += s.hv[i] * dt;
			energy +=
				Math.abs(s.h[i]) +
				Math.abs(s.hv[i]) * 0.02 +
				Math.abs(to - s.b[i]) +
				Math.abs(s.bv[i]) * 0.02;
		}

		let leanTo = 0;
		if (!s.reduced) {
			if (s.mode === 'aim') leanTo = clamp(s.pullX * 0.32, -LEAN_MAX, LEAN_MAX);
			else if (s.mode === 'drag' || s.mode === 'idle') leanTo = clamp(s.vx * 0.012, -18, 18);
		}
		s.leanV += (LEAN_K * (leanTo - s.lean) - LEAN_C * s.leanV) * dt;
		s.lean += s.leanV * dt;

		if (s.mode === 'idle' || s.mode === 'drag' || s.mode === 'aim') {
			const seat = tip(BALL_GAP + BALL / 2);
			const tx = s.mode === 'aim' ? seat.x + s.pullX : seat.x;
			const ty = s.mode === 'aim' ? seat.y + s.pullY : seat.y;
			s.bvx += (RIDE_K * (tx - s.bx) - RIDE_C * s.bvx) * dt;
			s.bvy += (RIDE_K * (ty - s.by) - RIDE_C * s.bvy) * dt;
			s.bx += s.bvx * dt;
			s.by += s.bvy * dt;
		}

		return (
			energy +
			Math.abs(s.target - s.x) +
			Math.abs(s.vx) * 0.01 +
			Math.abs(s.lean) * 0.1 +
			Math.abs(s.leanV) * 0.01 +
			Math.abs(s.bvx) * 0.01 +
			Math.abs(s.bvy) * 0.01
		);
	}

	function paint() {
		for (let i = 0; i < N; i++) {
			const el = barEls[i];
			if (!el) continue;
			const b = s.b[i];
			const sy = Math.max(0.05, lerp(DIM_H / BAR_H, 1, b) + s.h[i]);
			const sx = lerp(DIM_W / BAR_W, 1, clamp(b, 0, 1.4));
			const rot = i === s.lit - 1 ? s.lean : 0;
			el.style.transform = `translateX(${i * PITCH}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
			el.style.opacity = lerp(0.5, 1, clamp(b, 0, 1)).toFixed(3);
		}

		if (ballEl) {
			ballEl.style.transform = `translate(${(s.bx - BALL / 2).toFixed(2)}px, ${(s.by - BALL / 2).toFixed(2)}px)`;
		}

		const aiming =
			s.mode === 'aim' && Math.hypot(s.pullX, s.pullY) >= PULL_MIN && Math.abs(s.pullX) >= 2;
		s.aimAlpha += ((aiming ? 1 : 0) - s.aimAlpha) * (aiming ? 0.35 : 0.2);
		if (aiming) {
			const { land, lift } = s.aim;
			const { vx, vy, time } = solve(s.bx, s.by, land, lift);
			let d = '';
			for (let k = 0; k <= 40; k++) {
				const t = (time * k) / 40;
				const x = s.bx + vx * t;
				const y = s.by + vy * t + 0.5 * GRAVITY * t * t;
				d += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
			}
			arcEl?.setAttribute('d', d);
			if (ghostEl) {
				ghostEl.style.transform = `translate(${(land - BALL / 2).toFixed(2)}px, ${(REST_Y - BALL / 2).toFixed(2)}px)`;
			}
		}
		if (arcEl) arcEl.style.opacity = (s.aimAlpha * 0.75).toFixed(3);
		if (ghostEl) ghostEl.style.opacity = s.aimAlpha.toFixed(3);

		if (bandEl) {
			if (s.mode === 'aim') {
				const t = tip(0);
				bandEl.setAttribute('d', `M${t.x.toFixed(1)} ${t.y.toFixed(1)}L${s.bx.toFixed(1)} ${s.by.toFixed(1)}`);
				bandEl.style.opacity = '0.55';
			} else {
				bandEl.style.opacity = '0';
			}
		}

		if (trailEl) {
			const t = s.trail;
			if (s.mode === 'flight') t.push(s.bx, s.by);
			else if (t.length) t.splice(0, 6);
			let d = '';
			for (let k = 0; k < t.length; k += 2) d += `${k ? 'L' : 'M'}${t[k].toFixed(1)} ${t[k + 1].toFixed(1)}`;
			trailEl.setAttribute('d', d);
		}

		const shown = s.mode === 'aim' && aiming ? toValue(s.aim.value) : toValue(s.x);
		if (readingEl) {
			if (readingEl.textContent !== String(shown)) readingEl.textContent = String(shown);
			readingEl.toggleAttribute('data-aim', s.mode === 'aim' && aiming);
		}
		const value = toValue(s.x);
		if (value !== s.value) {
			s.value = value;
			stageEl?.setAttribute('aria-valuenow', String(value));
			onChange?.(value);
		}
	}

	function wake() {
		if (s.raf) return;
		s.last = performance.now();
		s.acc = 0;
		const frame = (now: number) => {
			s.acc += Math.min(0.05, (now - s.last) / 1000);
			s.last = now;
			let e = 0;
			while (s.acc >= STEP) {
				e = step(STEP);
				s.acc -= STEP;
			}
			s.instant = false;
			paint();
			const busy = s.mode !== 'idle' || e > 0.004 || s.aimAlpha > 0.01 || s.trail.length > 0;
			s.raf = busy ? requestAnimationFrame(frame) : 0;
		};
		s.raf = requestAnimationFrame(frame);
	}

	function local(clientX: number, clientY: number) {
		const r = stageEl!.getBoundingClientRect();
		const k = r.width / (TRACK + BAR_W) || 1;
		return {
			x: (clientX - r.left) / k - BAR_W / 2,
			y: (clientY - r.top) / k - STAGE_H / 2
		};
	}

	function onBall(x: number, y: number, pointerType = 'mouse') {
		const r = stageEl?.getBoundingClientRect();
		const k = r ? r.width / (TRACK + BAR_W) || 1 : 1;
		const reach = pointerType === 'mouse' ? GRAB_R : Math.max(GRAB_R, FINGER_R / k);
		return s.mode === 'idle' && Math.hypot(x - s.bx, y - s.by) <= reach;
	}

	function release() {
		if (s.mode === 'aim') {
			const pulled = Math.hypot(s.pullX, s.pullY) >= PULL_MIN && Math.abs(s.pullX) >= 2;
			if (!pulled) {
				s.mode = 'idle';
			} else if (s.reduced) {
				s.mode = 'idle';
				s.x = s.target = s.aim.value;
				s.vx = 0;
				s.instant = true;
			} else {
				const { vx, vy } = solve(s.bx, s.by, s.aim.land, s.aim.lift);
				s.bvx = vx;
				s.bvy = vy;
				s.fromX = s.x;
				s.flyFrom = s.bx;
				s.landX = s.aim.land;
				s.landValue = s.aim.value;
				s.target = s.aim.value;
				s.trail.length = 0;
				s.mode = 'flight';
			}
		} else if (s.mode === 'drag') {
			s.mode = 'idle';
		}
		s.pullX = s.pullY = 0;
		if (stageEl) stageEl.style.cursor = '';
		wake();
	}

	function onPointerDown(e: PointerEvent) {
		if (s.pointer !== -1 || e.button !== 0) return;
		s.pointer = e.pointerId;
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* */
		}
		const { x, y } = local(e.clientX, e.clientY);
		s.trail.length = 0;
		if (onBall(x, y, e.pointerType)) {
			s.mode = 'aim';
			s.grabX = x;
			s.grabY = y;
			s.pullX = s.pullY = 0;
			s.aim = aimAt(s.x, 0, 0);
			(e.currentTarget as HTMLElement).style.cursor = 'grabbing';
		} else {
			s.mode = 'drag';
			s.target = clamp(x, 0, TRACK);
		}
		wake();
	}

	function onPointerMove(e: PointerEvent) {
		const { x, y } = local(e.clientX, e.clientY);
		if (e.pointerId !== s.pointer) {
			if (s.pointer === -1)
				(e.currentTarget as HTMLElement).style.cursor = onBall(x, y) ? 'grab' : '';
			return;
		}
		if (s.mode === 'aim') {
			let dx = x - s.grabX;
			let dy = y - s.grabY;
			const len = Math.hypot(dx, dy);
			if (len > 0) {
				const k = (PULL_MAX * (1 - Math.exp(-len / PULL_MAX))) / len;
				dx *= k;
				dy *= k;
			}
			s.pullX = dx;
			s.pullY = dy;
			s.aim = aimAt(s.x, dx, dy);
		} else if (s.mode === 'drag') {
			s.target = clamp(x, 0, TRACK);
		}
		wake();
	}

	function onPointerUp(e: PointerEvent) {
		if (e.pointerId !== s.pointer) return;
		s.pointer = -1;
		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			/* */
		}
		release();
	}

	function onPointerCancel(e: PointerEvent) {
		if (e.pointerId !== s.pointer) return;
		s.pointer = -1;
		s.pullX = s.pullY = 0;
		if (s.mode === 'aim' || s.mode === 'drag') s.mode = 'idle';
		release();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && s.mode === 'aim') {
			e.preventDefault();
			s.pullX = s.pullY = 0;
			s.mode = 'idle';
			wake();
			return;
		}
		const by = e.shiftKey ? 10 : 1;
		const now = toValue(s.x);
		let next: number | null = null;
		if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = now + by;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = now - by;
		if (e.key === 'PageUp') next = now + 10;
		if (e.key === 'PageDown') next = now - 10;
		if (e.key === 'Home') next = 0;
		if (e.key === 'End') next = 100;
		if (next === null) return;
		e.preventDefault();
		const x = (clamp(next, 0, 100) / 100) * TRACK;
		s.mode = 'idle';
		s.x = s.target = x;
		s.vx = 0;
		s.instant = true;
		wake();
	}

	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => {
			s.reduced = mq.matches;
		};
		sync();
		mq.addEventListener('change', sync);
		paint();

		const measure = () => {
			if (!fitEl || !bodyEl) return;
			const natural = bodyEl.offsetWidth;
			const room = fitEl.parentElement?.clientWidth ?? fitEl.clientWidth;
			const scale = natural > 0 && room > 0 ? Math.min(1, room / natural) : 1;
			fitEl.style.setProperty('--psling-scale', String(scale));
			fitEl.style.width = `${natural * scale}px`;
			fitEl.style.height = `${bodyEl.offsetHeight * scale}px`;
		};
		measure();
		const watch = new ResizeObserver(measure);
		if (fitEl?.parentElement) watch.observe(fitEl.parentElement);
		if (bodyEl) watch.observe(bodyEl);

		return () => {
			mq.removeEventListener('change', sync);
			cancelAnimationFrame(s.raf);
			s.raf = 0;
			watch.disconnect();
		};
	});
</script>

<div class="psling" data-theme={theme}>
	<div class="psling__fit" bind:this={fitEl}>
		<div class="psling__body" bind:this={bodyEl}>
			<div
				class="psling__stage"
				bind:this={stageEl}
				role="slider"
				tabindex="0"
				aria-label={label}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={s.value}
				style:width="{TRACK + BAR_W}px"
				style:height="{STAGE_H}px"
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerCancel}
				onkeydown={onKeyDown}
			>
				{#each Array.from({ length: N }) as _, i}
					<span class="psling__bar" use:setBar={i}></span>
				{/each}
				<svg class="psling__arcs" aria-hidden="true">
					<path bind:this={arcEl} class="psling__arc" />
					<path bind:this={trailEl} class="psling__trail" />
					<path bind:this={bandEl} class="psling__band" />
				</svg>
				<span class="psling__ghost" bind:this={ghostEl} aria-hidden="true"></span>
				<span class="psling__ball" bind:this={ballEl} aria-hidden="true"></span>
			</div>
			<span class="psling__value" bind:this={readingEl} aria-hidden="true">{s.value}</span>
		</div>
	</div>
	{#if hint}
		<p class="psling__hint">Drag the bars to set. Pull the red ball back and let go to sling it.</p>
	{/if}
</div>
