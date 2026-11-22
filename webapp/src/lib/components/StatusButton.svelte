<script lang="ts">
	/**
	 * StatusButton — CTA de 3 estados: idle → loading → success → idle.
	 * Port Svelte 5 (CSS transitions, sin Motion/Lucide).
	 */
	type Status = 'idle' | 'loading' | 'success';

	interface Props {
		idleLabel?: string;
		successLabel?: string;
		class?: string;
		onComplete?: () => void;
	}

	let {
		idleLabel = 'Add to cart',
		successLabel = 'Added to cart',
		class: className = '',
		onComplete
	}: Props = $props();

	let status = $state<Status>('idle');
	const isEnabled = $derived(status === 'idle');

	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

	async function changeStatus() {
		if (!isEnabled) return;
		status = 'loading';
		await wait(1500);
		status = 'success';
		onComplete?.();
		await wait(1500);
		status = 'idle';
	}
</script>

<button
	type="button"
	class="status-btn {className}"
	disabled={!isEnabled}
	onclick={changeStatus}
>
	<span class="status-btn__slot" data-key={status}>
		{#key status}
			{#if status === 'loading'}
				<svg class="status-btn__spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke-dasharray="4 4" />
				</svg>
			{:else if status === 'success'}
				<span class="status-btn__row">
					<span class="status-btn__check-wrap">
						<svg class="status-btn__check" viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="12" r="10" fill="white" />
							<path
								d="M9 12.5 11 14.5 15 10"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</span>
					{successLabel}
				</span>
			{:else}
				{idleLabel}
			{/if}
		{/key}
	</span>
</button>

<style>
	.status-btn {
		position: relative;
		height: 2.5rem;
		min-width: 10rem;
		overflow: hidden;
		border: none;
		border-radius: 0.375rem;
		background: #14b8a6;
		padding: 0 1.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #fff;
		cursor: pointer;
		transition: background-color 300ms ease;
	}

	.status-btn:hover:not(:disabled) {
		background: #0d9488;
	}

	.status-btn:disabled {
		cursor: default;
		opacity: 0.95;
	}

	.status-btn__slot {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
	}

	.status-btn__slot > :global(*) {
		animation: status-in 75ms ease-out;
	}

	@keyframes status-in {
		from {
			opacity: 0;
			transform: translateY(-15px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.status-btn__row {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
	}

	.status-btn__spin {
		width: 1rem;
		height: 1rem;
		animation: status-spin 0.9s linear infinite;
	}

	@keyframes status-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.status-btn__check-wrap {
		display: inline-flex;
		animation: status-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 75ms both;
	}

	@keyframes status-pop {
		from {
			transform: scale(0);
		}
		to {
			transform: scale(1);
		}
	}

	.status-btn__check {
		width: 1rem;
		height: 1rem;
		color: #14b8a6;
	}

	.status-btn:hover:not(:disabled) .status-btn__check {
		color: #0d9488;
	}

	@media (prefers-reduced-motion: reduce) {
		.status-btn__slot > :global(*),
		.status-btn__check-wrap,
		.status-btn__spin {
			animation: none;
		}
	}
</style>
