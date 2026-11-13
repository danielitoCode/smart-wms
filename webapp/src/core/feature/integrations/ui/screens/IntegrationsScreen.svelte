<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createIntegrationsState } from '../state/integrationsState.svelte';
	const i18n = getContext<I18nState>('i18n');
	const vm = createIntegrationsState();
	onMount(() => { void vm.load(); });
</script>
<section class="page">
	<header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Integraciones')}</h1>
			<p>{i18n.t('Conectores y prueba de conectividad.')}</p>
		</div>
	</header>
	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
	{#if vm.message}<p class="success" role="status">{i18n.t(vm.message)}</p>{/if}
	{#if vm.loading}<p>{i18n.t('Cargando…')}</p>
	{:else if vm.rows.length === 0}<p class="empty">{i18n.t('No hay conectores disponibles.')}</p>
	{:else}
		<div class="grid">
			{#each vm.rows as row (row.name)}
				<article class="card">
					<h2>{row.displayName}</h2>
					<p>{row.description ?? '—'}</p>
					<button type="button" class="primary" disabled={vm.saving} onclick={() => void vm.test(row.name)}>{i18n.t('Probar')}</button>
				</article>
			{/each}
		</div>
	{/if}
</section>
<style>
	.page{max-width:64rem;margin:0 auto;padding:2rem 1.25rem}
	header{margin-bottom:1.25rem}
	.eyebrow{margin:0;font-size:.68rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--navy)}
	h1{margin:.2rem 0 .35rem;font-size:1.45rem}
	header p{margin:0;color:var(--slate)}
	.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:.9rem}
	.card{border:1px solid var(--line);border-radius:10px;padding:1rem;background:var(--card,#fff)}
	.card h2{margin:0 0 .35rem;font-size:1.05rem}
	.card p{margin:0 0 .8rem;color:var(--slate);font-size:.88rem}
	button{padding:.45rem .75rem;border:1px solid var(--line);border-radius:8px;background:var(--surface);cursor:pointer}
	.primary{background:var(--navy);color:#fff;border-color:var(--navy)}
	.error{color:var(--danger)}
	.success{color:var(--success,#0f5132)}
	.empty{color:var(--slate)}
</style>
