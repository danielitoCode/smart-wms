<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import type { I18nState } from '#lib/i18n/i18n.svelte';
	import { createSplashState } from '../state/splashState.svelte';

	const i18n = getContext<I18nState>('i18n');
	const splash = createSplashState();

	const MIN_VISIBLE_MS = 900;

	const PHASE_KEYS = [
		'Estableciendo canal seguro…',
		'Comprobando sesión y permisos…',
		'Sincronizando catálogo de almacén…',
		'Cargando preferencias operativas…',
		'Preparando el escritorio…'
	] as const;

	let phaseIndex = $state(0);
	let phaseTimer: ReturnType<typeof setInterval> | null = null;

	const isLoading = $derived(splash.status === 'checking' || splash.status === 'idle');
	const isError = $derived(splash.status === 'error');
	const phaseLabel = $derived(i18n.t(PHASE_KEYS[phaseIndex] ?? PHASE_KEYS[0]));
	const progress = $derived(
			isLoading ? ((phaseIndex + 1) / PHASE_KEYS.length) * 100 : isError ? 0 : 100
	);

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

<section class="splash" aria-busy={isLoading}>
	<div class="content">
		<img
				class="mark"
				src="/brand/abellis_mark_principal.svg"
				width="64"
				height="64"
				alt="Abellis"
		/>

		<div class="titles">
			<p class="eyebrow">ABELLIS</p>
			<h1>Smart WMS</h1>
		</div>

		{#if isError}
			<div class="status-block">
				<p class="error" role="alert">
					{splash.message ?? i18n.t('No se pudo validar la sesión')}
				</p>
				<div class="actions">
					<button type="button" class="primary" onclick={() => void retry()}>
						{i18n.t('Reintentar')}
					</button>
					<button
							type="button"
							class="ghost"
							onclick={() => void goto('/login', { replaceState: true })}
					>
						{i18n.t('Ir al login')}
					</button>
				</div>
			</div>
		{:else}
			<div class="status-block">
				<div
						class="progress"
						role="progressbar"
						aria-valuemin="0"
						aria-valuemax="100"
						aria-valuenow={Math.round(progress)}
						aria-label={i18n.t('Validando sesión')}
				>
					<span class="fill" style="width: {progress}%"></span>
				</div>

				<p class="phase" aria-live="polite">
					{#key isLoading ? phaseIndex : 'done'}
						<span>
							{isLoading ? phaseLabel : i18n.t('Abriendo el módulo asignado…')}
						</span>
					{/key}
				</p>
			</div>
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
				radial-gradient(
						ellipse at 20% 10%,
						color-mix(in srgb, var(--lightblue, #8fb4da) 22%, transparent),
						transparent 55%
				),
				radial-gradient(
						ellipse at 80% 90%,
						color-mix(in srgb, var(--gold, #e9a50b) 12%, transparent),
						transparent 50%
				),
				var(--bg);
		color: var(--ink);
	}

	.content {
		width: min(20rem, 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.75rem;
		text-align: center;
		animation: fade-in 400ms ease-out both;
	}

	.mark {
		display: block;
	}

	.titles {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
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

	.status-block {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.progress {
		width: 100%;
		height: 3px;
		border-radius: 99px;
		overflow: hidden;
		background: var(--line);
	}

	.fill {
		display: block;
		height: 100%;
		background: var(--gold);
		transition: width 400ms ease-out;
	}

	.phase {
		margin: 0;
		min-height: 1.25em;
		color: var(--muted, var(--slate));
		font: 500 var(--fs-md, 0.88rem) / 1.4 var(--body, system-ui);
	}

	.phase span {
		display: inline-block;
		animation: fade-in 240ms ease-out both;
	}

	.error {
		margin: 0;
		color: var(--danger);
		font: 500 var(--fs-md, 0.9rem) / 1.4 var(--body, system-ui);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}

	button {
		min-height: 42px;
		padding: 0.55rem 1.1rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface);
		color: var(--ink);
		font: 600 0.88rem var(--body);
		cursor: pointer;
	}

	button:focus-visible {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
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

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.content,
		.phase span {
			animation: none;
		}

		.fill {
			transition: none;
		}
	}
</style>