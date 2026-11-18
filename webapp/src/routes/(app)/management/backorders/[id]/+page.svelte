<script lang="ts">
  import { page } from '$app/state';
  import BackorderDetailScreen from '../../../../../core/feature/backorders/ui/screens/BackorderDetailScreen.svelte';

  const backorderId = $derived(Number(page.params.id));
</script>

{#if Number.isInteger(backorderId) && backorderId > 0}
  <BackorderDetailScreen {backorderId} />
{:else}
  <p>Identificador de backorder inválido.</p>
{/if}
