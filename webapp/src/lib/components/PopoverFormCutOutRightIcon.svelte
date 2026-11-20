<script lang="ts">
	/** Notch derecho de la barra de acción (espejo del left). */
	interface Props {
		class?: string;
	}
	let { class: className = '' }: Props = $props();
</script>

<svg
	class="pf-cut {className}"
	width="6"
	height="12"
	viewBox="0 0 6 12"
	fill="none"
	aria-hidden="true"
>
	<path
		d="M0 0v12c3.314 0 6-2.686 6-6S3.314 0 0 0Z"
		fill="var(--bg, #edf2f8)"
	/>
	<path
		d="M0 0.5C2.95 0.5 5.5 2.91 5.5 6S2.95 11.5 0 11.5"
		stroke="color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent)"
		stroke-width="1"
		fill="none"
	/>
</svg>

<style>
	.pf-cut {
		display: block;
		pointer-events: none;
	}
</style>
