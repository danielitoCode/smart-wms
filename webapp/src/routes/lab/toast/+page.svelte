<script lang="ts">
	/**
	 * Lab — Rare-style toasts (squircle + glyph + promise).
	 */
	import { toast } from '../../../lib/components/toast/toast.store';
	import Toaster from '../../../lib/components/toast/Toaster.svelte';

	function runPromise() {
		toast.promise(
			() =>
				new Promise<{ ok: true }>((resolve, reject) => {
					setTimeout(() => {
						if (Math.random() > 0.35) resolve({ ok: true });
						else reject(new Error('Fallo de red'));
					}, 1800);
				}),
			{
				loading: 'Publicando ola…',
				success: 'Ola publicada',
				error: (e) => (e instanceof Error ? e.message : 'Error inesperado')
			}
		);
	}
</script>

<svelte:head>
	<title>Toast · Component Lab</title>
</svelte:head>

<section class="detail-intro">
	<a class="detail-back" href="/lab">← Lab</a>
	<h1 class="detail-title">Toast</h1>
	<p class="detail-lead">
		Toasts con clip squircle, tile de icono animado y API tipo Sonner (success / error / promise).
		Port Svelte 5 sin motion/react ni figma-squircle; listo para montar <code>Toaster</code> en el layout.
	</p>
</section>

<section class="detail-block">
	<h2 class="detail-h2">Disparar</h2>
	<div class="detail-stage">
		<div class="tl-grid">
			<button type="button" class="tl-btn" onclick={() => toast('Mensaje neutro', { description: 'Sin tono especial.' })}>
				Default
			</button>
			<button type="button" class="tl-btn tl-btn--ok" onclick={() => toast.success('Recepción confirmada', { description: 'ASN-1042 cerrado.' })}>
				Success
			</button>
			<button type="button" class="tl-btn tl-btn--err" onclick={() => toast.error('No se pudo validar', { description: 'El bin destino no está autorizado.' })}>
				Error
			</button>
			<button type="button" class="tl-btn tl-btn--warn" onclick={() => toast.warning('Stock bajo', { description: 'SKU-88 bajo el mínimo en Nave 2.' })}>
				Warning
			</button>
			<button type="button" class="tl-btn tl-btn--info" onclick={() => toast.info('Contexto de almacén', { description: 'Peticiones acotadas a Nave Madrid.' })}>
				Info
			</button>
			<button type="button" class="tl-btn" onclick={() => toast.loading('Sincronizando…', { duration: 2500 })}>
				Loading
			</button>
			<button
				type="button"
				class="tl-btn tl-btn--action"
				onclick={() =>
					toast.success('Listo para despachar', {
						description: '12 bultos en muelle B.',
						action: { label: 'Ver', onClick: () => console.log('ver') }
					})}
			>
				Con acción
			</button>
			<button type="button" class="tl-btn tl-btn--promise" onclick={runPromise}>
				Promise
			</button>
		</div>
	</div>
</section>

<Toaster position="bottom-right" />

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
		padding: 1.25rem;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 88%, transparent);
		background: color-mix(in srgb, var(--card, #fff) 80%, transparent);
	}
	.tl-grid { display: flex; flex-wrap: wrap; gap: 0.55rem; }
	.tl-btn {
		padding: 0.5rem 0.9rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		background: var(--card, #fff);
		color: var(--head-ink, #012a50);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 650;
		cursor: pointer;
		transition: transform 0.15s ease, border-color 0.15s ease;
	}
	.tl-btn:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--navy, #004c8b) 35%, transparent);
	}
	.tl-btn--ok {
		background: color-mix(in srgb, #34c759 12%, #fff);
		border-color: color-mix(in srgb, #34c759 35%, transparent);
	}
	.tl-btn--err {
		background: color-mix(in srgb, #ff3b30 10%, #fff);
		border-color: color-mix(in srgb, #ff3b30 30%, transparent);
	}
	.tl-btn--warn {
		background: color-mix(in srgb, #ff9500 12%, #fff);
		border-color: color-mix(in srgb, #ff9500 35%, transparent);
	}
	.tl-btn--info {
		background: color-mix(in srgb, var(--navy, #004c8b) 10%, #fff);
		border-color: color-mix(in srgb, var(--navy, #004c8b) 30%, transparent);
	}
	.tl-btn--action,
	.tl-btn--promise {
		background: var(--navy, #004c8b);
		color: #fff;
		border-color: transparent;
	}
</style>
