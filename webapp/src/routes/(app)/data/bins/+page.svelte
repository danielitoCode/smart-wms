<script lang="ts">
	import { page } from '$app/state';
	import BinsScreen from '../../../../core/feature/warehouses/ui/screens/BinsScreen.svelte';
	const initialZoneId = $derived.by(() => {
		const value = Number(page.url.searchParams.get('zone_id'));
		return Number.isInteger(value) && value > 0 ? value : null;
	});
</script>
<BinsScreen {initialZoneId} />
