<script lang="ts">
	/**
	 * SpeedDial — FAB + menú de acciones con animación staggered por dirección.
	 * Port Svelte 5 (CSS keyframes, sin Motion).
	 */
	export type SpeedDialDirection = 'up' | 'down' | 'left' | 'right';

	export type SpeedDialIconName = 'copy' | 'edit' | 'share' | 'delete' | 'plus';

	export interface SpeedDialAction {
		key: string;
		label: string;
		icon: SpeedDialIconName;
		action: () => void;
	}

	interface Props {
		direction?: SpeedDialDirection;
		actionButtons: SpeedDialAction[];
		triggerLabel?: string;
		class?: string;
	}

	let {
		direction = 'right',
		actionButtons,
		triggerLabel = 'Open actions menu',
		class: className = ''
	}: Props = $props();

	let open = $state(false);
	let rootEl = $state<HTMLDivElement | null>(null);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let itemEls: Array<HTMLButtonElement | null> = [];

	function registerItem(node: HTMLButtonElement, index: number) {
		itemEls[index] = node;
		return {
			destroy() {
				if (itemEls[index] === node) itemEls[index] = null;
			}
		};
	}

	const menuId = `speed-dial-${Math.random().toString(36).slice(2, 9)}`;

	function close() {
		open = false;
		queueMicrotask(() => triggerEl?.focus());
	}

	function toggle() {
		open = !open;
	}

	$effect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			if (rootEl?.contains(event.target as Node)) return;
			open = false;
		};
		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	});

	$effect(() => {
		if (!open) return;
		queueMicrotask(() => itemEls[0]?.focus());
	});

	function arrowKeys(dir: SpeedDialDirection) {
		if (dir === 'up') return { prev: 'ArrowDown', next: 'ArrowUp' };
		if (dir === 'down') return { prev: 'ArrowUp', next: 'ArrowDown' };
		if (dir === 'left') return { prev: 'ArrowRight', next: 'ArrowLeft' };
		return { prev: 'ArrowLeft', next: 'ArrowRight' };
	}

	function focusItem(index: number) {
		const count = actionButtons.length;
		if (count === 0) return;
		const next = ((index % count) + count) % count;
		itemEls[next]?.focus();
	}

	function onMenuKeyDown(event: KeyboardEvent) {
		const { prev, next } = arrowKeys(direction);
		const activeIndex = itemEls.findIndex((n) => n === document.activeElement);

		switch (event.key) {
			case 'Escape':
				event.preventDefault();
				close();
				break;
			case 'Tab':
				open = false;
				break;
			case 'Home':
				event.preventDefault();
				itemEls[0]?.focus();
				break;
			case 'End':
				event.preventDefault();
				itemEls[actionButtons.length - 1]?.focus();
				break;
			default:
				if (event.key === prev) {
					event.preventDefault();
					focusItem(activeIndex <= 0 ? actionButtons.length - 1 : activeIndex - 1);
				} else if (event.key === next) {
					event.preventDefault();
					focusItem(activeIndex < 0 ? 0 : activeIndex + 1);
				}
		}
	}
</script>

