<script lang="ts">
	interface Props {
		title?: string;
		description?: string;
	}

	let {
		title = 'Listo',
		description = ''
	}: Props = $props();
</script>

<div class="pfs">
	<div class="pfs-icon" aria-hidden="true">
		<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
			<path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</div>
	<p class="pfs-title">{title}</p>
	{#if description}
		<p class="pfs-desc">{description}</p>
	{/if}
</div>

<style>
	.pfs {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		padding: 1.85rem 1.35rem;
		text-align: center;
		animation: pfs-in 0.42s cubic-bezier(0.34, 1.4, 0.64, 1) both;
	}

	@keyframes pfs-in {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.pfs-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 999px;
		background: color-mix(in srgb, #16a34a 14%, transparent);
		color: #15803d;
		margin-bottom: 0.25rem;
	}

	.pfs-title {
		margin: 0;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-weight: 700;
		font-size: 1rem;
		letter-spacing: -0.02em;
		color: var(--head-ink, #012a50);
	}

	.pfs-desc {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.45;
		color: var(--slate, #5c6b7d);
		max-width: 16rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.pfs {
			animation: none;
		}
	}
</style>
