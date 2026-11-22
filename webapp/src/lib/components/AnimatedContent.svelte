<script module lang="ts">
	export type AnimatedContentWipe = 'none' | 'up' | 'down' | 'left' | 'right' | 'center';
	export type AnimatedContentStaggerFrom = 'start' | 'end' | 'center' | 'edges' | 'random';

	const WIPES: Record<string, string> = {
		up: 'linear-gradient(to top, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
		down: 'linear-gradient(to bottom, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
		left: 'linear-gradient(to left, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
		right: 'linear-gradient(to right, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))',
		center:
			'radial-gradient(farthest-corner at 50% 50%, #000 calc(var(--ac-wipe) * 140% - 40%), transparent calc(var(--ac-wipe) * 140%))'
	};
</script>

<script lang="ts">
	/**
	 * AnimatedContent — scroll/mount reveal without GSAP.
	 * Uses IntersectionObserver + WAAPI (transform, opacity, filter, mask).
	 */
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'style'> & {
		children?: Snippet;
		distance?: number;
		direction?: 'vertical' | 'horizontal';
		reverse?: boolean;
		duration?: number;
		ease?: string;
		initialOpacity?: number;
		animateOpacity?: boolean;
		scale?: number;
		blur?: number;
		rotate?: number;
		wipe?: AnimatedContentWipe;
		threshold?: number;
		delay?: number;
		stagger?: number;
		staggerFrom?: AnimatedContentStaggerFrom;
		trigger?: 'scroll' | 'mount';
		once?: boolean;
		disappearAfter?: number;
		disappearDuration?: number;
		onStart?: () => void;
		onComplete?: () => void;
		onDisappearanceComplete?: () => void;
		class?: string;
		style?: string;
	};

	let {
		children,
		distance = 100,
		direction = 'vertical',
		reverse = false,
		duration = 0.8,
		ease = 'cubic-bezier(0.23, 1, 0.32, 1)',
		initialOpacity = 0,
		animateOpacity = true,
		scale = 1,
		blur = 0,
		rotate = 0,
		wipe = 'none',
		threshold = 0.1,
		delay = 0,
		stagger = 0,
		staggerFrom = 'start',
		trigger = 'scroll',
		once = true,
		disappearAfter = 0,
		disappearDuration = 0.5,
		onStart,
		onComplete,
		onDisappearanceComplete,
		class: className = '',
		style,
		...rest
	}: Props = $props();

	let el = $state<HTMLDivElement | null>(null);
	let played = $state(false);

	const cssEase = $derived(
		ease.startsWith('power') || ease.includes('.')
			? 'cubic-bezier(0.23, 1, 0.32, 1)'
			: ease
	);

	function staggerOrder(n: number, from: AnimatedContentStaggerFrom): number[] {
		const idxs = Array.from({ length: n }, (_, i) => i);
		if (from === 'end') return idxs.reverse();
		if (from === 'center') {
			const mid = (n - 1) / 2;
			return idxs.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
		}
		if (from === 'edges') {
			const mid = (n - 1) / 2;
			return idxs.sort((a, b) => Math.abs(b - mid) - Math.abs(a - mid));
		}
		if (from === 'random') {
			for (let i = idxs.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[idxs[i], idxs[j]] = [idxs[j], idxs[i]];
			}
			return idxs;
		}
		return idxs;
	}

	function fromTransform(): string {
		const horizontal = direction === 'horizontal';
		const sign = reverse ? -1 : 1;
		const axis = horizontal ? 'X' : 'Y';
		const parts = [`translate${axis}(${distance * sign}px)`, `scale(${scale})`];
		if (rotate) parts.push(`rotate(${rotate * sign}deg)`);
		return parts.join(' ');
	}

	function play() {
		const node = el;
		if (!node || (once && played)) return;
		played = true;

		const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
		const targets: HTMLElement[] =
			stagger > 0 && node.children.length
				? (Array.from(node.children) as HTMLElement[])
				: [node];

		const mask = WIPES[wipe];
		const order = staggerOrder(targets.length, staggerFrom);

		untrack(() => onStart)?.();

		if (reduce) {
			for (const t of targets) {
				t.style.opacity = '1';
				t.style.transform = 'none';
				t.style.filter = 'none';
				t.style.maskImage = 'none';
				(t.style as CSSStyleDeclaration & { webkitMaskImage?: string }).webkitMaskImage = 'none';
			}
			node.style.visibility = 'visible';
			untrack(() => onComplete)?.();
			return;
		}

		node.style.visibility = 'visible';
		const durMs = duration * 1000;
		const delayMs = Math.max(delay, 0) * 1000;
		const staggerMs = stagger * 1000;

		let finished = 0;
		const total = targets.length;

		for (let rank = 0; rank < order.length; rank++) {
			const t = targets[order[rank]];
			const startDelay = delayMs + rank * staggerMs;

			const from: Keyframe = {
				opacity: animateOpacity ? initialOpacity : 1,
				transform: fromTransform(),
				filter: blur > 0 ? `blur(${blur}px)` : 'blur(0px)'
			};
			const to: Keyframe = {
				opacity: 1,
				transform: 'translate(0) scale(1) rotate(0deg)',
				filter: 'blur(0px)'
			};

			if (mask) {
				t.style.maskImage = mask;
				(t.style as CSSStyleDeclaration & { webkitMaskImage?: string }).webkitMaskImage = mask;
				from['--ac-wipe' as string] = '0';
				to['--ac-wipe' as string] = '1';
			}

			t.animate([from, to], {
				duration: durMs,
				delay: startDelay,
				easing: cssEase,
				fill: 'forwards'
			}).finished.then(() => {
				finished += 1;
				if (finished >= total) {
					untrack(() => onComplete)?.();
					if (disappearAfter > 0) {
						setTimeout(() => disappear(targets), disappearAfter * 1000);
					}
				}
			});
		}
	}

	function disappear(targets: HTMLElement[]) {
		const horizontal = direction === 'horizontal';
		const sign = reverse ? -1 : 1;
		const axis = horizontal ? 'X' : 'Y';
		const durMs = disappearDuration * 1000;
		let done = 0;
		for (const t of targets) {
			t.animate(
				[
					{
						opacity: 1,
						transform: 'translate(0) scale(1)',
						filter: 'blur(0px)'
					},
					{
						opacity: animateOpacity ? initialOpacity : 0,
						transform: `translate${axis}(${-distance * sign}px) scale(0.8)`,
						filter: blur > 0 ? `blur(${blur}px)` : 'blur(0px)'
					}
				],
				{ duration: durMs, easing: cssEase, fill: 'forwards' }
			).finished.then(() => {
				done += 1;
				if (done >= targets.length) untrack(() => onDisappearanceComplete)?.();
			});
		}
	}

	$effect(() => {
		const node = el;
		if (!node) return;
		void distance;
		void direction;
		void reverse;
		void duration;
		void scale;
		void blur;
		void rotate;
		void wipe;
		void threshold;
		void delay;
		void stagger;
		void trigger;
		void once;

		return untrack(() => {
			played = false;
			if (trigger === 'mount') {
				requestAnimationFrame(() => play());
				return;
			}
			const io = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							play();
							if (once) io.disconnect();
						} else if (!once && played) {
							played = false;
							const targets =
								stagger > 0 && node.children.length
									? (Array.from(node.children) as HTMLElement[])
									: [node];
							for (const t of targets) {
								t.getAnimations().forEach((a) => a.cancel());
								t.style.opacity = String(animateOpacity ? initialOpacity : 1);
								t.style.transform = fromTransform();
								if (blur > 0) t.style.filter = `blur(${blur}px)`;
							}
							node.style.visibility = 'hidden';
						}
					}
				},
				{ threshold: Math.min(1, Math.max(0, threshold)) }
			);
			io.observe(node);
			return () => io.disconnect();
		});
	});
</script>

<div
	bind:this={el}
	class="ac {className}"
	style="visibility: hidden; --ac-wipe: 0; {style ?? ''}"
	{...rest}
>
	{@render children?.()}
</div>

<style>
	.ac {
		will-change: transform, opacity, filter;
	}
	.ac :global(> *) {
		will-change: transform, opacity, filter;
	}
</style>
