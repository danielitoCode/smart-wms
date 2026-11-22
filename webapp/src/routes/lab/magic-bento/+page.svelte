<script lang="ts">
	/**
	 * Lab demo — MagicBento WMS: throughput, occupancy, cycle count,
	 * wave pipeline, connectors, access control.
	 */
	import MagicBento from '../../../lib/components/MagicBento.svelte';

	let theme = $state<'dark' | 'light'>('dark');
	let motion = $state(true);
</script>

<svelte:head>
	<title>MagicBento · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">MagicBento · WMS</h1>
	<p class="detail-lead">
		Bento grid con visuales adaptados a operación de almacén: throughput outbound, ocupación de
		bins, cycle count colaborativo, pipeline de ola (receive → ship), conectores ERP/carriers y
		control de acceso por roles/zonas. Spotlight, border glow e intro staggered.
	</p>
</section>

<div class="toolbar">
	<button type="button" class="btn" class:active={theme === 'dark'} onclick={() => (theme = 'dark')}>
		Dark
	</button>
	<button type="button" class="btn" class:active={theme === 'light'} onclick={() => (theme = 'light')}>
		Light
	</button>
	<button type="button" class="btn" class:active={motion} onclick={() => (motion = !motion)}>
		{motion ? 'Motion on' : 'Motion off'}
	</button>
</div>

<div class="stage" data-theme={theme}>
	{#key `${theme}-${motion}`}
		<MagicBento
			theme={theme}
			glowColor={theme === 'dark' ? '#c9a227' : '#004c8b'}
			intro={motion}
			disableAnimations={!motion}
			enableSpotlight={true}
			enableBorderGlow={true}
			enableTilt={false}
			columns={4}
			rowHeight={180}
			gap={12}
			radius={18}
		/>
	{/key}
</div>

<style>
	.detail-intro {
		margin-bottom: 1.25rem;
	}
	.detail-back {
		display: inline-block;
		margin-bottom: 0.65rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}
	.detail-back:hover {
		text-decoration: underline;
	}
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
		max-width: 44rem;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.btn {
		height: 2.1rem;
		padding: 0 0.85rem;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
		background: transparent;
		color: var(--navy, #004c8b);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}
	.btn.active {
		background: var(--navy, #004c8b);
		color: #fff;
		border-color: transparent;
	}

	.stage {
		max-width: 56rem;
		padding: 1rem;
		border-radius: 16px;
		background: #0f0e0c;
	}
	.stage[data-theme='light'] {
		background: #f4f5f8;
	}
</style>
