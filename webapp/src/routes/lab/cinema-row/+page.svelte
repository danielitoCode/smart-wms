<script lang="ts">
	/**
	 * CinemaRow lab — hero WaveReveal + premieres marquee + vertical stills.
	 */
	import Marquee from '../../../lib/components/Marquee.svelte';
	import WaveReveal from '../../../lib/components/WaveReveal.svelte';

	const TMDB_POSTER = (path: string) => `https://media.themoviedb.org/t/p/w500${path}`;
	const TMDB_BACKDROP = (path: string) => `https://media.themoviedb.org/t/p/w780${path}`;

	const FEATURED = {
		eyebrow: 'Now streaming',
		title: 'Dune: Part Two',
		tagline: "Paul goes back to Arrakis. The desert hasn't forgotten him.",
		runtime: '2h 47m · Sci‑Fi',
		backdrop: TMDB_BACKDROP('/eZ239CUp1d6OryZEBPnO2n87gMG.jpg')
	};

	const HERO_TITLE_WORDS = FEATURED.title.trim().split(/\s+/).length;
	const HERO_TITLE_DELAY_MS = 100;
	const HERO_WORD_STAGGER_MS = 50;
	const HERO_WORD_DURATION_MS = 700;

	function heroSequenceDelays() {
		const titleEnd =
			HERO_TITLE_DELAY_MS +
			(HERO_TITLE_WORDS - 1) * HERO_WORD_STAGGER_MS +
			HERO_WORD_DURATION_MS;
		const ctaPrimary = titleEnd + 120;
		const ctaSecondary = titleEnd + 220;
		return {
			eyebrow: 0,
			title: HERO_TITLE_DELAY_MS,
			tagline: titleEnd - 220,
			runtime: titleEnd - 40,
			ctaPrimary,
			ctaSecondary,
			premieresLabel: ctaSecondary + 140,
			premieresMeta: ctaSecondary + 220,
			premieresRail: ctaSecondary + 260
		};
	}

	const delays = heroSequenceDelays();

	const STILLS_LEFT = [
		{ title: 'Anora', image: TMDB_BACKDROP('/qvyOfwTC3qdbzkqdXWSSEMHtjBZ.jpg') },
		{ title: 'Challengers', image: TMDB_BACKDROP('/tq8COKsI99Bivjd4CZIYVGoKcIx.jpg') },
		{ title: 'The Substance', image: TMDB_BACKDROP('/8ODNt5olCeIqBYTP3GgXEQYTfeX.jpg') },
		{ title: 'Everything Everywhere', image: TMDB_BACKDROP('/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg') },
		{ title: 'Poor Things', image: TMDB_BACKDROP('/zh6IdheEYinU4TPtorWsjx6qPQE.jpg') },
		{ title: 'The Batman', image: TMDB_BACKDROP('/rvtdN5XkWAfGX6xDuPL6yYS2seK.jpg') }
	] as const;

	const STILLS_RIGHT = [
		{ title: 'Top Gun: Maverick', image: TMDB_BACKDROP('/AaV1YIdWKnjAIAOe8UUKBFm327v.jpg') },
		{ title: 'Banshees of Inisherin', image: TMDB_BACKDROP('/1vXD5HXqkhvsXFHE7KmCPZGPR1e.jpg') },
		{ title: 'Sinners', image: TMDB_BACKDROP('/nAxGnGHOsfzufThz20zgmRwKur3.jpg') },
		{ title: 'Oppenheimer', image: TMDB_BACKDROP('/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg') },
		{ title: 'Interstellar', image: TMDB_BACKDROP('/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg') },
		{ title: 'Mad Max: Fury Road', image: TMDB_BACKDROP('/uT895WNwm0aIJRtGizcQhrejWUo.jpg') }
	] as const;

	const PREMIERES = [
		{ title: 'Sinners', genre: 'Horror', poster: TMDB_POSTER('/fWPgbnt2LSqkQ6cdQc0SZN9CpLm.jpg') },
		{ title: 'Anora', genre: 'Drama', poster: TMDB_POSTER('/oN0o3owobFjePDc5vMdLRAd0jkd.jpg') },
		{ title: 'Challengers', genre: 'Drama', poster: TMDB_POSTER('/H6vke7zGiuLsz4v4RPeReb9rsv.jpg') },
		{ title: 'The Substance', genre: 'Horror', poster: TMDB_POSTER('/lqoMzCcZYEFK729d6qzt349fB4o.jpg') },
		{ title: 'Oppenheimer', genre: 'Biography', poster: TMDB_POSTER('/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg') },
		{
			title: 'Everything Everywhere All at Once',
			genre: 'Sci‑Fi',
			poster: TMDB_POSTER('/u68AjlvlutfEIcpmbYpKcdi09ut.jpg')
		},
		{ title: 'Parasite', genre: 'Thriller', poster: TMDB_POSTER('/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg') },
		{
			title: 'Spider-Man: Across the Spider-Verse',
			genre: 'Animation',
			poster: TMDB_POSTER('/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg')
		},
		{ title: 'Blade Runner 2049', genre: 'Sci‑Fi', poster: TMDB_POSTER('/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg') },
		{ title: 'Interstellar', genre: 'Sci‑Fi', poster: TMDB_POSTER('/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg') },
		{ title: 'Poor Things', genre: 'Comedy', poster: TMDB_POSTER('/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg') },
		{ title: 'Mad Max: Fury Road', genre: 'Action', poster: TMDB_POSTER('/hA2ple9q4qnwxp3hKVNhroipsir.jpg') }
	] as const;

	let reducedMotion = $state(false);

	$effect(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		const apply = () => {
			reducedMotion = mq.matches;
		};
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});
</script>

