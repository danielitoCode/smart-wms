<script lang="ts">
	/**
	 * Host de toasts — montar una vez en el layout (fixed, sin portal DOM extra).
	 */
	import { onMount } from 'svelte';
	import { getToasts, subscribeToasts, type ToastItem } from './toast.store';
	import ToastCard from './ToastCard.svelte';

	interface Props {
		position?:
			| 'top-left'
			| 'top-center'
			| 'top-right'
			| 'bottom-left'
			| 'bottom-center'
			| 'bottom-right';
		gap?: number;
		width?: number;
	}

	let { position = 'bottom-right', gap = 10, width = 356 }: Props = $props();

	let items = $state<ToastItem[]>([]);
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
		items = getToasts();
		return subscribeToasts(() => {
			items = getToasts();
		});
	});

	const visible = $derived(items.slice(-5));
</script>

{#if mounted}
	<div
		class="tr"
		data-position={position}
		style="--tr-gap: {gap}px; --tr-w: {width}px"
		aria-live="polite"
		aria-relevant="additions"
	>
		{#each visible as t (t.id)}
			<div class="tr-item">
				<ToastCard
					toastId={t.id}
					type={t.type}
					title={t.title}
					description={t.description}
					action={t.action}
					dismissible={t.dismissible}
				/>
			</div>
		{/each}
	</div>
{/if}

<style>
	.tr {
		position: fixed;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: var(--tr-gap, 10px);
		width: min(var(--tr-w, 356px), calc(100vw - 1.5rem));
		pointer-events: none;
		padding: 1rem;
	}

	.tr[data-position='bottom-right'] { right: 0; bottom: 0; align-items: flex-end; }
	.tr[data-position='bottom-left'] { left: 0; bottom: 0; align-items: flex-start; }
	.tr[data-position='bottom-center'] {
		left: 50%; bottom: 0; transform: translateX(-50%); align-items: center;
	}
	.tr[data-position='top-right'] { right: 0; top: 0; align-items: flex-end; }
	.tr[data-position='top-left'] { left: 0; top: 0; align-items: flex-start; }
	.tr[data-position='top-center'] {
		left: 50%; top: 0; transform: translateX(-50%); align-items: center;
	}

	.tr-item {
		width: 100%;
		pointer-events: auto;
	}
</style>
