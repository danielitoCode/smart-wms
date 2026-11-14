<script lang="ts">
	import { getContext, onMount, setContext } from 'svelte';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import AppIcon from '../../lib/components/AppIcon.svelte';
	import LocaleSwitcher from '../../lib/components/LocaleSwitcher.svelte';
	import ThemeToggle from '../../lib/components/ThemeToggle.svelte';
	import WarehousePicker from '../../lib/components/WarehousePicker.svelte';
	import type { I18nState } from '../../lib/i18n/i18n.svelte';
	import { createAuthGuardState } from '../../core/feature/auth/ui/state/authGuardState.svelte';
	import { createWarehouseSelectionState } from '../../core/feature/warehouses/ui/state/warehouseSelectionState.svelte';
	import { canAccessPages, requiredPageKeysForPath } from '../../core/feature/auth/domain/policy/AccessPolicy';

	const i18n = getContext<I18nState>('i18n');
	let { children } = $props();
	let sidebarOpen = $state(false);
	const guard = createAuthGuardState();
	setContext('authGuard', guard);
	const warehouseSelection = createWarehouseSelectionState();
	setContext('warehouseSelection', warehouseSelection);

	onNavigate((navigation) => {
		if (typeof document === 'undefined' || !document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

	type IconName = 'inbox' | 'map-pin' | 'clipboard-list' | 'package-check' | 'truck' | 'boxes' | 'scan' | 'package' | 'warehouse' | 'database' | 'user' | 'globe' | 'lock' | 'menu' | 'logout';
	type NavItem = { href: string; label: string; icon: IconName; pageKey?: string };
	const navGroups: { label: string; items: NavItem[] }[] = $derived([
		{ label: i18n.t('Operaciones'), items: [
			{ href: '/receiving', label: i18n.t('Recepción'), icon: 'inbox', pageKey: 'receiving' },
			{ href: '/putaway', label: i18n.t('Ubicación'), icon: 'map-pin', pageKey: 'putaway' },
			{ href: '/picking', label: i18n.t('Preparación'), icon: 'clipboard-list' },
			{ href: '/packing', label: i18n.t('Empaque'), icon: 'package-check' },
			{ href: '/shipping', label: i18n.t('Despacho'), icon: 'truck' }
		]},
		{ label: i18n.t('Control'), items: [
			{ href: '/inventory', label: i18n.t('Inventario'), icon: 'boxes', pageKey: 'inventory' },
			{ href: '/cycle-count', label: i18n.t('Conteo cíclico'), icon: 'scan', pageKey: 'cycle-counts' }
		]},
		{ label: i18n.t('Gestión'), items: [
			{ href: '/management/purchase-orders', label: i18n.t('Compras'), icon: 'clipboard-list', pageKey: 'purchase-orders' },
			{ href: '/management/sales-orders', label: i18n.t('Pedidos de venta'), icon: 'package', pageKey: 'sales-orders' },
			{ href: '/management/customers', label: i18n.t('Clientes'), icon: 'user' },
			{ href: '/management/vendors', label: i18n.t('Proveedores'), icon: 'truck', pageKey: 'vendors' },
			{ href: '/management/backorders', label: i18n.t('Pendientes'), icon: 'scan', pageKey: 'backorders' },
			{ href: '/management/count-approvals', label: i18n.t('Aprobaciones'), icon: 'clipboard-list', pageKey: 'count-approvals' },
			{ href: '/management/adjustments', label: i18n.t('Ajustes'), icon: 'database', pageKey: 'adjustments' },
			{ href: '/management/inter-warehouse-transfers', label: i18n.t('Movimientos'), icon: 'truck', pageKey: 'transfer-orders' },
			{ href: '/management/transfer-orders', label: i18n.t('Órdenes de traslado'), icon: 'truck', pageKey: 'transfer-orders' },
			{ href: '/management/preferred-bins', label: i18n.t('Ubicaciones preferidas'), icon: 'map-pin', pageKey: 'preferred-bins' },
			{ href: '/management/fraud', label: i18n.t('Revisión de pedidos'), icon: 'user', pageKey: 'fraud' },
			{ href: '/management/pos-activity', label: i18n.t('Actividad POS'), icon: 'database', pageKey: 'pos-activity' },
			{ href: '/management/refunds', label: i18n.t('Reembolsos'), icon: 'package', pageKey: 'sales-orders' },
			{ href: '/management/returns', label: i18n.t('Devoluciones'), icon: 'package', pageKey: 'sales-orders' },
			{ href: '/management/users', label: i18n.t('Usuarios'), icon: 'user', pageKey: 'users' }
		]},
		{ label: i18n.t('Plataforma'), items: [
			{ href: '/management/settings', label: i18n.t('Ajustes'), icon: 'database', pageKey: 'settings' },
			{ href: '/management/api-tokens', label: i18n.t('Tokens API'), icon: 'lock', pageKey: 'api-tokens' },
			{ href: '/management/channels', label: i18n.t('Canales'), icon: 'globe', pageKey: 'channels' },
			{ href: '/management/webhooks', label: i18n.t('Webhooks'), icon: 'globe', pageKey: 'webhooks' },
			{ href: '/management/notifications', label: i18n.t('Notificaciones'), icon: 'globe', pageKey: 'notifications' },
			{ href: '/management/integrations', label: i18n.t('Integraciones'), icon: 'database', pageKey: 'integrations' },
			{ href: '/management/consumer-groups', label: i18n.t('Consumer groups'), icon: 'user', pageKey: 'consumer-groups' },
			{ href: '/management/inbound-activity', label: i18n.t('Actividad inbound'), icon: 'inbox', pageKey: 'inbound' },
			{ href: '/management/imports', label: i18n.t('Imports'), icon: 'database', pageKey: 'imports' },
			{ href: '/management/audit-log', label: i18n.t('Audit log'), icon: 'clipboard-list', pageKey: 'audit-log' }
		]},
		{ label: i18n.t('Datos'), items: [
			{ href: '/data', label: i18n.t('Maestros'), icon: 'database' },
			{ href: '/warehouses', label: i18n.t('Almacenes'), icon: 'warehouse', pageKey: 'warehouses' }
		]}
	]);

	onMount(() => { void bootstrap(); });

	$effect(() => {
		void page.url.pathname;
		if (guard.status !== 'authenticated') return;
		void guard.revalidatePermissions();
	});

	$effect(() => {
		if (guard.status !== 'authenticated' || !guard.user) return;
		void warehouseSelection.syncFromUser({
			userId: guard.user.userId,
			username: guard.user.username,
			fullName: guard.user.fullName,
			role: guard.user.role,
			warehouseIds: guard.user.warehouseIds,
			allowedPages: guard.user.allowedPages,
			allowedFunctions: guard.user.allowedFunctions,
			allowedOverrides: guard.user.allowedOverrides ?? [],
			mustChangePassword: guard.user.mustChangePassword
		});
	});

	$effect(() => {
		if (guard.status === 'authenticated' && guard.user?.mustChangePassword && page.url.pathname !== '/change-password') {
			void goto('/change-password', { replaceState: true });
		}
	});

	const hasRouteAccess = $derived(guard.status !== 'authenticated' || canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], requiredPageKeysForPath(page.url.pathname)));

	function canSeeNavItem(item: NavItem): boolean {
		if (item.pageKey) return canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], [item.pageKey]);
		if (item.href === '/data') {
			return guard.user?.role === 'ADMIN' ||
				canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], ['warehouses']) || canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], ['zones']) ||
				canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], ['bins', 'zones']) || canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], ['preferred-bins']);
		}
		return true;
	}

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	function scrollActiveNavIntoView() {
		if (typeof document === 'undefined') return;
		const active = document.querySelector('.main-nav a.nav-link.active');
		if (active instanceof HTMLElement) {
			active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
		}
	}

	$effect(() => {
		void page.url.pathname;
		if (guard.status !== 'authenticated') return;
		queueMicrotask(() => scrollActiveNavIntoView());
	});

	async function bootstrap() {
		await guard.verify();
		if (guard.status === 'authenticated' && !guard.user?.mustChangePassword) {
			await warehouseSelection.load(guard.user ? {
				userId: guard.user.userId, username: guard.user.username, fullName: guard.user.fullName,
				role: guard.user.role, warehouseIds: guard.user.warehouseIds,
				allowedPages: guard.user.allowedPages, allowedFunctions: guard.user.allowedFunctions,
				mustChangePassword: guard.user.mustChangePassword,
				allowedOverrides: guard.user.allowedOverrides ?? []
			} : null);
		}
		if (guard.status === 'anonymous') {
			const redirect = encodeURIComponent(page.url.pathname + page.url.search);
			await goto('/login?redirect=' + redirect);
		}
	}

	async function logout() {
		sidebarOpen = false;
		await guard.logout();
		await goto('/login');
	}
	async function retry() { await bootstrap(); }
