<script lang="ts">
  import PickingTicketPrintScreen from '#core/feature/picking-tickets/ui/screens/PickingTicketPrintScreen.svelte';
  let { params } = $props();
</script>
<PickingTicketPrintScreen salesOrderId={Number(params.id)} />
