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
	.app-shell {
		min-height: 100vh;
		font-family: system-ui, -apple-system, sans-serif;
		background: #f8fafc;
		color: #0f172a;
	}
	.topbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.25rem;
		background: #0f172a;
		color: #f8fafc;
	}
	.brand {
		font-weight: 700;
		color: inherit;
		text-decoration: none;
		margin-right: 0.5rem;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		flex: 1;
	}
	nav a {
		color: #cbd5e1;
		text-decoration: none;
		font-size: 0.95rem;
	}
	nav a:hover,
	nav a.active {
		color: #fff;
	}
	.session {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.user {
		font-size: 0.85rem;
		color: #94a3b8;
	}
	.session button {
		padding: 0.35rem 0.75rem;
		border-radius: 6px;
		border: 1px solid #475569;
		background: transparent;
		color: #e2e8f0;
		cursor: pointer;
	}
	.content {
		padding-bottom: 2rem;
	}
	.boot {
		font-family: system-ui, sans-serif;
		padding: 2rem;
		color: #64748b;
	}
	.error-panel {
		max-width: 28rem;
		margin: 3rem auto;
		padding: 1.5rem;
		border: 1px solid #fecaca;
		border-radius: 8px;
		background: #fff;
		color: #0f172a;
	}
	.error-panel .detail {
		color: #b91c1c;
		font-size: 0.9rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.actions button {
		padding: 0.45rem 0.9rem;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #0f172a;
		color: #fff;
		cursor: pointer;
	}
	.actions button.secondary {
		background: #fff;
		color: #0f172a;
	}
</style>
