<script lang="ts">
	interface Props {
		loading?: boolean;
		text?: string;
		disabled?: boolean;
		type?: 'button' | 'submit';
		onclick?: (e: MouseEvent) => void;
	}

	let {
		loading = false,
		text = 'Enviar',
		disabled = false,
		type = 'submit',
		onclick
	}: Props = $props();
</script>

<button
	class="pfb"
	{type}
	disabled={disabled || loading}
	aria-busy={loading}
	{onclick}
>
	{#if loading}
		<span class="pfb-spin" aria-hidden="true"></span>
		<span class="pfb-label">{text}…</span>
	{:else}
		<span class="pfb-label">{text}</span>
	{/if}
</button>

<style>
	.pfb {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		width: 100%;
		padding: 0.55rem 1rem;
		border: none;
		border-radius: 999px;
		background: var(--navy, #004c8b);
		color: #fff;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 650;
		font-size: 0.8125rem;
		letter-spacing: -0.01em;
		cursor: pointer;
		box-shadow: 0 6px 16px color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
		transition:
			transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
			box-shadow 0.25s ease,
			opacity 0.2s ease;
	}

	.pfb:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 10px 22px color-mix(in srgb, var(--navy, #004c8b) 32%, transparent);
	}

	.pfb:active:not(:disabled) {
		transform: translateY(0) scale(0.98);
	}

	.pfb:disabled {
		opacity: 0.72;
		cursor: wait;
	}

	.pfb-spin {
		width: 0.9rem;
		height: 0.9rem;
		border: 2px solid color-mix(in srgb, #fff 35%, transparent);
		border-top-color: #fff;
		border-radius: 999px;
		animation: pfb-spin 0.7s linear infinite;
	}

	@keyframes pfb-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pfb-spin {
			animation: none;
			border-top-color: #fff;
			opacity: 0.7;
		}
		.pfb {
			transition: none;
		}
	}
</style>
