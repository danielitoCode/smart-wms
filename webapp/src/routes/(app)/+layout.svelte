<script lang="ts">
	import { getContext, onMount, setContext, untrack } from 'svelte';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import AppIcon from '../../lib/components/AppIcon.svelte';
	import LocaleSwitcher from '../../lib/components/LocaleSwitcher.svelte';
	import ThemeToggle from '../../lib/components/ThemeToggle.svelte';
	import WarehousePicker from '../../lib/components/WarehousePicker.svelte';
	import SessionBootView from '../../lib/components/SessionBootView.svelte';
	import type { I18nState } from '../../lib/i18n/i18n.svelte';
	import { createAuthGuardState } from '../../core/feature/auth/ui/state/authGuardState.svelte';
	import { createWarehouseSelectionState } from '../../core/feature/warehouses/ui/state/warehouseSelectionState.svelte';
	import { canAccessPages, requiredPageKeysForPath } from '../../core/feature/auth/domain/policy/AccessPolicy';

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
	type NavItem = { href: string; label: string; icon: IconName; pageKey?: string };
	const navGroups: { label: string; items: NavItem[] }[] = $derived([
		{ label: i18n.t('Operaciones'), items: [
			{ href: '/receiving', label: i18n.t('Recepción'), icon: 'inbox', pageKey: 'receiving' },
			{ href: '/putaway', label: i18n.t('Ubicación'), icon: 'map-pin', pageKey: 'putaway' },
			{ href: '/picking', label: i18n.t('Preparación'), icon: 'clipboard-list' },
			{ href: '/picking-tickets', label: i18n.t('Tickets de picking'), icon: 'clipboard-list', pageKey: 'picking-tickets' },
			{ href: '/picking-batches', label: i18n.t('Lotes de picking'), icon: 'boxes', pageKey: 'picking-batches' },
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
			{ href: '/items', label: i18n.t('Items'), icon: 'package', pageKey: 'items' },
			{ href: '/data', label: i18n.t('Maestros'), icon: 'database' },
			{ href: '/warehouses', label: i18n.t('Almacenes'), icon: 'warehouse', pageKey: 'warehouses' }
		]}
	]);

	const requiredKeys = $derived(requiredPageKeysForPath(page.url.pathname));
	const hasRouteAccess = $derived(
		!requiredKeys.length ||
			canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], requiredKeys)
	);

	function canSeeNavItem(item: NavItem) {
		if (item.pageKey) return canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], [item.pageKey]);
		if (item.href === '/data') {
			return canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], ['preferred-bins']);
		}
		return true;
	}

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	/** Breadcrumb for capsule topbar (section / page). */
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
					<span class="mark">A</span>
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
						{#if warehouseSelection.canSelect && warehouseSelection.warehouses.length > 0}
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
		display: grid;
		place-items: center;
		background: var(--navy);
		color: white;
		font-weight: 700;
		flex: none;
	}

	.brand-text {
		min-width: 0;
		overflow: hidden;
		transition:
			opacity 0.28s cubic-bezier(0.32, 1.1, 0.55, 1),
			transform 0.28s cubic-bezier(0.32, 1.1, 0.55, 1),
			max-width 0.36s cubic-bezier(0.32, 1.1, 0.55, 1);
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
		transition:
			background 0.2s ease,
			transform 0.35s cubic-bezier(0.32, 1.15, 0.55, 1);
	}

	.nav-collapse-btn:hover {
		background: color-mix(in srgb, var(--navy) 16%, transparent);
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
		justify-content: flex-start;
		gap: 0.45rem;
		padding: 0.15rem 0 0.75rem;
	}

	.shell.nav-collapsed .brand {
		flex: none;
		justify-content: center;
		width: 100%;
	}

	.shell.nav-collapsed .brand-text {
		opacity: 0;
		transform: translateX(-8px);
		max-width: 0;
		pointer-events: none;
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
	}

	.shell.nav-collapsed .nav-collapse-btn {
		margin: 0;
		width: 2rem;
		height: 2rem;
		flex: none;
	}

	.group-label {
		margin: 0.85rem 0.45rem 0.35rem;
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--slate);
		white-space: nowrap;
		overflow: hidden;
		max-height: 1.5rem;
		opacity: 1;
		transform: translateX(0);
		transition:
			opacity 0.26s ease,
			transform 0.28s cubic-bezier(0.32, 1.1, 0.55, 1),
			max-height 0.3s ease,
			margin 0.3s ease;
		transition-delay: calc(var(--stagger, 0) * 28ms);
	}

	.shell.nav-collapsed .group-label {
		opacity: 0;
		transform: translateX(-8px);
		max-height: 0;
		margin-top: 0.25rem;
		margin-bottom: 0;
		pointer-events: none;
		transition-delay: 0ms;
	}

	.main-nav {
		overflow: visible;
	}

	.main-nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow: visible;
	}

	.main-nav li {
		position: relative;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.5rem 0.55rem;
		border-radius: 0.65rem;
		color: var(--ink);
		text-decoration: none;
		font-size: 0.9rem;
		transition:
			filter 0.3s ease,
			transform 0.3s ease,
			background 0.2s ease,
			opacity 0.3s ease,
			justify-content 0.3s ease;
		will-change: filter, transform;
		min-height: 2.45rem;
	}

	.nav-ico {
		display: grid;
		place-items: center;
		flex: none;
		width: 1.25rem;
	}

	.nav-label {
		display: inline-block;
		white-space: nowrap;
		overflow: hidden;
		max-width: 12rem;
		opacity: 1;
		transform: translateX(0);
		transition:
			opacity 0.28s cubic-bezier(0.32, 1.1, 0.55, 1),
			transform 0.28s cubic-bezier(0.32, 1.1, 0.55, 1),
			max-width 0.36s cubic-bezier(0.32, 1.1, 0.55, 1);
		transition-delay: calc(var(--stagger, 0) * 22ms);
	}

	.shell.nav-collapsed .nav-label {
		opacity: 0;
		transform: translateX(-10px);
		max-width: 0;
		pointer-events: none;
		transition-delay: 0ms;
	}

	.shell.nav-collapsed .nav-link {
		justify-content: center;
		padding-inline: 0.45rem;
	}

	.nav-link:hover {
		background: color-mix(in oklab, var(--navy) 8%, transparent);
	}

	.nav-link.active {
		background: color-mix(in oklab, var(--navy) 14%, transparent);
		font-weight: 600;
	}

	.shell:not(.nav-collapsed) .main-nav:hover .nav-link:not(:hover) {
		filter: blur(1px);
		transform: scale(0.95);
		opacity: 0.72;
	}

	.shell:not(.nav-collapsed) .main-nav:hover .nav-link:hover {
		filter: none;
		transform: scale(1);
		opacity: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.shell {
			transition: none;
		}
		.brand-text,
		.group-label,
		.nav-label,
		.nav-collapse-btn,
		.nav-collapse-btn .chev {
			transition: none !important;
		}
		.nav-link {
			transition: background 0.2s ease;
		}
		.shell:not(.nav-collapsed) .main-nav:hover .nav-link:not(:hover) {
			filter: none;
			transform: none;
			opacity: 0.85;
		}
	}

	.main {
		min-width: 0;
		display: flex;
		flex-direction: column;
		position: relative;
		z-index: 1;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		padding: 0.75rem 1rem 0.35rem;
		background: transparent;
		pointer-events: none;
	}

	.topbar-pill {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-height: 3.15rem;
		padding: 0.35rem 0.55rem 0.35rem 1rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--line) 85%, transparent);
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		backdrop-filter: blur(14px) saturate(1.15);
		-webkit-backdrop-filter: blur(14px) saturate(1.15);
		box-shadow:
			0 10px 28px -18px color-mix(in srgb, var(--navy) 40%, transparent),
			0 1px 0 color-mix(in srgb, #fff 6%, transparent) inset;
		color: var(--ink);
	}

	:global([data-theme='dark']) .topbar-pill,
	:global(.theme-dark) .topbar-pill {
		background: color-mix(in srgb, #0c1219 82%, transparent);
		border-color: color-mix(in srgb, #ffffff 10%, transparent);
		box-shadow:
			0 12px 32px -16px rgb(0 0 0 / 0.55),
			0 1px 0 color-mix(in srgb, #fff 5%, transparent) inset;
	}

	.crumbs {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
		font-size: 0.8125rem;
		line-height: 1.2;
		white-space: nowrap;
	}

	.crumb-section {
		color: var(--slate);
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.crumb-sep {
		color: color-mix(in srgb, var(--slate) 70%, transparent);
		font-weight: 400;
	}

	.crumb-page {
		color: var(--ink);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.topbar-spacer {
		flex: 1 1 auto;
		min-width: 0.5rem;
	}

	.topbar-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: none;
	}

	.pill-slot {
		display: flex;
		align-items: center;
	}

	.icon-tools {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		padding-right: 0.15rem;
	}

	.icon-btn {
		display: inline-grid;
		place-items: center;
		width: 2.15rem;
		height: 2.15rem;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--slate);
		cursor: pointer;
		text-decoration: none;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.icon-btn:hover {
		background: color-mix(in srgb, var(--navy) 12%, transparent);
		color: var(--ink);
	}

	.icon-tool {
		display: grid;
		place-items: center;
	}

	.avatar {
		display: inline-grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		margin-left: 0.15rem;
		border-radius: 999px;
		background: linear-gradient(
			145deg,
			color-mix(in srgb, var(--navy) 75%, white),
			var(--navy-deep, #012a50)
		);
		color: #fff;
		font: 700 0.78rem / 1 var(--disp, system-ui);
		letter-spacing: 0.02em;
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--surface) 80%, transparent);
		user-select: none;
	}

	.menu-btn {
		display: none;
		border: 0;
		background: transparent;
		border-radius: 999px;
		padding: 0.4rem;
		color: var(--ink);
		cursor: pointer;
	}

	.menu-btn:hover {
		background: color-mix(in srgb, var(--navy) 12%, transparent);
	}

	.topbar-pill :global(.theme-switch),
	.topbar-pill :global(.theme-toggle) {
		transform: scale(0.88);
		transform-origin: center;
	}

	.topbar-pill :global(button),
	.topbar-pill :global(select) {
		border-radius: 999px;
	}

	.content {
		flex: 1;
		min-width: 0;
		padding: 0 0 0.5rem;
	}

	.denied {
		max-width: 32rem;
		margin: 2rem auto;
		padding: 1.25rem;
		border: 1px solid var(--line);
		border-radius: 0.75rem;
		background: var(--surface);
	}

	.scrim {
		display: none;
	}

	@media (max-width: 900px) {
		.shell {
			grid-template-columns: 1fr;
			transition: none;
		}
		.shell.nav-collapsed {
			--nav-w: 16.5rem;
		}
		.sidebar {
			position: fixed;
			inset: 0 auto 0 0;
			width: min(18rem, 88vw);
			z-index: 110;
			transform: translateX(-105%);
			transition: transform 0.2s ease;
		}
		.shell.sidebar-open .sidebar {
			transform: translateX(0);
		}
		.shell.nav-collapsed .brand-text,
		.shell.nav-collapsed .group-label,
		.shell.nav-collapsed .nav-label {
			opacity: 1;
			transform: none;
			max-width: 12rem;
			max-height: none;
			pointer-events: auto;
			position: static;
			width: auto;
			height: auto;
		}
		.shell.nav-collapsed .nav-link {
			justify-content: flex-start;
			padding-inline: 0.55rem;
		}
		.nav-collapse-btn {
			display: none;
		}
		.menu-btn {
			display: inline-grid;
			place-items: center;
		}
		.scrim {
			display: block;
			position: fixed;
			inset: 0;
			border: 0;
			background: rgb(0 0 0 / 0.35);
			z-index: 100;
		}
	}
</style>
