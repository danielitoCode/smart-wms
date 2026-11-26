<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import '../styles/app.css';
	import { createI18nState } from '../lib/i18n/i18n.svelte';
	import { createThemeState } from '../lib/ui/theme.svelte';
	import { Toaster } from '../lib/components/toast';

	const i18n = createI18nState();
	const theme = createThemeState();
	setContext('i18n', i18n);
	setContext('theme', theme);

	onMount(() => {
		// This is an observability signal for browser smoke/E2E checks, not
		// an authorization or security boundary. It is set only after the
		// client has mounted and completed its synchronous app initialization.
		document.documentElement.dataset.appReady = 'true';
		document.documentElement.dataset.appState = 'initializing';

		try {
			theme.init();
			i18n.init();
			document.documentElement.dataset.appState = 'ready';
		} catch (error) {
			document.documentElement.dataset.appState = 'error';
			throw error;
		}
	});

	let { children } = $props();
</script>

{@render children()}
<Toaster position="bottom-right" />
