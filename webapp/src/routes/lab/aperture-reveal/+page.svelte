<script lang="ts">
	import ApertureReveal from '../../../lib/components/ApertureReveal.svelte';

	const NIGHT =
		'--aperture-ground:#0d0e12;--aperture-ink:#e9e7e1;--aperture-opening:#1d1f26';

	const route = [
		{ value: '6.2 km', label: 'Trailhead to lookout' },
		{ value: '840 m', label: 'Climbing, mostly in the first hour' },
		{ value: '2 h 40', label: 'At an easy, talking pace' }
	];
</script>

<svelte:head>
	<title>ApertureReveal · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">ApertureReveal</h1>
	<p class="detail-lead">
		Scroll section: la imagen se abre con un diafragma circular. Headline Lead + Opening + Trail,
		caption y hint.
	</p>
</section>

<div class="page">
	<ApertureReveal length={2.6} style={NIGHT}>
		{#snippet media()}
			<img
				src="https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2400&q=80"
				alt="Snow-covered mountain under a clear night sky full of stars"
				decoding="async"
			/>
		{/snippet}
		{#snippet lead()}Start in the dark,{/snippet}
		{#snippet trail()}under the ridge{/snippet}
		{#snippet caption()}
			Headlamps on at ten past four. The first hour climbs through pine on a wide path, so you can
			walk it half awake while the stars are still out.
		{/snippet}
		{#snippet hint()}Scroll{/snippet}
	</ApertureReveal>

	<section class="route" aria-labelledby="route-title">
		<h2 id="route-title" class="route-title">
			One route, walked slowly enough to watch the light arrive.
		</h2>
		<dl class="route-grid">
			{#each route as item}
				<div class="route-cell">
					<dt class="route-label">{item.label}</dt>
					<dd class="route-value">{item.value}</dd>
				</div>
			{/each}
		</dl>
	</section>

	<ApertureReveal length={3}>
		{#snippet media()}
			<img
				src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=80"
				alt="Snow-capped mountains above a forested valley and a braided river"
				decoding="async"
			/>
		{/snippet}
		{#snippet lead()}Leave early,{/snippet}
		{#snippet trail()}arrive at first light{/snippet}
		{#snippet caption()}
			Reach the lookout as the valley fills with light, stop for breakfast at the hut, and be back
			at the trailhead before the afternoon heat.
		{/snippet}
		{#snippet action()}
			<a href="/lab">Back to lab</a>
		{/snippet}
	</ApertureReveal>

	<footer class="end">End of route</footer>
</div>

<style>
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
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 70%, transparent);
	}

	.route {
		margin: 0 auto; width: 100%; max-width: 72rem; padding: 7rem 1.5rem;
		background: #0d0e12; color: #e9e7e1;
	}
	@media (min-width: 640px) {
		.route { padding: 10rem 2.5rem; }
	}
	.route-title {
		margin: 0; max-width: 18ch; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.75rem, 4vw, 3rem); font-weight: 600; line-height: 1.02; letter-spacing: -0.035em;
	}
	.route-grid {
		margin: 4rem 0 0; display: grid; gap: 0;
		border-top: 1px solid color-mix(in srgb, #fff 10%, transparent);
	}
	@media (min-width: 640px) {
		.route-grid { grid-template-columns: repeat(3, 1fr); }
	}
	.route-cell {
		display: flex; flex-direction: column; gap: 0.75rem; padding: 1.5rem 0;
		border-bottom: 1px solid color-mix(in srgb, #fff 10%, transparent);
	}
	@media (min-width: 640px) {
		.route-cell {
			padding: 0.25rem 2rem; border-bottom: 0;
			border-right: 1px solid color-mix(in srgb, #fff 10%, transparent);
		}
		.route-cell:first-child { padding-left: 0; }
		.route-cell:last-child { border-right: 0; }
	}
	.route-label {
		order: 2; margin: 0; font-size: 0.875rem; line-height: 1.35;
		color: color-mix(in srgb, #e9e7e1 60%, transparent);
	}
	.route-value {
		order: 1; margin: 0; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(2.25rem, 5vw, 3.75rem); font-weight: 600; line-height: 1;
		letter-spacing: -0.04em; font-variant-numeric: tabular-nums;
	}

	.end {
		display: flex; min-height: min(24svh, 200px); align-items: center; justify-content: center;
		background: #ebe9e4; padding: 2.5rem 1.5rem 4rem; font-size: 0.875rem;
		color: color-mix(in srgb, #141413 50%, transparent);
	}
</style>
