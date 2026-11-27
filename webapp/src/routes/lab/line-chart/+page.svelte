<script lang="ts">
	import LineChart, { type LineChartSeries } from '../../../lib/components/LineChart.svelte';

	const categories = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

	const series: LineChartSeries[] = [
		{ id: 'inbound', name: 'Receiving', color: '#0ea5e9', values: [42, 55, 48, 61, 58, 35, 28] },
		{ id: 'pick', name: 'Picking', color: '#10b981', values: [38, 44, 52, 49, 63, 40, 31] },
		{ id: 'ship', name: 'Shipping', color: '#f59e0b', values: [30, 36, 41, 47, 55, 33, 25] }
	];

	let status: 'ready' | 'loading' = $state('ready');
	let variant: 'line' | 'area' = $state('area');
</script>

<svelte:head>
	<title>LineChart · Component Lab</title>
</svelte:head>

<div class="lab">
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
	</header>
	<main class="lab-main">
		<p class="lab-kicker">Charts · SVG</p>
		<h1 class="lab-title">LineChart</h1>
		<p class="lab-lead">
			Throughput semanal WMS: multi-serie line/area, crosshair, tooltip, leyenda con toggle y tabla
			accesible. Estilo beUI, sin motion/react.
		</p>

		<div class="lab-tools">
			<button type="button" class:is-on={variant === 'area'} onclick={() => (variant = 'area')}>Area</button>
			<button type="button" class:is-on={variant === 'line'} onclick={() => (variant = 'line')}>Line</button>
			<button
				type="button"
				onclick={() => {
					status = 'loading';
					setTimeout(() => (status = 'ready'), 1200);
				}}>Simular loading</button
			>
		</div>

		<div class="lab-card">
			<LineChart
				{series}
				{categories}
				{variant}
				{status}
				label="Weekly warehouse throughput"
				formatValue={(v) => `${v} orders`}
				height={300}
			/>
		</div>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh;
		margin: 0;
		padding: 1.25rem 1.25rem 3rem;
		background: #f4f4f5;
		color: #18181b;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.lab-head {
		max-width: 52rem;
		margin: 0 auto 1.25rem;
	}
	.back {
		display: inline-block;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(24, 24, 27, 0.12);
		background: rgba(24, 24, 27, 0.04);
		font-size: 0.75rem;
		font-weight: 600;
		color: inherit;
		text-decoration: none;
	}
	.lab-main {
		max-width: 52rem;
		margin: 0 auto;
	}
	.lab-kicker {
		margin: 0 0 0.35rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		opacity: 0.55;
	}
	.lab-title {
		margin: 0 0 0.5rem;
		font-size: clamp(1.4rem, 3vw, 1.85rem);
		font-weight: 700;
		letter-spacing: -0.03em;
	}
	.lab-lead {
		margin: 0 0 1.25rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.7;
	}
	.lab-tools {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 1rem;
	}
	.lab-tools button {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(24, 24, 27, 0.12);
		background: #fff;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}
	.lab-tools button.is-on {
		background: #18181b;
		color: #fff;
		border-color: #18181b;
	}
	.lab-card {
		padding: 1.25rem;
		border-radius: 16px;
		background: #fff;
		border: 1px solid rgba(24, 24, 27, 0.08);
		box-shadow: 0 8px 24px -12px rgb(0 0 0 / 0.12);
	}
</style>
