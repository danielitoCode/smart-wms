<script lang="ts">
	/**
	 * Progress Image — rollout card whose photograph is the progress bar.
	 * Six reveal looks driven by createRevealEngine (canvas).
	 */
	import { onMount } from 'svelte';
	import {
		createRevealEngine,
		REVEAL_FX,
		type RevealFx
	} from './progress-image-engine';
	import './progress-image.css';

	export type ProgressImageProps = {
		theme?: 'light' | 'dark';
		src?: string;
		alt?: string;
		defaultValue?: number;
		defaultTransition?: RevealFx;
		onChange?: (value: number) => void;
	};

	const PRESETS = [0, 25, 50, 75, 90, 100];
	const SRC = 'https://picsum.photos/id/1015/1200/620';
	const clamp = (n: number, a = 0, b = 100) => Math.min(b, Math.max(a, n));

	let {
		theme = 'light',
		src = SRC,
		alt = 'A deep blue fjord winding between rocky cliffs',
		defaultValue = 75,
		defaultTransition = 'pixel',
		onChange
	}: ProgressImageProps = $props();

	let photoEl: HTMLCanvasElement | null = null;
	let trackEl: HTMLDivElement | null = null;
	let fillEl: HTMLDivElement | null = null;
	let pctEl: HTMLSpanElement | null = null;
	let knobEl: HTMLSpanElement | null = null;
	let leadBlob: HTMLDivElement | null = null;
	let trailBlob: HTMLDivElement | null = null;
	let fxNav: HTMLElement | null = null;
	let fxInd: HTMLDivElement | null = null;
	let presetsEl: HTMLDivElement | null = null;
	let shimmerEl: HTMLDivElement | null = null;
	let tipOpen = $state(false);
	let value = $state(0);
	let fx = $state<RevealFx>(
		REVEAL_FX.some((f) => f.id === defaultTransition) ? defaultTransition : 'pixel'
	);
	let ready = $state(false);
	let activePreset = $state(-1);
	let knobDown = $state(false);
	let entered = $state(false);
	let reduce = false;

	let target = 0;
	let revealMul = 1;
	let engine: ReturnType<typeof createRevealEngine> | null = null;
	let stopPrewarm = () => {};
	let paintQueued = 0;
	let trackW = 0;
	const H = 44;

	function progress() {
		return (clamp(value) / 100) * clamp(revealMul, 0, 1);
	}

	function paintPhoto() {
		if (!photoEl || !engine) return;
		const t = progress();
		photoEl.style.filter =
			fx === 'pixel' ? `saturate(${(0.35 + 0.65 * Math.pow(t, 0.6)).toFixed(3)})` : '';
		if (shimmerEl) shimmerEl.style.opacity = String(ready ? clamp(1 - t / 0.3, 0, 1) * 0.6 : 1);
		if (!ready || paintQueued) return;
		paintQueued = requestAnimationFrame(() => {
			paintQueued = 0;
			engine?.draw(progress(), fx);
		});
	}

	function paintFill() {
		if (!fillEl || !pctEl) return;
		const v = clamp(value);
		const x = H + (trackW - H) * (v / 100);
		fillEl.style.transform = `translate3d(${x - trackW}px,0,0)`;
		pctEl.textContent = `${Math.round(v)}%`;
		pctEl.style.opacity = String(clamp((v - 8) / 8, 0, 1));
		paintPhoto();
	}

	function moveIndicator(index: number) {
		activePreset = index;
		if (!leadBlob || !trailBlob || !presetsEl) return;
		const pills = presetsEl.querySelectorAll<HTMLButtonElement>('.ppimg__pill');
		if (index < 0) {
			leadBlob.style.opacity = '0';
			trailBlob.style.opacity = '0';
			return;
		}
		const p = pills[index];
		if (!p) return;
		const left = `${p.offsetLeft}px`;
		const top = `${p.offsetTop}px`;
		const width = `${p.offsetWidth}px`;
		for (const b of [leadBlob, trailBlob]) {
			b.style.top = top;
			b.style.left = left;
			b.style.width = width;
			b.style.opacity = '1';
		}
	}

	function selectFxUi() {
		if (!fxInd || !fxNav) return;
		const btn = fxNav.querySelector<HTMLButtonElement>(`[data-fx="${fx}"]`);
		if (!btn) return;
		fxInd.style.transform = `translateX(${btn.offsetLeft}px)`;
		fxInd.style.width = `${btn.offsetWidth}px`;
		fxInd.classList.add('is-on');
	}

	function commit(v: number) {
		const next = Math.round(clamp(v));
		if (next !== target) {
			target = next;
			onChange?.(target);
		}
		const idx = PRESETS.indexOf(target);
		if (idx !== activePreset) moveIndicator(idx);
	}

	function setValue(v: number, animate = true) {
		commit(v);
		if (!animate || reduce) {
			value = target;
			paintFill();
			return;
		}
		const from = value;
		const to = target;
		const t0 = performance.now();
		const dur = 420;
		const tick = (now: number) => {
			const p = Math.min(1, (now - t0) / dur);
			const e = 1 - Math.pow(1 - p, 3);
			value = from + (to - from) * e;
			paintFill();
			if (p < 1) requestAnimationFrame(tick);
			else {
				value = to;
				paintFill();
			}
		};
		requestAnimationFrame(tick);
	}

	function chooseFx(id: RevealFx) {
		if (id === fx) return;
		fx = id;
		engine?.ensure(id);
		selectFxUi();
		if (reduce) {
			paintPhoto();
			return;
		}
		revealMul = 0;
		const t0 = performance.now();
		const dur = 1800;
		const tick = (now: number) => {
			const p = Math.min(1, (now - t0) / dur);
			const e = p * p * (3 - 2 * p);
			revealMul = e;
			paintPhoto();
			if (p < 1) requestAnimationFrame(tick);
			else {
				revealMul = 1;
				paintPhoto();
			}
		};
		requestAnimationFrame(tick);
	}

	function valueAtClientX(clientX: number, left: number, offset: number) {
		return clamp(((clientX - left - offset - H / 2) / (trackW - H)) * 100);
	}

	onMount(() => {
		reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!photoEl) return;

		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.decoding = 'async';
		engine = createRevealEngine(photoEl, img);

		const build = () => {
			if (!engine?.build()) return;
			engine.ensure(fx);
			stopPrewarm();
			stopPrewarm = engine.prewarm();
		};

		const ro = new ResizeObserver(() => {
			if (!photoEl || !engine || !ready) return;
			const size = `${photoEl.clientWidth}x${photoEl.clientHeight}`;
			if (size === engine.size) return;
			build();
			paintPhoto();
		});
		ro.observe(photoEl);

		const trackRo = new ResizeObserver(() => {
			if (!trackEl) return;
			trackW = trackEl.clientWidth;
			paintFill();
			if (activePreset >= 0) moveIndicator(activePreset);
			selectFxUi();
		});
		if (trackEl) {
			trackW = trackEl.clientWidth;
			trackRo.observe(trackEl);
		}

		let drag: { left: number; offset: number } | null = null;

		const onPointerDown = (e: PointerEvent) => {
			if (e.button !== 0 || !trackEl || !knobEl) return;
			const r = trackEl.getBoundingClientRect();
			const k = knobEl.getBoundingClientRect();
			const onKnob = e.clientX >= k.left - 6 && e.clientX <= k.right + 6;
			drag = { left: r.left, offset: onKnob ? e.clientX - (k.left + k.width / 2) : 0 };
			trackEl.setPointerCapture(e.pointerId);
			knobDown = true;
			const v = valueAtClientX(e.clientX, drag.left, drag.offset);
			commit(v);
			value = v;
			paintFill();
		};
		const onPointerMove = (e: PointerEvent) => {
			if (!drag) return;
			const last = e.getCoalescedEvents?.().at(-1) ?? e;
			const v = valueAtClientX(last.clientX, drag.left, drag.offset);
			commit(v);
			value = v;
			paintFill();
		};
		const release = () => {
			if (!drag) return;
			drag = null;
			knobDown = false;
			const near = PRESETS.find((p) => Math.abs(p - target) <= 2);
			setValue(near ?? target, true);
		};

		trackEl?.addEventListener('pointerdown', onPointerDown);
		trackEl?.addEventListener('pointermove', onPointerMove);
		trackEl?.addEventListener('pointerup', release);
		trackEl?.addEventListener('pointercancel', release);
		trackEl?.addEventListener('lostpointercapture', release);

		const onKey = (e: KeyboardEvent) => {
			const step = e.shiftKey ? 10 : 1;
			const map: Record<string, number> = {
				ArrowRight: target + step,
				ArrowUp: target + step,
				ArrowLeft: target - step,
				ArrowDown: target - step,
				PageUp: target + 10,
				PageDown: target - 10,
				Home: 0,
				End: 100
			};
			if (!(e.key in map)) return;
			e.preventDefault();
			setValue(map[e.key], true);
		};
		trackEl?.addEventListener('keydown', onKey);

		img.onload = () => {
			ready = true;
			build();
			paintPhoto();
			setValue(defaultValue, !reduce);
			requestAnimationFrame(() => {
				entered = true;
				selectFxUi();
			});
		};
		img.onerror = () => {
			ready = false;
		};
		img.src = src;

		return () => {
			stopPrewarm();
			ro.disconnect();
			trackRo.disconnect();
			if (paintQueued) cancelAnimationFrame(paintQueued);
			trackEl?.removeEventListener('pointerdown', onPointerDown);
			trackEl?.removeEventListener('pointermove', onPointerMove);
			trackEl?.removeEventListener('pointerup', release);
			trackEl?.removeEventListener('pointercancel', release);
			trackEl?.removeEventListener('lostpointercapture', release);
			trackEl?.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="ppimg" data-theme={theme}>
	<svg class="ppimg__defs" aria-hidden="true">
		<defs>
			<filter id="ppimg-goo">
				<feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
				<feColorMatrix
					in="blur"
					mode="matrix"
					values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
					result="goo"
				/>
				<feBlend in="SourceGraphic" in2="goo" />
			</filter>
		</defs>
	</svg>

	<section class="ppimg__card" data-enter class:is-in={entered}>
		<div class="ppimg__scene">
			<canvas class="ppimg__photo" class:is-ready={ready} bind:this={photoEl} aria-label={alt}></canvas>
			<div class="ppimg__shimmer" bind:this={shimmerEl} aria-hidden="true"></div>
		</div>

		<div class="ppimg__meta">
			<div>
				<p class="ppimg__title">Plugin rollout</p>
				<p class="ppimg__caption">Canary · staged release</p>
			</div>
			<div class="ppimg__pct-pill" aria-live="polite">{Math.round(value)}%</div>
			<div class="ppimg__help">
				<button
					type="button"
					class="ppimg__info"
					aria-describedby="ppimg-tip"
					aria-expanded={tipOpen}
					onfocus={() => (tipOpen = true)}
					onblur={() => (tipOpen = false)}
					onclick={() => (tipOpen = !tipOpen)}
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M12 7v6" />
						<path d="M12 16.6v.1" />
					</svg>
				</button>
				<div id="ppimg-tip" role="tooltip" class="ppimg__tip" class:is-open={tipOpen}>
					Users are bucketed randomly. Raising the percentage adds users; lowering it never removes
					the update from anyone who already has it.
				</div>
			</div>
		</div>

		<p class="ppimg__copy">
			Control how many users get access to the latest plugin update. Use the presets or drag the
			slider to schedule a safe release.
		</p>

		<div
			class="ppimg__presets"
			bind:this={presetsEl}
			role="radiogroup"
			aria-label="Rollout presets"
		>
			<div class="ppimg__blobs" aria-hidden="true">
				<div class="ppimg__blob ppimg__blob--trail" bind:this={trailBlob}></div>
				<div class="ppimg__blob ppimg__blob--lead" bind:this={leadBlob}></div>
			</div>
			{#each PRESETS as v, i}
				<button
					type="button"
					role="radio"
					class="ppimg__pill"
					aria-checked={activePreset === i}
					tabindex={activePreset === i || (activePreset === -1 && i === 0) ? 0 : -1}
					onclick={() => setValue(v, true)}
				>
					{v}%
				</button>
			{/each}
		</div>

		<p class="ppimg__label" id="ppimg-label">Deployment progress</p>
		<div
			class="ppimg__track"
			bind:this={trackEl}
			role="slider"
			tabindex="0"
			aria-labelledby="ppimg-label"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(value)}
			aria-valuetext="{Math.round(value)}% of users"
		>
			<div class="ppimg__fill" bind:this={fillEl}>
				<span class="ppimg__pct" bind:this={pctEl}>0%</span>
				<span class="ppimg__knob" class:is-down={knobDown} bind:this={knobEl}></span>
			</div>
		</div>
	</section>

	<nav
		class="ppimg__fx"
		bind:this={fxNav}
		data-enter
		class:is-in={entered}
		role="radiogroup"
		aria-label="Photo transition"
	>
		<div class="ppimg__fx-ind" bind:this={fxInd} aria-hidden="true"></div>
		{#each REVEAL_FX as { id, label }}
			<button
				type="button"
				role="radio"
				class="ppimg__fx-btn"
				data-fx={id}
				aria-checked={fx === id}
				tabindex={fx === id ? 0 : -1}
				onclick={() => chooseFx(id)}
			>
				{label}
			</button>
		{/each}
	</nav>
</div>
