<script lang="ts">
	/**
	 * Lab demo — FlowingMenu WMS: ops navigation with hover marquee band.
	 */
	import FlowingMenu, { type FlowingMenuItem } from '../../../lib/components/FlowingMenu.svelte';

	const WMS_ITEMS: FlowingMenuItem[] = [
		{
			text: 'Receiving',
			marquee: 'Receiving · ASN · Dock doors · Put-away queue',
			meta: '01',
			image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80'
		},
		{
			text: 'Putaway',
			marquee: 'Putaway · Directed · Zone B · Scan confirm',
			meta: '02',
			image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=400&q=80'
		},
		{
			text: 'Picking',
			marquee: 'Picking · Wave 4821 · Batch · Cart path',
			meta: '03',
			image: 'https://images.unsplash.com/photo-1605745341112-859dfc6bc4e9?auto=format&fit=crop&w=400&q=80'
		},
		{
			text: 'Packing',
			marquee: 'Packing · Verify · Carton · Label print',
			meta: '04',
			image: 'https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?auto=format&fit=crop&w=400&q=80'
		},
		{
			text: 'Shipping',
			marquee: 'Shipping · Carrier handoff · BOL · Gate 3',
			meta: '05',
			image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=400&q=80'
		},
		{
			text: 'Inventory',
			marquee: 'Inventory · Cycle count · Adjustments · Zones',
			meta: '06',
			image: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=400&q=80'
		}
	];

	let theme = $state<'dark' | 'light'>('dark');
	let showIndex = $state(true);
	let showArrow = $state(true);
	let dimInactive = $state(true);
	let direction = $state<'left' | 'right' | 'alternate'>('alternate');
	let carryContent = $state(false);
	let lastClick = $state<string | null>(null);

	const colors = $derived(
		theme === 'dark'
			? {
					textColor: '#f4f4f5',
					bgColor: '#0f1011',
					marqueeBgColor: '#c9a227',
					marqueeTextColor: '#14110e',
					borderColor: 'rgba(255,255,255,0.12)'
				}
			: {
					textColor: '#0f1011',
					bgColor: '#f4f5f8',
					marqueeBgColor: '#004c8b',
					marqueeTextColor: '#ffffff',
					borderColor: 'rgba(15,16,17,0.1)'
				}
	);
</script>

<svelte:head>
	<title>FlowingMenu · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">FlowingMenu · WMS</h1>
	<p class="detail-lead">
		Menú de operaciones de almacén: band marquee al hover con spring, magnet al cursor, intro
		staggered y direcciones alternate. Datos orientados a receiving → shipping.
	</p>
</section>

<div class="toolbar">
	<button type="button" class="btn" class:active={theme === 'dark'} onclick={() => (theme = 'dark')}>
		Dark
	</button>
	<button type="button" class="btn" class:active={theme === 'light'} onclick={() => (theme = 'light')}>
		Light
	</button>
	<button type="button" class="btn" class:active={showIndex} onclick={() => (showIndex = !showIndex)}>
		Index
	</button>
	<button type="button" class="btn" class:active={showArrow} onclick={() => (showArrow = !showArrow)}>
		Arrow
	</button>
	<button type="button" class="btn" class:active={dimInactive} onclick={() => (dimInactive = !dimInactive)}>
		Dim
	</button>
	<button
		type="button"
		class="btn"
		class:active={direction === 'alternate'}
		onclick={() =>
			(direction = direction === 'left' ? 'right' : direction === 'right' ? 'alternate' : 'left')}
	>
		Dir: {direction}
	</button>
	<button type="button" class="btn" class:active={carryContent} onclick={() => (carryContent = !carryContent)}>
		Carry
	</button>
</div>

{#if lastClick}
	<p class="click-hint">Clicked: <strong>{lastClick}</strong></p>
{/if}

<div class="stage" data-theme={theme}>
	{#key `${theme}-${direction}-${carryContent}-${showIndex}-${showArrow}-${dimInactive}`}
		<div class="frame">
			<FlowingMenu
				items={WMS_ITEMS}
				{...colors}
				{direction}
				{showIndex}
				{showArrow}
				{dimInactive}
				{carryContent}
				speed={72}
				followCursor={0.45}
				stretch={0.55}
				magnet={0.28}
				bandInset={4}
				bandRadius={10}
				imageShape="pill"
				intro={true}
				ariaLabel="Warehouse operations"
				onItemClick={(item) => {
					lastClick = item.text;
				}}
			/>
		</div>
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
		margin-bottom: 0.75rem;
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

	.click-hint {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}

	.stage {
		max-width: 48rem;
		border-radius: 16px;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
	}
	.frame {
		height: min(72vh, 640px);
		min-height: 420px;
	}
</style>
