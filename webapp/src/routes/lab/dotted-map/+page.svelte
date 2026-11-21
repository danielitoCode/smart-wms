<script lang="ts">
	/**
	 * Lab detail — DottedMap
	 */
	import DottedMap from '../../../lib/components/DottedMap.svelte';

	const hubs = [
		{ lat: 40.4168, lng: -3.7038, size: 0.55, pulse: true }, // Madrid
		{ lat: 41.3874, lng: 2.1686, size: 0.4 }, // Barcelona
		{ lat: 40.7128, lng: -74.006, size: 0.5, pulse: true }, // NYC
		{ lat: 51.5074, lng: -0.1278, size: 0.45 }, // London
		{ lat: 19.4326, lng: -99.1332, size: 0.4 }, // CDMX
		{ lat: -23.5505, lng: -46.6333, size: 0.45 }, // São Paulo
		{ lat: 35.6762, lng: 139.6503, size: 0.4 }, // Tokyo
		{ lat: 1.3521, lng: 103.8198, size: 0.35 } // Singapore
	];
</script>

<svelte:head>
	<title>DottedMap · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">DottedMap</h1>
	<p class="detail-lead">
		Mapa mundial en puntos SVG (<code>svg-dotted-map</code>) con stagger hexagonal, marcadores y pulse
		SMIL. Marker color navy Abellis. Port Svelte 5.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Hubs WMS</h2>
	<div class="detail-stage">
		<div class="dm-frame">
			<DottedMap
				width={150}
				height={75}
				mapSamples={4000}
				markers={hubs}
				pulse
				markerColor="#004c8b"
				dotColor="currentColor"
				dotRadius={0.18}
			/>
		</div>
	</div>
</section>

<style>
	.detail-intro { margin-bottom: 1.75rem; }
	.detail-back {
		display: inline-block;
		margin-bottom: 0.65rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}
	.detail-lead code {
		font-size: 0.85em;
		padding: 0.1em 0.35em;
		border-radius: 4px;
		background: color-mix(in srgb, var(--navy, #004c8b) 8%, transparent);
	}
	.detail-block { margin-bottom: 2rem; }
	.detail-h2 {
		margin: 0 0 0.75rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
	}
	.detail-stage {
		padding: 1.5rem 1rem;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
	}
	.dm-frame {
		width: 100%;
		max-width: 42rem;
		margin: 0 auto;
		aspect-ratio: 2 / 1;
		color: color-mix(in srgb, var(--slate, #5c6b7d) 55%, transparent);
	}
</style>
