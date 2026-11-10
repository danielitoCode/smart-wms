<script lang="ts">
	import { onMount } from 'svelte';
	import { createPickingState } from '../state/pickingState.svelte';

	const state = createPickingState();

	onMount(() => {
		void state.refresh();
	});

	function onConfirm(event: Event) {
		event.preventDefault();
		void state.confirm();
	}

	function onWave(event: Event) {
		event.preventDefault();
		void state.createWave();
	}
</script>

<section class="page">
	<header>
		<h1>Picking</h1>
		<p class="subtitle">Wave create, batch activo y siguiente tarea</p>
	</header>

	<section class="wave">
		<h2>Crear wave</h2>
		<p class="meta">POST /api/picking/wave-create — so_ids + warehouse_id</p>
		<form class="wave-form" onsubmit={onWave}>
			<label>
				Warehouse ID
				<input
					type="number"
					min="1"
					value={state.warehouseId}
					oninput={(e) => state.setWarehouseId(Number(e.currentTarget.value))}
					disabled={state.busy}
				/>
			</label>
			<label class="grow">
				SO IDs
				<input
					type="text"
					placeholder="ej. 1, 2, 3"
					value={state.soIdsInput}
					oninput={(e) => state.setSoIdsInput(e.currentTarget.value)}
					disabled={state.busy}
					required
				/>
			</label>
			<button type="submit" disabled={state.busy || !state.soIdsInput.trim()}>
				Crear wave
			</button>
		</form>
		{#if state.waveResult}
			<p class="ok">
				batch #{state.waveResult.batchId} · {state.waveResult.batchStatus}
				· orders {state.waveResult.totalOrders} · picks {state.waveResult.totalPicks}
			</p>
		{/if}
	</section>

	<div class="toolbar">
		<button type="button" onclick={() => state.refresh()} disabled={state.loading || state.busy}>
			{state.loading ? 'Cargando…' : 'Actualizar batch'}
		</button>
		{#if state.batch?.active && state.batch.batchId}
			<button type="button" class="secondary" onclick={() => state.completeBatch()} disabled={state.busy}>
				Completar batch
			</button>
		{/if}
	</div>

	{#if state.error}
		<p class="status error" role="alert">{state.error}</p>
	{/if}
	{#if state.info}
		<p class="status ok" role="status">{state.info}</p>
	{/if}

	{#if state.batch?.active && state.batch.batchId}
		<p class="meta">
			Batch #{state.batch.batchId}
			· picks {state.batch.completedPicks}/{state.batch.totalPicks}
			· orders {state.batch.totalOrders}
		</p>
	{/if}

	{#if state.task}
		<article class="task">
			<h2>{state.task.sku}</h2>
			<p class="meta">
				{state.task.itemName}
				{#if state.task.binCode}
					· bin {state.task.binCode}
				{/if}
				· qty {state.task.quantityToPick}
			</p>

			<form onsubmit={onConfirm}>
				<label>
					Barcode escaneado
					<input
						type="text"
						value={state.scannedBarcode}
						oninput={(e) => state.setScannedBarcode(e.currentTarget.value)}
						disabled={state.busy}
						required
					/>
				</label>
				<label>
					Cantidad
					<input
						type="number"
						min="1"
						value={state.quantityPicked}
						oninput={(e) => state.setQuantityPicked(Number(e.currentTarget.value))}
						disabled={state.busy}
						required
					/>
				</label>
				<div class="actions">
					<button type="submit" disabled={state.busy}>Confirmar pick</button>
					<button type="button" class="secondary" onclick={() => state.shortPick()} disabled={state.busy}>
						Short (0)
					</button>
				</div>
			</form>
		</article>
	{:else if !state.loading}
		<p class="status">No hay tarea pendiente.</p>
	{/if}
</section>

<style>
	.page { font-family: system-ui, -apple-system, sans-serif; max-width: 36rem; margin: 1.5rem auto; padding: 0 1.25rem; }
	header { margin-bottom: 1rem; }
	h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
	h2 { margin: 0 0 0.35rem; font-size: 1.15rem; }
	.subtitle, .meta { margin: 0; color: #64748b; }
	.wave { margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
	.wave-form { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: end; margin-top: 0.75rem; }
	.wave-form label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
	.wave-form label.grow { flex: 1; min-width: 10rem; }
	.toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
	.status { color: #475569; }
	.status.error { color: #b91c1c; }
	.status.ok, .ok { color: #166534; }
	.task { margin-top: 1.25rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
	form { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
	label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; color: #334155; }
	input { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 6px; }
	.actions { display: flex; gap: 0.5rem; }
	button { padding: 0.45rem 0.9rem; border-radius: 6px; border: 1px solid #0f172a; background: #0f172a; color: #fff; cursor: pointer; }
	button.secondary { background: #fff; color: #0f172a; border-color: #cbd5e1; }
	button:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
