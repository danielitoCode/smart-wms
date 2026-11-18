<script lang="ts">
	/**
	 * Tags — multi-select chip picker (pool → selected tray).
	 * Migrated from React + motion/react layoutId to Svelte 5 + CSS (no Motion).
	 *
	 * Uso:
	 *   <Tags tags={[{ id, label }, ...]} />
	 */
	import type { Tag } from './tags.types';

	const DEFAULT_TAGS: Tag[] = [
		{ id: 'javascript', label: 'Javascript' },
		{ id: 'express', label: 'Express' },
		{ id: 'vue', label: 'Vue' },
		{ id: 'jest', label: 'Jest' },
		{ id: 'next', label: 'Next' },
		{ id: 'typescript', label: 'Typescript' },
		{ id: 'redis', label: 'Redis' },
		{ id: 'git', label: 'Git' },
		{ id: 'node', label: 'Node' }
	];

	interface Props {
		tags?: Tag[];
		class?: string;
	}

	let { tags = DEFAULT_TAGS, class: className = '' }: Props = $props();

	let selecteds = $state<Tag[]>([]);
	let selectedsEl = $state<HTMLDivElement | null>(null);

	const available = $derived(
		tags.filter((tag) => !selecteds.some((s) => s.id === tag.id))
	);

	$effect(() => {
		const n = selecteds.length;
		if (!selectedsEl || n === 0) return;
		selectedsEl.scrollTo({ left: selectedsEl.scrollWidth, behavior: 'smooth' });
	});

	function add(tag: Tag) {
		if (selecteds.some((s) => s.id === tag.id)) return;
		selecteds = [...selecteds, tag];
	}

	function remove(id: string) {
		selecteds = selecteds.filter((t) => t.id !== id);
	}
</script>

<div class="tags {className}">
	<h2 class="tags__title">TAGS</h2>

	<div class="tags__selected" bind:this={selectedsEl} aria-label="Selected tags">
		{#each selecteds as tag (tag.id)}
			<div class="tags__chip tags__chip--selected">
				<span class="tags__label">{tag.label}</span>
				<button
					type="button"
					class="tags__remove"
					title="Remove {tag.label}"
					aria-label="Remove {tag.label}"
					onclick={() => remove(tag.id)}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
					</svg>
				</button>
			</div>
		{/each}
	</div>

	{#if available.length > 0}
		<div class="tags__pool" aria-label="Available tags">
			<div class="tags__pool-inner">
				{#each available as tag (tag.id)}
					<button type="button" class="tags__chip tags__chip--pool" onclick={() => add(tag)}>
						<span class="tags__label">{tag.label}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.tags {
		position: relative;
		display: flex;
		width: min(100%, 340px);
		flex-direction: column;
		padding: 1.5rem;
	}

	@media (min-width: 640px) {
		.tags {
			width: min(100%, 24rem);
		}
	}

	.tags__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
	}

	.tags__selected {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		min-height: 3.5rem;
		width: 100%;
		margin-top: 0.5rem;
		margin-bottom: 0.75rem;
		padding: 0.375rem;
		border-radius: 1rem;
		border: 1.6px solid var(--line, #e5e5e5);
		background: var(--card, #fefefe);
		overflow-x: auto;
	}

	.tags__pool {
		width: 100%;
		padding: 0.5rem;
		border-radius: 1rem;
		border: 1.6px solid var(--line, #e5e5e5);
		background: var(--card, #fff);
	}

	.tags__pool-inner {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tags__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
		border-radius: 10px;
		font-weight: 500;
		color: #404040;
		transition: transform 0.12s ease, background 0.15s ease, opacity 0.2s ease;
		animation: tags-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.tags__chip--selected {
		border: 1.6px solid var(--line, #e5e5e5);
		background: #fff;
		padding: 0.25rem 0.25rem 0.25rem 0.75rem;
		z-index: 2;
	}

	.tags__chip--pool {
		border: 0;
		background: #f4f4fb;
		padding: 0.625rem 1rem;
		cursor: pointer;
		z-index: 1;
	}

	.tags__chip--pool:hover {
		transform: translateY(-1px);
		background: color-mix(in srgb, #f4f4fb 70%, var(--navy, #004c8b) 8%);
	}

	.tags__chip--pool:active {
		transform: scale(0.97);
	}

	.tags__label {
		font-size: 0.9375rem;
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tags__remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: #9ca3af;
		cursor: pointer;
		transition: color 0.15s ease, background 0.15s ease;
	}

	.tags__remove:hover {
		color: #525252;
		background: #f3f4f6;
	}

	@keyframes tags-in {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
