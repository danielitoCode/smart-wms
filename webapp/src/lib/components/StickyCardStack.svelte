<script lang="ts">
	/**
	 * StickyCardStack — stacked sticky cards that scale down as you scroll.
	 * Migrated from React (Framer Motion useScroll/useTransform + Lenis) to Svelte 5.
	 * Native scroll + rAF scale (no Framer, no Lenis).
	 *
	 * Uso:
	 *   <StickyCardStack items={projects} />
	 */
	import type { StickyCardItem } from './stickyCardStack.types';

	interface Props {
		items: StickyCardItem[];
		hint?: string;
		class?: string;
	}

	let {
		items,
		hint = 'scroll down to see card stack',
		class: className = ''
	}: Props = $props();

	let rootEl = $state<HTMLElement | null>(null);
	let progress = $state(0);

	$effect(() => {
		const el = rootEl;
		if (!el || typeof window === 'undefined') return;

		let raf = 0;
		const measure = () => {
			const rect = el.getBoundingClientRect();
			const total = el.offsetHeight - window.innerHeight;
			if (total <= 0) {
				progress = 0;
				return;
			}
			const scrolled = -rect.top;
			progress = Math.min(1, Math.max(0, scrolled / total));
		};

		const onScroll = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(measure);
		};

		measure();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	});

	function scaleFor(i: number): number {
		const n = items.length;
		const targetScale = Math.max(0.5, 1 - (n - i - 1) * 0.1);
		const rangeStart = i * 0.25;
		const rangeEnd = 1;
		if (progress <= rangeStart) return 1;
		if (progress >= rangeEnd) return targetScale;
		const t = (progress - rangeStart) / (rangeEnd - rangeStart);
		return 1 + (targetScale - 1) * t;
	}

	function topOffset(i: number): string {
		return `calc(-5vh + ${i * 20 + 250}px)`;
	}
</script>

<section class="scs {className}" bind:this={rootEl}>
	<div class="scs__hint" aria-hidden="true">
		<span class="scs__hint-text">{hint}</span>
	</div>

	{#each items as project, i (i)}
		<div class="scs__sticky">
			<div
				class="scs__card"
				style:top={topOffset(i)}
				style:transform="scale({scaleFor(i)})"
				style:z-index={i + 1}
			>
				<img class="scs__img" src={project.src} alt={project.alt ?? project.title} />
				{#if project.title}
					<div class="scs__label">{project.title}</div>
				{/if}
			</div>
		</div>
	{/each}
</section>

<style>
	.scs {
		position: relative;
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding-top: 50vh;
		padding-bottom: 100vh;
	}

	.scs__hint {
		position: absolute;
		left: 50%;
		top: 10%;
		display: grid;
		translate: -50% 0;
		justify-items: center;
		gap: 1.5rem;
		text-align: center;
		pointer-events: none;
	}

	.scs__hint-text {
		position: relative;
		max-width: 12ch;
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		line-height: 1.3;
		opacity: 0.4;
		color: var(--ink, #132234);
	}

	.scs__hint-text::after {
		content: '';
		position: absolute;
		left: 50%;
		top: 100%;
		height: 4rem;
		width: 1px;
		translate: -50% 0;
		background: linear-gradient(to bottom, var(--bg, #edf2f8), var(--ink, #132234));
		opacity: 0.35;
	}

	.scs__sticky {
		position: sticky;
		top: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	.scs__card {
		position: relative;
		top: -25%;
		display: flex;
		height: 300px;
		width: min(500px, 92vw);
		flex-direction: column;
		overflow: hidden;
		border-radius: 1.75rem;
		transform-origin: top center;
		will-change: transform;
		box-shadow:
			0 20px 40px -16px rgba(0, 0, 0, 0.35),
			0 0 0 1px rgba(0, 0, 0, 0.06);
		background: #111;
	}

	.scs__img {
		height: 100%;
		width: 100%;
		object-fit: cover;
		display: block;
	}

	.scs__label {
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		padding: 1rem 1.25rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 600;
		color: #fff;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.65), transparent);
		pointer-events: none;
	}
</style>
