<script lang="ts">
	import ScrollSnapList, {
		DEFAULT_SERIES,
		type SeriesItem
	} from '../../../lib/components/ScrollSnapList.svelte';

	/** Demo WMS-flavoured series (ops journeys as “episodes”). */
	const wmsItems: SeriesItem[] = [
		{
			title: 'Receiving',
			color: '#22c55e',
			image: '',
			year: 'Inbound',
			character: 'Dock → QC'
		},
		{
			title: 'Putaway',
			color: '#38bdf8',
			image: '',
			year: 'Storage',
			character: 'Bin confirm'
		},
		{
			title: 'Picking',
			color: '#f59e0b',
			image: '',
			year: 'Wave',
			character: 'Batch path'
		},
		{
			title: 'Packing',
			color: '#a78bfa',
			image: '',
			year: 'Ship prep',
			character: 'Carton + label'
		},
		{
			title: 'Shipping',
			color: '#f97316',
			image: '',
			year: 'Carrier',
			character: 'Load & depart'
		},
		{
			title: 'Cycle count',
			color: '#ef4444',
			image: '',
			year: 'Inventory',
			character: 'Variance close'
		}
	];

	let mode = $state<'series' | 'wms'>('series');
	const items = $derived(mode === 'wms' ? wmsItems : DEFAULT_SERIES);
</script>

<svelte:head>
	<title>ScrollSnapList · Component Lab</title>
</svelte:head>

<div class="lab">
	<header class="lab-head">
		<a class="back" href="/lab">← Lab</a>
		<div class="toggles">
			<button
				type="button"
				class="chip"
				class:on={mode === 'series'}
				onclick={() => (mode = 'series')}
			>
				Series
			</button>
			<button type="button" class="chip" class:on={mode === 'wms'} onclick={() => (mode = 'wms')}>
				WMS ops
			</button>
		</div>
	</header>

	<main class="lab-main">
		<p class="lab-kicker">Interactive</p>
		<h1 class="lab-title">ScrollSnapList</h1>
		<p class="lab-lead">
			Lista con snap vertical, timeline y card 9:16. Scroll o click en título / pips. Demo series TV o
			flujo ops WMS.
		</p>

		<div class="lab-demo">
			{#key mode}
				<ScrollSnapList {items} />
			{/key}
		</div>
	</main>
</div>

<style>
	.lab {
		min-height: 100svh;
		margin: 0;
		padding: 1.25rem 1.25rem 3rem;
		background: #050505;
		color: #e4e4e7;
		font-family: ui-sans-serif, system-ui, sans-serif;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.lab-head {
		width: 100%;
		max-width: 960px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
		gap: 0.75rem;
	}
	.back,
	.chip {
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		font-size: 0.75rem;
		font-weight: 600;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}
	.chip.on {
		border-color: rgba(255, 255, 255, 0.28);
		background: rgba(255, 255, 255, 0.12);
	}
	.toggles {
		display: flex;
		gap: 0.4rem;
	}
	.lab-main {
		width: 100%;
		max-width: 960px;
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
		margin: 0 0 1.5rem;
		font-size: 0.95rem;
		line-height: 1.55;
		opacity: 0.7;
		max-width: 36rem;
	}
	.lab-demo {
		width: 100%;
	}
</style>
