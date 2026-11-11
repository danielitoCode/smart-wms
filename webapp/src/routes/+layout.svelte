<script lang="ts">
	import '../app.css';
	import { onMount, setContext } from 'svelte';
	import { createI18nState } from '../lib/i18n/i18n.svelte';
	const i18n = createI18nState();
	setContext('i18n', i18n);
	onMount(() => i18n.init());

	let { children } = $props();
</script>

{@render children()}
