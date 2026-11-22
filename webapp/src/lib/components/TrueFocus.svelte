<script module lang="ts">
	interface FocusRect {
		x: number;
		y: number;
		width: number;
		height: number;
	}

	type Shape = { x: number; y: number; width?: number; height?: number; opacity: number };
	type ShapeKey = keyof Shape;
	type ShapeParams = { initial: Shape; target: Shape; duration: number; spring: boolean };

	type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	const CORNERS: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
	const FRAME_GAP = 10;
	const SMOOTH_CSS = 'cubic-bezier(0.65, 0, 0.35, 1)';
	const SPRING_CSS = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
	const SHAPE_KEYS: ShapeKey[] = ['x', 'y', 'width', 'height', 'opacity'];

	/** Svelte action: animate shape (x/y/w/h/opacity) via WAAPI — no motion dependency. */
	function motionShape(node: HTMLElement, params: ShapeParams) {
		const state: Shape = { ...params.initial };
		let last: Partial<Shape> = {};
		let anims: Animation[] = [];

		const apply = () => {
			node.style.transform = `translateX(${state.x}px) translateY(${state.y}px)`;
			if (state.width !== undefined) node.style.width = `${state.width}px`;
			if (state.height !== undefined) node.style.height = `${state.height}px`;
			node.style.opacity = `${state.opacity}`;
		};

		const run = (p: ShapeParams) => {
			anims.forEach((a) => a.cancel());
			anims = [];
			const ease = p.spring ? SPRING_CSS : SMOOTH_CSS;
			const ms = Math.max(0, p.duration * 1000);

			SHAPE_KEYS.forEach((key) => {
				const next = p.target[key];
				const from = state[key];
				if (next === undefined || from === undefined || last[key] === next) return;

				if (ms === 0) {
					(state as Record<string, number>)[key] = next;
					return;
				}

				const start = from;
				const delta = next - start;
				const anim = node.animate([{ offset: 0 }, { offset: 1 }], {
					duration: ms,
					easing: ease,
					fill: 'forwards'
				});
				const onFrame = () => {
					const t = anim.effect?.getComputedTiming().progress ?? 1;
					(state as Record<string, number>)[key] = start + delta * t;
					apply();
					if (t < 1 && anim.playState !== 'finished') {
						requestAnimationFrame(onFrame);
					}
				};
				requestAnimationFrame(onFrame);
				anim.finished
					.then(() => {
						(state as Record<string, number>)[key] = next;
						apply();
					})
					.catch(() => {});
					anims.push(anim);
			});
			last = { ...p.target };
			apply();
		};

		apply();
		run(params);

		return {
			update(next: ShapeParams) {
				run(next);
			},
			destroy() {
				anims.forEach((a) => a.cancel());
			}
		};
	}
</script>

