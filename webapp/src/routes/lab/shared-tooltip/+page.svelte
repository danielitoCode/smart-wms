<script lang="ts">
	/**
	 * Lab detail — SharedTooltipAvatars
	 */
	import SharedTooltipAvatars from '../../../lib/components/SharedTooltipAvatars.svelte';
	import type { AvatarItem } from '../../../lib/components/sharedTooltipAvatars.types';

	const items: AvatarItem[] = [
		{ id: '1', name: 'Alice', image: 'https://i.pravatar.cc/150?u=alice' },
		{ id: '2', name: 'Bob', image: 'https://i.pravatar.cc/150?u=bob' },
		{ id: '3', name: 'Chloe', image: 'https://i.pravatar.cc/150?u=chloe' },
		{ id: '4', name: 'Diego', image: 'https://i.pravatar.cc/150?u=diego' },
		{ id: '5', name: 'Elena', image: 'https://i.pravatar.cc/150?u=elena' }
	];
</script>

<svelte:head>
	<title>SharedTooltipAvatars · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">SharedTooltipAvatars</h1>
	<p class="detail-lead">
		Stack de avatares solapados con un único tooltip flotante compartido. Migrado de React + Framer a
		Svelte 5 + CSS.
	</p>
</section>

<section class="detail-stage">
	<SharedTooltipAvatars {items} />
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
		align-items: center;
		justify-content: center;
		min-height: 220px;
		border-radius: 16px;
		border: 1.5px solid var(--line, #d9e2ec);
		background: var(--surface-2, #f5f8fc);
		padding: 1rem;
	}
</style>
