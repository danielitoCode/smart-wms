<script lang="ts">
	import { page } from '$app/state';
	import BinsScreen from '../../../../core/feature/warehouses/ui/screens/BinsScreen.svelte';
	const initialZoneId = $derived(Number(page.url.searchParams.get('zone_id')) || null);
</script>
<BinsScreen {initialZoneId} />
