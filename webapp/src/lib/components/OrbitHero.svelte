<script lang="ts">
	/**
	 * Orbit Hero — space hero with still Earth → WebGL2 globe hand-off.
	 * No motion/framer; CSS entrance choreography.
	 */
	import { onMount } from 'svelte';
	import { startGlobe } from './orbit-globe';
	import './orbit-hero.css';

	/** Prefer local static assets; fall back to public equirectangular maps for lab demo. */
	const ART = {
		earth: '/blocx/orbit-hero/earth.webp',
		surface: '/blocx/orbit-hero/surface.webp',
		clouds: '/blocx/orbit-hero/clouds.webp',
		logo: '/blocx/orbit-hero/logo.webp',
		surfaceFallback: 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
		cloudsFallback: 'https://unpkg.com/three-globe@2.31.1/example/img/earth-clouds.png',
		earthFallback:
			'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=2000&q=80'
	};

	const NAV = [
		{ label: 'Experience', href: '#experience' },
		{ label: 'Features', href: '#features' },
		{ label: 'How It Works', href: '#how-it-works' },
		{ label: 'About', href: '#about' },
		{ label: 'Enter Orbit', href: '#enter-orbit' }
	] as const;

	const HEADLINE: { text: string; serif?: boolean; breakAfter?: boolean }[] = [
		{ text: 'Experience', serif: true },
		{ text: 'Earth' },
		{ text: 'Like', breakAfter: true },
		{ text: 'Never' },
		{ text: 'Before' }
	];

	let active = $state('#experience');
	let menuOpen = $state(false);
	let live = $state(false);
	let earthSrc = $state(ART.earth);
	let headlineEl = $state<HTMLHeadingElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);

	function scrollToAnchor(hash: string) {
		document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
	}

	function select(href: string) {
		active = href;
		scrollToAnchor(href);
		menuOpen = false;
	}

	function updateGradient() {
		const el = headlineEl;
		if (!el) return;
		el.style.setProperty('--hw', `${el.clientWidth}px`);
		el.querySelectorAll<HTMLElement>('[data-word]').forEach((w) => {
			w.style.setProperty('--x', `${w.offsetLeft}px`);
		});
	}

	onMount(() => {
		updateGradient();
		const ro = new ResizeObserver(updateGradient);
		if (headlineEl) ro.observe(headlineEl);
		document.fonts?.ready.then(updateGradient);

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && menuOpen) menuOpen = false;
		};
		window.addEventListener('keydown', onKey);

		const canvas = canvasEl;
		const ac = new AbortController();
		let handle: { destroy: () => void } | null = null;

		async function probe(url: string) {
			try {
				const r = await fetch(url, { method: 'HEAD' });
				return r.ok;
			} catch {
				return false;
			}
		}

		(async () => {
			const hasEarth = await probe(ART.earth);
			if (!hasEarth) earthSrc = ART.earthFallback;
			const hasSurf = await probe(ART.surface);
			const hasCloud = await probe(ART.clouds);
			if (!canvas) return;
			const h = await startGlobe(
				canvas,
				{
					surface: hasSurf ? ART.surface : ART.surfaceFallback,
					clouds: hasCloud ? ART.clouds : ART.cloudsFallback,
					surfaceBottomLat: -30.015,
					cloudsBottomLat: -30
				},
				() => {
					if (!ac.signal.aborted) live = true;
				},
				() => {
					if (!ac.signal.aborted) live = false;
				},
				ac.signal
			);
			if (ac.signal.aborted) h.destroy();
			else handle = h;
		})();

		return () => {
			window.removeEventListener('keydown', onKey);
			ro.disconnect();
			ac.abort();
			handle?.destroy();
		};
	});
</script>

<section id="experience" class="oh-hero" aria-labelledby="hero-title">
	<header class="oh-hero__header">
		<div class="oh-logo">
			<img
				src={ART.logo}
				alt=""
				width="50"
				height="50"
				draggable="false"
				onerror={(e) => {
					(e.currentTarget as HTMLImageElement).style.display = 'none';
				}}
			/>
		</div>

		<nav class="oh-nav-desktop" aria-label="Primary">
			<ul class="oh-nav-list">
				{#each NAV as item}
					<li>
						<a
							href={item.href}
							class="oh-nav-link"
							class:is-active={active === item.href}
							aria-current={active === item.href ? 'location' : undefined}
							onclick={(e) => {
								e.preventDefault();
								select(item.href);
							}}
						>
							{#if active === item.href}<span class="oh-br" aria-hidden="true">[</span>{/if}
							<span class="nav-text">{item.label}</span>
							{#if active === item.href}<span class="oh-br" aria-hidden="true">]</span>{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<button
			type="button"
			class="oh-menu-btn"
			class:is-open={menuOpen}
			aria-expanded={menuOpen}
			aria-controls="mobile-menu"
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span class="menu-btn__label">{menuOpen ? 'Close' : 'Menu'}</span>
			<span class="oh-menu-btn__icon" aria-hidden="true">
				<span></span>
				<span></span>
			</span>
		</button>
	</header>

	{#if menuOpen}
		<div id="mobile-menu" class="oh-menu-sheet" role="dialog" aria-label="Primary">
			<nav aria-label="Primary">
				<ul>
					{#each NAV as item}
						<li>
							<a
								href={item.href}
								class:is-active={active === item.href}
								onclick={(e) => {
									e.preventDefault();
									select(item.href);
								}}
							>
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</div>
	{/if}

	<div class="oh-hero__content">
		<p class="oh-eyebrow">No setup. No hardware. Just you and the universe.</p>

		<h1 id="hero-title" class="oh-headline" bind:this={headlineEl}>
			{#each HEADLINE as w, i (w.text)}
				<span class="headline__slot">
					<span
						data-word
						class="oh-headline__word"
						class:oh-headline__word--serif={w.serif}
						style="animation-delay: {0.55 + i * 0.085}s"
					>
						{w.text}
					</span>{' '}
					{#if w.breakAfter}<br class="oh-headline__br" />{/if}
				</span>
			{/each}
		</h1>

		<a
			href="#enter-orbit"
			class="oh-orbit-btn"
			onclick={(e) => {
				e.preventDefault();
				scrollToAnchor('#enter-orbit');
			}}
		>
			<span class="oh-orbit-btn__glow" aria-hidden="true"></span>
			<span class="oh-orbit-btn__line oh-orbit-btn__line--top" aria-hidden="true"></span>
			<span class="oh-orbit-btn__line oh-orbit-btn__line--mid" aria-hidden="true"></span>
			<span class="oh-orbit-btn__sheen" aria-hidden="true"></span>
			<span class="oh-orbit-btn__label">Enter Orbit</span>
		</a>
	</div>

	<div class="oh-earth-stage" aria-hidden="true">
		<div class="oh-earth">
			<div class="oh-earth__halo"></div>
			<img src={earthSrc} alt="" draggable="false" class="oh-earth__img" class:is-hidden={live} />
			<canvas bind:this={canvasEl} class="oh-earth__globe" class:is-live={live}></canvas>
		</div>
	</div>
</section>
