<script lang="ts">
	/**
	 * Chips — 3D selection list with a real press.
	 * Extruded lip via --lift; selected stays pressed; Web Audio cues.
	 */
	import { onMount } from 'svelte';
	import './chips.css';

	export type ChipsProps = {
		corner?: number;
		shadow?: number;
		rows?: 2 | 3 | 4 | '2' | '3' | '4';
		theme?: 'light' | 'dark';
		sound?: boolean;
		defaultValue?: string | null;
		onChange?: (value: string | null) => void;
	};

	const DOWN = 1;
	const PER_ROW = 4;

	const ITEMS = [
		'Start', 'Type', 'Layout', 'Color', 'Style', 'Imagery', 'Elements', 'Tactics',
		'Motion', 'Grid', 'Spacing', 'Depth', 'Voice', 'Craft', 'Flow', 'Ship'
	].map((label) => ({ id: label.toLowerCase(), label }));

	const ICONS: Record<string, string> = {
		start: `<circle cx="5.5" cy="12" r="3" fill="#22c55e"/><path d="M10.5 7.6a1 1 0 0 1 1.5-.87l6.5 3.75a1.2 1.2 0 0 1 0 2.08l-6.5 3.75a1 1 0 0 1-1.5-.87V7.6Z" fill="#22c55e"/>`,
		type: `<rect x="2" y="4.5" width="20" height="4" rx="2" fill="#f5d64e"/><rect x="2" y="10" width="12" height="4" rx="2" fill="#fbe795"/><rect x="2" y="15.5" width="17" height="4" rx="2" fill="#f5d64e"/>`,
		layout: `<rect x="2" y="3" width="9" height="8" rx="2.4" fill="#f97316"/><rect x="13" y="3" width="9" height="8" rx="2.4" fill="#fdba74"/><rect x="2" y="13" width="20" height="8" rx="2.4" fill="#f97316"/>`,
		color: `<path d="M12 2.4c4.3 4.2 7 7.3 7 10.7a7 7 0 1 1-14 0c0-3.4 2.7-6.5 7-10.7Z" fill="#fda4af"/><path d="M12 2.4c4.3 4.2 7 7.3 7 10.7a7 7 0 0 1-7 7V2.4Z" fill="#f43f5e"/><circle cx="12" cy="13.6" r="2" fill="#ffffff" fill-opacity=".7"/>`,
		style: `<rect x="2.5" y="2.5" width="9" height="9" rx="3" fill="#e879f9"/><rect x="12.5" y="12.5" width="9" height="9" rx="3" fill="#d946ef"/><path d="M15.6 3.4a6.2 6.2 0 0 1 5 5M8.4 20.6a6.2 6.2 0 0 1-5-5" stroke="#f0abfc" stroke-width="2.4" stroke-linecap="round"/>`,
		imagery: `<path d="M8.6 8.8 15.8 20H1.4L8.6 8.8Z" fill="#a78bfa"/><path d="M15.2 5.2 22.6 20H8.8l6.4-14.8Z" fill="#7c3aed"/><circle cx="5.2" cy="5.4" r="2.4" fill="#c4b5fd"/>`,
		elements: `<rect x="2.4" y="2.4" width="8.6" height="8.6" rx="2.4" fill="#3b9dfb"/><rect x="13" y="2.4" width="8.6" height="8.6" rx="2.4" fill="#9fcdfd"/><rect x="2.4" y="13" width="8.6" height="8.6" rx="2.4" fill="#9fcdfd"/><rect x="13" y="13" width="8.6" height="8.6" rx="2.4" fill="#3b9dfb"/>`,
		tactics: `<path d="M6.4 1.8v15.8h15.8" stroke="#a5b4fc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.8 6.4h15.8v15.8" stroke="#818cf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
		motion: `<path d="M3 6h18" stroke="#2dd4bf" stroke-width="3" stroke-linecap="round"/><path d="M3 12h12" stroke="#5eead4" stroke-width="3" stroke-linecap="round"/><path d="M3 18h7" stroke="#2dd4bf" stroke-width="3" stroke-linecap="round"/>`,
		grid: `<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4" stroke="#fb7185" stroke-width="2.6"/><path d="M2.6 9.2h18.8M9.2 2.6v18.8" stroke="#fda4af" stroke-width="2.6"/>`,
		spacing: `<rect x="2.5" y="4" width="19" height="6" rx="2.4" fill="#34d399"/><rect x="2.5" y="14" width="19" height="6" rx="2.4" fill="#a7f3d0"/>`,
		depth: `<rect x="2.4" y="2.4" width="13" height="13" rx="3.4" fill="#fcd34d"/><rect x="8.6" y="8.6" width="13" height="13" rx="3.4" fill="#f59e0b"/>`,
		voice: `<rect x="2" y="9" width="3" height="6" rx="1.5" fill="#93c5fd"/><rect x="7" y="5" width="3" height="14" rx="1.5" fill="#2563eb"/><rect x="12" y="2.5" width="3" height="19" rx="1.5" fill="#93c5fd"/><rect x="17" y="7" width="3" height="10" rx="1.5" fill="#2563eb"/>`,
		craft: `<path d="M12 2.4 14.9 9l7.1.6-5.4 4.7 1.6 6.9L12 17.5 5.8 21.2l1.6-6.9L2 9.6 9.1 9 12 2.4Z" fill="#f472b6"/>`,
		flow: `<path d="M5 9v6a4 4 0 0 0 4 4h6" stroke="#7dd3fc" stroke-width="2.8" stroke-linecap="round"/><circle cx="5" cy="5" r="3.2" fill="#38bdf8"/><circle cx="19" cy="19" r="3.2" fill="#0284c7"/>`,
		ship: `<path d="M12 2c3.6 2.7 5.4 6.1 5.4 10.1L15.2 17.4H8.8L6.6 12.1C6.6 8.1 8.4 4.7 12 2Z" fill="#94a3b8"/><circle cx="12" cy="9.4" r="2.2" fill="#fff"/><path d="M9.4 18.6c1.1 1.9 1.8 2.9 2.6 3.4.8-.5 1.5-1.5 2.6-3.4H9.4Z" fill="#f97316"/>`
	};

	let {
		corner = 20,
		shadow = 50,
		rows = 2,
		theme = 'light',
		sound = true,
		defaultValue = 'start',
		onChange
	}: ChipsProps = $props();

	let rootEl: HTMLDivElement | null = null;
	let listEl: HTMLDivElement | null = null;
	let selected = $state<string | null>(defaultValue);
	const chipEls = new Map<string, HTMLButtonElement>();
	const held = new Map<string, boolean>();

	const rowCount = $derived(Math.min(4, Math.max(2, Number(rows) || 2)));
	const visible = $derived(ITEMS.slice(0, rowCount * PER_ROW));
	const lines = $derived(
		Array.from({ length: rowCount }, (_, r) => visible.slice(r * PER_ROW, r * PER_ROW + PER_ROW))
	);

	const v = $derived(Math.min(100, Math.max(0, shadow)) / 100);
	const styleVars = $derived({
		'--corner': `${Math.min(40, Math.max(0, corner))}px`,
		'--shade': (v * 2).toFixed(3),
		'--cast': (0.04 + v * 0.58).toFixed(3)
	});

	let audio: { ctx: AudioContext; master: GainNode; noise: AudioBuffer } | null = null;
	let soundOn = true;
	let lastHover = 0;

	$effect(() => {
		soundOn = sound;
	});

	function ensureAudio() {
		if (typeof window === 'undefined') return null;
		if (!audio) {
			const AC =
				window.AudioContext ??
				(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
			if (!AC) return null;
			const ctx = new AC();
			const master = ctx.createGain();
			master.gain.value = 0.34;
			master.connect(ctx.destination);
			const len = Math.floor(ctx.sampleRate * 0.4);
			const noise = ctx.createBuffer(1, len, ctx.sampleRate);
			const data = noise.getChannelData(0);
			for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
			audio = { ctx, master, noise };
		}
		if (audio.ctx.state === 'suspended') void audio.ctx.resume();
		return audio;
	}

	function voice(opts: {
		f?: number;
		f2?: number;
		dur?: number;
		type?: OscillatorType;
		g?: number;
		noise?: number;
		nf?: number;
		q?: number;
		delay?: number;
	} = {}) {
		if (!soundOn) return;
		const e = ensureAudio();
		if (!e) return;
		const {
			f = 200,
			f2 = 100,
			dur = 0.06,
			type = 'triangle',
			g = 0.3,
			noise = 0.7,
			nf = 3000,
			q = 1.2,
			delay = 0
		} = opts;
		const { ctx, master } = e;
		const t0 = ctx.currentTime + delay;
		if (noise > 0) {
			const src = ctx.createBufferSource();
			src.buffer = e.noise;
			src.playbackRate.value = 0.8 + Math.random() * 0.5;
			const bp = ctx.createBiquadFilter();
			bp.type = 'bandpass';
			bp.frequency.value = nf;
			bp.Q.value = q;
			const ng = ctx.createGain();
			ng.gain.setValueAtTime(0.0001, t0);
			ng.gain.exponentialRampToValueAtTime(Math.max(0.001, noise * g), t0 + 0.003);
			ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.8);
			src.connect(bp).connect(ng).connect(master);
			src.start(t0);
			src.stop(t0 + dur + 0.08);
		}
		const o = ctx.createOscillator();
		o.type = type;
		o.frequency.setValueAtTime(f, t0);
		o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
		const og = ctx.createGain();
		og.gain.setValueAtTime(0.0001, t0);
		og.gain.exponentialRampToValueAtTime(Math.max(0.001, g), t0 + 0.004);
		og.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
		o.connect(og).connect(master);
		o.start(t0);
		o.stop(t0 + dur + 0.08);
	}

	const sfx = {
		unlock: () => {
			if (soundOn) ensureAudio();
		},
		press: () => voice({ f: 240, f2: 110, dur: 0.055, g: 0.26, noise: 0.8, nf: 3100, q: 1.1 }),
		release: () => voice({ f: 330, f2: 220, dur: 0.034, g: 0.11, noise: 0.55, nf: 5400, q: 1.5 }),
		select: () => {
			voice({ f: 250, f2: 105, dur: 0.06, g: 0.27, noise: 0.78, nf: 2900, q: 1.1 });
			voice({ f: 560, f2: 300, dur: 0.13, g: 0.08, noise: 0.12, nf: 2200, type: 'sine', delay: 0.014 });
		},
		hover: () => {
			const now = performance.now();
			if (now - lastHover < 110) return;
			lastHover = now;
			voice({ f: 1500, f2: 1250, dur: 0.015, g: 0.018, noise: 0.35, nf: 7200, q: 3 });
		}
	};

	function edge() {
		if (!listEl) return 7;
		return parseFloat(getComputedStyle(listEl).getPropertyValue('--pchips-edge')) || 7;
	}

	function isOn(el: HTMLElement) {
		return el.dataset.selected === 'true';
	}

	function setDepth(el: HTMLElement, px: number) {
		const full = edge();
		el.style.setProperty('--ty', `${full - px}px`);
		el.style.setProperty('--lift', `${px}px`);
		const ground = el.querySelector<HTMLElement>('.pchips__ground');
		if (ground) {
			ground.style.setProperty('--go', String(0.25 + (px / full) * 0.75));
			ground.style.setProperty('--gs', String(0.84 + (px / full) * 0.16));
		}
	}

	function settle() {
		const full = edge();
		chipEls.forEach((el) => {
			const on = isOn(el);
			el.style.setProperty('--ty', on ? `${full - DOWN}px` : '0px');
			el.style.setProperty('--lift', `${on ? DOWN : full}px`);
			el.style.setProperty('--sc', '1');
			el.style.opacity = '1';
			const ground = el.querySelector<HTMLElement>('.pchips__ground');
			if (ground) {
				ground.style.setProperty('--go', on ? '0.36' : '1');
				ground.style.setProperty('--gs', on ? '0.86' : '1');
			}
			const icon = el.querySelector<SVGElement>('.pchips__icon');
			if (icon) {
				icon.style.setProperty('--ir', '0deg');
				icon.style.setProperty('--is', '1');
			}
		});
	}

	function select(id: string) {
		const prev = selected;
		const next = prev === id ? null : id;
		selected = next;
		if (next) sfx.select();
		else sfx.release();

		chipEls.forEach((el, chipId) => {
			el.dataset.selected = String(chipId === next);
			const icon = el.querySelector<SVGElement>('.pchips__icon');
			if (chipId === next) {
				setDepth(el, DOWN);
				el.style.setProperty('--sc', '1.02');
				requestAnimationFrame(() => el.style.setProperty('--sc', '1'));
				if (icon) {
					icon.style.setProperty('--ir', '-14deg');
					icon.style.setProperty('--is', '1.25');
					requestAnimationFrame(() => {
						icon.style.setProperty('--ir', '0deg');
						icon.style.setProperty('--is', '1');
					});
				}
			} else if (chipId === prev) {
				setDepth(el, edge());
				el.style.setProperty('--sc', '1');
				if (icon) {
					icon.style.setProperty('--ir', '0deg');
					icon.style.setProperty('--is', '1');
				}
			}
		});
		onChange?.(next);
	}

	function canHover() {
		return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
	}

	function onEnter(id: string) {
		const el = chipEls.get(id);
		if (!el || !canHover() || held.get(id) || isOn(el)) return;
		sfx.hover();
		el.style.setProperty('--ty', '-3px');
		el.style.setProperty('--sc', '1.015');
		const icon = el.querySelector<SVGElement>('.pchips__icon');
		if (icon) {
			icon.style.setProperty('--ir', '-7deg');
			icon.style.setProperty('--is', '1.14');
		}
	}

	function onLeave(id: string) {
		const el = chipEls.get(id);
		if (!el || !canHover() || held.get(id) || isOn(el)) return;
		el.style.setProperty('--ty', '0px');
		el.style.setProperty('--sc', '1');
		const icon = el.querySelector<SVGElement>('.pchips__icon');
		if (icon) {
			icon.style.setProperty('--ir', '0deg');
			icon.style.setProperty('--is', '1');
		}
	}

	function onDown(id: string, e: PointerEvent) {
		if (e.button !== 0) return;
		const el = chipEls.get(id);
		if (!el) return;
		sfx.unlock();
		held.set(id, true);
		try {
			el.setPointerCapture(e.pointerId);
		} catch {
			/* ok */
		}
		sfx.press();
		setDepth(el, DOWN);
		el.style.setProperty('--sc', '0.975');
		const icon = el.querySelector<SVGElement>('.pchips__icon');
		if (icon) {
			icon.style.setProperty('--ir', '0deg');
			icon.style.setProperty('--is', '0.94');
		}
	}

	function onUp(id: string) {
		const el = chipEls.get(id);
		if (!el || !held.get(id)) return;
		held.set(id, false);
		if (isOn(el)) return;
		sfx.release();
		setDepth(el, edge());
		el.style.setProperty('--sc', '1');
		const icon = el.querySelector<SVGElement>('.pchips__icon');
		if (icon) icon.style.setProperty('--is', '1');
	}

	function onKey(e: KeyboardEvent, index: number) {
		const step =
			e.key === 'ArrowRight' || e.key === 'ArrowDown'
				? 1
				: e.key === 'ArrowLeft' || e.key === 'ArrowUp'
					? -1
					: 0;
		if (!step) return;
		e.preventDefault();
		const next = visible[(index + step + visible.length) % visible.length];
		if (next) chipEls.get(next.id)?.focus();
	}

	function bindChip(node: HTMLButtonElement, id: string) {
		chipEls.set(id, node);
		return {
			destroy() {
				chipEls.delete(id);
			}
		};
	}

	onMount(() => {
		settle();
		const chips = visible.map((i) => chipEls.get(i.id)).filter(Boolean) as HTMLButtonElement[];
		chips.forEach((el, i) => {
			el.style.opacity = '0';
			el.style.setProperty('--ty', `${(isOn(el) ? edge() - DOWN : 0) - 28}px`);
			el.style.setProperty('--sc', '0.9');
			setTimeout(() => {
				el.style.opacity = '1';
				el.style.setProperty('--ty', isOn(el) ? `${edge() - DOWN}px` : '0px');
				el.style.setProperty('--sc', '1');
			}, i * 55);
		});
		const rescue = window.setTimeout(() => {
			chips.forEach((el) => {
				if (el.style.opacity === '0') el.style.opacity = '';
			});
		}, 1400);

		let last = edge();
		const ro = new ResizeObserver(() => {
			const next = edge();
			if (next !== last) {
				last = next;
				settle();
			}
		});
		if (rootEl) ro.observe(rootEl);

		return () => {
			clearTimeout(rescue);
			ro.disconnect();
			void audio?.ctx.close().catch(() => {});
		};
	});

	$effect(() => {
		rowCount;
		queueMicrotask(() => settle());
	});
</script>

<div class="pchips" data-theme={theme} bind:this={rootEl} style={styleVars}>
	<div class="pchips__list" bind:this={listEl} role="listbox" aria-label="Selection list">
		{#each lines as line, r}
			<div class="pchips__row">
				{#each line as item}
					{@const index = visible.indexOf(item)}
					{@const on = selected === item.id}
					<button
						type="button"
						class="pchips__chip"
						role="option"
						aria-selected={on}
						data-selected={on}
						use:bindChip={item.id}
						onpointerenter={() => onEnter(item.id)}
						onpointerleave={() => onLeave(item.id)}
						onpointerdown={(e) => onDown(item.id, e)}
						onpointerup={() => onUp(item.id)}
						onpointercancel={() => onUp(item.id)}
						onclick={() => select(item.id)}
						onkeydown={(e) => onKey(e, index)}
					>
						<span class="pchips__ground" aria-hidden="true"></span>
						<svg class="pchips__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							{@html ICONS[item.id]}
						</svg>
						<span class="pchips__label">{item.label}</span>
					</button>
				{/each}
			</div>
		{/each}
	</div>
</div>
