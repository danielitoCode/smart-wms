<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { I18nState } from '../i18n/i18n.svelte';
	import type { WarehouseSelectionState } from '../../core/feature/warehouses/ui/state/warehouseSelectionState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const warehouseSelection = getContext<WarehouseSelectionState>('warehouseSelection');

	let open = $state(false);
	let rootEl: HTMLDivElement | undefined = $state();

	const current = $derived(
		warehouseSelection.warehouses.find((w) => w.id === warehouseSelection.warehouseId) ?? null
	);

	const currentLabel = $derived(
		current ? `${current.code} — ${current.name}` : i18n.t('Seleccionar almacén')
	);

	function select(id: number) {
		warehouseSelection.select(id);
		open = false;
	}

	function onDocClick(e: MouseEvent) {
		if (!rootEl) return;
		if (!rootEl.contains(e.target as Node)) open = false;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}

	onMount(() => {
		document.addEventListener('click', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="warehouse" bind:this={rootEl}>
	<button
		type="button"
		class="trigger"
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label={i18n.t('Almacén activo')}
		disabled={warehouseSelection.loading || warehouseSelection.warehouses.length === 0}
		onclick={() => (open = !open)}
	>
		<span class="caption">{i18n.t('Almacén activo')}</span>
		<span class="value" title={currentLabel}>{currentLabel}</span>
		<span class="chev" aria-hidden="true">▾</span>
	</button>

	{#if open}
		<ul class="menu" role="listbox" aria-label={i18n.t('Almacén activo')}>
			{#each warehouseSelection.warehouses as wh (wh.id)}
				<li role="option" aria-selected={wh.id === warehouseSelection.warehouseId}>
					<button
						type="button"
						class="option"
						class:active={wh.id === warehouseSelection.warehouseId}
						onclick={() => select(wh.id)}
					>
						<span class="code">{wh.code}</span>
						<span class="name">{wh.name}</span>
						{#if wh.id === warehouseSelection.warehouseId}
							<span class="check" aria-hidden="true">✓</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.warehouse {
		position: relative;
		display: inline-block;
		max-width: min(280px, 42vw);
	}

	.trigger {
		height: 40px;
		min-height: 40px;
		max-width: 100%;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0 0.65rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
		font: 600 0.78rem var(--body);
		transition:
			border-color var(--motion-fast, 140ms) var(--ease-out, ease),
			background var(--motion-fast, 140ms) var(--ease-out, ease);
	}

	.trigger:hover:not(:disabled),
	.trigger[aria-expanded='true'] {
		border-color: var(--lightblue, #8fb4da);
		background: var(--surface-2);
	}

	.trigger:disabled {
		opacity: 0.65;
		cursor: wait;
	}

	.caption {
		flex: none;
		color: var(--slate);
		font-size: 0.68rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.value {
		min-width: 0;
		flex: 1 1 auto;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--ink);
		font: 500 0.82rem var(--body);
		text-align: left;
	}

	.chev {
		flex: none;
		font-size: 0.65rem;
		color: var(--slate);
		opacity: 0.85;
	}

	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		z-index: 60;
		min-width: 100%;
		width: max(100%, 16rem);
		max-width: min(22rem, 90vw);
		max-height: min(16rem, 50vh);
		overflow: auto;
		margin: 0;
		padding: 0.35rem;
		list-style: none;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
		box-shadow: var(--shadow-2);
		animation: menu-in var(--motion-base, 200ms) var(--ease-out, ease) both;
	}

	.option {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		min-height: 40px;
		padding: 0.4rem 0.55rem;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--ink);
		font: 500 0.86rem var(--body);
		cursor: pointer;
		text-align: left;
	}

	.option:hover {
		background: var(--surface-selected, var(--surface-2));
	}

	.option.active {
		background: var(--surface-selected, var(--surface-2));
		font-weight: 600;
	}

	.code {
		flex: none;
		min-width: 4.5rem;
		color: var(--navy);
		font: 600 0.78rem var(--disp, system-ui);
		letter-spacing: 0.02em;
	}

	:global(:root[data-theme='dark']) .code {
		color: var(--gold);
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.check {
		flex: none;
		color: var(--navy);
		font-size: 0.85rem;
	}

	:global(:root[data-theme='dark']) .check {
		color: var(--gold);
	}

	@keyframes menu-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (max-width: 520px) {
		.caption {
			display: none;
		}
		.warehouse {
			max-width: 140px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.menu {
			animation: none;
		}
	}
</style>
