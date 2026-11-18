<script lang="ts">
	/**
	 * InlineTableControl — expense table with inline row edit.
	 * Migrated from React + motion/react layout animations to Svelte 5 + CSS.
	 *
	 * Uso:
	 *   <InlineTableControl data={rows} onUpdate={(item) => ...} />
	 */
	import type { TableItem } from './inlineTableControl.types';

	interface Props {
		data: TableItem[];
		onUpdate?: (item: TableItem) => void;
		class?: string;
	}

	let { data, onUpdate, class: className = '' }: Props = $props();

	let items = $state<TableItem[]>([]);
	let editingId = $state<string | null>(null);
	let editValues = $state<TableItem | null>(null);

	$effect(() => {
		items = data.map((d) => ({ ...d }));
	});

	function startEdit(item: TableItem) {
		editValues = { ...item };
		editingId = item.id;
	}

	function cancelEdit() {
		editingId = null;
		editValues = null;
	}

	function handleDone() {
		if (!editValues) return;
		const next = items.map((item) => (item.id === editValues!.id ? { ...editValues! } : item));
		items = next;
		onUpdate?.(editValues);
		editingId = null;
		editValues = null;
	}

	function setField(field: keyof TableItem, value: string) {
		if (!editValues) return;
		editValues = { ...editValues, [field]: value };
	}
</script>

