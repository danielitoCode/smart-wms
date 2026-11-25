<!-- see artifacts DynamicDropZone.svelte — full content uploaded next -->
<script lang="ts">
	/** Dynamic Drop Zone — placeholder; full component in follow-up commit */
	let { theme = 'light' }: { theme?: 'light' | 'dark' } = $props();
</script>
<div class="pdz" data-theme={theme}>
	<p style="padding:2rem;text-align:center;opacity:0.6">Loading Dynamic Drop Zone…</p>
</div>
