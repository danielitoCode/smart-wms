<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createAuthGuardState } from '../../core/feature/auth/ui/state/authGuardState.svelte';

	let { children } = $props();
	const guard = createAuthGuardState();
	const nav = [
		{ href: '/inventory', label: 'Inventario', pageKey: 'inventory' },
		{ href: '/cycle-count', label: 'Cycle count', pageKey: 'cycle-counts' },
		{ href: '/receiving', label: 'Recepción', pageKey: 'receiving' },
		{ href: '/putaway', label: 'Putaway', pageKey: 'putaway' },
		{ href: '/picking', label: 'Picking' }, { href: '/packing', label: 'Packing' }, { href: '/shipping', label: 'Shipping' },
		{ href: '/warehouses', label: 'Almacenes', pageKey: 'warehouses' },
		{ href: '/items', label: 'Ítems', pageKey: 'items' }
	] as const;

	onMount(() => { void bootstrap(); });

	$effect(() => {
		if (guard.status === 'authenticated' && guard.user?.mustChangePassword && page.url.pathname !== '/change-password') {
			void goto('/change-password', { replaceState: true });
		}
	});

	const hasRouteAccess = $derived(guard.status !== 'authenticated' || canAccessPages(requiredPageKeys(page.url.pathname)));

	function canAccessPages(keys: string[]): boolean {
		if (keys.length === 0 || guard.user?.role === 'ADMIN') return true;
		const granted = guard.user?.allowedPages ?? [];
		return keys.every(key => granted.includes(key));
	}
	function requiredPageKeys(pathname: string): string[] {
		if (pathname === '/inventory' || pathname.startsWith('/inventory/')) return ['inventory'];
		if (pathname === '/cycle-count' || pathname.startsWith('/cycle-count/')) return ['cycle-counts'];
		if (pathname === '/receiving' || pathname.startsWith('/receiving/')) return ['receiving'];
		if (pathname === '/putaway' || pathname.startsWith('/putaway/')) return ['putaway'];
		if (pathname === '/items' || pathname.startsWith('/items/')) return ['items'];
		if (pathname === '/warehouses') return ['warehouses'];
		if (pathname.startsWith('/warehouses/')) return ['warehouses', 'zones', 'bins'];
		return [];
	}
	function canSeeNavItem(item: (typeof nav)[number]): boolean {
		return !('pageKey' in item) || canAccessPages([item.pageKey]);
	}
	async function bootstrap() {
		await guard.verify();
		if (guard.status === 'anonymous') {
			const redirect = encodeURIComponent(page.url.pathname + page.url.search);
			await goto('/login?redirect=' + redirect);
		}
	}
	async function logout() { await guard.logout(); await goto('/login'); }
	async function retry() { await bootstrap(); }
	function isActive(href: string) { return page.url.pathname === href || page.url.pathname.startsWith(href + '/'); }
</script>

{#if guard.status === 'checking'}<p class="boot">Validando sesión…</p>
{:else if guard.status === 'error'}<section class="boot panel" role="alert"><p class="title">Sin conexión con el servidor</p>{#if guard.message}<p class="detail">{guard.message}</p>{/if}<div class="actions"><button type="button" class="primary" onclick={retry}>Reintentar</button><button type="button" onclick={logout}>Cerrar sesión</button></div></section>
{:else if guard.status === 'authenticated' && !hasRouteAccess}<section class="boot panel" role="alert"><p class="title">Acceso no autorizado</p><p class="detail">Tu cuenta no tiene los permisos de página necesarios para este módulo.</p><button type="button" class="primary" onclick={() => goto('/inventory')}>Continuar</button></section>
{:else if guard.status === 'authenticated'}<div class="shell"><header class="topbar"><a class="brand" href="/inventory"><img src="/brand/abellis_mark_blanco.svg" width="28" height="28" alt="" /><span class="brand-text"><span class="name">Abellis</span><span class="product">Smart WMS</span></span></a>
	{#if !guard.user?.mustChangePassword}<nav aria-label="Principal">{#each nav.filter(canSeeNavItem) as item}<a href={item.href} class:active={isActive(item.href)}>{item.label}</a>{/each}</nav>{/if}
	<div class="session">{#if guard.user}<span class="user">{guard.user.fullName || guard.user.username}</span>{/if}{#if !guard.user?.mustChangePassword}<a class="ghost" href="/change-password">Cambiar contraseña</a>{/if}<button type="button" class="ghost" onclick={logout}>Salir</button></div></header><main class="content">{@render children()}</main></div>
{:else}<p class="boot">Redirigiendo…</p>{/if}

<style>
	.shell { min-height:100vh; display:flex; flex-direction:column; background:var(--bg); color:var(--ink); }
	.topbar { display:flex; flex-wrap:wrap; align-items:center; gap:.75rem 1rem; padding:.65rem 1.15rem; background:var(--navy-deep); color:#f5f8fc; border-bottom:1px solid rgba(255,255,255,.06); }
	.brand { display:flex; align-items:center; gap:.55rem; text-decoration:none; color:inherit; margin-right:.25rem; } .brand img { display:block; flex:none; }
	.brand-text { display:flex; flex-direction:column; line-height:1.05; min-width:0; } .brand-text .name { font-family:var(--disp); font-weight:700; font-size:.95rem; letter-spacing:-.02em; } .brand-text .product { font-size:.62rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--gold); }
	nav { display:flex; flex-wrap:wrap; gap:.15rem; flex:1; min-width:12rem; } nav a { color:rgba(245,248,252,.72); text-decoration:none; font-size:.84rem; padding:.35rem .55rem; border-radius:8px; transition:color 120ms ease,background 120ms ease; } nav a:hover { color:#fff; background:rgba(255,255,255,.06); } nav a.active { color:#fff; background:rgba(255,255,255,.1); font-weight:600; }
	.session { display:flex; align-items:center; gap:.65rem; margin-left:auto; } .user { font-size:.82rem; color:rgba(245,248,252,.8); max-width:10rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
	.ghost { padding:.3rem .7rem; border-radius:8px; border:1px solid rgba(255,255,255,.22); background:transparent; color:inherit; cursor:pointer; font-size:.82rem; text-decoration:none; } .ghost:hover { background:rgba(255,255,255,.08); }
	.content { flex:1; animation:fade-in 160ms ease-out; } .boot { padding:3rem 1.25rem; text-align:center; color:var(--slate); animation:fade-in 160ms ease-out; }
	.panel { max-width:22rem; margin:2.5rem auto; text-align:left; background:var(--card); border:1px solid var(--line); border-radius:var(--radius-card); padding:1.25rem; box-shadow:var(--shadow-1); } .panel .title { margin:0 0 .35rem; font-family:var(--disp); font-weight:600; color:var(--ink); } .panel .detail { margin:0; color:var(--danger); font-size:.9rem; }
	.actions { display:flex; gap:.5rem; margin-top:1rem; } .actions .primary { background:var(--navy); border-color:var(--navy); color:#fff; }
</style>
