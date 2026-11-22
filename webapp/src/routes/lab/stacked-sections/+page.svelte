<script lang="ts">
	import StackedSections from '../../../lib/components/StackedSections.svelte';
	import StackedSectionPane from '../../../lib/components/StackedSectionPane.svelte';

	const panes = [
		{
			title: 'Receiving',
			body: 'Scan ASN lines, confirm quantities and stage inbound pallets before putaway.',
			tone: 'navy'
		},
		{
			title: 'Putaway',
			body: 'Confirm bin destinations with barcode validation and same-bin guards.',
			tone: 'teal'
		},
		{
			title: 'Picking',
			body: 'Wave validate, create batches and walk pick paths with live task status.',
			tone: 'amber'
		},
		{
			title: 'Shipping',
			body: 'Load carriers, seal cartons and close the outbound dock with audit trail.',
			tone: 'rose'
		}
	] as const;
</script>

<svelte:head>
	<title>StackedSections · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">StackedSections</h1>
	<p class="detail-lead">
		Cartas sticky apiladas con efecto drama (scale) mientras la siguiente entra en pin. Patrón
		stacking-cards, sin Lenis ni Motion.
	</p>
</section>

<section class="detail-block">
	<p class="hint">Desplázate hacia abajo para ver el apilado.</p>
	<div class="detail-stage">
		<StackedSections stackOffset={56} scrollRunway="40vh" paneGap="0.75rem">
			{#each panes as pane, i}
				<StackedSectionPane index={i + 1}>
					<article class="pane pane--{pane.tone}">
						<span class="pane-kicker">Step {i + 1}</span>
						<h2 class="pane-title">{pane.title}</h2>
						<p class="pane-body">{pane.body}</p>
					</article>
				</StackedSectionPane>
			{/each}
		</StackedSections>
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
	.hint {
		margin: 0 0 0.75rem; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.04em;
		text-transform: uppercase; color: var(--slate, #5c6b7d);
	}
	.detail-stage {
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--bg, #edf2f8) 80%, transparent);
		padding: 1rem 1rem 0;
		min-height: 120vh;
	}
	.pane {
		border-radius: 1.25rem; padding: 1.75rem 1.5rem 2rem; min-height: 14rem;
		border: 1px solid color-mix(in srgb, #fff 40%, transparent);
		box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04);
		color: #0f172a;
	}
	.pane--navy { background: linear-gradient(145deg, #e8eef8 0%, #d5e3f5 100%); }
	.pane--teal { background: linear-gradient(145deg, #e6f5f2 0%, #c8ebe4 100%); }
	.pane--amber { background: linear-gradient(145deg, #fef3e2 0%, #fde4b8 100%); }
	.pane--rose { background: linear-gradient(145deg, #fce8ec 0%, #f5cdd6 100%); }
	.pane-kicker {
		display: inline-block; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
		text-transform: uppercase; opacity: 0.65; margin-bottom: 0.5rem;
	}
	.pane-title {
		margin: 0 0 0.5rem; font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;
	}
	.pane-body { margin: 0; max-width: 28rem; font-size: 0.95rem; line-height: 1.55; opacity: 0.85; }
</style>
