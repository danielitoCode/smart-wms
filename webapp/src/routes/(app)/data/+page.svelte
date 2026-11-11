<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authSession } from '../../../core/infrastructure/auth/AuthSession';
	onMount(() => {
		const user = authSession.getUser();
		const pages = user?.allowedPages ?? [];
		const admin = user?.role === 'ADMIN';
		const target = admin ? '/data/warehouses'
			: pages.includes('warehouses') ? '/data/warehouses'
			: pages.includes('zones') ? '/data/zones'
			: pages.includes('bins') ? '/data/bins'
			: pages.includes('preferred-bins') ? '/data/preferred-bins'
			: '/inventory';
		void goto(target, { replaceState: true });
	});
</script>
<p class="status">Abriendo datos maestros…</p>
<style>.status { padding:2rem; color:var(--slate); text-align:center; }</style>
