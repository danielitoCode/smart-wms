<script lang="ts">
	import WarehouseWorkspaceScreen from './WarehouseWorkspaceScreen.svelte';
	let { initialZoneId = null }: { initialZoneId?: number | null } = $props();
</script>
<WarehouseWorkspaceScreen mode="bins" {initialZoneId} />
