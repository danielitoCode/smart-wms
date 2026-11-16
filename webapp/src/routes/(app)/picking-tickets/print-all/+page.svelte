<script lang="ts">
  import PickingTicketPrintAllScreen from '#core/feature/picking-tickets/ui/screens/PickingTicketPrintAllScreen.svelte';
  import { page } from '$app/state';
  const params = $derived(page.url.searchParams);
  const ids = $derived((params.get('so_ids') ?? '').split(',').map(Number).filter((id) => Number.isInteger(id) && id > 0));
  const status = $derived(params.get('status') ?? 'OPEN');
</script>
<PickingTicketPrintAllScreen salesOrderIds={ids} status={status} />
