<script lang="ts">
	import CollabCard from '../../../lib/components/CollabCard.svelte';
</script>

<svelte:head>
	<title>CollabCard · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">CollabCard</h1>
	<p class="detail-lead">
		Card multiplayer: presence, live ping, cursores animados y burst de click (CSS @container).
	</p>
</section>

<section class="detail-block">
	<div class="detail-stage">
		<div class="stage-inner">
			<CollabCard />
		</div>
	</div>
</section>

<style>
	.detail-intro { margin-bottom: 1.75rem; }
	.detail-back {
		display: inline-block;
		margin-bottom: 0.65rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0;
		max-width: 42rem;
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}
	.detail-block { margin-bottom: 2rem; }
	.detail-stage {
		padding: 1.25rem;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: #0a0a0c;
	}
	.stage-inner {
		max-width: 36rem;
		margin-inline: auto;
	}
</style>
