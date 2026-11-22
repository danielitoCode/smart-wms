<script lang="ts">
	import SpeedDial, {
		type SpeedDialAction,
		type SpeedDialDirection
	} from '../../../lib/components/SpeedDial.svelte';

	let last = $state<string | null>(null);

	const actions: SpeedDialAction[] = [
		{ key: 'copy', label: 'Copy', icon: 'copy', action: () => (last = 'Copy') },
		{ key: 'edit', label: 'Edit', icon: 'edit', action: () => (last = 'Edit') },
		{ key: 'share', label: 'Share', icon: 'share', action: () => (last = 'Share') },
		{ key: 'delete', label: 'Delete', icon: 'delete', action: () => (last = 'Delete') }
	];

	const dirs: SpeedDialDirection[] = ['up', 'down', 'left', 'right'];
</script>

<svelte:head>
	<title>SpeedDial · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">SpeedDial</h1>
	<p class="detail-lead">
		FAB + menú de acciones con entrada staggered por dirección. Teclado (flechas / Esc / Home / End),
		click fuera cierra.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Directions</h2>
	<div class="detail-stage grid">
		{#each dirs as dir}
			<div class="cell">
				<span class="cell-label">{dir}</span>
				<div class="cell-pad" data-pad={dir}>
					<SpeedDial direction={dir} actionButtons={actions} />
				</div>
			</div>
		{/each}
	</div>
	{#if last}
		<p class="last">Última acción: <strong>{last}</strong></p>
	{/if}
</section>

<style>
	.detail-intro {
		margin-bottom: 1.75rem;
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
		max-width: 42rem;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}
	.detail-block {
		margin-bottom: 2rem;
	}
	.detail-h2 {
		margin: 0 0 0.75rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
	}
	.detail-stage {
		padding: 1.5rem;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
	}
	.grid {
		display: grid;
		gap: 1.25rem;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	}
	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}
	.cell-label {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}
	.cell-pad {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 11rem;
		min-width: 9rem;
		width: 100%;
		border-radius: 12px;
		background: color-mix(in srgb, var(--bg, #edf2f8) 70%, transparent);
	}
	.cell-pad[data-pad='up'] {
		align-items: flex-end;
		padding-bottom: 1.25rem;
	}
	.cell-pad[data-pad='down'] {
		align-items: flex-start;
		padding-top: 1.25rem;
	}
	.cell-pad[data-pad='left'] {
		justify-content: flex-end;
		padding-right: 1.25rem;
	}
	.cell-pad[data-pad='right'] {
		justify-content: flex-start;
		padding-left: 1.25rem;
	}
	.last {
		margin: 1rem 0 0;
		font-size: 0.875rem;
		color: var(--slate, #5c6b7d);
	}
</style>
