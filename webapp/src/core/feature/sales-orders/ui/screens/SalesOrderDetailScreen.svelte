<script lang="ts">
  import SalesOrdersScreen from './SalesOrdersScreen.svelte';

  interface Props {
    soId: number;
  }

  let { soId }: Props = $props();
</script>

<SalesOrdersScreen initialOrderId={soId} />
