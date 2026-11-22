<script lang="ts">
	import DeliveryCard from '../../../lib/components/DeliveryCard.svelte';
</script>

<svelte:head>
	<title>DeliveryCard · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">DeliveryCard</h1>
	<p class="detail-lead">
		Tarjeta de tracking: ETA, barra de progreso con camión, estado y ubicación. Modo demo con
		simulación de avance.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Static</h2>
	<div class="detail-stage row">
		<DeliveryCard progress={12} arrivalTime="11:40" location="Barcelona DC" timeAgo="12 min" />
		<DeliveryCard progress={42} arrivalTime="09:26" location="Pokhara" timeAgo="30 min" />
		<DeliveryCard progress={88} arrivalTime="14:05" location="Milano Hub" timeAgo="5 min" />
		<DeliveryCard progress={100} arrivalTime="08:12" location="Madrid Norte" timeAgo="1 h" />
	</div>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Simulate progress</h2>
	<div class="detail-stage row">
		<DeliveryCard
			simulateProgress
			progress={10}
			arrivalTime="16:20"
			location="Valencia Port"
			timeAgo="8 min"
		/>
	</div>
</section>

<style>
	.detail-intro { margin-bottom: 1.75rem; }
	.detail-back {
		display: inline-block; margin-bottom: 0.65rem; font-size: 0.8125rem; font-weight: 600;
		color: var(--navy, #004c8b); text-decoration: none;
	}
	.detail-back:hover { text-decoration: underline; }
	.detail-title {
		margin: 0 0 0.45rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: clamp(1.35rem, 2.5vw, 1.75rem); font-weight: 700; letter-spacing: -0.03em;
		color: var(--head-ink, #012a50);
	}
	.detail-lead {
		margin: 0; max-width: 42rem; font-size: 0.95rem; line-height: 1.55; color: var(--slate, #5c6b7d);
	}
	.detail-block { margin-bottom: 2rem; }
	.detail-h2 {
		margin: 0 0 0.75rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem; font-weight: 700; color: var(--head-ink, #012a50);
	}
	.detail-stage {
		padding: 1.5rem; border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--bg, #edf2f8) 70%, transparent);
	}
	.row { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-start; }
</style>
