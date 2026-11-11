<script lang="ts">
	import { createCycleCountState } from '../state/cycleCountState.svelte';

	const state = createCycleCountState();

	function onCreate(e: Event) {
		e.preventDefault();
		void state.create();
	}

	function onSubmit(e: Event) {
		e.preventDefault();
		void state.submit();
	}
</script>

<section class="page">
	<header>
		<h1>Conteo cíclico</h1>
		<p class="subtitle">Cuenta las existencias por ubicación y registra las diferencias encontradas.</p>
	</header>

	<form class="panel" onsubmit={onCreate}>
		<label>
			ID de almacén
			<input
				type="number"
				min="1"
				value={state.warehouseId}
				oninput={(e) => state.setWarehouseId(Number(e.currentTarget.value))}
				disabled={state.busy}
			/>
		</label>
		<label class="grow">
			ID de ubicaciones
			<input
				type="text"
				placeholder="ej. 3, 4, 5"
				value={state.binIdsInput}
				oninput={(e) => state.setBinIdsInput(e.currentTarget.value)}
				disabled={state.busy}
				required
			/>
		</label>
		<button type="submit" disabled={state.busy || !state.binIdsInput.trim()}>
			Crear conteos
		</button>
	</form>

	{#if state.error}
		<p class="err" role="alert">{state.error}</p>
	{/if}
	{#if state.info}
		<p class="ok" role="status">{state.info}</p>
	{/if}

	{#if state.created.length}
		<ul class="created">
			{#each state.created as c (c.countId)}
				<li>
					<button
						type="button"
						class="link"
						class:active={state.selectedCountId === c.countId}
						onclick={() => state.loadDetail(c.countId)}
						disabled={state.loading || state.busy}
					>
						Conteo #{c.countId} · ubicación {c.binCode} · {c.status} · {c.lines} líneas
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if state.loading}
		<p class="meta">Cargando detalle…</p>
	{:else if state.detail}
		<section class="panel detail">
			<p class="meta">
				Conteo #{state.detail.countId} · ubicación {state.detail.binCode} · {state.detail.status}
			</p>
			<form onsubmit={onSubmit}>
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th>SKU</th>
								<th>Esperado</th>
								<th>Contado</th>
							</tr>
						</thead>
						<tbody>
							{#each state.detail.lines as line (line.countLineId)}
								<tr>
									<td>{line.sku ?? line.itemId}</td>
									<td>{line.expectedQuantity ?? '—'}</td>
									<td>
										<input
											type="number"
											min="0"
											value={state.countsByLine[line.countLineId] ?? 0}
											oninput={(e) =>
												state.setCounted(line.countLineId, Number(e.currentTarget.value))}
											disabled={state.busy || state.detail?.status === 'COMPLETED'}
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if state.detail.status !== 'COMPLETED'}
					<button type="submit" disabled={state.busy}>Enviar conteo</button>
				{/if}
			</form>
		</section>
	{/if}

	{#if state.submitResult}
		<section class="panel">
			<p class="ok">
				{state.submitResult.status} · líneas {state.submitResult.totalLines} ·
				diferencias: {state.submitResult.linesWithVariance}
			</p>
			{#if state.submitResult.adjustments.length}
				<ul>
					{#each state.submitResult.adjustments as a, i (a.adjustmentId + '-' + i)}
						<li>
							{a.sku}: esperado {a.expected} / contado {a.counted} (Δ {a.variance}) · ajuste
							#{a.adjustmentId}
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</section>

<style>
	.page {
		font-family: system-ui, -apple-system, sans-serif;
		max-width: 42rem;
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
	.subtitle,
	.meta {
		margin: 0;
		color: #64748b;
	}
	.panel {
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		align-items: end;
		margin-bottom: 1rem;
		padding: 1rem;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		background: #fff;
	}
	.panel.detail {
		display: block;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
	}
	label.grow {
		flex: 1;
		min-width: 12rem;
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
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	button.link {
		background: transparent;
		color: #0f172a;
		border: none;
		padding: 0.25rem 0;
		text-align: left;
	}
	button.link.active {
		font-weight: 600;
		text-decoration: underline;
	}
	.err {
		color: #b91c1c;
	}
	.ok {
		color: #166534;
	}
	.created {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
	}
	.table-wrap {
		overflow-x: auto;
		margin: 0.75rem 0;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	th,
	td {
		border-bottom: 1px solid #e2e8f0;
		padding: 0.4rem 0.5rem;
		text-align: left;
	}
	td input {
		width: 5rem;
	}
</style>
