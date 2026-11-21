<script lang="ts">
	/**
	 * @deprecated Sustituido por `Toaster` de `lib/components/toast`.
	 * Se mantiene como thin wrapper para no romper imports residuales.
	 */
	import Toaster from './toast/Toaster.svelte';

	interface Props {
		position?:
			| 'top-left'
			| 'top-center'
			| 'top-right'
			| 'bottom-left'
			| 'bottom-center'
			| 'bottom-right';
	}

	let { position = 'bottom-right' }: Props = $props();
</script>

<Toaster {position} />