<svelte:head>
	<title>CinemaRow · Component Lab</title>
</svelte:head>



<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">CinemaRow</h1>
	<p class="detail-lead">
		Hero con WaveReveal + CTAs staggered, rail de premieres (Marquee) y dos columnas verticales de
		stills. Respeta prefers-reduced-motion.
	</p>
</section>

<div class="page">
	<section class="hero">
		<div class="hero-glow" aria-hidden="true"></div>
		<div class="hero-fade" aria-hidden="true"></div>

		<div class="cinema-content hero-copy">
			{#if reducedMotion}
				<p class="eyebrow">{FEATURED.eyebrow}</p>
				<h1 class="title-static">{FEATURED.title}</h1>
				<p class="tagline">{FEATURED.tagline}</p>
				<p class="runtime">{FEATURED.runtime}</p>
				<div class="ctas">
					<button type="button" class="btn-primary">
						<svg class="play" viewBox="0 0 24 24" aria-hidden="true"
							><path fill="currentColor" d="M8 5v14l11-7z" /></svg
						>
						Play
					</button>
					<button type="button" class="btn-ghost">Add to Up Next</button>
				</div>
			{:else}
				<p class="eyebrow cinema-hero-rise" style="animation-delay: {delays.eyebrow}ms">
					{FEATURED.eyebrow}
				</p>
				<h1 class="title-wrap">
					<WaveReveal
						text={FEATURED.title}
						mode="word"
						direction="up"
						blur={true}
						duration={`${HERO_WORD_DURATION_MS}ms`}
						delay={delays.title}
						class="title-wave"
					/>
				</h1>
				<p class="tagline cinema-hero-rise" style="animation-delay: {delays.tagline}ms">
					{FEATURED.tagline}
				</p>
				<p class="runtime cinema-hero-rise" style="animation-delay: {delays.runtime}ms">
					{FEATURED.runtime}
				</p>
				<div class="ctas">
					<button
						type="button"
						class="btn-primary cinema-hero-rise"
						style="animation-delay: {delays.ctaPrimary}ms"
					>
						<svg class="play" viewBox="0 0 24 24" aria-hidden="true"
							><path fill="currentColor" d="M8 5v14l11-7z" /></svg
						>
						Play
					</button>
					<button
						type="button"
						class="btn-ghost cinema-hero-rise"
						style="animation-delay: {delays.ctaSecondary}ms"
					>
						Add to Up Next
					</button>
				</div>
			{/if}
		</div>
	</section>

	<section class="premieres" aria-labelledby="premieres-heading">
		<div class="cinema-content premieres-head">
			<h2
				id="premieres-heading"
				class="premieres-title"
				class:cinema-hero-rise={!reducedMotion}
				style={reducedMotion ? undefined : `animation-delay: ${delays.premieresLabel}ms`}
			>
				Premieres
			</h2>
			<span
				class="premieres-meta"
				class:cinema-hero-rise={!reducedMotion}
				style={reducedMotion ? undefined : `animation-delay: ${delays.premieresMeta}ms`}
			>
				Now playing
			</span>
		</div>

		<div
			class:cinema-hero-rise={!reducedMotion}
			style={reducedMotion ? undefined : `animation-delay: ${delays.premieresRail}ms`}
		>
			{#if reducedMotion}
				<div class="cinema-content premieres-static">
					{#each PREMIERES as film}
						<article class="poster">
							<div class="poster-frame">
								<img src={film.poster} alt="{film.title} poster" loading="lazy" decoding="async" />
							</div>
							<h3 class="poster-title">{film.title}</h3>
							<p class="poster-genre">{film.genre}</p>
						</article>
					{/each}
				</div>
			{:else}
				<div class="premieres-mask">
					<Marquee duration={38} pauseOnHover={true} fade={false} class="premieres-mq">
						{#each PREMIERES as film}
							<article class="poster">
								<div class="poster-frame">
									<img
										src={film.poster}
										alt="{film.title} poster"
										loading="lazy"
										decoding="async"
									/>
								</div>
								<h3 class="poster-title">{film.title}</h3>
								<p class="poster-genre">{film.genre}</p>
							</article>
						{/each}
					</Marquee>
				</div>
			{/if}
		</div>
	</section>

	<section class="editorial" aria-labelledby="editorial-heading">
		<div class="cinema-content">
			<div class="craft">
				<div class="craft-copy">
					<p class="craft-kicker">The craft</p>
					<h2 id="editorial-heading" class="craft-title">
						Built for the big screen. Fine on your couch.
					</h2>
					<p class="craft-body">
						Hero, poster row, two still columns — same page, different speeds.
					</p>
				</div>
				<div class="craft-stills">
					{#if reducedMotion}
						<div class="still-col still-col--violet">
							{#each STILLS_LEFT.slice(0, 3) as still}
								<figure class="still still--wide">
									<img src={still.image} alt="{still.title} still" loading="lazy" />
									<div class="still-grad"></div>
									<figcaption>{still.title}</figcaption>
								</figure>
							{/each}
						</div>
						<div class="still-col still-col--amber">
							{#each STILLS_RIGHT.slice(0, 3) as still}
								<figure class="still still--tall">
									<img src={still.image} alt="{still.title} still" loading="lazy" />
									<div class="still-grad"></div>
									<figcaption>{still.title}</figcaption>
								</figure>
							{/each}
						</div>
					{:else}
						<div class="still-col still-col--violet">
							<Marquee vertical={true} duration={32} pauseOnHover={true} fade={false} class="still-mq">
								{#each STILLS_LEFT as still}
									<figure class="still still--wide">
										<img src={still.image} alt="{still.title} still" loading="lazy" />
										<div class="still-grad"></div>
										<figcaption>{still.title}</figcaption>
									</figure>
								{/each}
							</Marquee>
						</div>
						<div class="still-col still-col--amber">
							<Marquee
								vertical={true}
								reverse={true}
								duration={38}
								pauseOnHover={true}
								fade={false}
								class="still-mq"
							>
								{#each STILLS_RIGHT as still}
									<figure class="still still--tall">
										<img src={still.image} alt="{still.title} still" loading="lazy" />
										<div class="still-grad"></div>
										<figcaption>{still.title}</figcaption>
									</figure>
								{/each}
							</Marquee>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>
</div>

<style>

	@keyframes cinema-hero-rise {
		from {
			opacity: 0;
			transform: translateY(14px);
			filter: blur(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
			filter: blur(0);
		}
	}

	:global(.cinema-hero-rise) {
		animation: cinema-hero-rise 580ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.cinema-hero-rise) {
			animation: none !important;
			opacity: 1 !important;
			filter: none !important;
			transform: none !important;
		}
	}


	.detail-intro { margin-bottom: 1.25rem; }
	.detail-back {
		display: inline-block; margin-bottom: 0.65rem; font-size: 0.8125rem; font-weight: 600;
		color: var(--navy, #004c8b); text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem); font-weight: 700; letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0; max-width: 42rem; font-size: 0.95rem; line-height: 1.55; color: var(--slate, #5c6b7d);
	}

	.page {
		margin: 0 -0.25rem; border-radius: 14px; overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 40%, transparent);
		background: #000; color: #fff; font-family: 'Inter', system-ui, sans-serif;
	}

	.cinema-content {
		margin-inline: auto; width: 100%; max-width: 80rem; padding-inline: 1.25rem;
	}
	@media (min-width: 640px) {
		.cinema-content { padding-inline: 2rem; }
	}

	.hero {
		position: relative; isolation: isolate; overflow: hidden;
		min-height: min(88svh, 920px); display: flex; flex-direction: column; justify-content: flex-end;
	}
	.hero-glow {
		position: absolute; inset: 0; pointer-events: none;
		background:
			radial-gradient(ellipse 120% 80% at 50% -10%, oklch(0.28 0.08 280 / 0.55) 0%, transparent 58%),
			linear-gradient(to bottom, oklch(0.12 0.02 280) 0%, #000 72%);
	}
	.hero-fade {
		position: absolute; inset-inline: 0; bottom: 0; height: 10rem; pointer-events: none;
		background: linear-gradient(to top, #000, transparent);
	}
	.hero-copy {
		position: relative; z-index: 1;
		padding-bottom: 3.5rem; padding-top: max(1.25rem, env(safe-area-inset-top));
	}

	.eyebrow {
		margin: 0; font-size: 13px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
		color: color-mix(in srgb, #fff 45%, transparent);
	}
	.title-static {
		margin: 0.75rem 0 0; max-width: 11ch;
		font-size: clamp(3.25rem, 14vw, 7.5rem); line-height: 0.9; font-weight: 600; letter-spacing: -0.045em;
	}
	.title-wrap { margin: 0.75rem 0 0; line-height: 0.9; }
	.title-wrap :global(.title-wave) {
		justify-content: flex-start; padding: 0;
		font-size: clamp(3.25rem, 14vw, 7.5rem); font-weight: 600; letter-spacing: -0.02em;
		transform: translateX(-0.13ex);
	}
	.tagline {
		margin: 1.25rem 0 0; max-width: 28ch; font-size: 17px; line-height: 1.35;
		color: color-mix(in srgb, #fff 58%, transparent);
	}
	@media (min-width: 640px) { .tagline { font-size: 19px; } }
	.runtime {
		margin: 0.75rem 0 0; font-size: 13px; color: color-mix(in srgb, #fff 38%, transparent);
	}
	.ctas { margin-top: 2rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
	.btn-primary, .btn-ghost {
		display: inline-flex; height: 2.75rem; align-items: center; justify-content: center; gap: 0.5rem;
		border-radius: 999px; padding: 0 1.5rem; font-size: 14px; font-weight: 600; border: none;
		cursor: pointer; touch-action: manipulation;
		transition: transform 120ms ease, background 150ms ease;
	}
	.btn-primary { background: #fff; color: #000; }
	.btn-primary:active { transform: scale(0.98); }
	.btn-ghost {
		font-weight: 500; color: color-mix(in srgb, #fff 78%, transparent);
		border: 1px solid color-mix(in srgb, #fff 18%, transparent);
		background: color-mix(in srgb, #fff 4%, transparent);
	}
	.btn-ghost:hover { background: color-mix(in srgb, #fff 8%, transparent); }
	.btn-ghost:active { transform: scale(0.98); }
	.play { width: 1rem; height: 1rem; }

	.premieres { padding: 2rem 0 1.5rem; }
	.premieres-head {
		margin-bottom: 1rem; display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem;
	}
	.premieres-title { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
	.premieres-meta { font-size: 13px; color: color-mix(in srgb, #fff 38%, transparent); }
	.premieres-mask {
		overflow: hidden;
		mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
		-webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
	}
	.premieres-mq { padding: 0.25rem 0 0.25rem 1.25rem; --gap: 1rem; }
	@media (min-width: 640px) {
		.premieres-mq { padding-left: 2rem; --gap: 1.25rem; }
	}
	.premieres-static {
		display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: none;
	}
	.premieres-static::-webkit-scrollbar { display: none; }

	.poster { width: 9.75rem; flex-shrink: 0; }
	@media (min-width: 640px) { .poster { width: 11.25rem; } }
	.poster-frame {
		aspect-ratio: 2 / 3; overflow: hidden; border-radius: 0.75rem;
		box-shadow: 0 0 0 1px color-mix(in srgb, #fff 10%, transparent);
	}
	.poster-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.poster-title {
		margin: 0.625rem 0 0; font-size: 15px; font-weight: 500;
		color: color-mix(in srgb, #fff 92%, transparent);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.poster-genre { margin: 0; font-size: 13px; color: color-mix(in srgb, #fff 42%, transparent); }

	.editorial {
		border-top: 1px solid color-mix(in srgb, #fff 6%, transparent); padding: 4rem 0;
	}
	@media (min-width: 640px) { .editorial { padding: 6rem 0; } }
	.craft {
		overflow: hidden; border-radius: 1.35rem;
		border: 1px solid color-mix(in srgb, #fff 10%, transparent);
		background: oklch(0.12 0.025 285);
		box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.05);
		display: grid;
	}
	@media (min-width: 768px) { .craft { grid-template-columns: 1fr auto; } }
	.craft-copy {
		display: flex; flex-direction: column; justify-content: flex-end; gap: 0.75rem;
		padding: 1.25rem; border-bottom: 1px solid color-mix(in srgb, #fff 8%, transparent);
	}
	@media (min-width: 640px) { .craft-copy { padding: 1.5rem; } }
	@media (min-width: 768px) {
		.craft-copy {
			border-bottom: 0; border-right: 1px solid color-mix(in srgb, #fff 8%, transparent);
			padding: 1.5rem 2rem;
		}
	}
	.craft-kicker {
		margin: 0; font-size: 13px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
		color: color-mix(in srgb, #fff 42%, transparent);
	}
	.craft-title {
		margin: 0; font-size: clamp(1.5rem, 4.5cqi, 2.25rem); line-height: 1.08; font-weight: 600;
		letter-spacing: -0.03em; text-wrap: balance;
	}
	.craft-body {
		margin: 0; font-size: 14px; line-height: 1.55; color: color-mix(in srgb, #fff 52%, transparent);
	}
	@media (min-width: 640px) { .craft-body { font-size: 15px; } }

	.craft-stills {
		display: flex; justify-content: space-evenly; gap: 0.5rem;
		min-height: 18rem; max-height: 18rem; padding: 0 1rem;
	}
	@media (min-width: 768px) {
		.craft-stills { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	}

	.still-col {
		position: relative; min-height: 18rem; overflow: hidden; max-width: fit-content; width: 100%;
	}
	.still-col--violet { background: oklch(0.14 0.03 285); }
	.still-col--amber { background: oklch(0.15 0.028 55); }
	.still-mq { height: 100%; --gap: 12px; }

	.still {
		position: relative; width: 100%; max-width: 12rem; flex-shrink: 0; overflow: hidden; margin: 0;
	}
	.still--wide { aspect-ratio: 16 / 9; }
	.still--tall { aspect-ratio: 5 / 3; }
	.still img {
		width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 700ms ease-out;
	}
	.still:hover img { transform: scale(1.04); }
	.still-grad {
		pointer-events: none; position: absolute; inset: 0;
		background: linear-gradient(to top, rgb(0 0 0 / 0.75), rgb(0 0 0 / 0.1), transparent);
	}
	.still figcaption {
		position: absolute; inset-inline: 0; bottom: 0; padding: 0 0.75rem 0.625rem;
		font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
		color: color-mix(in srgb, #fff 88%, transparent);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
</style>
