<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createSplashState } from '../state/splashState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const splash = createSplashState();

	const MIN_VISIBLE_MS = 700;

	onMount(() => {
		void run();
	});

	async function run() {
		const started = Date.now();
		await splash.bootstrap();
		const elapsed = Date.now() - started;
		if (elapsed < MIN_VISIBLE_MS) {
			await new Promise((r) => setTimeout(r, MIN_VISIBLE_MS - elapsed));
		}
		await navigateFromOutcome();
	}

	async function navigateFromOutcome() {
		const result = splash.outcome;
		if (!result) return;

		if (result.kind === 'home') {
			await goto(result.path, { replaceState: true });
			return;
		}

		if (result.kind === 'login') {
			await goto('/login', { replaceState: true });
			return;
		}

		// error: se queda en splash con reintento
	}

	async function retry() {
		await run();
	}
</script>

<section class="splash" aria-busy={splash.status === 'checking'} aria-live="polite">
	<div class="panel">
		<img
			class="mark"
			src="/brand/abellis_mark_principal.svg"
			width="72"
			height="72"
			alt="Abellis"
		/>
		<p class="eyebrow">ABELLIS</p>
		<h1>Smart WMS</h1>
		<p class="lead">{i18n.t('Preparando el entorno de almacén…')}</p>

		{#if splash.status === 'checking' || splash.status === 'idle'}
			<div class="spinner" role="status" aria-label={i18n.t('Validando sesión')}></div>
			<p class="status">{i18n.t('Comprobando sesión…')}</p>
		{:else if splash.status === 'error'}
			<p class="error" role="alert">{splash.message ?? i18n.t('No se pudo validar la sesión')}</p>
			<button type="button" class="primary" onclick={() => void retry()}>{i18n.t('Reintentar')}</button>
			<button type="button" class="ghost" onclick={() => void goto('/login', { replaceState: true })}
				>{i18n.t('Ir al login')}</button
			>
		{:else}
			<p class="status">{i18n.t('Redirigiendo…')}</p>
		{/if}
	</div>
</section>

<style>
	.splash {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background:
			radial-gradient(ellipse at 20% 10%, rgba(143, 180, 218, 0.18), transparent 55%),
			radial-gradient(ellipse at 80% 90%, rgba(201, 162, 39, 0.12), transparent 50%),
			var(--bg, #f4f7fb);
		color: var(--ink, #0f1c2e);
	}

	.panel {
		width: min(22rem, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.55rem;
		text-align: center;
		animation: fade-in 220ms ease-out;
	}

	.mark {
		display: block;
		margin-bottom: 0.35rem;
	}

	.eyebrow {
		margin: 0;
		font: 600 0.68rem var(--disp, system-ui);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--navy, #0b3a5b);
	}

	h1 {
		margin: 0;
		font: 700 1.65rem var(--disp, system-ui);
		letter-spacing: -0.02em;
		color: var(--navy-deep, #011222);
	}

	.lead,
	.status {
		margin: 0;
		color: var(--slate, #5b6b7c);
		font: 500 0.92rem var(--body, system-ui);
	}

	.error {
		margin: 0.4rem 0 0.2rem;
		color: var(--danger, #b42318);
		font-size: 0.9rem;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		margin: 0.75rem 0 0.15rem;
		border: 2.5px solid color-mix(in srgb, var(--navy, #0b3a5b) 18%, transparent);
		border-top-color: var(--gold, #c9a227);
		border-radius: 50%;
		animation: spin 0.75s linear infinite;
	}

	button {
		margin-top: 0.35rem;
		min-height: 42px;
		padding: 0.55rem 1.1rem;
		border: 1px solid var(--line, #d5dee8);
		border-radius: 10px;
		background: var(--surface, #fff);
		color: var(--ink, #0f1c2e);
		font: 600 0.88rem var(--body, system-ui);
		cursor: pointer;
	}

	button.primary {
		background: var(--navy, #0b3a5b);
		border-color: var(--navy, #0b3a5b);
		color: #fff;
	}

	button.ghost {
		background: transparent;
		color: var(--navy, #0b3a5b);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner,
		.panel {
			animation: none;
		}
	}
</style>