<div class="itc {className}">
	<div class="itc__wrap">
		<div class="itc__head" class:itc__head--dim={!!editingId} aria-hidden="true">
			<div class="itc__head-cell">
				<svg class="itc__ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="2" y="5" width="20" height="14" rx="2" />
					<path d="M2 10h20" />
				</svg>
				Expense
			</div>
			<div class="itc__head-cell">
				<svg class="itc__ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 2 2 7l10 5 10-5-10-5Z" />
					<path d="m2 17 10 5 10-5" />
					<path d="m2 12 10 5 10-5" />
				</svg>
				Method
			</div>
			<div class="itc__head-cell">
				<svg class="itc__ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M7 17 17 7" />
					<path d="M7 7h10v10" />
				</svg>
				Amount
			</div>
			<div></div>
		</div>

		<div class="itc__list">
			{#each items as item (item.id)}
				<div class="itc__row-wrap">
					{#if !editingId}
						<div class="itc__divider" aria-hidden="true"></div>
					{/if}

					{#if editingId === item.id && editValues}
						<div class="itc__editor">
							{#each (['expense', 'method', 'amount'] as const) as field (field)}
								<div class="itc__field">
									<label class="itc__label" for="itc-{item.id}-{field}">
										{#if field === 'expense'}
											<svg class="itc__ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<rect x="2" y="5" width="20" height="14" rx="2" />
												<path d="M2 10h20" />
											</svg>
										{:else if field === 'method'}
											<svg class="itc__ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M12 2 2 7l10 5 10-5-10-5Z" />
												<path d="m2 17 10 5 10-5" />
												<path d="m2 12 10 5 10-5" />
											</svg>
										{:else}
											<svg class="itc__ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="M7 17 17 7" />
												<path d="M7 7h10v10" />
											</svg>
										{/if}
										{field}
									</label>
									<div class="itc__input-shell">
										<input
											id="itc-{item.id}-{field}"
											class="itc__input"
											type="text"
											title="edit text"
											value={editValues[field]}
											oninput={(e) => setField(field, e.currentTarget.value)}
										/>
									</div>
								</div>
							{/each}

							<div class="itc__actions">
								<button type="button" class="itc__btn itc__btn--ghost" onclick={cancelEdit}>
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
									</svg>
									<span>Cancel</span>
								</button>
								<button type="button" class="itc__btn itc__btn--solid" onclick={handleDone}>
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
									</svg>
									<span>Done</span>
								</button>
							</div>
						</div>
					{:else}
						<div class="itc__row" class:itc__row--dim={!!editingId}>
							<div class="itc__cell itc__cell--main">
								<span class="itc__expense">{item.expense}</span>
								<span class="itc__method-mobile">{item.method}</span>
							</div>
							<div class="itc__cell itc__cell--method">{item.method}</div>
							<div class="itc__cell itc__cell--amount">
								<span class="itc__currency">$</span>{item.amount}
							</div>
							<button
								type="button"
								class="itc__edit"
								title="edit"
								disabled={!!editingId}
								onclick={() => startEdit(item)}
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<path d="M12 20h9" />
									<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke-linejoin="round" />
								</svg>
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.itc {
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		user-select: none;
		-webkit-font-smoothing: antialiased;
	}

	@media (min-width: 640px) {
		.itc {
			padding: 2.5rem;
		}
	}

	.itc__wrap {
		width: 100%;
		max-width: 32rem;
	}

	.itc__head {
		display: none;
		grid-template-columns: 1.2fr 1fr 0.8fr 40px;
		padding: 1rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: capitalize;
		color: var(--slate, #5c6b7d);
		transition: opacity 0.3s ease, filter 0.3s ease;
	}

	.itc__head--dim {
		opacity: 0.2;
		filter: blur(1px);
	}

	@media (min-width: 640px) {
		.itc__head {
			display: grid;
		}
	}

	.itc__head-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.itc__ico {
		flex-shrink: 0;
		color: var(--slate, #5c6b7d);
		opacity: 0.85;
	}

	.itc__list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	@media (min-width: 640px) {
		.itc__list {
			gap: 0;
		}
	}

	.itc__row-wrap {
		position: relative;
	}

	.itc__divider {
		display: none;
		height: 1px;
		margin-inline: 1.5rem;
		background: var(--line, #d9e2ec);
	}

	@media (min-width: 640px) {
		.itc__divider {
			display: block;
		}
	}

	.itc__row {
		display: grid;
		grid-template-columns: 1fr auto 40px;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: 1rem;
		border: 1px solid var(--line, #d9e2ec);
		background: color-mix(in srgb, var(--surface-2, #f5f8fc) 80%, transparent);
		transition: opacity 0.3s ease, filter 0.3s ease, background 0.2s ease;
	}

	.itc__row:hover:not(.itc__row--dim) {
		background: var(--surface-2, #f5f8fc);
	}

	.itc__row--dim {
		opacity: 0.35;
		filter: blur(1px);
		pointer-events: none;
	}

	@media (min-width: 640px) {
		.itc__row {
			grid-template-columns: 1.2fr 1fr 0.8fr 40px;
			border-radius: 0;
			border: none;
			background: transparent;
			padding: 1.25rem 1.5rem;
		}

		.itc__row:hover:not(.itc__row--dim) {
			background: color-mix(in srgb, var(--surface-2, #f5f8fc) 70%, transparent);
		}
	}

	.itc__cell--main {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.itc__expense {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
	}

	@media (min-width: 640px) {
		.itc__expense {
			font-size: 1rem;
		}
	}

	.itc__method-mobile {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--slate, #5c6b7d);
	}

	@media (min-width: 640px) {
		.itc__method-mobile {
			display: none;
		}
	}

	.itc__cell--method {
		display: none;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--slate, #5c6b7d);
	}

	@media (min-width: 640px) {
		.itc__cell--method {
			display: flex;
		}
	}

	.itc__cell--amount {
		display: flex;
		justify-content: flex-end;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--ink, #132234);
	}

	@media (min-width: 640px) {
		.itc__cell--amount {
			justify-content: flex-start;
			font-size: 1rem;
		}
	}

	.itc__currency {
		margin-right: 0.125rem;
		color: var(--slate, #5c6b7d);
		font-weight: 600;
	}

	.itc__edit {
		display: flex;
		justify-content: flex-end;
		padding: 0.25rem;
		border: 0;
		background: transparent;
		color: var(--slate, #5c6b7d);
		cursor: pointer;
		transition: color 0.15s ease, transform 0.15s ease;
	}

	.itc__edit:hover:not(:disabled) {
		color: var(--ink, #132234);
		transform: scale(1.08);
	}

	.itc__edit:active:not(:disabled) {
		transform: scale(1.15);
	}

	.itc__edit:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.itc__editor {
		position: relative;
		z-index: 20;
		margin-block: 0.5rem;
		padding: 1rem;
		border-radius: 1rem;
		border: 1.4px solid var(--line, #d9e2ec);
		background: var(--card, #fff);
		box-shadow: var(--shadow-2, 0 12px 32px -12px rgba(0, 0, 0, 0.18));
		animation: itc-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	@media (min-width: 640px) {
		.itc__editor {
			margin-block: 1rem;
			padding: 1rem 2rem;
			border-radius: 0;
			box-shadow: none;
			border-left: 0;
			border-right: 0;
		}
	}

	@keyframes itc-in {
		from {
			opacity: 0;
			transform: translateY(6px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.itc__field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 1rem;
	}

	@media (min-width: 640px) {
		.itc__field {
			display: grid;
			grid-template-columns: 120px 1fr;
			align-items: center;
			gap: 0;
			margin-bottom: 1.25rem;
		}
	}

	.itc__label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}

	@media (min-width: 640px) {
		.itc__label {
			font-size: 0.875rem;
			text-transform: capitalize;
			letter-spacing: 0.02em;
		}
	}

	.itc__input-shell {
		display: flex;
		width: 100%;
		align-items: center;
		border-radius: 0.75rem;
		border: 1.6px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
		padding: 0.65rem 1rem;
		transition: border-color 0.15s ease;
	}

	.itc__input-shell:focus-within {
		border-color: var(--navy, #004c8b);
	}

	.itc__input {
		width: 100%;
		border: 0;
		background: transparent;
		outline: none;
		font-size: 1rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
	}

	@media (min-width: 640px) {
		.itc__input {
			font-size: 0.875rem;
		}
	}

	.itc__actions {
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.itc__btn {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		border: 0;
		border-radius: 0.75rem;
		font-size: 0.875rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.12s ease, opacity 0.12s ease;
	}

	.itc__btn:active {
		transform: scale(0.97);
	}

	@media (min-width: 640px) {
		.itc__btn {
			flex: none;
			padding-block: 0.5rem;
		}
	}

	.itc__btn--ghost {
		background: var(--surface-2, #f5f8fc);
		color: var(--slate, #5c6b7d);
	}

	.itc__btn--solid {
		background: var(--navy, #004c8b);
		color: #fff;
	}
</style>
