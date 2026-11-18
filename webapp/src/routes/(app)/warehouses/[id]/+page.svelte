<script lang="ts">
	import { page } from '$app/state';
	import WarehouseDetailScreen from '../../../../core/feature/warehouses/ui/screens/WarehouseDetailScreen.svelte';

	const warehouseId = $derived(Number(page.params.id));
</script>

{#if Number.isFinite(warehouseId) && warehouseId > 0}
	<WarehouseDetailScreen {warehouseId} />
{:else}
	<p style="padding: 2rem; font-family: system-ui">Identificador de almacén no válido.</p>
{/if}
