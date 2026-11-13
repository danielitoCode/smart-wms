<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createSplashState } from '../state/splashState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const splash = createSplashState();

	const MIN_VISIBLE_MS = 900;

	/** Mensajes de progreso: sensación de carga de entorno pesado. */
	const PHASE_KEYS = [
		'Estableciendo canal seguro…',
		'Comprobando sesión y permisos…',
		'Sincronizando catálogo de almacén…',
		'Cargando preferencias operativas…',
		'Preparando el escritorio…'
	] as const;

	let phaseIndex = $state(0);
	let phaseTimer: ReturnType<typeof setInterval> | null = null;

	const phaseLabel = $derived(i18n.t(PHASE_KEYS[phaseIndex] ?? PHASE_KEYS[0]));

	function startPhases() {
		phaseIndex = 0;
		stopPhases();
		phaseTimer = setInterval(() => {
			phaseIndex = Math.min(phaseIndex + 1, PHASE_KEYS.length - 1);
		}, 480);
	}

	function stopPhases() {
		if (phaseTimer) {
			clearInterval(phaseTimer);
			phaseTimer = null;
		}
	}

	onMount(() => {
		void run();
		return () => stopPhases();
	});

	async function run() {
		startPhases();
		const started = Date.now();
		await splash.bootstrap();
		const elapsed = Date.now() - started;
		if (elapsed < MIN_VISIBLE_MS) {
			await new Promise((r) => setTimeout(r, MIN_VISIBLE_MS - elapsed));
		}
		stopPhases();
		phaseIndex = PHASE_KEYS.length - 1;
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
			<p class="phase">{phaseLabel}</p>
			<ul class="pipeline" aria-hidden="true">
				{#each PHASE_KEYS as key, i}
					<li class:done={i < phaseIndex} class:active={i === phaseIndex}></li>
				{/each}
			</ul>
		{:else if splash.status === 'error'}
			<p class="error" role="alert">{splash.message ?? i18n.t('No se pudo validar la sesión')}</p>
			<button type="button" class="primary" onclick={() => void retry()}>{i18n.t('Reintentar')}</button>
			<button type="button" class="ghost" onclick={() => void goto('/login', { replaceState: true })}
				>{i18n.t('Ir al login')}</button
			>
		{:else}
			<p class="status">{i18n.t('Redirigiendo…')}</p>
			<p class="phase">{i18n.t('Abriendo el módulo asignado…')}</p>
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
			radial-gradient(ellipse at 20% 10%, color-mix(in srgb, var(--lightblue, #8fb4da) 28%, transparent), transparent 55%),
			radial-gradient(ellipse at 80% 90%, color-mix(in srgb, var(--gold, #e9a50b) 16%, transparent), transparent 50%),
			var(--bg);
		color: var(--ink);
	}

	.panel {
		width: min(22rem, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		text-align: center;
		animation: fade-in var(--motion-page, 320ms) var(--ease-out, ease) both;
	}

	.mark {
		display: block;
		margin-bottom: 0.35rem;
	}

	.eyebrow {
		margin: 0;
		font: 600 var(--fs-xs, 0.72rem) var(--disp, system-ui);
		letter-spacing: var(--tracking-label, 0.14em);
		text-transform: uppercase;
		color: var(--navy);
	}

	h1 {
		margin: 0;
		font: 700 var(--fs-2xl, 1.65rem) / var(--lh-tight, 1.2) var(--disp, system-ui);
		letter-spacing: var(--tracking-display, -0.02em);
		color: var(--head-ink, var(--navy-deep));
	}

	.lead,
	.status {
		margin: 0;
		color: var(--slate);
		font: 500 var(--fs-md, 0.92rem) var(--body, system-ui);
	}

	.phase {
		margin: 0.15rem 0 0;
		min-height: 1.15em;
		color: var(--muted, var(--slate));
		font: 500 var(--fs-xs, 0.72rem) / 1.4 var(--body, system-ui);
		letter-spacing: 0.02em;
	}

	.pipeline {
		display: flex;
		gap: 0.35rem;
		margin: 0.65rem 0 0;
		padding: 0;
		list-style: none;
	}

	.pipeline li {
		width: 1.65rem;
		height: 3px;
		border-radius: 99px;
		background: var(--line);
		transition: background var(--motion-fast, 140ms) ease;
	}

	.pipeline li.active {
		background: var(--gold);
	}

	.pipeline li.done {
		background: var(--navy);
	}

	.error {
		margin: 0.4rem 0 0.2rem;
		color: var(--danger);
		font-size: var(--fs-md, 0.9rem);
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		margin: 0.75rem 0 0.15rem;
		border: 2.5px solid color-mix(in srgb, var(--navy) 18%, transparent);
		border-top-color: var(--gold);
		border-radius: 50%;
		animation: spin 0.75s linear infinite;
	}

	button {
		margin-top: 0.35rem;
		min-height: 42px;
		padding: 0.55rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface);
		color: var(--ink);
		font: 600 0.88rem var(--body);
		cursor: pointer;
	}

	button.primary {
		background: var(--navy);
		border-color: var(--navy);
		color: #fff;
	}

	button.ghost {
		background: transparent;
		color: var(--navy);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner,
		.panel {
			animation: none;
		}
	}
</style>
