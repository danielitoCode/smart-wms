<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createAuthGuardState } from '../../core/feature/auth/ui/state/authGuardState.svelte';

	let { children } = $props();

	const guard = createAuthGuardState();

	onMount(() => {
		void bootstrap();
	});

	async function bootstrap() {
		await guard.verify();
		if (guard.status === 'anonymous') {
			const redirect = encodeURIComponent(page.url.pathname + page.url.search);
			await goto(`/login?redirect=${redirect}`);
		}
	}

	async function logout() {
		guard.logout();
		await goto('/login');
	}

	async function retry() {
		await bootstrap();
	}
</script>

{#if guard.status === 'checking'}
	<p class="boot">Validando sesión…</p>
{:else if guard.status === 'error'}
	<section class="boot error-panel" role="alert">
		<p>No se pudo validar la sesión con el servidor.</p>
		{#if guard.message}
			<p class="detail">{guard.message}</p>
		{/if}
		<div class="actions">
			<button type="button" onclick={retry}>Reintentar</button>
			<button type="button" class="secondary" onclick={logout}>Cerrar sesión</button>
		</div>
	</section>
{:else if guard.status === 'authenticated'}
	<div class="app-shell">
		<header class="topbar">
			<a class="brand" href="/">Smart WMS</a>
			<nav>
				<a href="/inventory" class:active={page.url.pathname.startsWith('/inventory')}>Inventario</a>
				<a href="/cycle-count" class:active={page.url.pathname.startsWith('/cycle-count')}>Cycle count</a>
				<a href="/receiving" class:active={page.url.pathname.startsWith('/receiving')}>Recepción</a>
				<a href="/putaway" class:active={page.url.pathname.startsWith('/putaway')}>Putaway</a>
				<a href="/picking" class:active={page.url.pathname.startsWith('/picking')}>Picking</a>
				<a href="/packing" class:active={page.url.pathname.startsWith('/packing')}>Packing</a>
				<a href="/shipping" class:active={page.url.pathname.startsWith('/shipping')}>Shipping</a>
				<a href="/warehouses" class:active={page.url.pathname.startsWith('/warehouses')}>Almacenes</a>
				<a href="/items" class:active={page.url.pathname.startsWith('/items')}>Ítems</a>
			</nav>
			<div class="session">
				{#if guard.user}
					<span class="user">{guard.user.fullName || guard.user.username}</span>
				{/if}
				<button type="button" onclick={logout}>Salir</button>
			</div>
		</header>
		<main class="content">
			{@render children()}
		</main>
	</div>
{:else}
	<p class="boot">Redirigiendo al login…</p>
{/if}

<style>
	.app-shell { min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; }
	.topbar { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; padding: 0.75rem 1.25rem; background: #0f172a; color: #f8fafc; }
	.brand { font-weight: 700; color: inherit; text-decoration: none; margin-right: 0.5rem; }
	nav { display: flex; flex-wrap: wrap; gap: 0.65rem; flex: 1; }
	nav a { color: #cbd5e1; text-decoration: none; font-size: 0.9rem; }
	nav a.active { color: #fff; font-weight: 600; }
	.session { display: flex; align-items: center; gap: 0.75rem; }
	.user { font-size: 0.85rem; color: #e2e8f0; }
	.session button, .actions button {
		padding: 0.35rem 0.75rem; border-radius: 6px; border: 1px solid #94a3b8;
		background: transparent; color: inherit; cursor: pointer; font-size: 0.85rem;
	}
	.session button:hover, .actions button:hover { background: #1e293b; }
	.content { padding: 0; }
	.boot { padding: 2rem 1.25rem; text-align: center; color: #475569; }
	.error-panel { max-width: 24rem; margin: 2rem auto; text-align: left; }
	.error-panel .detail { color: #b91c1c; font-size: 0.9rem; }
	.actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
	.actions .secondary { border-color: #cbd5e1; color: #0f172a; background: #fff; }
</style>
