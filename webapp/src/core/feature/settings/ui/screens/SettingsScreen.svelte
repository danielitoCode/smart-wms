<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createSettingsState } from '../state/settingsState.svelte';
	import { KNOWN_SETTING_KEYS } from '../../domain/entity/Setting';

	const i18n = getContext<I18nState>('i18n');
	const vm = createSettingsState();

	onMount(() => { void vm.load(); });

	const labels: Record<string, string> = {
		count_show_expected: 'Mostrar cantidad esperada en conteo',
		require_packing_before_shipping: 'Exigir empaque antes del despacho',
		allow_over_receiving: 'Permitir sobre-recepción',
		default_receiving_bin: 'Ubicación de recepción por defecto',
		require_count_approval_separation: 'Separación de aprobación de conteos',
		picking_ticket_company_name: 'Nombre de empresa (ticket)',
		picking_ticket_company_address: 'Dirección de empresa (ticket)',
		picking_ticket_logo_url: 'URL del logo (ticket)',
		picking_ticket_returns_text: 'Texto de devoluciones (ticket)',
		pos_activity_enabled: 'Actividad POS habilitada',
		fraud_review_billing_shipping: 'Revisión fraude billing/shipping',
		dashboard_bubble_origins: 'Orígenes de burbujas del dashboard'
	};

	function isBooleanKey(key: string): boolean {
		return [
			'count_show_expected',
			'require_packing_before_shipping',
			'allow_over_receiving',
			'require_count_approval_separation',
			'pos_activity_enabled',
			'fraud_review_billing_shipping'
		].includes(key);
	}
</script>

<section class="page">
	<header>
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Ajustes')}</h1>
			<p>{i18n.t('Parámetros operativos del almacén.')}</p>
		</div>
		<button class="primary" type="button" disabled={vm.loading || vm.saving} onclick={() => void vm.save()}>
			{vm.saving ? i18n.t('Guardando…') : i18n.t('Guardar')}
		</button>
	</header>

	{#if vm.error}<p class="error" role="alert">{vm.error}</p>{/if}
	{#if vm.saved}<p class="success" role="status">{i18n.t('Ajustes guardados.')}</p>{/if}

	{#if vm.loading}
		<p>{i18n.t('Cargando…')}</p>
	{:else}
		<form class="form" onsubmit={(e) => { e.preventDefault(); void vm.save(); }}>
			{#each KNOWN_SETTING_KEYS as key}
				{#if isBooleanKey(key)}
					<label class="check">
						<input type="checkbox" checked={(vm.draft[key] ?? '') === 'true'}
							onchange={(e) => vm.setDraft(key, e.currentTarget.checked ? 'true' : 'false')} />
						{i18n.t(labels[key] ?? key)}
					</label>
				{:else}
					<label>
						<span>{i18n.t(labels[key] ?? key)}</span>
						<input type="text" value={vm.draft[key] ?? ''}
							oninput={(e) => vm.setDraft(key, e.currentTarget.value)} />
					</label>
				{/if}
			{/each}
		</form>
	{/if}
</section>

<style>
	.page { max-width: 40rem; margin: 0 auto; padding: 2rem 1.25rem; }
	header { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1.25rem; }
	.eyebrow { margin: 0; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--navy); }
	h1 { margin: 0.2rem 0 0.35rem; font-size: 1.45rem; }
	header p { margin: 0; color: var(--slate); font-size: 0.92rem; }
	.form { display: flex; flex-direction: column; gap: 0.9rem; }
	label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.88rem; color: var(--slate); }
	label.check { flex-direction: row; align-items: center; gap: 0.55rem; color: var(--ink); }
	input[type='text'] { padding: 0.55rem 0.7rem; border: 1px solid var(--line); border-radius: var(--radius-field); }
	.primary { padding: 0.55rem 1rem; border: 0; border-radius: 8px; background: var(--navy); color: #fff; cursor: pointer; }
	.error { color: var(--danger); }
	.success { color: var(--success, #0f5132); background: var(--success-bg, #e6f3ea); padding: 0.55rem 0.75rem; border-radius: 8px; }
</style>
