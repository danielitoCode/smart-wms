<script lang="ts">
	import UiStatePanel from '#lib/components/UiStatePanel.svelte';
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createSettingsState } from '../state/settingsState.svelte';
	import {
		SETTING_DEFINITIONS,
		type KnownSettingKey
	} from '../../domain/entity/Setting';

	const i18n = getContext<I18nState>('i18n');
	const vm = createSettingsState();
	let confirmSensitive = $state(false);

	onMount(() => { void vm.load(); });

	const categories: { title: string; description: string; keys: KnownSettingKey[] }[] = [
		{
			title: 'Fulfillment',
			description: 'Reglas que controlan el flujo de preparación, recepción y despacho.',
			keys: ['require_packing_before_shipping', 'default_receiving_bin', 'allow_over_receiving']
		},
		{
			title: 'Mobile App',
			description: 'Opciones visibles para los usuarios que realizan conteos desde dispositivos móviles.',
			keys: ['count_show_expected']
		},
		{
			title: 'Inventory',
			description: 'Controles de separación de funciones y aprobación de ajustes de inventario.',
			keys: ['require_count_approval_separation']
		},
		{
			title: 'POS',
			description: 'Activa la actividad de punto de venta en la navegación y el dashboard.',
			keys: ['pos_activity_enabled']
		},
		{
			title: 'Fraud Review',
			description: 'Reglas automáticas que retienen pedidos para revisión antes del picking.',
			keys: ['fraud_review_billing_shipping']
		},
		{
			title: 'Marketplace Health',
			description: 'Canales que aparecerán en el panel de salud del marketplace.',
			keys: ['dashboard_bubble_origins']
		},
		{
			title: 'Picking Ticket',
			description: 'Marca y textos opcionales que se imprimen en los tickets de preparación.',
			keys: [
				'picking_ticket_company_name',
				'picking_ticket_company_address',
				'picking_ticket_logo_url',
				'picking_ticket_returns_text'
			]
		}
	];

	const labels: Record<KnownSettingKey, string> = {
		count_show_expected: 'Mostrar cantidades esperadas durante el conteo',
		require_packing_before_shipping: 'Exigir empaque antes del despacho',
		allow_over_receiving: 'Permitir sobre-recepción',
		default_receiving_bin: 'Ubicación de recepción por defecto (ID)',
		require_count_approval_separation: 'Exigir un aprobador distinto para ajustes de conteo',
		picking_ticket_company_name: 'Nombre de la empresa',
		picking_ticket_company_address: 'Dirección de la empresa',
		picking_ticket_logo_url: 'URL o ruta del logo',
		picking_ticket_returns_text: 'Texto de devoluciones',
		pos_activity_enabled: 'Mostrar actividad POS',
		fraud_review_billing_shipping: 'Marcar pedidos cuando facturación y envío difieren',
		dashboard_bubble_origins: 'Canales del Marketplace Health'
	};

	const descriptions: Partial<Record<KnownSettingKey, string>> = {
		count_show_expected: 'Desactívalo para realizar conteos ciegos: el contador no verá la cantidad del sistema.',
		require_packing_before_shipping: 'Si se desactiva, un pedido PICKED podrá enviarse sin pasar por PACKED.',
		allow_over_receiving: 'Cuando está activo, se puede recibir una cantidad superior a la ordenada, con advertencia.',
		default_receiving_bin: 'ID numérico del bin de staging usado como destino inicial. Vacío significa sin valor predeterminado.',
		require_count_approval_separation: 'La persona que realizó el conteo no podrá aprobar los ajustes resultantes.',
		pos_activity_enabled: 'Añade la actividad POS y sus indicadores a la navegación de salida.',
		fraud_review_billing_shipping: 'Retiene para revisión los pedidos entrantes con direcciones de facturación y envío diferentes.',
		picking_ticket_logo_url: 'Admite una ruta relativa como /picking-tickets/logo.png o una URL HTTP(S).',
		dashboard_bubble_origins: 'El origen debe coincidir exactamente con order_origin; la etiqueta solo cambia el texto mostrado.'
	};

	const sensitiveChanges = $derived(
		SETTING_DEFINITIONS.filter((item) => item.sensitive && (vm.draft[item.key] ?? '') !== (vm.values[item.key] ?? ''))
	);

	function parseBubbleRows(value: string): { origin: string; label?: string }[] {
		try {
			const parsed: unknown = JSON.parse(value || '[]');
			return Array.isArray(parsed)
				? parsed.filter((item): item is { origin: string; label?: string } =>
					!!item && typeof item === 'object' && !Array.isArray(item) && typeof item.origin === 'string')
				: [];
		} catch {
			return [];
		}
	}

	const bubbleRows = $derived(parseBubbleRows(vm.draft.dashboard_bubble_origins ?? '[]'));

	function updateBubble(index: number, field: 'origin' | 'label', value: string) {
		const rows = parseBubbleRows(vm.draft.dashboard_bubble_origins ?? '[]').map((row) => ({ ...row }));
		rows[index] = { ...rows[index], [field]: value };
		vm.setDraft('dashboard_bubble_origins', JSON.stringify(rows));
	}

	function addBubble() {
		vm.setDraft('dashboard_bubble_origins', JSON.stringify([
			...parseBubbleRows(vm.draft.dashboard_bubble_origins ?? '[]'),
			{ origin: '', label: '' }
		]));
	}

	function removeBubble(index: number) {
		vm.setDraft('dashboard_bubble_origins', JSON.stringify(
			parseBubbleRows(vm.draft.dashboard_bubble_origins ?? '[]').filter((_, i) => i !== index)
		));
	}

	function requestSave() {
		if (!vm.hasChanges) return;
		if (Object.keys(vm.validateDraft()).length) return;
		if (vm.getSensitiveChanges().length) confirmSensitive = true;
		else void saveNow();
	}

	async function saveNow() {
		const ok = await vm.save();
		if (ok) confirmSensitive = false;
	}
