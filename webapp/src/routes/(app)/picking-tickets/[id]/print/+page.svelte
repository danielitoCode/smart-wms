<script lang="ts">
  import { page } from '$app/state';
  import PickingTicketPrintScreen from '#core/feature/picking-tickets/ui/screens/PickingTicketPrintScreen.svelte';
  const salesOrderId = $derived(Number(page.params.id));
</script>
<PickingTicketPrintScreen {salesOrderId} />
