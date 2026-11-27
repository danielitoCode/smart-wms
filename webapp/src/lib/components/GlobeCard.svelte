<script lang="ts" module>
	/**
	 * GlobeCard — feature card with dotted Three.js globe, arcs, avatars (motion-brew, MIT).
	 * Requires `three` (npm i three).
	 */
	export interface GlobeMember {
		name: string;
		city: string;
		lat: number;
		lon: number;
		color?: string;
	}
	export interface GlobeCardProps {
		title?: string;
		subtitle?: string;
		cta?: string;
		href?: string;
		members?: GlobeMember[];
		arcs?: number;
		turn?: number;
		onCta?: () => void;
		class?: string;
	}

	const PALETTE = ['#9150e0', '#3d66d6', '#d6498f', '#269a5a', '#cf7a1c', '#2a9fbf'];
	export const DEFAULT_MEMBERS: GlobeMember[] = [
		{ name: 'Ava Chen', city: 'San Francisco', lat: 37.8, lon: -122.4 },
		{ name: 'Leo Martins', city: 'São Paulo', lat: -23.5, lon: -46.6 },
		{ name: 'Maya Lindqvist', city: 'Stockholm', lat: 59.3, lon: 18.1 },
		{ name: 'Daniel Okafor', city: 'Lagos', lat: 6.5, lon: 3.4 },
		{ name: 'Priya Raman', city: 'Bengaluru', lat: 12.97, lon: 77.6 },
		{ name: 'Kenji Sato', city: 'Tokyo', lat: 35.7, lon: 139.7 },
		{ name: 'Grace Hill', city: 'Sydney', lat: -33.9, lon: 151.2 },
		{ name: 'Omar Haddad', city: 'Dubai', lat: 25.2, lon: 55.3 },
		{ name: 'Sofia Ruiz', city: 'Mexico City', lat: 19.4, lon: -99.1 },
		{ name: 'Tom Becker', city: 'Berlin', lat: 52.5, lon: 13.4 }
	];
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { mountGlobe, type GlobePerson } from './globe-card-engine';

	let {
		title = 'Global team',
		subtitle = 'We are designers, engineers and writers spread across ten countries. Wherever you are, someone on the team is awake and building.',
		cta = 'Meet the team',
		href,
		members = DEFAULT_MEMBERS,
		arcs = 6,
		turn = 70,
		onCta,
		class: className = ''
	}: GlobeCardProps = $props();

	let cardEl: HTMLDivElement | null = $state(null);
	let mountEl: HTMLDivElement | null = $state(null);
	let still = $state(false);
	let show = $state(false);

	const people = $derived(
		members.map((m, i) => ({
			...m,
			color: m.color ?? ['#9150e0', '#3d66d6', '#d6498f', '#269a5a', '#cf7a1c', '#2a9fbf'][i % 6]!
		})) as GlobePerson[]
	);

	const titleWords = $derived(title.split(' '));
	const subWords = $derived(subtitle.split(' '));

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		show = still;
		const card = cardEl;
		const host = mountEl;
		if (!card || !host) return;

		const ioCard = new IntersectionObserver(
			([e]) => {
				if (e?.isIntersecting) show = true;
			},
			{ threshold: 0.4 }
		);
		ioCard.observe(card);

		const dispose = mountGlobe(host, {
			getTurn: () => turn,
			getArcs: () => arcs,
			getStill: () => still,
			getPeople: () => people
		});

		return () => {
			ioCard.disconnect();
			dispose();
		};
	});
</script>

