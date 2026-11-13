<script lang="ts">
	import { page } from '$app/state';
	import SalesOrderDetailScreen from '#core/feature/sales-orders/ui/screens/SalesOrderDetailScreen.svelte';

	const soId = $derived(Number(page.params.id));
</script>

{#if Number.isInteger(soId) && soId > 0}
	<SalesOrderDetailScreen {soId} />
{:else}
	<p>Identificador de pedido inválido.</p>
{/if}
