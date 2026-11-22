<script lang="ts">
	import { getContext, onMount, setContext, untrack } from 'svelte';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import AppIcon from '../../lib/components/AppIcon.svelte';
	import LocaleSwitcher from '../../lib/components/LocaleSwitcher.svelte';
	import ThemeToggle from '../../lib/components/ThemeToggle.svelte';
	import WarehousePicker from '../../lib/components/WarehousePicker.svelte';
	import SessionBootView from '../../lib/components/SessionBootView.svelte';
	import UiStatePanel from '../../lib/components/UiStatePanel.svelte';
	import type { I18nState } from '../../lib/i18n/i18n.svelte';
	import { createAuthGuardState } from '../../core/feature/auth/ui/state/authGuardState.svelte';
	import { createWarehouseSelectionState } from '../../core/feature/warehouses/ui/state/warehouseSelectionState.svelte';
	import { canAccessAdminRoute, canAccessAnyPages, canAccessOperationalFunction, canAccessPages, routeAccessPolicyForPath } from '../../core/feature/auth/domain/policy/AccessPolicy';

	const i18n = getContext<I18nState>('i18n');
	let { children } = $props();
	let sidebarOpen = $state(false);
	/** Desktop: rail de iconos vs sidebar completa (efecto collapse del demo). */
	let navCollapsed = $state(false);

	function toggleNavCollapsed() {
		navCollapsed = !navCollapsed;
		try {
			localStorage.setItem('smartwms-nav-collapsed', navCollapsed ? '1' : '0');
		} catch {
			/* ignore */
		}
	}
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
	type NavItem = { href: string; label: string; icon: IconName; pageKey?: string; functionKey?: 'pick' | 'pack' | 'ship' };
	const navGroups: { label: string; items: NavItem[] }[] = $derived([
		{ label: i18n.t('Operaciones'), items: [
			{ href: '/dashboard', label: i18n.t('Dashboard'), icon: 'database', pageKey: 'dashboard' },
			{ href: '/receiving', label: i18n.t('Recepción'), icon: 'inbox', pageKey: 'receiving' },
			{ href: '/putaway', label: i18n.t('Ubicación'), icon: 'map-pin', pageKey: 'putaway' },
			{ href: '/picking', label: i18n.t('Preparación'), icon: 'clipboard-list', functionKey: 'pick' },
			{ href: '/picking-tickets', label: i18n.t('Tickets de picking'), icon: 'clipboard-list', pageKey: 'picking-tickets' },
			{ href: '/picking-batches', label: i18n.t('Lotes de picking'), icon: 'boxes', pageKey: 'picking-batches' },
			{ href: '/packing', label: i18n.t('Empaque'), icon: 'package-check', functionKey: 'pack' },
			{ href: '/shipping', label: i18n.t('Despacho'), icon: 'truck', functionKey: 'ship' }
		]},
		{ label: i18n.t('Control'), items: [
			{ href: '/inventory', label: i18n.t('Inventario'), icon: 'boxes', pageKey: 'inventory' },
			{ href: '/cycle-count', label: i18n.t('Conteo cíclico'), icon: 'scan', pageKey: 'cycle-counts' }
		]},
		{ label: i18n.t('Gestión'), items: [
			{ href: '/management/purchase-orders', label: i18n.t('Compras'), icon: 'clipboard-list', pageKey: 'purchase-orders' },
			{ href: '/management/sales-orders', label: i18n.t('Pedidos de venta'), icon: 'package', pageKey: 'sales-orders' },
			{ href: '/management/customers', label: i18n.t('Clientes'), icon: 'user', pageKey: 'sales-orders' },
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
			{ href: '/items', label: i18n.t('Items'), icon: 'package', pageKey: 'items' },
			{ href: '/data', label: i18n.t('Maestros'), icon: 'database' },
			{ href: '/warehouses', label: i18n.t('Almacenes'), icon: 'warehouse', pageKey: 'warehouses' }
		]}
	]);

	const routeAccess = $derived(routeAccessPolicyForPath(page.url.pathname));
	const hasRouteAccess = $derived.by(() => {
		if (guard.user?.mustChangePassword) return page.url.pathname === '/change-password';
		if (!routeAccess) return false;
		if (routeAccess.kind === 'authenticated') return true;
		if (routeAccess.kind === 'admin') return canAccessAdminRoute(guard.user?.role ?? 'USER');
		if (routeAccess.kind === 'function') return canAccessOperationalFunction(guard.user?.role ?? 'USER', guard.user?.allowedFunctions ?? [], routeAccess.functionKey);
		if (routeAccess.kind === 'all') {
			return canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], routeAccess.pageKeys);
		}
		if (routeAccess.kind === 'allAndAny') {
			const role = guard.user?.role ?? 'USER';
			const allowed = guard.user?.allowedPages ?? [];
			return canAccessPages(role, allowed, routeAccess.allPageKeys) && canAccessAnyPages(role, allowed, routeAccess.anyPageKeys);
		}
		return canAccessAnyPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], routeAccess.pageKeys);
	});

	function canSeeNavItem(item: NavItem) {
		if (item.href === '/management/audit-log' || item.href === '/warehouses') {
			return canAccessAdminRoute(guard.user?.role ?? 'USER');
		}
		if (item.functionKey) return canAccessOperationalFunction(guard.user?.role ?? 'USER', guard.user?.allowedFunctions ?? [], item.functionKey);
		if (item.pageKey) {
			const role = guard.user?.role ?? 'USER';
			const allowed = guard.user?.allowedPages ?? [];
			if (item.href === '/picking-tickets') return canAccessPages(role, allowed, ['picking-tickets']) && canAccessAnyPages(role, allowed, ['sales-orders', 'fraud']);
			return canAccessPages(role, allowed, [item.pageKey]);
		}
		if (item.href === '/data') {
			return canAccessAnyPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], [
				'bins', 'zones', 'preferred-bins'
			]);
		}
		return true;
	}

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	const crumb = $derived.by(() => {
		const path = page.url.pathname;
		for (const group of navGroups) {
			for (const item of group.items) {
				if (isActive(item.href)) {
					return { section: group.label, page: item.label };
				}
			}
		}
		if (path.startsWith('/change-password')) {
			return { section: 'ABELLIS', page: i18n.t('Contraseña') };
		}
		return { section: 'Smart WMS', page: path.replace(/^\//, '') || 'app' };
	});

	const userInitial = $derived(
		(guard.user?.fullName || guard.user?.username || '?').trim().charAt(0).toUpperCase()
	);

	function scrollActiveNavIntoView() {
		if (typeof document === 'undefined') return;
		const active = document.querySelector('.main-nav a.nav-link.active');
		if (active instanceof HTMLElement) {
			active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
		}
	}

	let previousPathname = page.url.pathname;

	function toWarehouseAuthUser(user: NonNullable<typeof guard.user>) {
		return {
			userId: user.userId,
			username: user.username,
			fullName: user.fullName,
			role: user.role,
			warehouseIds: user.warehouseIds,
			allowedPages: user.allowedPages,
			allowedFunctions: user.allowedFunctions,
			mustChangePassword: user.mustChangePassword,
			allowedOverrides: user.allowedOverrides ?? []
		};
	}

	async function revalidateAccessAndWarehouse() {
		await guard.revalidatePermissions();
		if (guard.status === 'authenticated' && guard.user && !guard.user.mustChangePassword) {
			await warehouseSelection.syncFromUser(toWarehouseAuthUser(guard.user));
			return;
		}
		if (guard.status === 'anonymous') {
			await warehouseSelection.syncFromUser(null);
			const redirect = encodeURIComponent(page.url.pathname + page.url.search);
			await goto('/login?redirect=' + redirect, { replaceState: true });
		}
	}

	$effect(() => {
		const pathname = page.url.pathname;
		if (pathname !== previousPathname) {
			previousPathname = pathname;
			if (untrack(() => guard.status) === 'authenticated') {
				void revalidateAccessAndWarehouse();
			}
		}
		if (guard.status !== 'authenticated') return;
		if (guard.user?.mustChangePassword && pathname !== '/change-password') {
			queueMicrotask(() => void goto('/change-password', { replaceState: true }));
			return;
		}
		queueMicrotask(() => scrollActiveNavIntoView());
	});

	async function bootstrap() {
		await guard.verify();
		if (guard.status === 'authenticated' && !guard.user?.mustChangePassword && guard.user) {
			await warehouseSelection.load(toWarehouseAuthUser(guard.user));
		}
		if (guard.status === 'anonymous') {
			const redirect = encodeURIComponent(page.url.pathname + page.url.search);
			await goto('/login?redirect=' + redirect);
		}
	}

	async function logout() {
		sidebarOpen = false;
		await guard.logout();
		await warehouseSelection.syncFromUser(null);
		await goto('/login');
	}

	async function retry() { await bootstrap(); }

	onMount(() => {
		try {
			navCollapsed = localStorage.getItem('smartwms-nav-collapsed') === '1';
		} catch {
			/* ignore */
		}
		void bootstrap();
	});
</script>

{#if guard.status === 'checking'}
	<SessionBootView status="checking" />
{:else if guard.status === 'error'}
	<SessionBootView status="error" message={guard.message} onRetry={retry} />
{:else if guard.status === 'authenticated'}
	<div class="shell" class:sidebar-open={sidebarOpen} class:nav-collapsed={navCollapsed}>
		<aside class="sidebar" aria-label={i18n.t('Navegación principal')}>
			<div class="brand-row">
				<div class="brand">
					<img
						class="mark"
						src="/brand/abellis_mark_principal.svg"
						width="32"
						height="32"
						alt="Abellis"
					/>
					<div class="brand-text">
						<strong>ABELLIS</strong>
						<small>Smart WMS</small>
					</div>
				</div>
				<button
					type="button"
					class="nav-collapse-btn"
					onclick={toggleNavCollapsed}
					aria-expanded={!navCollapsed}
					aria-label={navCollapsed ? i18n.t('Expandir menú') : i18n.t('Contraer menú')}
					title={navCollapsed ? i18n.t('Expandir menú') : i18n.t('Contraer menú')}
				>
					<svg class="chev" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M14.5 6.5 9 12l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</div>
			<nav class="main-nav">
				{#each navGroups as group, gi}
					{#if group.items.some(canSeeNavItem)}
						<p class="group-label" style="--stagger: {gi}">{group.label}</p>
						<ul>
							{#each group.items.filter(canSeeNavItem) as item, ii}
								<li style="--stagger: {gi * 3 + ii}">
									<a
										class="nav-link"
										class:active={isActive(item.href)}
										href={item.href}
										title={item.label}
										onclick={() => (sidebarOpen = false)}
									>
										<span class="nav-ico"><AppIcon name={item.icon} size={18} /></span>
										<span class="nav-label">{item.label}</span>
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
				<div class="topbar-pill">
					<button type="button" class="menu-btn" onclick={() => (sidebarOpen = !sidebarOpen)} aria-label={i18n.t('Menú')}>
						<AppIcon name="menu" size={18} />
					</button>
					<nav class="crumbs" aria-label="Breadcrumb">
						<span class="crumb-section">{crumb.section}</span>
						<span class="crumb-sep" aria-hidden="true">/</span>
						<span class="crumb-page">{crumb.page}</span>
					</nav>
					<div class="topbar-spacer"></div>
					<div class="topbar-actions">
						{#if warehouseSelection.warehouses.length > 0}
							<div class="pill-slot warehouse-slot">
								<WarehousePicker />
							</div>
						{/if}
						<div class="pill-slot locale-slot">
							<LocaleSwitcher />
						</div>
						<div class="icon-tools">
							<div class="icon-tool theme-slot">
								<ThemeToggle />
							</div>
							{#if !guard.user?.mustChangePassword}
								<a class="icon-btn" href="/change-password" aria-label={i18n.t('Cambiar contraseña')} title={i18n.t('Contraseña')}>
									<AppIcon name="lock" size={16} />
								</a>
							{/if}
							<button type="button" class="icon-btn" onclick={logout} aria-label={i18n.t('Cerrar sesión')} title={i18n.t('Salir')}>
								<AppIcon name="logout" size={16} />
							</button>
							<span class="avatar" title={guard.user?.fullName || guard.user?.username || ''} aria-hidden="true">{userInitial}</span>
						</div>
					</div>
				</div>
			</header>
			<main class="content">
				{#if warehouseSelection.error}
					<UiStatePanel
						kind="error"
						title={i18n.t('Contexto de almacén no disponible')}
						message={warehouseSelection.error}
					/>
				{/if}
				{#if !hasRouteAccess}
					<UiStatePanel
						kind="forbidden"
						title={i18n.t('Acceso denegado')}
						message={i18n.t('No tienes permiso para ver esta página.')}
					/>
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
	.shell {
		display: grid;
		grid-template-columns: var(--nav-w, 16.5rem) 1fr;
		min-height: 100dvh;
		background: var(--bg);
		color: var(--ink);
		--nav-w: 16.5rem;
		--nav-w-collapsed: 4.35rem;
		transition: grid-template-columns 0.42s cubic-bezier(0.32, 1.15, 0.55, 1);
	}
	.shell.nav-collapsed {
		--nav-w: var(--nav-w-collapsed);
	}
	.sidebar {
		position: sticky;
		top: 0;
		height: 100dvh;
		overflow-x: hidden;
		overflow-y: auto;
		border-right: 1px solid var(--line);
		background: var(--surface);
		padding: 0.85rem 0.55rem;
		z-index: 100;
		width: 100%;
		min-width: 0;
	}
	.brand-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.25rem 0.85rem;
		min-height: 2.75rem;
	}
	.brand {
		display: flex;
		gap: 0.55rem;
		align-items: center;
		min-width: 0;
		flex: 1;
	}
	.mark {
		width: 2rem;
		height: 2rem;
		border-radius: 0.55rem;
		display: block;
		object-fit: contain;
		flex: none;
		background: transparent;
	}
	.brand-text {
		min-width: 0;
		overflow: hidden;
		transition: opacity 0.28s cubic-bezier(0.32, 1.1, 0.55, 1), transform 0.28s cubic-bezier(0.32, 1.1, 0.55, 1), max-width 0.36s cubic-bezier(0.32, 1.1, 0.55, 1);
		max-width: 9rem;
		opacity: 1;
		transform: translateX(0);
	}
	.brand-text strong {
		display: block;
		font-size: 0.95rem;
		white-space: nowrap;
	}
	.brand-text small {
		color: var(--slate);
		white-space: nowrap;
	}
	.nav-collapse-btn {
		flex: none;
		width: 2rem;
		height: 2rem;
		border: 0;
		border-radius: 0.65rem;
		background: color-mix(in srgb, var(--navy) 10%, transparent);
		color: var(--ink);
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.nav-collapse-btn .chev {
		width: 1.1rem;
		height: 1.1rem;
		transition: transform 0.4s cubic-bezier(0.32, 1.2, 0.55, 1);
	}
	.shell.nav-collapsed .nav-collapse-btn .chev {
		transform: rotate(180deg);
	}
	.shell.nav-collapsed .brand-row {
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
	}
	.shell.nav-collapsed .brand-text {
		max-width: 0;
		opacity: 0;
	}
	.main-nav {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.group-label {
		margin: 0.65rem 0.55rem 0.25rem;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--slate);
	}
	.shell.nav-collapsed .group-label {
		opacity: 0;
		height: 0;
		overflow: hidden;
		margin: 0;
	}
	.main-nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.65rem;
		border-radius: 0.65rem;
		text-decoration: none;
		color: var(--ink);
		font-size: 0.875rem;
		font-weight: 500;
	}
	.nav-link:hover {
		background: color-mix(in srgb, var(--navy) 8%, transparent);
	}
	.nav-link.active {
		background: color-mix(in srgb, var(--navy) 14%, transparent);
		color: var(--navy);
		font-weight: 600;
	}
	.nav-ico {
		flex: none;
		display: grid;
		place-items: center;
	}
	.shell.nav-collapsed .nav-label {
		display: none;
	}
	.shell.nav-collapsed .nav-link {
		justify-content: center;
		padding-inline: 0.45rem;
	}
	.main {
		min-width: 0;
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 40;
		padding: 0.75rem 1rem;
		background: color-mix(in srgb, var(--bg) 85%, transparent);
		backdrop-filter: blur(10px);
	}
	.topbar-pill {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.35rem 0.55rem;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: var(--surface);
	}
	.menu-btn {
		display: none;
		border: 0;
		background: transparent;
		cursor: pointer;
		color: var(--ink);
	}
	.crumbs {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8125rem;
	}
	.crumb-section {
		color: var(--slate);
	}
	.crumb-page {
		font-weight: 600;
	}
	.topbar-spacer {
		flex: 1;
	}
	.topbar-actions {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	.icon-tools {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.icon-btn {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		border: 0;
		background: transparent;
		color: var(--ink);
		text-decoration: none;
		cursor: pointer;
	}
	.avatar {
		width: 1.85rem;
		height: 1.85rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--navy) 16%, transparent);
		color: var(--navy);
		display: grid;
		place-items: center;
		font-size: 0.72rem;
		font-weight: 700;
	}
	.content {
		flex: 1;
		padding: 0.5rem 1.25rem 1.5rem;
	}
	.scrim {
		position: fixed;
		inset: 0;
		border: 0;
		background: rgba(15, 23, 42, 0.35);
		z-index: 90;
	}
	@media (max-width: 900px) {
		.shell {
			grid-template-columns: 1fr;
		}
		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			width: min(18rem, 88vw);
			transform: translateX(-105%);
			transition: transform 0.28s ease;
		}
		.shell.sidebar-open .sidebar {
			transform: translateX(0);
		}
		.menu-btn {
			display: grid;
			place-items: center;
		}
	}
</style>
