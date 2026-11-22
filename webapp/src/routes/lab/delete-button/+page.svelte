<script lang="ts">
	/**
	 * Lab demo — DeleteButton expand confirm/cancel.
	 */
	import DeleteButton from '../../../lib/components/DeleteButton.svelte';

	let log = $state<string[]>([]);
	let count = $state(0);

	function push(msg: string) {
		const t = new Date().toLocaleTimeString();
		log = [`${t} · ${msg}`, ...log].slice(0, 8);
	}

	function onConfirm() {
		count += 1;
		push('Confirm — deleted');
	}

	function onCancel() {
		push('Cancel — kept');
	}

	function clearLog() {
		log = [];
	}
</script>

<svelte:head>
	<title>DeleteButton · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">DeleteButton</h1>
	<p class="detail-lead">
		Botón de papelera que se expande a confirmar / cancelar. Tapa animada, check con stroke y
		asiento al cancelar. Escape = keep. prefers-reduced-motion respetado.
	</p>
</section>

<div class="stage">
	<div class="row">
		<DeleteButton {onConfirm} {onCancel} />
		<span class="hint">Clic → abre · ✓ elimina · ✕ o Escape cancela</span>
	</div>

	<div class="stats">
		<span class="pill">Deletes: <strong>{count}</strong></span>
		<button type="button" class="btn-ghost" onclick={clearLog}>Clear log</button>
	</div>

	{#if log.length}
		<ul class="log">
			{#each log as line}
				<li>{line}</li>
			{/each}
		</ul>
	{/if}
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
		max-width: 42rem;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.stage {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-width: 28rem;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.hint {
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}

	.stats {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.pill {
		font-size: 0.8125rem;
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--navy, #004c8b) 10%, transparent);
		color: var(--head-ink, #012a50);
	}
	.btn-ghost {
		height: 2rem;
		padding: 0 0.75rem;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
		background: transparent;
		color: var(--navy, #004c8b);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}

	.log {
		margin: 0;
		padding: 0.75rem 1rem;
		list-style: none;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		color: var(--slate, #5c6b7d);
		line-height: 1.6;
	}
</style>
