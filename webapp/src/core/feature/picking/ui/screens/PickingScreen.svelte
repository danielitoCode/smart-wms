<script lang="ts">
	import { getContext } from 'svelte';
	import type { I18nState } from '../../../../lib/i18n/i18n.svelte';
	const i18n = getContext<I18nState>('i18n');
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

	function onValidate(event: Event) {
		event.preventDefault();
		void state.validateWaveSo();
	}

	function onCreateBatch(event: Event) {
		event.preventDefault();
		void state.createBatch();
	}
</script>

<section class="page">
	<header>
		<h1>{i18n.t(i18n.t('Preparación de pedidos'))}</h1>
		<p class="subtitle">{i18n.t(i18n.t('Valida pedidos de venta, organiza su preparación y registra cada producto recogido.'))}</p>
	</header>

	<label class="wh">
		ID de almacén
		<input
			type="number"
			min="1"
			value={state.warehouseId}
			oninput={(e) => state.setWarehouseId(Number(e.currentTarget.value))}
			disabled={state.busy}
		/>
	</label>

	<section class="panel">
		<h2>{i18n.t(i18n.t('Validar pedido de venta'))}</h2>
		<p class="meta">{i18n.t(i18n.t('Comprueba que el pedido esté listo para incluirlo en una preparación.'))}</p>
		<form class="row" onsubmit={onValidate}>
			<input
				type="text"
				placeholder={i18n.t(i18n.t('Código del pedido (ej. SO-2026-001)'))}
				value={state.validateBarcode}
				oninput={(e) => state.setValidateBarcode(e.currentTarget.value)}
				disabled={state.busy}
				required
			/>
			<button type="submit" disabled={state.busy || !state.validateBarcode.trim()}>
				Validar
			</button>
			<button type="button" class="secondary" onclick={() => state.clearValidated()} disabled={state.busy}>
				Limpiar pedidos
			</button>
		</form>
		{#if state.validateResult}
			<p class={state.validateResult.valid ? 'ok' : 'err'}>
				{state.validateResult.valid ? i18n.t('Válida') : i18n.t('No válida')}
				{#if state.validateResult.soNumber} · {state.validateResult.soNumber}{/if}
				{#if state.validateResult.lineCount != null} · líneas {state.validateResult.lineCount}{/if}
				{#if state.validateResult.totalUnits != null} · uds {state.validateResult.totalUnits}{/if}
				{#if state.validateResult.error} · {state.validateResult.error}{/if}
				{#if state.validateResult.batchId} · batch #{state.validateResult.batchId}{/if}
			</p>
		{/if}
		{#if state.validatedSoIds.length}
			<p class="meta">Pedidos validados (ID): {state.validatedSoIds.join(', ')}</p>
		{/if}
	</section>

	<section class="panel">
		<h2>{i18n.t(i18n.t('Crear ola de preparación'))}</h2>
		<p class="meta">{i18n.t(i18n.t('Agrupa los pedidos validados para organizar su recogida.'))}</p>
		<form class="row" onsubmit={onWave}>
			<input
				type="text"
				class="grow"
				placeholder={i18n.t(i18n.t('Identificadores de pedidos (ej. 1, 2, 3)'))}
				value={state.soIdsInput}
				oninput={(e) => state.setSoIdsInput(e.currentTarget.value)}
				disabled={state.busy}
				required
			/>
			<button type="submit" disabled={state.busy || !state.soIdsInput.trim()}>
				Crear ola
			</button>
		</form>
		{#if state.waveResult}
			<p class="ok">
				lote de trabajo #{state.waveResult.batchId} · {state.waveResult.batchStatus}
				· pedidos: {state.waveResult.totalOrders} · líneas por recoger: {state.waveResult.totalPicks}
			</p>
		{/if}
	</section>

	<section class="panel">
		<h2>{i18n.t(i18n.t('Crear lote de trabajo'))}</h2>
		<p class="meta">{i18n.t(i18n.t('Crea un lote a partir de los números o códigos de los pedidos.'))}</p>
		<form class="row" onsubmit={onCreateBatch}>
			<input
				type="text"
				class="grow"
				placeholder={i18n.t(i18n.t('Números o códigos de pedido (ej. SO-001, SO-002)'))}
				value={state.batchIdentifiersInput}
				oninput={(e) => state.setBatchIdentifiersInput(e.currentTarget.value)}
				disabled={state.busy}
				required
			/>
			<button type="submit" disabled={state.busy || !state.batchIdentifiersInput.trim()}>
				Crear lote
			</button>
		</form>
		{#if state.createBatchResult}
			<p class="ok">
				{state.createBatchResult.batchNumber} (#{state.createBatchResult.batchId})
				· pedidos: {state.createBatchResult.totalOrders}
				· tareas: {state.createBatchResult.totalItems}
			</p>
			{#if state.createBatchResult.orders.length}
				<ul class="totes">
					{#each state.createBatchResult.orders as o, i (o.soNumber ?? i)}
						<li>
							{o.soNumber ?? o.soId}
							{#if o.toteNumber} · contenedor {o.toteNumber}{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</section>

	<div class="toolbar">
		<button type="button" onclick={() => state.refresh()} disabled={state.loading || state.busy}>
			{state.loading ? i18n.t('Cargando…') : i18n.t('Actualizar lote')}
		</button>
		{#if state.batch?.active && state.batch.batchId}
			<button type="button" class="secondary" onclick={() => state.completeBatch()} disabled={state.busy}>
				Completar lote
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
			Lote de trabajo #{state.batch.batchId}
			· líneas recogidas: {state.batch.completedPicks}/{state.batch.totalPicks}
			· pedidos: {state.batch.totalOrders}
		</p>
	{/if}

	{#if state.task}
		<article class="task">
			<h2>{state.task.sku}</h2>
			<p class="meta">
				{state.task.itemName}
				{#if state.task.binCode}
					· ubicación: {state.task.binCode}
				{/if}
				· cantidad: {state.task.quantityToPick}
			</p>

			<form onsubmit={onConfirm}>
				<label>
					Código de barras escaneado
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
					<button type="submit" class="accent" disabled={state.busy}>{i18n.t(i18n.t('Confirmar recogida'))}</button>
					<button type="button" class="secondary" onclick={() => state.shortPick()} disabled={state.busy}>
						Indicar faltante (0)
					</button>
				</div>
			</form>
		</article>
	{:else if !state.loading}
		<p class="status">{i18n.t(i18n.t('No hay productos pendientes de recoger.'))}</p>
	{/if}
</section>

<style>
	.page {
		font-family: system-ui, -apple-system, sans-serif;
		max-width: 40rem;
		margin: 1.5rem auto;
		padding: 0 1.25rem;
	}
	header {
		margin-bottom: 1rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: 1.75rem;
	}
	h2 {
		margin: 0 0 0.35rem;
		font-size: 1.1rem;
	}
	.subtitle,
	.meta {
		margin: 0;
		color: #64748b;
		font-size: 0.9rem;
	}
	.wh {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
		margin-bottom: 1rem;
		max-width: 10rem;
	}
	.panel {
		margin-bottom: 1.25rem;
		padding: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		margin-top: 0.75rem;
	}
	.row input.grow,
	.row input[type='text'] {
		flex: 1;
		min-width: 10rem;
	}
	input {
		padding: 0.45rem 0.6rem;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
	}
	button {
		padding: 0.45rem 0.9rem;
		border-radius: 6px;
		border: 1px solid #0f172a;
		background: #0f172a;
		color: #fff;
		cursor: pointer;
	}
	button.secondary {
		background: #fff;
		color: #0f172a;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.toolbar {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.status {
		color: #475569;
	}
	.status.error,
	.err {
		color: #b91c1c;
	}
	.status.ok,
	.ok {
		color: #166534;
	}
	.task {
		padding: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
	}
	.task form {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		margin-top: 0.75rem;
	}
	.task label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.totes {
		margin: 0.5rem 0 0;
		padding-left: 1.25rem;
		color: #334155;
		font-size: 0.9rem;
	}
</style>
