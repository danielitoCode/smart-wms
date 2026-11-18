<script lang="ts">
	/**
	 * SharedTooltipAvatars — overlapping avatar stack with one shared floating tooltip.
	 * Migrated from React + framer-motion to Svelte 5 + CSS (no Motion).
	 *
	 * Uso:
	 *   <SharedTooltipAvatars items={[{ id, name, image }, ...]} />
	 */
	import type { AvatarItem } from './sharedTooltipAvatars.types';

	interface Props {
		items: AvatarItem[];
		class?: string;
	}

	let { items, class: className = '' }: Props = $props();

	let hoveredIndex = $state<number | null>(null);
	let tooltipLeft = $state(0);
	let tooltipTop = $state(0);
	let activeName = $state('');
	let rootEl = $state<HTMLDivElement | null>(null);
	let leaveTimer: ReturnType<typeof setTimeout> | null = null;

	function clearLeave() {
		if (leaveTimer) {
			clearTimeout(leaveTimer);
			leaveTimer = null;
		}
	}

	function handleEnter(index: number, el: HTMLElement) {
		clearLeave();
		const root = rootEl;
		if (!root) return;
		const rootRect = root.getBoundingClientRect();
		const rect = el.getBoundingClientRect();
		tooltipLeft = rect.left - rootRect.left + rect.width / 2;
		tooltipTop = rect.top - rootRect.top;
		activeName = items[index]?.name ?? '';
		hoveredIndex = index;
	}

	function handleLeave() {
		clearLeave();
		leaveTimer = setTimeout(() => {
			hoveredIndex = null;
			leaveTimer = null;
		}, 150);
	}
</script>

<div class="sta {className}" bind:this={rootEl} role="list">
	{#if hoveredIndex !== null}
		<div
			class="sta__tooltip"
			role="tooltip"
			style:left="{tooltipLeft}px"
			style:top="{tooltipTop - 12}px"
		>
			<span class="sta__tooltip-text">{activeName || '\u00A0'}</span>
		</div>
	{/if}

	{#each items as item, index (item.id)}
		<div
			class="sta__avatar"
			role="listitem"
			tabindex="0"
			onmouseenter={(e) => handleEnter(index, e.currentTarget)}
			onmouseleave={handleLeave}
			onfocus={(e) => handleEnter(index, e.currentTarget)}
			onblur={handleLeave}
		>
			<img class="sta__img" src={item.image} alt={item.name} width="56" height="56" />
		</div>
	{/each}
</div>

<style>
	.sta {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-block: 3rem;
	}

	.sta__tooltip {
		position: absolute;
		z-index: 50;
		translate: -50% -100%;
		padding: 0.375rem 0.875rem;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 50%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 70%, transparent);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--head-ink, #012a50);
		white-space: nowrap;
		pointer-events: none;
		transition: left 0.22s cubic-bezier(0.16, 1, 0.3, 1), top 0.22s cubic-bezier(0.16, 1, 0.3, 1);
		animation: sta-tip 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.sta__tooltip-text {
		display: inline-block;
		animation: sta-name 0.15s ease-out both;
	}

	.sta__avatar {
		position: relative;
		margin-left: -0.75rem;
		cursor: pointer;
		transition: transform 0.3s ease, z-index 0s;
		outline: none;
	}

	.sta__avatar:first-child {
		margin-left: 0;
	}

	.sta__avatar:hover,
	.sta__avatar:focus-visible {
		z-index: 10;
		transform: translateY(-0.5rem);
	}

	.sta__img {
		display: block;
		width: 3rem;
		height: 3rem;
		border-radius: 999px;
		object-fit: cover;
		border: 3px solid var(--card, #fff);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
		transition: box-shadow 0.3s ease;
	}

	.sta__avatar:hover .sta__img,
	.sta__avatar:focus-visible .sta__img {
		box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.25);
	}

	@media (min-width: 768px) {
		.sta__img {
			width: 3.5rem;
			height: 3.5rem;
		}
	}

	@keyframes sta-tip {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes sta-name {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
