<script lang="ts">
	/**
	 * Lab detail — StickyCardStack
	 */
	import StickyCardStack from '../../../lib/components/StickyCardStack.svelte';
	import type { StickyCardItem } from '../../../lib/components/stickyCardStack.types';

	const projects: StickyCardItem[] = [
		{ title: 'Project 1', src: 'https://picsum.photos/seed/stk01/1000/600' },
		{ title: 'Project 2', src: 'https://picsum.photos/seed/stk02/1000/600' },
		{ title: 'Project 3', src: 'https://picsum.photos/seed/stk03/1000/600' },
		{ title: 'Project 4', src: 'https://picsum.photos/seed/stk04/1000/600' },
		{ title: 'Project 5', src: 'https://picsum.photos/seed/stk05/1000/600' }
	];
</script>

<svelte:head>
	<title>StickyCardStack · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">StickyCardStack</h1>
	<p class="detail-lead">
		Stack de cards sticky: al hacer scroll cada una se escala hacia atrás. Migrado de Framer Motion
		+ Lenis a Svelte 5 (scroll nativo + rAF).
	</p>
</section>

<div class="detail-stage">
	<StickyCardStack items={projects} />
</div>

<style>
	.detail-intro {
		margin-bottom: 0.5rem;
		padding-inline: 0.25rem;
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
		margin-inline: -1.25rem;
	}

	@media (min-width: 640px) {
		.detail-stage {
			margin-inline: -1.75rem;
		}
	}
</style>