<div bind:this={cardEl} class={['gc', className].filter(Boolean).join(' ')} class:is-still={still}>
	<div class="gc__glow" aria-hidden="true"></div>
	<div bind:this={mountEl} class="gc__canvas" aria-hidden="true"></div>

	<div class="gc__copy">
		<h2 class="gc__title" aria-label={title}>
			{#each titleWords as w, i}
				<span class="gc__word" class:on={show} style="--d: {i * 0.05}s" aria-hidden="true">{w}</span>{' '}
			{/each}
		</h2>
		<p class="gc__sub" aria-label={subtitle}>
			{#each subWords as w, i}
				<span class="gc__word" class:on={show} style="--d: {0.12 + i * 0.05}s" aria-hidden="true">{w}</span>{' '}
			{/each}
		</p>
		<div class="gc__cta-wrap" class:on={show}>
			{#if href}
				<a class="gc__btn" {href}>
					{cta}
					<span class="gc__through" aria-hidden="true">
						<svg class="a" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
						<svg class="b" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
					</span>
				</a>
			{:else}
				<button type="button" class="gc__btn" onclick={() => onCta?.()}>
					{cta}
					<span class="gc__through" aria-hidden="true">
						<svg class="a" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
						<svg class="b" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
					</span>
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.gc {
		position: relative;
		height: 400px;
		width: 440px;
		max-width: 100%;
		overflow: hidden;
		border-radius: 24px;
		background: #fff;
		color: #18181b;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 32px -16px rgba(0, 0, 0, 0.18);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	:global(.dark) .gc,
	:global([data-theme='dark']) .gc {
		background: #18181b;
		color: #f4f4f5;
	}
	.gc__glow {
		pointer-events: none;
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		height: 60%;
		opacity: 0.09;
		background: radial-gradient(70% 90% at 50% 100%, #9150e0 0%, #3d66d6 45%, transparent 80%);
	}
	.gc__canvas {
		position: absolute;
		inset: 0;
		cursor: grab;
		touch-action: none;
	}
	.gc__canvas:active {
		cursor: grabbing;
	}
	.gc__copy {
		pointer-events: none;
		position: relative;
		padding: 24px;
	}
	.gc__title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.25;
	}
	.gc__sub {
		margin: 8px 0 0;
		font-size: 1rem;
		line-height: 1.625;
		color: #71717a;
	}
	:global(.dark) .gc__sub,
	:global([data-theme='dark']) .gc__sub {
		color: #a1a1aa;
	}
	.gc__word {
		display: inline-block;
		opacity: 0;
		transform: translateY(0.35em);
		filter: blur(6px);
		transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
			filter 0.55s cubic-bezier(0.22, 1, 0.36, 1);
		transition-delay: var(--d, 0s);
	}
	.gc__word.on {
		opacity: 1;
		transform: none;
		filter: none;
	}
	.gc.is-still .gc__word {
		opacity: 1;
		transform: none;
		filter: none;
		transition: none;
	}
	.gc__cta-wrap {
		margin-top: 20px;
		opacity: 0;
		transform: translateY(8px);
		filter: blur(4px);
		transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s,
			filter 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s;
	}
	.gc__cta-wrap.on,
	.gc.is-still .gc__cta-wrap {
		opacity: 1;
		transform: none;
		filter: none;
	}
	.gc__btn {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 40px;
		padding: 0 16px;
		border: 0;
		border-radius: 999px;
		background: rgba(36, 36, 35, 0.06);
		color: #242423;
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.2s ease, transform 0.2s ease;
	}
	.gc__btn:hover {
		background: rgba(36, 36, 35, 0.1);
	}
	.gc__btn:active {
		background: rgba(36, 36, 35, 0.14);
		transform: scale(0.97);
	}
	.gc__btn:focus-visible {
		outline: 2px solid #a1a1aa;
		outline-offset: 2px;
	}
	:global(.dark) .gc__btn,
	:global([data-theme='dark']) .gc__btn {
		background: rgba(255, 255, 255, 0.08);
		color: #f4f4f5;
	}
	:global(.dark) .gc__btn:hover,
	:global([data-theme='dark']) .gc__btn:hover {
		background: rgba(255, 255, 255, 0.12);
	}
	.gc__through {
		position: relative;
		width: 16px;
		height: 16px;
		overflow: hidden;
	}
	.gc__through .a,
	.gc__through .b {
		position: absolute;
		inset: 0;
		transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.gc__through .b {
		transform: translateX(-140%);
	}
	.gc__btn:hover .gc__through .a {
		transform: translateX(140%);
	}
	.gc__btn:hover .gc__through .b {
		transform: translateX(0);
		transition-delay: 75ms;
	}
	@media (prefers-reduced-motion: reduce) {
		.gc__word,
		.gc__cta-wrap,
		.gc__through .a,
		.gc__through .b {
			transition: none;
		}
	}
</style>
