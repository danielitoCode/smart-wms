<script lang="ts">
	/**
	 * Lab demo — BranchedMenu: tree nav with SVG branch lines and draw accent.
	 */
	import BranchedMenu from '../../../lib/components/BranchedMenu.svelte';
	import type { BranchedMenuItem } from '../../../lib/components/BranchedMenu.svelte';

	const WMS_ITEMS: BranchedMenuItem[] = [
		{
			label: 'Inbound',
			children: [
				{ value: 'receiving', label: 'Receiving' },
				{ value: 'putaway', label: 'Putaway' },
				{ value: 'cycle-count', label: 'Cycle count' }
			]
		},
		{
			label: 'Outbound',
			children: [
				{ value: 'picking', label: 'Picking' },
				{ value: 'packing', label: 'Packing' },
				{ value: 'shipping', label: 'Shipping' },
				{ value: 'wave', label: 'Wave release' }
			]
		},
		{
			label: 'Masters',
			children: [
				{ value: 'items', label: 'Items' },
				{ value: 'warehouses', label: 'Warehouses' },
				{ value: 'bins', label: 'Bins & zones' }
			]
		}
	];

	let theme = $state<'dark' | 'light'>('dark');
	let lastSelect = $state('—');
	let lastToggle = $state('—');

	const colors = $derived(
		theme === 'dark'
			? { color: '#F5EFE9', accent: '#C9A227', line: '#6B5E52' }
			: { color: '#012A50', accent: '#004C8B', line: '#9AA8B8' }
	);
</script>

<svelte:head>
	<title>BranchedMenu · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">BranchedMenu · WMS</h1>
	<p class="detail-lead">
		Árbol de navegación con tronco y ramas SVG: fold animado, trazo de acento al seleccionar y
		marcador de sección. Datos orientados a inbound → outbound → masters.
	</p>
</section>

<div class="toolbar">
	<button type="button" class="btn" class:active={theme === 'dark'} onclick={() => (theme = 'dark')}>
		Dark
	</button>
	<button type="button" class="btn" class:active={theme === 'light'} onclick={() => (theme = 'light')}>
		Light
	</button>
</div>

<div class="stage" data-theme={theme}>
	{#key theme}
		<BranchedMenu
			items={WMS_ITEMS}
			defaultOpen={[0, 1]}
			defaultActive="receiving"
			color={colors.color}
			accentColor={colors.accent}
			lineColor={colors.line}
			width={260}
			onSelect={(value) => (lastSelect = value)}
			onToggle={(i, open) => (lastToggle = `${i}: ${open ? 'open' : 'closed'}`)}
		/>
	{/key}
</div>

<p class="hint">
	Select: <strong>{lastSelect}</strong>
	· Toggle: <strong>{lastToggle}</strong>
</p>

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
		margin-bottom: 1.25rem;
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
		display: flex;
		min-height: 22rem;
		align-items: flex-start;
		justify-content: flex-start;
		padding: 1.5rem 1.75rem;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		background: #1a1612;
	}
	.stage[data-theme='light'] {
		background: #f4f6f9;
	}

	.hint {
		margin: 0.85rem 0 0;
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}
	.hint strong {
		color: var(--head-ink, #012a50);
		font-weight: 600;
	}
</style>
