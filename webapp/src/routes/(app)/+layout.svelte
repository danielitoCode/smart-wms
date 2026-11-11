<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createAuthGuardState } from '../../core/feature/auth/ui/state/authGuardState.svelte';

	let { children } = $props();
	const guard = createAuthGuardState();

	const nav = [
		{ href: '/inventory', label: 'Inventario' },
		{ href: '/cycle-count', label: 'Cycle count' },
		{ href: '/receiving', label: 'Recepción' },
		{ href: '/putaway', label: 'Putaway' },
		{ href: '/picking', label: 'Picking' },
		{ href: '/packing', label: 'Packing' },
		{ href: '/shipping', label: 'Shipping' },
		{ href: '/warehouses', label: 'Almacenes' },
		{ href: '/items', label: 'Ítems' },
		{ href: '/change-password', label: 'Cambiar contraseña' }
	] as const;

	onMount(() => { void bootstrap(); });

	$effect(() => {
		if (guard.status === 'authenticated' && guard.user?.mustChangePassword &&
			page.url.pathname !== '/change-password') {
			void goto('/change-password', { replaceState: true });
		}
	});

	async function bootstrap() {
		await guard.verify();
		if (guard.status === 'anonymous') {
			const redirect = encodeURIComponent(page.url.pathname + page.url.search);
			await goto(`/login?redirect=${redirect}`);
		} else if (guard.status === 'authenticated' && guard.user?.mustChangePassword &&
			page.url.pathname !== '/change-password') {
			await goto('/change-password', { replaceState: true });
		}
	}

	async function logout() {
		await guard.logout();
		await goto('/login');
	}

	async function retry() { await bootstrap(); }

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

{#if guard.status === 'checking'}
	<p class="boot">Validando sesión…</p>
{:else if guard.status === 'error'}
	<section class="boot panel" role="alert">
		<p class="title">Sin conexión con el servidor</p>
		{#if guard.message}<p class="detail">{guard.message}</p>{/if}
		<div class="actions">
			<button type="button" class="primary" onclick={retry}>Reintentar</button>
			<button type="button" onclick={logout}>Cerrar sesión</button>
		</div>
	</section>
{:else if guard.status === 'authenticated'}
	<div class="shell">
		<header class="topbar">
			<a class="brand" href="/inventory">
				<img src="/brand/abellis_mark_blanco.svg" width="28" height="28" alt="" />
				<span class="brand-text"><span class="name">Abellis</span><span class="product">Smart WMS</span></span>
			</a>
			{#if !guard.user?.mustChangePassword}
				<nav aria-label="Principal">
					{#each nav as item}<a href={item.href} class:active={isActive(item.href)}>{item.label}</a>{/each}
				</nav>
			{/if}
			<div class="session">
				{#if guard.user}<span class="user">{guard.user.fullName || guard.user.username}</span>{/if}
				{#if !guard.user?.mustChangePassword}<a class="ghost" href="/change-password">Cambiar contraseña</a>{/if}
				<button type="button" class="ghost" onclick={logout}>Salir</button>
			</div>
		</header>
		<main class="content">{@render children()}</main>
	</div>
{:else}
	<p class="boot">Redirigiendo…</p>
{/if}

<style>
	.shell { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); color: var(--ink); }
	.topbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1rem; padding: 0.65rem 1.15rem; background: var(--navy-deep); color: #f5f8fc; border-bottom: 1px solid rgba(255,255,255,0.06); }
	.brand { display: flex; align-items: center; gap: 0.55rem; text-decoration: none; color: inherit; margin-right: 0.25rem; }
	.brand img { display: block; flex: none; }
	.brand-text { display: flex; flex-direction: column; line-height: 1.05; min-width: 0; }
	.brand-text .name { font-family: var(--disp); font-weight: 700; font-size: 0.95rem; letter-spacing: -0.02em; }
	.brand-text .product { font-size: 0.62rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); }
	nav { display: flex; flex-wrap: wrap; gap: 0.15rem; flex: 1; min-width: 12rem; }
	nav a { color: rgba(245,248,252,0.72); text-decoration: none; font-size: 0.84rem; padding: 0.35rem 0.55rem; border-radius: 8px; transition: color 120ms ease, background 120ms ease; }
	nav a:hover { color: #fff; background: rgba(255,255,255,0.06); }
	nav a.active { color: #fff; background: rgba(255,255,255,0.1); font-weight: 600; }
	.session { display: flex; align-items: center; gap: 0.65rem; margin-left: auto; }
	.user { font-size: 0.82rem; color: rgba(245,248,252,0.8); max-width: 10rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ghost { padding: 0.3rem 0.7rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.22); background: transparent; color: inherit; cursor: pointer; font-size: 0.82rem; text-decoration: none; }
	.ghost:hover { background: rgba(255,255,255,0.08); }
	.content { flex: 1; animation: fade-in 160ms ease-out; }
	.boot { padding: 3rem 1.25rem; text-align: center; color: var(--slate); animation: fade-in 160ms ease-out; }
	.panel { max-width: 22rem; margin: 2.5rem auto; text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-card); padding: 1.25rem; box-shadow: var(--shadow-1); }
	.panel .title { margin: 0 0 0.35rem; font-family: var(--disp); font-weight: 600; color: var(--ink); }
	.panel .detail { margin: 0; color: var(--danger); font-size: 0.9rem; }
	.actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
	.actions .primary { background: var(--navy); border-color: var(--navy); color: #fff; }
</style>
