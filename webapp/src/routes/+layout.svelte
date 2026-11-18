<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import '../styles/app.css';
	import { createI18nState } from '../lib/i18n/i18n.svelte';
	import { createThemeState } from '../lib/ui/theme.svelte';
	import UiToastHost from '../lib/components/UiToastHost.svelte';

	const i18n = createI18nState();
	const theme = createThemeState();
	setContext('i18n', i18n);
	setContext('theme', theme);

	onMount(() => {
		theme.init();
		i18n.init();
	});

	let { children } = $props();
</script>

{@render children()}
<UiToastHost />