</script>

{#if guard.status === 'checking'}
	<p class="boot" role="status">{i18n.t('Validando sesión…')}</p>
{:else if guard.status === 'error'}
	<section class="boot panel" role="alert">
		<p>{guard.message ?? i18n.t('No se pudo validar la sesión')}</p>
		<button type="button" onclick={retry}>{i18n.t('Reintentar')}</button>
	</section>
{:else if guard.status === 'authenticated'}
	<div class="shell" class:sidebar-open={sidebarOpen}>
		<aside class="sidebar" aria-label={i18n.t('Navegación principal')}>
			<div class="brand">
				<span class="mark">A</span>
				<div>
					<strong>ABELLIS</strong>
					<small>Smart WMS</small>
				</div>
			</div>
			<nav class="main-nav">
				{#each navGroups as group}
					{#if group.items.some(canSeeNavItem)}
						<p class="group-label">{group.label}</p>
						<ul>
							{#each group.items.filter(canSeeNavItem) as item}
								<li>
									<a class="nav-link" class:active={isActive(item.href)} href={item.href} onclick={() => (sidebarOpen = false)}>
										<AppIcon name={item.icon} size={18} />
										<span>{item.label}</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
			</nav>
		</aside>
		<div class="main">
			<header class="topbar">
				<button type="button" class="menu-btn" onclick={() => (sidebarOpen = !sidebarOpen)} aria-label={i18n.t('Menú')}>
					<AppIcon name="menu" size={20} />
				</button>
				<div class="topbar-actions">
					<ThemeToggle />
					<LocaleSwitcher />
					{#if warehouseSelection.canSelect && warehouseSelection.warehouses.length > 0}
						<WarehousePicker />
					{/if}
					{#if !guard.user?.mustChangePassword}<a class="account-action" href="/change-password" aria-label={i18n.t('Cambiar contraseña')} title={i18n.t('Cambiar contraseña')}><AppIcon name="lock" size={17} /><span>{i18n.t('Contraseña')}</span></a>{/if}
					<button type="button" class="account-action" onclick={logout} aria-label={i18n.t('Cerrar sesión')}>
						<AppIcon name="logout" size={17} /><span>{i18n.t('Salir')}</span>
					</button>
				</div>
			</header>
			<main class="content">
				{#if !hasRouteAccess}
					<section class="denied" role="alert">
						<p>{i18n.t('No tienes permiso para ver esta página.')}</p>
					</section>
				{:else}
					{@render children()}
				{/if}
			</main>
		</div>
		{#if sidebarOpen}
			<button type="button" class="scrim" aria-label={i18n.t('Cerrar menú')} onclick={() => (sidebarOpen = false)}></button>
		{/if}
	</div>
{/if}

<style>
	.shell { display: grid; grid-template-columns: 16.5rem 1fr; min-height: 100dvh; background: var(--bg); color: var(--ink); }
	.sidebar { position: sticky; top: 0; height: 100dvh; overflow: auto; border-right: 1px solid var(--line); background: var(--surface); padding: 1rem 0.75rem; }
	.brand { display: flex; gap: 0.65rem; align-items: center; padding: 0.35rem 0.5rem 1rem; }
	.mark { width: 2rem; height: 2rem; border-radius: 0.55rem; display: grid; place-items: center; background: var(--navy); color: white; font-weight: 700; }
	.brand strong { display: block; font-size: 0.95rem; }
	.brand small { color: var(--slate); }
	.group-label { margin: 0.85rem 0.5rem 0.35rem; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--slate); }
	.main-nav ul { list-style: none; margin: 0; padding: 0; }
	.nav-link { display: flex; align-items: center; gap: 0.55rem; padding: 0.45rem 0.55rem; border-radius: 0.55rem; color: var(--ink); text-decoration: none; font-size: 0.9rem; }
	.nav-link:hover { background: color-mix(in oklab, var(--navy) 8%, transparent); }
	.nav-link.active { background: color-mix(in oklab, var(--navy) 14%, transparent); font-weight: 600; }
	.main { min-width: 0; display: flex; flex-direction: column; }
	.topbar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; min-height: 3.25rem; padding: 0.55rem 1rem; border-bottom: 1px solid var(--line); background: var(--surface); }
	.topbar-actions { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
	.menu-btn { display: none; border: 1px solid var(--line); background: var(--surface); border-radius: 0.5rem; padding: 0.35rem; }
	.account-action { display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 0.5rem; padding: 0.35rem 0.55rem; text-decoration: none; font-size: 0.82rem; cursor: pointer; }
	.content { padding: 0.25rem 0 2rem; }
	.boot { display: grid; place-items: center; min-height: 100dvh; gap: 0.75rem; color: var(--slate); }
	.boot.panel { padding: 2rem; }
	.denied { max-width: 32rem; margin: 2rem auto; padding: 1.25rem; border: 1px solid var(--line); border-radius: 0.75rem; background: var(--surface); }
	.scrim { display: none; }
	@media (max-width: 900px) {
		.shell { grid-template-columns: 1fr; }
		.sidebar { position: fixed; inset: 0 auto 0 0; width: min(18rem, 88vw); z-index: 40; transform: translateX(-105%); transition: transform 0.2s ease; }
		.shell.sidebar-open .sidebar { transform: translateX(0); }
		.menu-btn { display: inline-grid; place-items: center; }
		.scrim { display: block; position: fixed; inset: 0; border: 0; background: rgb(0 0 0 / 0.35); z-index: 30; }
	}
</style>
