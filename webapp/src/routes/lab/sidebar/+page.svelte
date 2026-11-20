<script lang="ts">
	/**
	 * Lab detail — AppSidebar
	 * Shell colapsable (icon rail) estilo shadcn SidebarProvider.
	 */
	import AppSidebar from '../../../lib/components/sidebar/AppSidebar.svelte';
</script>

<svelte:head>
	<title>AppSidebar · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">AppSidebar</h1>
	<p class="detail-lead">
		Shell de navegación colapsable a iconos: TeamSwitcher (almacén), NavMain, proyectos en curso y
		NavUser. Port del patrón Vue/shadcn SidebarProvider adaptado a Smart WMS y tokens Abellis.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Demo embebida</h2>
	<div class="detail-frame">
		<AppSidebar pathname="/receiving">
			<div class="demo-body">
				<p class="demo-kicker">SidebarInset</p>
				<h2>Vista de demostración</h2>
				<p>
					Usa el trigger del topbar o el rail derecho para colapsar a iconos. En móvil el menú
					actúa como drawer. Los datos son demo (data.ts); en producción se alimentan de i18n +
					AccessPolicy + warehouse context.
				</p>
			</div>
		</AppSidebar>
	</div>
</section>

<style>
	.detail-intro {
		margin-bottom: 1.75rem;
	}
	.detail-back {
		display: inline-block;
		margin-bottom: 0.65rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--navy, #004c8b);
		text-decoration: none;
	}
	.detail-back:hover {
		text-decoration: underline;
	}
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
	.detail-block {
		margin-bottom: 2rem;
	}
	.detail-h2 {
		margin: 0 0 0.75rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--head-ink, #012a50);
	}
	.detail-frame {
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		overflow: hidden;
		min-height: 520px;
		height: min(70vh, 640px);
	}
	.detail-frame :global(.as) {
		min-height: 100%;
		height: 100%;
	}
	.demo-body {
		max-width: 28rem;
	}
	.demo-kicker {
		margin: 0 0 0.35rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--navy, #004c8b);
	}
	.demo-body h2 {
		margin: 0 0 0.5rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.2rem;
		color: var(--head-ink, #012a50);
	}
	.demo-body p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
	}
</style>
