<script lang="ts">
  import { page } from '$app/state';
  import PickingTicketPrintAllScreen from '#core/feature/picking-tickets/ui/screens/PickingTicketPrintAllScreen.svelte';
  const params = $derived(page.url.searchParams);
  const ids = $derived((params.get('so_ids') ?? '').split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0));
  const status = $derived(params.get('status') ?? 'OPEN');
  const warehouseId = $derived(Number(params.get('warehouse_id')) || undefined);
  const combine = $derived(params.get('combine') === '1');
</script>
<PickingTicketPrintAllScreen salesOrderIds={ids} {status} {warehouseId} {combine} />
