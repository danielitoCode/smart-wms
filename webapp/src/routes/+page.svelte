<script lang="ts">
	/**
	 * Carga en frío (`/`) → landing de presentación Smart WMS.
	 * Auth / splash siguen disponibles vía /login y el shell (app).
	 */
	import LandingScreen from '../lib/components/LandingScreen.svelte';
</script>

<svelte:head>
	<title>Smart WMS · Abellis</title>
	<meta
		name="description"
		content="Smart WMS — núcleo operativo multi-almacén: recepción, picking, packing y expedición."
	/>
</svelte:head>

<LandingScreen />
