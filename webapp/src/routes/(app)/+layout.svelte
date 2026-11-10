<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authSession } from '../../core/infrastructure/auth/AuthSession';
	import { createAuthDependencies } from '../../core/feature/auth/di/auth.dependencies';

	let { children } = $props();

	let ready = $state(false);
	let userLabel = $state('');

	const authDeps = createAuthDependencies();

	onMount(() => {
		if (!authSession.isAuthenticated()) {
			const redirect = encodeURIComponent(page.url.pathname);
			void goto(`/login?redirect=${redirect}`);
			return;
		}
		const user = authSession.getUser();
		userLabel = user?.fullName || user?.username || '';
		ready = true;
	});

	async function logout() {
		authDeps.logout.execute();
		await goto('/login');
	}
</script>

{#if ready}
	<div class="app-shell">
		<header class="topbar">
			<a class="brand" href="/">Smart WMS</a>
			<nav>
				<a href="/inventory" class:active={page.url.pathname.startsWith('/inventory')}>Inventario</a>
				<a href="/warehouses" class:active={page.url.pathname.startsWith('/warehouses')}>Almacenes</a>
				<a href="/items" class:active={page.url.pathname.startsWith('/items')}>Ítems</a>
			</nav>
			<div class="session">
				{#if userLabel}
					<span class="user">{userLabel}</span>
				{/if}
				<button type="button" onclick={logout}>Salir</button>
			</div>
		</header>
		<main class="content">
			{@render children()}
		</main>
	</div>
{:else}
	<p class="boot">Comprobando sesión…</p>
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
</style>
