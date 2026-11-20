<script lang="ts">
	interface Props {
		src: string;
		alt?: string;
		class?: string;
	}

	let { src, alt = '', class: className = '' }: Props = $props();
</script>

<img class="cci {className}" {src} {alt} loading="lazy" decoding="async" />

<style>
	.cci {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}
</style>
