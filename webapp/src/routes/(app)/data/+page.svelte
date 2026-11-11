<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authSession } from '../../../core/infrastructure/auth/AuthSession';
	let noAccess = $state(false);
	onMount(() => {
		const user = authSession.getUser();
		const pages = user?.allowedPages ?? [];
		const admin = user?.role === 'ADMIN';
		const target = admin ? '/data/warehouses'
			: pages.includes('warehouses') ? '/data/warehouses'
			: pages.includes('zones') ? '/data/zones'
			: (pages.includes('bins') && pages.includes('zones')) ? '/data/bins'
			: pages.includes('preferred-bins') ? '/data/preferred-bins'
			: null;
		if (target) void goto(target, { replaceState: true });
		else noAccess = true;
	});
</script>
{#if noAccess}<section class="empty"><h1>Sin acceso a datos maestros</h1><p>Tu cuenta no tiene permisos para ninguno de los módulos de esta sección.</p></section>
{:else}<p class="status">Abriendo datos maestros…</p>{/if}
<style>.status,.empty { max-width:40rem; margin:3rem auto; padding:0 1.25rem; color:var(--slate); } .empty h1 { color:var(--ink); font:700 1.4rem var(--disp); }</style>
