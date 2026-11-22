<script module lang="ts">
	export type FadeContentEffect = 'fade' | 'focus' | 'develop' | 'dissolve' | 'mist' | 'pixel';
	export type FadeContentStaggerFrom = 'start' | 'end' | 'center' | 'edges' | 'random';

	const toSeconds = (value: number) => (typeof value === 'number' && value > 10 ? value / 1000 : value);
	const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);
</script>

<script lang="ts">
	/**
	 * FadeContent — scroll/mount fade & filter reveals without GSAP.
	 * Effects: fade | focus | develop | dissolve | mist | pixel (CSS/WAAPI approximations).
	 */
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'style'> & {
		children?: Snippet;
		effect?: FadeContentEffect;
		blur?: boolean | number;
		duration?: number;
		ease?: string;
		delay?: number;
		threshold?: number;
		initialOpacity?: number;
		stagger?: number;
		staggerFrom?: FadeContentStaggerFrom;
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
		effect: effectType = 'fade',
		blur = false,
		duration = 1,
		ease = 'cubic-bezier(0.23, 1, 0.32, 1)',
		delay = 0,
		threshold = 0.1,
		initialOpacity = 0,
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
		String(ease).startsWith('power') || String(ease).includes('.')
			? 'cubic-bezier(0.23, 1, 0.32, 1)'
			: ease
	);

	const blurPx = $derived(blur === true ? 10 : Math.max(Number(blur) || 0, 0));
	const seconds = $derived(Math.max(toSeconds(duration) || 0, 0.01));
	const startOpacity = $derived(clamp01(Number(initialOpacity) || 0));

	function staggerOrder(n: number, from: FadeContentStaggerFrom): number[] {
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

	function fromFilter(eff: FadeContentEffect, amount: number): string {
		if (eff === 'focus') return `blur(${12 + amount}px)`;
		if (eff === 'develop')
			return `grayscale(1) contrast(0.55) brightness(1.3) blur(${Math.max(amount, 2)}px)`;
		if (eff === 'mist') return `blur(${14 + amount}px) saturate(0.4)`;
		if (eff === 'dissolve') return `blur(${6 + amount}px) contrast(1.15)`;
		if (eff === 'pixel') return `blur(${4 + amount}px) contrast(1.2)`;
		if (amount > 0) return `blur(${amount}px)`;
		return 'blur(0px)';
	}

	function toFilter(eff: FadeContentEffect): string {
		if (eff === 'develop') return 'grayscale(0) contrast(1) brightness(1) blur(0px)';
		return 'blur(0px) saturate(1) contrast(1)';
	}

	function fromTransform(eff: FadeContentEffect): string {
		if (eff === 'focus') return 'scale(0.97)';
		if (eff === 'pixel') return 'scale(1.02)';
		return 'scale(1)';
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

		untrack(() => onStart)?.();

		if (reduce) {
			for (const t of targets) {
				t.style.opacity = '1';
				t.style.filter = 'none';
				t.style.transform = 'none';
			}
			node.style.visibility = 'visible';
			untrack(() => onComplete)?.();
			return;
		}

		node.style.visibility = 'visible';
		const durMs = seconds * 1000;
		const delayMs = Math.max(toSeconds(delay), 0) * 1000;
		const staggerMs = toSeconds(stagger) * 1000;
		const order = staggerOrder(targets.length, staggerFrom);
		let finished = 0;
		const total = targets.length;

		for (let rank = 0; rank < order.length; rank++) {
			const t = targets[order[rank]];
			const startDelay = delayMs + rank * staggerMs;

			const from: Keyframe = {
				opacity: startOpacity,
				filter: fromFilter(effectType, blurPx),
				transform: fromTransform(effectType)
			};
			const to: Keyframe = {
				opacity: 1,
				filter: toFilter(effectType),
				transform: 'scale(1)'
			};

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
						setTimeout(() => disappear(targets), toSeconds(disappearAfter) * 1000);
					}
				}
			});
		}
	}

	function disappear(targets: HTMLElement[]) {
		const durMs = Math.max(toSeconds(disappearDuration), 0.01) * 1000;
		let done = 0;
		for (const t of targets) {
			t.animate(
				[
					{ opacity: 1, filter: toFilter(effect), transform: 'scale(1)' },
					{
						opacity: startOpacity,
						filter: fromFilter(effectType, blurPx),
						transform: fromTransform(effectType)
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
		void effectType;
		void blur;
		void duration;
		void delay;
		void threshold;
		void stagger;
		void trigger;
		void once;
		void initialOpacity;

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
								t.style.opacity = String(startOpacity);
								t.style.filter = fromFilter(effectType, blurPx);
								t.style.transform = fromTransform(effectType);
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
	class="fc {className}"
	style="visibility: hidden; {style ?? ''}"
	{...rest}
>
	{@render children?.()}
</div>

<style>
	.fc {
		will-change: opacity, filter, transform;
	}
	.fc :global(> *) {
		will-change: opacity, filter, transform;
	}
</style>