{#snippet iconSvg(name: SpeedDialIconName)}
	{#if name === 'copy'}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
			><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg
		>
	{:else if name === 'edit'}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
			><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" /></svg
		>
	{:else if name === 'share'}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
			><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.59 13.51 6.83 3.98" /><path d="m15.41 6.51-6.82 3.98" /></svg
		>
	{:else if name === 'delete'}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
			><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg
		>
	{:else}
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"
			><path d="M5 12h14" /><path d="M12 5v14" /></svg
		>
	{/if}
{/snippet}

<div bind:this={rootEl} class="sd {className}" data-direction={direction}>
	<button
		bind:this={triggerEl}
		type="button"
		class="sd-btn sd-btn--trigger"
		aria-expanded={open}
		aria-haspopup="menu"
		aria-controls={menuId}
		aria-label={open ? 'Close actions menu' : triggerLabel}
		onclick={toggle}
	>
		<span class="sd-trigger-icon" class:sd-trigger-icon--open={open} aria-hidden="true">
			{@render iconSvg('plus')}
		</span>
	</button>

	{#if open}
		<ul
			id={menuId}
			class="sd-menu sd-menu--{direction}"
			role="menu"
			aria-orientation={direction === 'up' || direction === 'down' ? 'vertical' : 'horizontal'}
			onkeydown={onMenuKeyDown}
		>
			{#each actionButtons as action, index (action.key)}
				<li class="speed-dial-item" role="none" style="--i: {index}">
					<button
						type="button"
						class="sd-btn"
						role="menuitem"
						aria-label={action.label}
						use:registerItem={index}
						onclick={() => {
							action.action();
							close();
						}}
					>
						<span class="sd-sr">{action.label}</span>
						<span class="sd-icon" aria-hidden="true">
							{@render iconSvg(action.icon)}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.sd {
		position: relative;
		display: inline-flex;
	}

	.sd-btn {
		display: flex;
		width: 2.75rem;
		height: 2.75rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 80%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 85%, transparent);
		color: var(--head-ink, #012a50);
		box-shadow:
			0 10px 24px rgba(15, 23, 42, 0.08),
			0 2px 6px rgba(15, 23, 42, 0.04);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		transition:
			background 150ms ease,
			transform 100ms ease,
			color 150ms ease;
		touch-action: manipulation;
		cursor: pointer;
		padding: 0;
	}

	.sd-btn:hover {
		background: color-mix(in srgb, var(--navy, #004c8b) 8%, var(--card, #fff));
	}

	.sd-btn:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 2px var(--bg, #edf2f8),
			0 0 0 4px var(--navy, #004c8b);
	}

	.sd-btn:active {
		transform: scale(0.97);
	}

	.sd-btn--trigger {
		position: relative;
		z-index: 20;
	}

	.sd-trigger-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		transition: transform 150ms ease-out;
	}

	.sd-trigger-icon--open {
		transform: rotate(45deg);
	}

	.sd-trigger-icon :global(svg),
	.sd-icon :global(svg) {
		width: 1.25rem;
		height: 1.25rem;
	}

	.sd-icon {
		display: flex;
		width: 1.25rem;
		height: 1.25rem;
		align-items: center;
		justify-content: center;
	}

	.sd-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.sd-menu {
		position: absolute;
		z-index: 10;
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.sd-menu--up {
		bottom: 100%;
		left: 50%;
		margin-bottom: 0.5rem;
		transform: translateX(-50%);
		flex-direction: column-reverse;
	}

	.sd-menu--down {
		top: 100%;
		left: 50%;
		margin-top: 0.5rem;
		transform: translateX(-50%);
		flex-direction: column;
	}

	.sd-menu--left {
		right: 100%;
		top: 50%;
		margin-right: 0.5rem;
		transform: translateY(-50%);
		flex-direction: row-reverse;
	}

	.sd-menu--right {
		left: 100%;
		top: 50%;
		margin-left: 0.5rem;
		transform: translateY(-50%);
		flex-direction: row;
	}

	.speed-dial-item {
		list-style: none;
		animation-duration: 120ms;
		animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
		animation-fill-mode: both;
		animation-delay: calc(12ms + var(--i, 0) * 22ms);
	}

	:global([data-direction='up']) .speed-dial-item {
		animation-name: speed-dial-in-up;
	}
	:global([data-direction='down']) .speed-dial-item {
		animation-name: speed-dial-in-down;
	}
	:global([data-direction='left']) .speed-dial-item {
		animation-name: speed-dial-in-left;
	}
	:global([data-direction='right']) .speed-dial-item {
		animation-name: speed-dial-in-right;
	}

	@keyframes speed-dial-in-up {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.82);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@keyframes speed-dial-in-down {
		from {
			opacity: 0;
			transform: translateY(-10px) scale(0.82);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@keyframes speed-dial-in-left {
		from {
			opacity: 0;
			transform: translateX(10px) scale(0.82);
		}
		to {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}
	@keyframes speed-dial-in-right {
		from {
			opacity: 0;
			transform: translateX(-10px) scale(0.82);
		}
		to {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.speed-dial-item {
			animation: none;
			opacity: 1;
			transform: none;
		}
		.sd-trigger-icon {
			transition: none;
		}
	}
</style>
