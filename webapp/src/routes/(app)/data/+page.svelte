<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authSession } from '#core/infrastructure/auth/AuthSession.ts';
	import { getDataLandingPath } from '#core/feature/warehouses/ui/state/dataNavigationPermissions.ts';
	let noAccess = $state(false);
	onMount(() => {
		const user = authSession.getUser();
		const target = getDataLandingPath(user?.role, user?.allowedPages ?? []);
		if (target) void goto(target, { replaceState: true });
		else noAccess = true;
	});
</script>
{#if noAccess}<section class="empty"><h1>Sin acceso a datos maestros</h1><p>Tu cuenta no tiene permisos para ninguno de los módulos de esta sección.</p></section>
{:else}<p class="status">Abriendo datos maestros…</p>{/if}
<style>.status,.empty { max-width:40rem; margin:3rem auto; padding:0 1.25rem; color:var(--slate); } .empty h1 { color:var(--ink); font:700 1.4rem var(--disp); }</style>
