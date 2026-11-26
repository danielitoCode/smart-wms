<script lang="ts">
	/**
	 * Lab layout — sin shell ni sidebar.
	 * La navegación entre demos vive solo en el overview (/lab).
	 */
	let { children } = $props();
</script>

<div class="lab-root">
	{@render children()}
</div>

<style>
	.lab-root {
		min-height: 100dvh;
		background: var(--bg, #edf2f8);
		color: var(--ink, #132234);
		font-family: var(--body, Inter, system-ui, sans-serif);
	}
</style>
