<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import '../styles/app.css';
	import { createI18nState } from '../lib/i18n/i18n.svelte';
	import UiToastHost from '../lib/components/UiToastHost.svelte';

	const i18n = createI18nState();
	setContext('i18n', i18n);

	// localStorage is browser-only; keep Italian default during SSR.
	onMount(() => {
		i18n.init();
	});

	let { children } = $props();
</script>

{@render children()}
<UiToastHost />
