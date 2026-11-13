<script lang="ts">
	import { getContext, onMount, setContext } from 'svelte';
	import { goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import AppIcon from '../../lib/components/AppIcon.svelte';
	import LocaleSwitcher from '../../lib/components/LocaleSwitcher.svelte';
	import ThemeToggle from '../../lib/components/ThemeToggle.svelte';
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
			{ href: '/management/count-approvals', label: i18n.t('Aprobaciones'), icon: 'clipboard-list', pageKey: 'adjustments' },
			{ href: '/management/adjustments', label: i18n.t('Ajustes'), icon: 'database', pageKey: 'adjustments' },
			{ href: '/management/inter-warehouse-transfers', label: i18n.t('Movimientos'), icon: 'truck', pageKey: 'transfer-orders' },
			{ href: '/management/transfer-orders', label: i18n.t('Órdenes de traslado'), icon: 'truck', pageKey: 'transfer-orders' },
			{ href: '/management/preferred-bins', label: i18n.t('Ubicaciones preferidas'), icon: 'map-pin', pageKey: 'preferred-bins' },
			{ href: '/management/fraud', label: i18n.t('Revisión de pedidos'), icon: 'user', pageKey: 'sales-orders' },
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
			{ href: '/management/imports', label: i18n.t('Importaciones'), icon: 'database', pageKey: 'imports' },
			{ href: '/management/audit-log', label: i18n.t('Auditoría'), icon: 'clipboard-list', pageKey: 'audit-log' }
		]},
		{ label: i18n.t('Catálogos'), items: [
			{ href: '/items', label: i18n.t('Productos'), icon: 'package', pageKey: 'items' },
			{ href: '/warehouses', label: i18n.t('Almacenes'), icon: 'warehouse', pageKey: 'warehouses' },
			{ href: '/data', label: i18n.t('Datos maestros'), icon: 'database' }
		]}
	]);

	onMount(() => { void bootstrap(); });

	$effect(() => {
		if (guard.status === 'authenticated' && guard.user?.mustChangePassword && page.url.pathname !== '/change-password') {
			void goto('/change-password', { replaceState: true });
		}
	});

	const hasRouteAccess = $derived(guard.status !== 'authenticated' || canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], requiredPageKeysForPath(page.url.pathname)));

	function canSeeNavItem(item: NavItem): boolean {
		if (item.pageKey) return canAccessPages(guard.user?.role ?? 'USER', guard.user?.allowedPages ?? [], requiredPageKeysForPath(item.href));
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

	async function bootstrap() {
		await guard.verify();
		if (guard.status === 'authenticated' && !guard.user?.mustChangePassword) {
			await warehouseSelection.load(guard.user ? {
				userId: guard.user.userId, username: guard.user.username, fullName: guard.user.fullName,
				role: guard.user.role, warehouseIds: guard.user.warehouseIds,
				allowedPages: guard.user.allowedPages, allowedFunctions: guard.user.allowedFunctions,
				mustChangePassword: guard.user.mustChangePassword
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
		<p class="title">{i18n.t('No se pudo conectar con el servidor')}</p>
		{#if guard.message}<p class="detail">{guard.message}</p>{/if}
		<div class="actions"><button type="button" class="primary" onclick={retry}>{i18n.t('Reintentar')}</button><button type="button" onclick={logout}>{i18n.t('Cerrar sesión')}</button></div>
	</section>
{:else if guard.status === 'authenticated' && !hasRouteAccess}
	<section class="boot panel" role="alert">
		<p class="title">{i18n.t('Acceso no autorizado')}</p>
		<p class="detail">{i18n.t('Tu cuenta no tiene permiso para abrir este módulo.')}</p>
		<button type="button" class="primary" onclick={() => goto('/inventory')}>{i18n.t('Ir al inventario')}</button>
	</section>
{:else if guard.status === 'authenticated'}
	<div class="workspace">
		<aside class="sidebar" class:open={sidebarOpen} aria-label={i18n.t('Navegación de Abellis')}>
			<a class="brand" href="/inventory" aria-label="Abellis WMS, ir al inventario">
				<img src="/brand/abellis_mark_blanco.svg" width="36" height="36" alt="" />
				<span class="brand-text"><strong>Abellis</strong><small>Smart WMS</small></span>
			</a>
			{#if !guard.user?.mustChangePassword}
				<nav class="main-nav" aria-label="Navegación principal">
					{#each navGroups as group}
						{@const visibleItems = group.items.filter(canSeeNavItem)}
						{#if visibleItems.length > 0}
							<section class="nav-group">
								<p class="group-label">{group.label}</p>
								{#each visibleItems as item}
									<a class="nav-link" class:active={isActive(item.href)} href={item.href}
										aria-current={isActive(item.href) ? 'page' : undefined} onclick={() => sidebarOpen = false}>
										<AppIcon name={item.icon} size={19} /><span>{item.label}</span>
									</a>
								{/each}
							</section>
						{/if}
					{/each}
				</nav>
			{/if}
			<div class="sidebar-footer">
				<div class="avatar"><AppIcon name="user" size={18} /></div>
				<div class="account"><strong>{guard.user?.fullName || guard.user?.username || i18n.t('Usuario')}</strong><span>{guard.user?.role === 'ADMIN' ? i18n.t('Administrador') : i18n.t('Usuario de almacén')}</span></div>
			</div>
		</aside>
		{#if sidebarOpen}<button class="scrim" type="button" aria-label={i18n.t('Cerrar menú')} onclick={() => sidebarOpen = false}></button>{/if}
		<div class="app-main">
			<header class="topbar">
				<button class="menu-toggle" type="button" aria-label={i18n.t('Abrir menú')} aria-expanded={sidebarOpen} onclick={() => sidebarOpen = !sidebarOpen}><AppIcon name="menu" size={21} /></button>
				<div class="page-context"><p>ABELLIS · SMART WMS</p><span>{i18n.t('Operaciones de almacén')}</span></div>
				<div class="topbar-actions">
					<ThemeToggle />
					<LocaleSwitcher />
					{#if warehouseSelection.canSelect && warehouseSelection.warehouses.length > 0}
						<label class="warehouse-picker"><span>{i18n.t('Almacén activo')}</span>
							<select aria-label={i18n.t('Almacén activo')} value={warehouseSelection.warehouseId ?? ''} onchange={(e) => warehouseSelection.select(Number(e.currentTarget.value))}>
								{#each warehouseSelection.warehouses as wh}<option value={wh.id}>{wh.code} — {wh.name}</option>{/each}
							</select>
						</label>
					{/if}
					{#if !guard.user?.mustChangePassword}<a class="account-action" href="/change-password" aria-label={i18n.t('Cambiar contraseña')} title={i18n.t('Cambiar contraseña')}><AppIcon name="lock" size={17} /><span>{i18n.t('Contraseña')}</span></a>{/if}
					<button class="logout" type="button" onclick={logout}><AppIcon name="logout" size={17} /><span>{i18n.t('Salir')}</span></button>
				</div>
			</header>
			<main class="content motion-page-in app-content-transition">{@render children()}</main>
		</div>
	</div>
{:else}
	<p class="boot">{i18n.t('Redirigiendo…')}</p>
{/if}

<style>
	.workspace { min-height:100vh; display:grid; grid-template-columns:252px minmax(0,1fr); background:var(--bg); color:var(--ink); }
	.sidebar { view-transition-name: none; position:sticky; top:0; height:100vh; min-height:100vh; display:flex; flex-direction:column; overflow:hidden; background:var(--navy-deep); color:#f5f8fc; border-right:1px solid rgba(255,255,255,.08); z-index:30; }
	.brand { min-height:84px; display:flex; align-items:center; gap:12px; padding:18px 22px; color:#fff; text-decoration:none; border-bottom:1px solid rgba(255,255,255,.12); }
	.brand img { display:block; flex:none; }
	.brand-text { display:flex; flex-direction:column; gap:4px; line-height:1; }
	.brand-text strong { font:700 1.12rem var(--disp); letter-spacing:-.02em; }
	.brand-text small { color:var(--gold); font:600 .62rem var(--disp); letter-spacing:.14em; text-transform:uppercase; }
	.main-nav { flex:1; overflow:auto; padding:22px 14px 18px; }
	.nav-group { margin:0 0 22px; }
	.group-label { margin:0 0 8px; padding:0 11px; color:rgba(224,235,247,.54); font:600 .65rem var(--disp); letter-spacing:.16em; text-transform:uppercase; }
	.nav-link { min-height:44px; display:flex; align-items:center; gap:12px; margin:2px 0; padding:10px 12px; border-radius:10px; color:rgba(245,248,252,.78); text-decoration:none; font:500 .9rem var(--body); transition:background var(--motion-fast,160ms) var(--ease-out,ease), color var(--motion-fast,160ms) var(--ease-out,ease), box-shadow var(--motion-fast,160ms) var(--ease-out,ease); }
	.nav-link :global(svg) { flex:none; color:rgba(190,211,234,.8); transition: color var(--motion-fast,160ms) var(--ease-out,ease); }
	.nav-link:hover { color:#fff; background:rgba(255,255,255,.07); }
	.nav-link.active { color:#fff; background:rgba(143,180,218,.16); box-shadow:inset 3px 0 0 var(--gold); font-weight:600; }
	.nav-link.active :global(svg) { color:var(--gold); }
	.sidebar-footer { display:flex; align-items:center; gap:10px; padding:16px 18px; border-top:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.08); }
	.avatar { width:34px; height:34px; display:grid; place-items:center; flex:none; border:1px solid rgba(255,255,255,.18); border-radius:50%; color:var(--gold); }
	.account { min-width:0; display:flex; flex-direction:column; gap:3px; }
	.account strong { max-width:168px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#fff; font-size:.82rem; font-weight:600; }
	.account span { color:rgba(224,235,247,.62); font-size:.72rem; }
	.app-main { min-width:0; display:flex; flex-direction:column; }
	.topbar {
		view-transition-name: none;
		position: sticky;
		top: 0;
		z-index: 20;
		min-height: 64px;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px clamp(18px, 2.5vw, 34px);
		background: var(--surface);
		border-bottom: 1px solid var(--line);
	}
	.page-context { min-width: 0; display: flex; flex-direction: column; justify-content: center; }
	.page-context p { margin: 0 0 2px; color: var(--slate); font: 600 0.63rem var(--disp); letter-spacing: 0.16em; line-height: 1.2; }
	.page-context span { color: var(--ink); font: 600 0.86rem var(--body); line-height: 1.2; }
	.topbar-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: nowrap;
		gap: 10px;
		margin-left: auto;
		min-height: 40px;
	}
	.topbar-actions :global(.theme-toggle),
	.topbar-actions :global(.locale .trigger),
	.warehouse-picker,
	.account-action,
	.logout {
		height: 40px;
		min-height: 40px;
		box-sizing: border-box;
	}
	.warehouse-picker {
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		gap: 8px;
		min-width: 0;
		max-width: 280px;
		padding: 0 4px 0 10px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface);
		color: var(--slate);
		font-size: 0.68rem;
		font-weight: 600;
	}
	.warehouse-picker span {
		flex: none;
		white-space: nowrap;
		line-height: 1;
	}
	.warehouse-picker select {
		flex: 1 1 auto;
		min-width: 120px;
		max-width: 220px;
		height: 100%;
		min-height: 0;
		padding: 0 28px 0 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		color: var(--ink);
		font: 500 0.82rem var(--body);
		cursor: pointer;
	}
	.warehouse-picker select:focus { outline: none; }
	.account-action,
	.logout {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		padding: 0 12px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: transparent;
		color: var(--link, var(--navy));
		text-decoration: none;
		font: 600 0.78rem var(--body);
		cursor: pointer;
		transition: background var(--motion-fast, 160ms) var(--ease-out, ease), border-color var(--motion-fast, 160ms) var(--ease-out, ease);
	}
	.account-action:hover,.logout:hover { background:var(--surface-2); border-color:var(--lightblue); }
	.logout { color:var(--slate); }
	.menu-toggle { display:none; width:42px; min-width:42px; height:42px; place-items:center; padding:0; border:1px solid var(--line); border-radius:10px; background:var(--surface); color:var(--link,var(--navy)); }
	.content { flex:1; min-width:0; padding:26px clamp(18px,2.5vw,34px) 42px; }
	.scrim { display:none; }
	.boot { padding:3rem 1.25rem; text-align:center; color:var(--slate); animation: fade-in var(--motion-base,200ms) var(--ease-out,ease) both; }
	.panel { max-width:26rem; margin:2.5rem auto; text-align:left; background:var(--card); border:1px solid var(--line); border-radius:var(--radius-card); padding:1.25rem; box-shadow:var(--shadow-1); }
	.panel .title { margin:0 0 .35rem; font:600 1rem var(--disp); color:var(--ink); }
	.panel .detail { margin:0; color:var(--danger); font-size:.9rem; }
	.actions { display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1rem; }
	@media (max-width:1080px) { .workspace { grid-template-columns:224px minmax(0,1fr); } .topbar { gap:10px; } .warehouse-picker { min-width:150px; } }
	@media (max-width:800px) {
		.workspace { display:block; }
		.sidebar { position:fixed; left:0; top:0; width:min(84vw,290px); transform:translateX(-102%); transition:transform var(--motion-base,200ms) var(--ease-out,ease); box-shadow:none; }
		.sidebar.open { transform:translateX(0); box-shadow:var(--shadow-3); }
		.scrim { display:block; position:fixed; inset:0; z-index:25; border:0; border-radius:0; background:rgba(1,18,34,.48); animation: fade-in var(--motion-fast,140ms) var(--ease-out,ease) both; }
		.menu-toggle { display:grid; flex:none; }
		.topbar { min-height:56px; padding:8px 16px; }
		.page-context span { font-size:.82rem; }
		.topbar-actions { gap:7px; }
		.warehouse-picker { min-width:0; max-width:180px; padding-left:8px; }
		.account-action span,.logout span { display:none; }
		.account-action,.logout { width:40px; min-width:40px; padding:0; }
		.content { padding:20px 16px 32px; }
	}
	@media (max-width:520px) { .topbar { gap:9px; } .page-context p { font-size:.56rem; } .page-context span { max-width:38vw; font-size:.76rem; } .warehouse-picker { max-width:140px; padding-left:6px; } .warehouse-picker span { display:none; } }
	@media (prefers-reduced-motion:reduce) { .sidebar,.nav-link,.content,.scrim,.boot { transition:none; animation:none; } }
</style>
