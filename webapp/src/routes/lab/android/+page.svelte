<script lang="ts">
	/**
	 * Lab detail — Android
	 */
	import Android from '../../../lib/components/Android.svelte';

	const demoSrc =
		'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=1600&fit=crop';
</script>

<svelte:head>
	<title>Android · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">Android</h1>
	<p class="detail-lead">
		Marco SVG de teléfono Android con botones laterales, cámara superior y recorte de pantalla.
		Acepta <code>src</code> o <code>videoSrc</code>. Port Svelte 5 de Magic UI.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Con imagen</h2>
	<div class="detail-stage">
		<div class="phone-wrap">
			<Android src={demoSrc} width={280} height={570} />
		</div>
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Sin media</h2>
	<div class="detail-stage">
		<div class="phone-wrap phone-wrap--sm">
			<Android width={200} height={407} />
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
	.detail-lead code {
		font-size: 0.85em;
		padding: 0.1em 0.35em;
		border-radius: 4px;
		background: color-mix(in srgb, var(--navy, #004c8b) 8%, transparent);
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
		padding: 1.5rem 1rem;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--bg, #edf2f8) 80%, transparent);
		display: flex;
		justify-content: center;
	}
	.phone-wrap {
		width: 100%;
		max-width: 16rem;
	}
	.phone-wrap--sm {
		max-width: 12rem;
	}
</style>
