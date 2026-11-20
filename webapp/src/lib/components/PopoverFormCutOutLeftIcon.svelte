<script lang="ts">
	/** Notch izquierdo de la barra de acción (estilo ticket / popover-form). */
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
		d="M6 0v12C2.686 12 0 9.314 0 6S2.686 0 6 0Z"
		fill="var(--bg, #edf2f8)"
	/>
	<path
		d="M6 0.5C3.05 0.5 0.5 2.91 0.5 6S3.05 11.5 6 11.5"
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