<script lang="ts">
	type Props = {
		sentence?: string;
		separator?: string;
		manualMode?: boolean;
		focusStyle?: 'brackets' | 'box' | 'underline' | 'highlight';
		order?: 'sequential' | 'random';
		easing?: 'smooth' | 'spring';
		blurAmount?: number;
		focusScale?: number;
		borderColor?: string;
		highlightColor?: string;
		glowColor?: string;
		animationDuration?: number;
		pauseBetweenAnimations?: number;
		cornerSize?: number;
		borderWidth?: number;
		unfocusedOpacity?: number;
		class?: string;
	};

	let {
		sentence = 'True Focus',
		separator = ' ',
		manualMode = false,
		focusStyle = 'brackets',
		order = 'sequential',
		easing = 'smooth',
		blurAmount = 5,
		focusScale = 1,
		borderColor = 'green',
		highlightColor,
		glowColor = 'transparent',
		animationDuration = 0.5,
		pauseBetweenAnimations = 1,
		cornerSize = 16,
		borderWidth = 3,
		unfocusedOpacity = 1,
		class: className = ''
	}: Props = $props();

	const words = $derived(sentence.split(separator).filter((word) => word.trim() !== ''));
	let currentIndex = $state(0);
	let focusRect = $state.raw<FocusRect | null>(null);
	let containerEl = $state<HTMLDivElement | undefined>();
	let wordEls = $state<(HTMLSpanElement | undefined)[]>([]);
	let reduceMotion = $state(false);

	const duration = $derived(reduceMotion ? 0 : animationDuration);
	const activeIndex = $derived(words.length ? currentIndex % words.length : -1);
	const spring = $derived(easing === 'spring' && !reduceMotion);

	$effect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return;
		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const sync = () => (reduceMotion = media.matches);
		sync();
		media.addEventListener('change', sync);
		return () => media.removeEventListener('change', sync);
	});

	$effect(() => {
		const length = words.length;
		const mode = order;
		if (manualMode || length < 2) return;
		const interval = setInterval(
			() => {
				const current = currentIndex % length;
				if (mode !== 'random') {
					currentIndex = (current + 1) % length;
					return;
				}
				const next = Math.floor(Math.random() * (length - 1));
				currentIndex = next >= current ? next + 1 : next;
			},
			(animationDuration + pauseBetweenAnimations) * 1000
		);
		return () => clearInterval(interval);
	});

	$effect(() => {
		void sentence;
		void separator;
		const container = containerEl;
		const word = wordEls[activeIndex];
		if (!container || !word) return;
		const measure = () => {
			const next = {
				x: word.offsetLeft,
				y: word.offsetTop,
				width: word.offsetWidth,
				height: word.offsetHeight
			};
			const prev = focusRect;
			if (
				prev &&
				prev.x === next.x &&
				prev.y === next.y &&
				prev.width === next.width &&
				prev.height === next.height
			)
				return;
			focusRect = next;
		};
		measure();
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(measure);
		observer.observe(container);
		wordEls.forEach((node) => node && observer.observe(node));
		return () => observer.disconnect();
	});

	const frame = $derived<FocusRect | null>(
		focusRect
			? {
					x: focusRect.x - (focusRect.width * (focusScale - 1)) / 2,
					y: focusRect.y - (focusRect.height * (focusScale - 1)) / 2,
					width: focusRect.width * focusScale,
					height: focusRect.height * focusScale
				}
			: null
	);

	const corners = $derived<Record<Corner, { x: number; y: number }> | null>(
		frame
			? {
					'top-left': { x: frame.x - FRAME_GAP, y: frame.y - FRAME_GAP },
					'top-right': { x: frame.x + frame.width + FRAME_GAP - cornerSize, y: frame.y - FRAME_GAP },
					'bottom-left': {
						x: frame.x - FRAME_GAP,
						y: frame.y + frame.height + FRAME_GAP - cornerSize
					},
					'bottom-right': {
						x: frame.x + frame.width + FRAME_GAP - cornerSize,
						y: frame.y + frame.height + FRAME_GAP - cornerSize
					}
				}
			: null
	);

	const shapes = $derived(
		frame
			? {
					box: {
						x: frame.x - FRAME_GAP,
						y: frame.y - FRAME_GAP,
						width: frame.width + FRAME_GAP * 2,
						height: frame.height + FRAME_GAP * 2
					},
					underline: {
						x: frame.x,
						y: frame.y + frame.height + FRAME_GAP * 0.4,
						width: frame.width,
						height: borderWidth
					},
					highlight: {
						x: frame.x - frame.height * 0.14,
						y: frame.y + frame.height * 0.04,
						width: frame.width + frame.height * 0.28,
						height: frame.height * 0.92
					}
				}
			: null
	);

	const glow = $derived(`drop-shadow(0 0 4px ${glowColor})`);

	const wordStyle = (index: number) => {
		const isActive = index === activeIndex;
		const transform = focusScale !== 1 ? `transform: scale(${isActive ? focusScale : 1});` : '';
		return `filter: blur(${isActive ? 0 : blurAmount}px); opacity: ${isActive ? 1 : unfocusedOpacity}; ${transform} transition: filter ${duration}s ease, opacity ${duration}s ease, transform ${duration}s ${spring ? SPRING_CSS : SMOOTH_CSS};`;
	};

	const shapeParams = (target: Omit<Shape, 'opacity'>) => ({
		initial: { ...target, opacity: 0 },
		target: { ...target, opacity: 1 },
		duration,
		spring
	});
</script>

<div
	class="tf relative flex gap-[1em] justify-center items-center flex-wrap outline-none select-none {className}"
	bind:this={containerEl}
>
	{#if focusStyle === 'highlight' && shapes}
		<span
			class="pointer-events-none absolute left-0 top-0 rounded-md"
			aria-hidden="true"
			style:background-color="color-mix(in srgb, {highlightColor ?? borderColor} 30%, transparent)"
			use:motionShape={shapeParams(shapes.highlight)}
		></span>
	{/if}

	{#each words as word, index (index)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			bind:this={wordEls[index]}
			class="relative text-[3rem] font-black cursor-pointer outline-none select-none"
			style={wordStyle(index)}
			onmouseenter={() => {
				if (manualMode) currentIndex = index;
			}}
		>
			{word}
		</span>
	{/each}

	{#if shapes && corners && focusStyle !== 'highlight'}
		<div class="absolute top-0 left-0 pointer-events-none" aria-hidden="true">
			{#if focusStyle === 'box'}
				<span
					class="absolute left-0 top-0 box-border rounded-md"
					style:border="{borderWidth}px solid {borderColor}"
					style:filter={glow}
					use:motionShape={shapeParams(shapes.box)}
				></span>
			{/if}
			{#if focusStyle === 'underline'}
				<span
					class="absolute left-0 top-0"
					style:background-color={borderColor}
					style:border-radius="{borderWidth / 2}px"
					style:filter={glow}
					use:motionShape={shapeParams(shapes.underline)}
				></span>
			{/if}
			{#if focusStyle === 'brackets'}
				{#each CORNERS as corner (corner)}
					<span
						class="absolute top-0 left-0 box-border rounded-[3px]"
						style:width="{cornerSize}px"
						style:height="{cornerSize}px"
						style:border-style="solid"
						style:border-color={borderColor}
						style:border-top-width="{corner.startsWith('top') ? borderWidth : 0}px"
						style:border-bottom-width="{corner.startsWith('top') ? 0 : borderWidth}px"
						style:border-left-width="{corner.endsWith('left') ? borderWidth : 0}px"
						style:border-right-width="{corner.endsWith('left') ? 0 : borderWidth}px"
						style:filter={glow}
						use:motionShape={shapeParams({ ...corners[corner], opacity: 1 })}
					></span>
				{/each}
			{/if}
		</div>
	{/if}
</div>
