<script lang="ts">
	/**
	 * HoverExpand — horizontal image strip that expands on hover/click.
	 * Migrated from React + Framer Motion to Svelte 5.
	 * Tokens Abellis; pure CSS transitions (no motion lib).
	 *
	 * Uso:
	 *   <HoverExpand images={items} />
	 *   <HoverExpand images={items} initialActive={0} />
	 */
	import type { HoverExpandImage } from './hoverExpand.types';

	interface Props {
		images: HoverExpandImage[];
		/** Index expanded on first paint (null = none). Default 1. */
		initialActive?: number | null;
		class?: string;
	}

	let {
		images,
		initialActive = 1,
		class: className = ''
	}: Props = $props();

	let activeIndex = $state<number | null>(
		initialActive === undefined ? 1 : initialActive
	);

	function activate(index: number) {
		activeIndex = index;
	}

	function onKeydown(e: KeyboardEvent, index: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			activate(index);
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			const next = Math.min(images.length - 1, (activeIndex ?? index) + 1);
			activate(next);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			const prev = Math.max(0, (activeIndex ?? index) - 1);
			activate(prev);
		}
	}
</script>

<div class="he {className}">
	<div class="he__row" role="list">
		{#each images as image, index (image.src + index)}
			<button
				type="button"
				class="he__panel"
				class:he__panel--active={activeIndex === index}
				role="listitem"
				aria-pressed={activeIndex === index}
				aria-label={image.alt || `Image ${index + 1}`}
				onmouseenter={() => activate(index)}
				onclick={() => activate(index)}
				onkeydown={(e) => onKeydown(e, index)}
			>
				<img class="he__img" src={image.src} alt={image.alt} loading="lazy" />
				{#if activeIndex === index}
					<div class="he__shade" aria-hidden="true"></div>
					{#if image.code}
						<div class="he__caption">
							<span class="he__code">{image.code}</span>
						</div>
					{/if}
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.he {
		position: relative;
		width: 100%;
		max-width: 72rem;
		padding-inline: 1.25rem;
		margin-inline: auto;
	}

	.he__row {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
	}

	.he__panel {
		position: relative;
		flex: 0 0 auto;
		width: 5rem;
		height: 24rem;
		padding: 0;
		margin: 0;
		border: 0;
		border-radius: 1.5rem;
		overflow: hidden;
		cursor: pointer;
		background: var(--surface-3, #e7eef6);
		color: inherit;
		transition:
			width 300ms ease-in-out,
			box-shadow 200ms ease;
	}

	.he__panel--active {
		width: min(24rem, 70vw);
		box-shadow: var(--shadow-3, 0 22px 48px rgba(10, 30, 60, 0.16));
	}

	.he__panel:focus-visible {
		outline: none;
		box-shadow: var(--focus, 0 0 0 3px rgba(233, 165, 11, 0.38));
	}

	.he__img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	.he__shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.4), transparent);
		pointer-events: none;
		animation: he-fade 200ms ease;
	}

	.he__caption {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		justify-content: flex-end;
		padding: 1rem;
		pointer-events: none;
		animation: he-fade 200ms ease;
	}

	.he__code {
		font-size: 0.75rem;
		line-height: 1.2;
		color: rgba(255, 255, 255, 0.55);
		font-family: var(--body, Inter, system-ui, sans-serif);
	}

	@keyframes he-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (max-width: 640px) {
		.he__panel {
			width: 2.75rem;
			height: 16rem;
		}
		.he__panel--active {
			width: min(14rem, 55vw);
			height: 16rem;
		}
	}
</style>
