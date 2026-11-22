<script lang="ts">
	import SwapTextCard from '../../../lib/components/SwapTextCard.svelte';
	import SwapText from '../../../lib/components/SwapText.svelte';
</script>

<svelte:head>
	<title>SwapText · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">SwapText / SwapTextCard</h1>
	<p class="detail-lead">
		Texto que intercambia capa al hover (desktop). En mobile se muestran ambas líneas. CSS, sin Motion.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Card</h2>
	<div class="detail-stage">
		<SwapTextCard
			initialText="Build beautiful interfaces"
			finalText="with less effort and more clarity for your team."
		/>
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Standalone (click toggle)</h2>
	<div class="detail-stage detail-stage--light">
		<SwapText
			initialText="Click me"
			finalText="Nice — toggled"
			class="standalone"
			initialTextClass="standalone-init"
			finalTextClass="standalone-final"
		/>
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
	.detail-h2 {
		margin: 0 0 0.75rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
	}
	.detail-stage {
		padding: 1.5rem;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 92%, transparent);
		display: flex;
		justify-content: center;
	}
	.detail-stage--light {
		background: #f9fafb;
	}
	.detail-stage :global(.standalone) {
		min-height: 3rem;
		min-width: 12rem;
	}
	.detail-stage :global(.standalone-init) {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
	}
	.detail-stage :global(.standalone-final) {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--slate, #5c6b7d);
	}
</style>
