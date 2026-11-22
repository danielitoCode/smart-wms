<script lang="ts">
	/**
	 * TransactionList — lista ↔ detalle con transición CSS.
	 * Port Svelte 5 (sin Motion layoutId).
	 */
	export type CardType = 'visa' | 'mastercard';
	export type TxIcon = 'receipt' | 'signal' | 'chef';

	export interface Transaction {
		id: string;
		name: string;
		type: string;
		amount: number;
		date: string;
		time: string;
		icon: TxIcon;
		paymentMethod: string;
		cardLastFour: string;
		cardType?: CardType;
	}

	interface Props {
		transactions: Transaction[];
		class?: string;
	}

	let { transactions, class: className = '' }: Props = $props();

	let selectedId = $state<string | null>(null);
	const selected = $derived(transactions.find((t) => t.id === selectedId) ?? null);

	function select(id: string) {
		selectedId = id;
	}
	function clear() {
		selectedId = null;
	}
	function fmt(amount: number) {
		return `$${Math.abs(amount).toFixed(2)}`;
	}
</script>

{#snippet iconSvg(name: TxIcon)}
	{#if name === 'signal'}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
			><path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" /><path d="M22 4v16" /></svg
		>
	{:else if name === 'chef'}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
			><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" /><path d="M6 17h12" /></svg
		>
	{:else}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
			><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5V14" /></svg
		>
	{/if}
{/snippet}

<div class="tx {className}">
	<div class="tx-card" class:tx-card--detail={!!selected}>
		{#if !selected}
			<div class="tx-list">
				<h2 class="tx-title">Transactions</h2>
				<div class="tx-rows">
					{#each transactions as t (t.id)}
						<button type="button" class="tx-row" onclick={() => select(t.id)}>
							<div class="tx-row-left">
								<div class="tx-icon">{render iconSvg(t.icon)}</div>
								<div class="tx-meta">
									<p class="tx-name">{t.name}</p>
									<p class="tx-type">{t.type}</p>
								</div>
							</div>
							<p class="tx-amount">{fmt(t.amount)}</p>
						</button>
					{/each}
				</div>
				<div class="tx-footer">
					<button type="button" class="tx-all">
						All Transactions
						<svg class="tx-all-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
						>
					</button>
				</div>
			</div>
		{:else}
			<div class="tx-detail">
				<div class="tx-detail-top">
					<div class="tx-icon tx-icon--lg">{render iconSvg(selected.icon)}</div>
					<button type="button" class="tx-close" onclick={clear} aria-label="Close">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
						>
					</button>
				</div>
				<div class="tx-detail-head">
					<div>
						<p class="tx-name tx-name--lg">{selected.name}</p>
						<p class="tx-type">{selected.type}</p>
					</div>
					<p class="tx-amount tx-amount--lg">{fmt(selected.amount)}</p>
				</div>
				<div class="tx-detail-body">
					<div class="tx-info">
						<p>#{selected.id}</p>
						<p>{selected.date}</p>
						<p>{selected.time}</p>
					</div>
					<div class="tx-pay">
						<p class="tx-pay-label">Paid Via {selected.paymentMethod}</p>
						<div class="tx-pay-row">
							<svg class="tx-card-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
								><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg
							>
							<span>XXXX {selected.cardLastFour}</span>
							{#if selected.cardType === 'visa'}
								<svg class="tx-brand tx-brand--visa" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 83" aria-hidden="true">
									<path fill="#1a1f71" d="M132.397 56.24c-.146-11.516 10.263-17.942 18.104-21.763c8.056-3.92 10.762-6.434 10.73-9.94c-.06-5.365-6.426-7.733-12.383-7.825c-10.393-.161-16.436 2.806-21.24 5.05l-3.744-17.519c4.82-2.221 13.745-4.158 23-4.243c21.725 0 35.938 10.724 36.015 27.351c.085 21.102-29.188 22.27-28.988 31.702c.069 2.86 2.798 5.912 8.778 6.688c2.96.392 11.131.692 20.395-3.574l3.636 16.95c-4.982 1.814-11.385 3.551-19.357 3.551c-20.448 0-34.83-10.87-34.946-26.428m89.241 24.968c-3.967 0-7.31-2.314-8.802-5.865L181.803 1.245h21.709l4.32 11.939h26.528l2.506-11.939H256l-16.697 79.963zm3.037-21.601l6.265-30.027h-17.158zm-118.599 21.6L88.964 1.246h20.687l17.104 79.963zm-30.603 0L53.941 26.782l-8.71 46.277c-1.022 5.166-5.058 8.149-9.54 8.149H.493L0 78.886c7.226-1.568 15.436-4.097 20.41-6.803c3.044-1.653 3.912-3.098 4.912-7.026L41.819 1.245H63.68l33.516 79.963z" transform="matrix(1 0 0 -1 0 82.668)" />
								</svg>
							{:else}
								<svg class="tx-brand tx-brand--mc" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 199" aria-hidden="true">
									<path fill="#eb001b" d="M97.689 79.029c0-25.245 11.854-47.637 30.074-62.126C114.373 6.366 97.47 0 79.03 0C35.343 0 0 35.343 0 79.029s35.343 79.029 79.029 79.029c18.44 0 35.343-6.366 48.734-16.904c-18.22-14.269-30.074-36.88-30.074-62.125" />
									<path fill="#f79e1b" d="M255.746 79.029c0 43.685-35.343 79.029-79.029 79.029c-18.44 0-35.343-6.366-48.734-16.904c18.44-14.488 30.075-36.88 30.075-62.125s-11.855-47.637-30.075-62.126C141.373 6.366 158.277 0 176.717 0c43.686 0 79.03 35.563 79.03 79.029" />
									<path fill="#ff5f00" d="M93.298 16.903h69.15v124.251h-69.15z" />
								</svg>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.tx { margin-inline: auto; max-width: 20rem; font-family: system-ui, -apple-system, sans-serif; }
	.tx-card {
		width: 300px; overflow: hidden; border-radius: 1.5rem; background: #fff;
		box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1), 0 2px 8px rgba(15, 23, 42, 0.04);
	}
	:global(.dark) .tx-card, :global([data-theme='dark']) .tx-card {
		background: color-mix(in srgb, var(--card, #1a1a1e) 96%, #fff);
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
	}
	.tx-list, .tx-detail { animation: tx-fade 180ms ease both; }
	@keyframes tx-fade {
		from { opacity: 0; transform: translateY(6px); }
		to { opacity: 1; transform: none; }
	}
	.tx-title { margin: 0; padding: 1rem 0 0 1.5rem; font-size: 1.125rem; font-weight: 600; color: #9ca3af; }
	.tx-rows { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.125rem; }
	.tx-row {
		display: flex; width: 100%; align-items: center; justify-content: space-between;
		border: 0; border-radius: 1rem; padding: 0.5rem; background: transparent;
		cursor: pointer; text-align: left; transition: background 150ms ease;
	}
	.tx-row:hover { background: #f9fafb; }
	:global(.dark) .tx-row:hover, :global([data-theme='dark']) .tx-row:hover {
		background: color-mix(in srgb, #fff 6%, transparent);
	}
	.tx-row-left { display: flex; align-items: center; gap: 0.75rem; }
	.tx-icon {
		display: flex; height: 2.5rem; width: 2.5rem; align-items: center; justify-content: center;
		border-radius: 9999px; background: #0a0a0a; color: #fff; flex-shrink: 0;
	}
	.tx-icon :global(svg) { width: 1.25rem; height: 1.25rem; }
	.tx-icon--lg { height: 3rem; width: 3rem; border-radius: 1rem; }
	.tx-icon--lg :global(svg) { width: 1.5rem; height: 1.5rem; }
	.tx-name { margin: 0; font-size: 0.875rem; font-weight: 500; color: #1f2937; }
	.tx-name--lg { font-size: 1rem; }
	:global(.dark) .tx-name, :global([data-theme='dark']) .tx-name { color: #e5e7eb; }
	.tx-type { margin: 0; font-size: 0.75rem; color: #9ca3af; }
	.tx-amount { margin: 0; font-size: 0.875rem; font-weight: 600; color: #6b7280; }
	.tx-amount--lg { font-size: 1.125rem; font-weight: 700; color: #374151; }
	:global(.dark) .tx-amount--lg, :global([data-theme='dark']) .tx-amount--lg { color: #d1d5db; }
	.tx-footer { padding: 0 0.75rem 0.75rem; }
	.tx-all {
		display: flex; width: 100%; align-items: center; justify-content: center; gap: 0.5rem;
		border: 0; border-radius: 0.75rem; background: #f3f4f6; padding: 0.625rem 0;
		font-size: 0.875rem; font-weight: 500; color: #4b5563; cursor: pointer;
		transition: transform 120ms ease, background 150ms ease;
	}
	.tx-all:hover { background: #e5e7eb; transform: scale(1.02); }
	.tx-all:active { transform: scale(0.98); }
	.tx-all-icon { width: 1rem; height: 1rem; }
	.tx-detail { padding: 1rem; }
	.tx-detail-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
	.tx-close {
		display: flex; height: 1.75rem; width: 1.75rem; align-items: center; justify-content: center;
		border: 0; border-radius: 9999px; background: #e5e7eb; color: #6b7280; cursor: pointer; padding: 0;
	}
	.tx-close:hover { background: #d1d5db; }
	.tx-close :global(svg) { width: 1rem; height: 1rem; }
	.tx-detail-head {
		display: flex; align-items: flex-start; justify-content: space-between;
		border-bottom: 1px dashed #e5e7eb; padding-bottom: 1rem;
	}
	.tx-detail-body { animation: tx-slide 250ms ease 80ms both; }
	@keyframes tx-slide {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: none; }
	}
	.tx-info { margin-top: 1rem; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; color: #9ca3af; }
	.tx-info p { margin: 0; }
	.tx-pay { margin-top: 1rem; border-top: 1px dashed #e5e7eb; padding-top: 1rem; font-size: 0.875rem; color: #9ca3af; }
	.tx-pay-label { margin: 0; font-weight: 500; color: #6b7280; }
	.tx-pay-row { margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
	.tx-card-icon { width: 1.25rem; height: 1.25rem; flex-shrink: 0; }
	.tx-brand--visa { height: 0.85rem; width: auto; }
	.tx-brand--mc { height: 1rem; width: auto; }
	@media (prefers-reduced-motion: reduce) {
		.tx-list, .tx-detail, .tx-detail-body { animation: none; }
		.tx-all { transition: none; }
	}
</style>
