<script lang="ts">
	interface Props {
		class?: string;
	}
	let { class: className = '' }: Props = $props();
</script>

<div class="cco {className}" aria-hidden="true"></div>

<style>
	.cco {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(
			to top,
			rgba(15, 23, 42, 0.45) 0%,
			rgba(15, 23, 42, 0.08) 45%,
			transparent 70%
		);
	}
</style>