</script>

<svelte:head><title>Settings · Smart WMS</title></svelte:head>

<section class="page">
	<header class="page-head">
		<div>
			<p class="eyebrow">ABELLIS · SMART WMS</p>
			<h1>{i18n.t('Ajustes')}</h1>
			<p>{i18n.t('Parámetros operativos y comportamiento de la plataforma.')}</p>
		</div>
		<div class="actions">
			{#if vm.hasChanges}<span class="dirty">{i18n.t('Cambios sin guardar')}</span>{/if}
			<button class="secondary" type="button" onclick={vm.discard} disabled={!vm.hasChanges || vm.saving}>
				{i18n.t('Descartar')}
			</button>
			<button class="primary" type="button" onclick={requestSave} disabled={!vm.hasChanges || vm.loading || vm.saving}>
				{vm.saving ? i18n.t('Guardando…') : i18n.t('Guardar cambios')}
			</button>
		</div>
	</header>

	{#if vm.error}<p class="alert error" role="alert">{i18n.t(vm.error)}</p>{/if}
	{#if vm.saved}<p class="alert success" role="status">{i18n.t('Ajustes guardados correctamente.')}</p>{/if}

	{#if vm.loading}
		<UiStatePanel kind="loading" title={i18n.t('Cargando configuración')} message={i18n.t('Estamos recuperando la configuración del sistema.')} />
	{:else}
		<div class="category-list">
			{#each categories as category}
				<section class="settings-card" aria-labelledby={'category-' + category.title.replaceAll(' ', '-')}>
					<div class="section-heading">
						<div><h2 id={'category-' + category.title.replaceAll(' ', '-')}>{i18n.t(category.title)}</h2><p>{i18n.t(category.description)}</p></div>
					</div>

					{#each category.keys as key}
						<div class="setting-row">
							<div class="setting-copy">
								<label for={'setting-' + key}>{i18n.t(labels[key])}</label>
								{#if descriptions[key]}<p>{i18n.t(descriptions[key]!)}</p>{/if}
								{#if vm.validationErrors[key]}<p class="field-error" role="alert">{i18n.t(vm.validationErrors[key])}</p>{/if}
							</div>
							<div class="setting-control">
								{#if SETTING_DEFINITIONS.find((item) => item.key === key)?.type === 'boolean'}
									<label class="switch" for={'setting-' + key}>
										<input id={'setting-' + key} type="checkbox" checked={vm.draft[key] === 'true'}
											onchange={(event) => vm.setDraft(key, event.currentTarget.checked ? 'true' : 'false')} />
										<span>{vm.draft[key] === 'true' ? i18n.t('Activado') : i18n.t('Desactivado')}</span>
									</label>
								{:else if key === 'default_receiving_bin'}
									<input id={'setting-' + key} type="number" min="1" step="1" inputmode="numeric"
										value={vm.draft[key] ?? ''} placeholder={i18n.t('ID del bin')}
										oninput={(event) => vm.setDraft(key, event.currentTarget.value)} />
								{:else if key === 'picking_ticket_company_address' || key === 'picking_ticket_returns_text'}
									<textarea id={'setting-' + key} rows={key === 'picking_ticket_company_address' ? 3 : 2}
										value={vm.draft[key] ?? ''}
										oninput={(event) => vm.setDraft(key, event.currentTarget.value)} />
								{:else if key === 'dashboard_bubble_origins'}
									<div class="bubble-editor">
										{#each bubbleRows as bubble, index (index)}
											<div class="bubble-row">
												<input aria-label={i18n.t('Origin')} value={bubble.origin}
													placeholder="order_origin (e.g. AMAZON)"
													oninput={(event) => updateBubble(index, 'origin', event.currentTarget.value)} />
												<input aria-label={i18n.t('Label')} value={bubble.label ?? ''}
													placeholder={i18n.t('Nombre visible')}
													oninput={(event) => updateBubble(index, 'label', event.currentTarget.value)} />
												<button class="remove" type="button" onclick={() => removeBubble(index)}>{i18n.t('Eliminar')}</button>
											</div>
										{/each}
										<button class="secondary add" type="button" onclick={addBubble}>{i18n.t('Añadir canal')}</button>
									</div>
								{:else}
									<input id={'setting-' + key} type="text" inputmode={key === 'picking_ticket_logo_url' ? 'url' : undefined}
										value={vm.draft[key] ?? ''} oninput={(event) => vm.setDraft(key, event.currentTarget.value)} />
								{/if}
							</div>
						</div>
					{/each}
				</section>
			{/each}
		</div>
	{/if}
</section>

{#if confirmSensitive}
	<div class="modal-backdrop" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) confirmSensitive = false; }}>
		<section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
			<p class="eyebrow">SMART WMS</p>
			<h2 id="confirm-title">{i18n.t('Confirmar cambios sensibles')}</h2>
			<p>{i18n.t('Estos cambios pueden alterar el flujo operativo o la visibilidad de funciones. Revisa los ajustes antes de aplicarlos:')}</p>
			<ul>{#each sensitiveChanges as item}<li>{i18n.t(labels[item.key])}: <strong>{vm.values[item.key] === 'true' ? i18n.t('Activado') : i18n.t('Desactivado')} → {vm.draft[item.key] === 'true' ? i18n.t('Activado') : i18n.t('Desactivado')}</strong></li>{/each}</ul>
			<footer>
				<button class="secondary" type="button" onclick={() => confirmSensitive = false} disabled={vm.saving}>{i18n.t('Volver')}</button>
				<button class="primary" type="button" onclick={() => void saveNow()} disabled={vm.saving}>
					{vm.saving ? i18n.t('Guardando…') : i18n.t('Confirmar y guardar')}
				</button>
			</footer>
		</section>
	</div>
{/if}

<style>
	.page{max-width:76rem;margin:1.5rem auto;padding:0 1.25rem 3rem;color:var(--ink)}
	.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1.2rem;margin-bottom:1.35rem}
	.eyebrow{margin:0 0 .3rem;font-size:.66rem;font-weight:700;letter-spacing:.14em;color:var(--slate)}
	h1{margin:0;font:700 1.7rem var(--disp)}
	.page-head>div:first-child>p:last-child{margin:.35rem 0 0;color:var(--slate);font-size:.9rem}
	.actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:.5rem}
	button{border-radius:8px;padding:.55rem .85rem;font:inherit;font-size:.82rem;cursor:pointer}
	button:disabled{opacity:.5;cursor:not-allowed}
	.primary{border:1px solid var(--navy);background:var(--navy);color:white}
	.secondary{border:1px solid var(--line);background:var(--surface);color:var(--ink)}
	.dirty{font-size:.75rem;color:var(--copper);font-weight:600}
	.category-list{display:grid;gap:1rem}
	.settings-card{border:1px solid var(--line);border-radius:13px;background:var(--surface);padding:1.1rem 1.2rem}
	.section-heading{display:flex;justify-content:space-between;gap:1rem;padding-bottom:.85rem;border-bottom:1px solid var(--line)}
	h2{margin:0;font-size:1.05rem}
	.section-heading p{margin:.3rem 0 0;color:var(--slate);font-size:.8rem}
	.setting-row{display:grid;grid-template-columns:minmax(13rem,1fr) minmax(16rem,1.15fr);gap:1.2rem;align-items:center;padding:.9rem 0;border-bottom:1px solid var(--line)}
	.setting-row:last-child{border-bottom:0;padding-bottom:0}
	.setting-copy label{font-size:.86rem;font-weight:600;color:var(--ink)}
	.setting-copy p{margin:.25rem 0 0;color:var(--slate);font-size:.75rem;line-height:1.45}
	.field-error{color:var(--danger)!important}
	.setting-control{min-width:0}
	input,textarea{box-sizing:border-box;width:100%;min-height:38px;padding:.55rem .65rem;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font:inherit;font-size:.82rem}
	textarea{resize:vertical;min-height:5rem}
	.switch{display:inline-flex;align-items:center;gap:.6rem;font-size:.8rem;color:var(--ink);cursor:pointer}
	.switch input{width:1.05rem;min-height:1.05rem;height:1.05rem;accent-color:var(--navy)}
	.bubble-editor{display:grid;gap:.55rem}
	.bubble-row{display:grid;grid-template-columns:1fr 1fr auto;gap:.45rem}
	.remove{border:1px solid var(--line);background:var(--surface-2);color:var(--danger)}
	.add{justify-self:start}
	.alert{padding:.7rem .85rem;border-radius:8px;font-size:.82rem}
	.error{color:var(--danger);background:var(--danger-bg,transparent);border:1px solid var(--danger)}
	.success{color:var(--success);background:var(--success-bg);border:1px solid var(--success)}
	.loading{padding:2rem;text-align:center;color:var(--slate)}
	.modal-backdrop{position:fixed;inset:0;z-index:150;display:grid;place-items:center;padding:1rem;background:#0008}
	.confirm-modal{width:min(34rem,100%);padding:1.35rem;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);box-shadow:var(--shadow-2)}
	.confirm-modal>p:not(.eyebrow){color:var(--slate);font-size:.85rem;line-height:1.5}
	.confirm-modal ul{padding-left:1.2rem;font-size:.84rem;line-height:1.8}
	.confirm-modal footer{display:flex;justify-content:flex-end;gap:.5rem;margin-top:1.2rem}
	@media(max-width:720px){.page-head{flex-direction:column}.actions{justify-content:flex-start}.setting-row{grid-template-columns:1fr;gap:.55rem}.bubble-row{grid-template-columns:1fr}.settings-card{padding:1rem}}
	@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style>
