<script lang="ts">
	/**
	 * Lab detail — Tags
	 */
	import Tags from '../../../lib/components/Tags.svelte';
	import type { Tag } from '../../../lib/components/tags.types';

	const tags: Tag[] = [
		{ id: 'javascript', label: 'Javascript' },
		{ id: 'express', label: 'Express' },
		{ id: 'vue', label: 'Vue' },
		{ id: 'jest', label: 'Jest' },
		{ id: 'next', label: 'Next' },
		{ id: 'typescript', label: 'Typescript' },
		{ id: 'redis', label: 'Redis' },
		{ id: 'git', label: 'Git' },
		{ id: 'knockout', label: 'Knockout' },
		{ id: 'vite', label: 'Vite' },
		{ id: 'cypress', label: 'Cypress' },
		{ id: 'storybook', label: 'Storybook' },
		{ id: 'tailwind', label: 'Tailwind' },
		{ id: 'backbone', label: 'Backbone' },
		{ id: 'node', label: 'Node' }
	];
</script>

<svelte:head>
	<title>Tags · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">Tags</h1>
	<p class="detail-lead">
		Selector multi de chips: pool → bandeja de seleccionados. Migrado de React + Motion layout a Svelte
		5 + CSS.
	</p>
</section>

<section class="detail-stage">
	<Tags {tags} />
</section>

<style>
	.detail-intro {
		margin-bottom: 1rem;
	}

	.detail-back {
		display: inline-block;
		margin-bottom: 0.6rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--link, #004c8b);
		text-decoration: none;
	}

	.detail-back:hover {
		text-decoration: underline;
	}

	.detail-title {
		margin: 0 0 0.4rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.4rem, 2.6vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--head-ink, #012a50);
	}

	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}

	.detail-stage {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		min-height: 320px;
		padding: 1.5rem 1rem 2rem;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
	}
</style>
