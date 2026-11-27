<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import '../styles/app.css';
	import { createI18nState } from '../lib/i18n/i18n.svelte';
	import { createThemeState } from '../lib/ui/theme.svelte';
	import { Toaster } from '../lib/components/toast';
	import AppStartupView from '../lib/components/AppStartupView.svelte';
	import { initializeApp } from '../lib/platform/appBootstrap';

	const i18n = createI18nState();
	const theme = createThemeState();
	setContext('i18n', i18n);
	setContext('theme', theme);

	let startupStatus = $state<'initializing' | 'ready' | 'error'>('initializing');

	function setDocumentState(state: 'initializing' | 'ready' | 'error') {
		if (typeof document === 'undefined') return;
		document.documentElement.dataset.appState = state;
		document.documentElement.dataset.appReady = state === 'ready' ? 'true' : 'false';
	}

	function bootstrap() {
		startupStatus = 'initializing';
		setDocumentState('initializing');
		try {
			initializeApp({ theme, i18n });
			startupStatus = 'ready';
			setDocumentState('ready');
		} catch {
			startupStatus = 'error';
			setDocumentState('error');
		}
	}

	function handleRenderError() {
		setDocumentState('error');
	}

	onMount(() => {
		bootstrap();
	});

	let { children } = $props();
</script>

{#if startupStatus !== 'ready'}
	<AppStartupView status={startupStatus} onRetry={bootstrap} />
{:else}
	<svelte:boundary onerror={handleRenderError}>
		{@render children()}
		<Toaster position="bottom-right" />
		{#snippet failed(_error, reset)}
			<main class="runtime-error" role="alert">
				<section>
					<p class="eyebrow">ABELLIS · Smart WMS</p>
					<h1>Ocurrió un error al mostrar esta pantalla</h1>
					<p>La aplicación encontró un problema inesperado. Puedes volver a intentar cargar la vista.</p>
					<button type="button" onclick={reset}>Reintentar vista</button>
					<button type="button" class="secondary" onclick={() => window.location.reload()}>Recargar aplicación</button>
				</section>
			</main>
		{/snippet}
	</svelte:boundary>
{/if}

<style>
	.runtime-error {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: var(--bg);
		color: var(--ink);
	}
	.runtime-error section {
		width: min(32rem, 100%);
		display: grid;
		justify-items: center;
		gap: 0.85rem;
		text-align: center;
	}
	.eyebrow {
		margin: 0;
		color: var(--navy);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.14em;
	}
	h1 { margin: 0; font-size: clamp(1.2rem, 4vw, 1.6rem); }
	p:not(.eyebrow) { margin: 0; color: var(--slate); line-height: 1.5; }
	button {
		min-height: 42px;
		padding: 0.55rem 1.2rem;
		border: 1px solid var(--navy);
		border-radius: 10px;
		background: var(--navy);
		color: white;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	button.secondary { background: transparent; color: var(--ink); border-color: var(--line); }
	button:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
</style>
