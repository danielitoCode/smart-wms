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

	/* ───────── Estado de UI (scroll, migas de pan) ───────── */
	let scrollY = $state(0);
	const scrolled = $derived(scrollY > 4);

	let navEl = $state<HTMLElement | null>(null);
	let navScroll = $state({ top: false, bottom: false });

	/** Sección actual (la ruta más específica que coincide) para el topbar. */
	const currentSection = $derived.by(() => {
		let best: { group: string; item: string; len: number } | null = null;
		for (const group of navGroups) {
			for (const item of group.items) {
				if (isActive(item.href) && (!best || item.href.length > best.len)) {
					best = { group: group.label, item: item.label, len: item.href.length };
				}
			}
		}
		return best;
	});

	function updateNavScroll() {
		if (!navEl) return;
		navScroll.top = navEl.scrollTop > 4;
		navScroll.bottom = navEl.scrollTop + navEl.clientHeight < navEl.scrollHeight - 4;
	}

	$effect(() => {
		if (!navEl) return;
		updateNavScroll();
		const ro = new ResizeObserver(() => updateNavScroll());
		ro.observe(navEl);
		return () => ro.disconnect();
	});

	// Evita que la página scrollee por detrás del menú en móvil.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = sidebarOpen ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && sidebarOpen) sidebarOpen = false;
	}

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

<svelte:window bind:scrollY onkeydown={onKeydown} />

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
				<div class="nav-wrap" class:fade-top={navScroll.top} class:fade-bottom={navScroll.bottom}>
					<nav class="main-nav" aria-label="Navegación principal" bind:this={navEl} onscroll={updateNavScroll}>
						{#each navGroups as group, gi}
							{@const visibleItems = group.items.filter(canSeeNavItem)}
							{#if visibleItems.length > 0}
								<section class="nav-group" style="--i: {gi}">
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
				</div>
			{:else}
				<div class="nav-wrap"></div>
			{/if}

			<div class="sidebar-footer">
				<div class="avatar"><AppIcon name="user" size={18} /></div>
				<div class="account"><strong>{guard.user?.fullName || guard.user?.username || i18n.t('Usuario')}</strong><span>{guard.user?.role === 'ADMIN' ? i18n.t('Administrador') : i18n.t('Usuario de almacén')}</span></div>
			</div>
		</aside>

		{#if sidebarOpen}<button class="scrim" type="button" aria-label={i18n.t('Cerrar menú')} onclick={() => sidebarOpen = false}></button>{/if}

		<div class="app-main">
			<header class="topbar" class:scrolled>
				<button class="menu-toggle" type="button" aria-label={i18n.t('Abrir menú')} aria-expanded={sidebarOpen} onclick={() => sidebarOpen = !sidebarOpen}><AppIcon name="menu" size={21} /></button>

				<div class="page-context">
					<p>{currentSection?.group ?? 'Abellis · Smart WMS'}</p>
					{#key currentSection?.item ?? ''}
						<span>{currentSection?.item ?? i18n.t('Operaciones de almacén')}</span>
					{/key}
				</div>

				<div class="topbar-actions">
					{#if warehouseSelection.canSelect && warehouseSelection.warehouses.length > 0}
						<WarehousePicker />
						<span class="divider" aria-hidden="true"></span>
					{/if}
					<div class="tool-group">
						<ThemeToggle />
						<LocaleSwitcher />
					</div>
					<span class="divider" aria-hidden="true"></span>
					<div class="tool-group">
						{#if !guard.user?.mustChangePassword}<a class="account-action" href="/change-password" aria-label={i18n.t('Cambiar contraseña')} title={i18n.t('Cambiar contraseña')}><AppIcon name="lock" size={17} /><span>{i18n.t('Contraseña')}</span></a>{/if}
						<button class="logout" type="button" title={i18n.t('Salir')} onclick={logout}><AppIcon name="logout" size={17} /><span>{i18n.t('Salir')}</span></button>
					</div>
				</div>
			</header>
			<main class="content motion-page-in app-content-transition">{@render children()}</main>
		</div>
	</div>
{:else}
	<p class="boot">{i18n.t('Redirigiendo…')}</p>
{/if}

<style>
	.workspace {
		min-height: 100vh;
		display: grid;
		grid-template-columns: 252px minmax(0, 1fr);
		background: var(--bg);
		color: var(--ink);
	}

	/* ───────── Sidebar ───────── */
	.sidebar {
		view-transition-name: none;
		position: sticky;
		top: 0;
		height: 100vh;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--navy-deep);
		color: #f5f8fc;
		border-right: 1px solid rgba(255, 255, 255, 0.08);
		z-index: 30;
	}

	.brand {
		flex: none;
		min-height: 84px;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 18px 22px;
		color: #fff;
		text-decoration: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.12);
		transition: background var(--motion-fast, 160ms) var(--ease-out, ease);
	}
	.brand:hover { background: rgba(255, 255, 255, 0.04); }
	.brand:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }
	.brand img { display: block; flex: none; }
	.brand-text { display: flex; flex-direction: column; gap: 4px; line-height: 1; }
	.brand-text strong { font: 700 1.12rem var(--disp); letter-spacing: -0.02em; }
	.brand-text small { color: var(--gold); font: 600 0.62rem var(--disp); letter-spacing: 0.14em; text-transform: uppercase; }

	/* Contenedor del scroll: aloja los degradados de borde */
	.nav-wrap {
		position: relative;
		flex: 1;
		min-height: 0;
	}
	.nav-wrap::before,
	.nav-wrap::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 28px;
		z-index: 3;
		pointer-events: none;
		opacity: 0;
		transition: opacity 200ms ease;
	}
	.nav-wrap::before { top: 0; background: linear-gradient(to bottom, var(--navy-deep), transparent); }
	.nav-wrap::after { bottom: 0; background: linear-gradient(to top, var(--navy-deep), transparent); }
	.nav-wrap.fade-top::before,
	.nav-wrap.fade-bottom::after { opacity: 1; }

	.main-nav {
		position: relative;
		height: 100%;
		overflow-y: auto;
		padding: 14px 14px 18px;
		scroll-snap-type: y proximity;
		scroll-padding-block: 44px 24px;
		scroll-behavior: smooth;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
	}
	.main-nav::-webkit-scrollbar { width: 6px; }
	.main-nav::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.16); border-radius: 99px; }
	.main-nav::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.28); }

	.nav-group {
		margin: 0 0 18px;
		scroll-snap-align: start;
		scroll-snap-stop: normal;
		animation: nav-in 360ms var(--ease-out, ease-out) backwards;
		animation-delay: calc(var(--i, 0) * 45ms);
	}

	/* La etiqueta de grupo se queda fija mientras se recorre su sección */
	.group-label {
		position: sticky;
		top: 0;
		z-index: 2;
		margin: 0 0 4px;
		padding: 8px 11px 6px;
		background: var(--navy-deep);
		color: rgba(224, 235, 247, 0.54);
		font: 600 0.65rem var(--disp);
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	/* ───────── Botón de navegación + estado seleccionado ───────── */
	.nav-link {
		position: relative;
		min-height: 44px;
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 2px 0;
		padding: 10px 12px;
		border-radius: 10px;
		color: rgba(245, 248, 252, 0.78);
		text-decoration: none;
		font: 500 0.9rem var(--body);
		transition:
				background 200ms var(--ease-out, ease),
				color 200ms var(--ease-out, ease),
				transform var(--motion-fast, 160ms) var(--ease-out, ease);
	}
	.nav-link :global(svg) {
		flex: none;
		color: rgba(190, 211, 234, 0.8);
		transition:
				color 200ms var(--ease-out, ease),
				transform 220ms var(--ease-out, ease);
	}

	/* Barra dorada: siempre dentro del botón, crece desde el centro al activarse */
	.nav-link::before {
		content: '';
		position: absolute;
		left: 0;
		top: 10px;
		bottom: 10px;
		width: 3px;
		border-radius: 0 3px 3px 0;
		background: var(--gold);
		transform: scaleY(0);
		opacity: 0;
		transition:
				transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
				opacity 160ms ease;
	}

	.nav-link:hover { color: #fff; background: rgba(255, 255, 255, 0.06); }
	.nav-link:hover :global(svg) { transform: translateX(2px); }
	.nav-link:active { transform: scale(0.985); }
	.nav-link:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }

	.nav-link.active,
	.nav-link.active:hover {
		color: #fff;
		background: rgba(143, 180, 218, 0.16);
		font-weight: 600;
	}
	.nav-link.active :global(svg),
	.nav-link.active:hover :global(svg) {
		color: var(--gold);
		transform: none;
	}
	.nav-link.active::before {
		transform: scaleY(1);
		opacity: 1;
	}

	.sidebar-footer {
		flex: none;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px 18px;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.08);
	}
	.avatar { width: 34px; height: 34px; display: grid; place-items: center; flex: none; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 50%; color: var(--gold); }
	.account { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
	.account strong { max-width: 168px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff; font-size: 0.82rem; font-weight: 600; }
	.account span { color: rgba(224, 235, 247, 0.62); font-size: 0.72rem; }

	/* ───────── Topbar ───────── */
	.app-main { min-width: 0; display: flex; flex-direction: column; }

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
		transition: box-shadow 220ms ease, border-color 220ms ease;
	}
	.topbar.scrolled {
		box-shadow: 0 10px 20px -16px color-mix(in srgb, var(--navy-deep) 60%, transparent);
		border-bottom-color: color-mix(in srgb, var(--line) 60%, transparent);
	}

	.page-context { min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
	.page-context p {
		margin: 0;
		color: var(--slate);
		font: 600 0.63rem var(--disp);
		letter-spacing: 0.16em;
		line-height: 1.2;
		text-transform: uppercase;
	}
	.page-context span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--ink);
		font: 700 1rem var(--disp);
		letter-spacing: -0.01em;
		line-height: 1.2;
		animation: title-in 240ms var(--ease-out, ease-out) both;
	}

	.topbar-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		flex-wrap: nowrap;
		gap: 10px;
		margin-left: auto;
		min-height: 40px;
	}
	.tool-group { display: flex; align-items: center; gap: 6px; }
	.divider { flex: none; width: 1px; height: 22px; background: var(--line); }

	.topbar-actions :global(.theme-toggle),
	.topbar-actions :global(.locale .trigger),
	.topbar-actions :global(.warehouse .trigger),
	.account-action,
	.logout {
		height: 40px;
		min-height: 40px;
		box-sizing: border-box;
	}

	.account-action,
	.logout {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		padding: 0 12px;
		border: 1px solid transparent;
		border-radius: 10px;
		background: transparent;
		color: var(--link, var(--navy));
		text-decoration: none;
		font: 600 0.78rem var(--body);
		cursor: pointer;
		transition:
				background var(--motion-fast, 160ms) var(--ease-out, ease),
				border-color var(--motion-fast, 160ms) var(--ease-out, ease),
				color var(--motion-fast, 160ms) var(--ease-out, ease),
				transform var(--motion-fast, 160ms) var(--ease-out, ease);
	}
	.account-action:hover,
	.logout:hover { background: var(--surface-2); border-color: var(--line); }
	.account-action:active,
	.logout:active { transform: scale(0.97); }
	.account-action:focus-visible,
	.logout:focus-visible,
	.menu-toggle:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

	.logout { color: var(--slate); }
	.logout:hover {
		color: var(--danger);
		border-color: color-mix(in srgb, var(--danger) 35%, transparent);
		background: color-mix(in srgb, var(--danger) 8%, transparent);
	}

	.menu-toggle {
		display: none;
		width: 42px;
		min-width: 42px;
		height: 42px;
		place-items: center;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--surface);
		color: var(--link, var(--navy));
		cursor: pointer;
		transition: transform var(--motion-fast, 160ms) var(--ease-out, ease), background var(--motion-fast, 160ms) ease;
	}
	.menu-toggle:active { transform: scale(0.95); }

	.content { flex: 1; min-width: 0; padding: 26px clamp(18px, 2.5vw, 34px) 42px; }
	.scrim { display: none; }

	/* ───────── Estados de arranque ───────── */
	.boot { padding: 3rem 1.25rem; text-align: center; color: var(--slate); animation: fade-in var(--motion-base, 200ms) var(--ease-out, ease) both; }
	.panel { max-width: 26rem; margin: 2.5rem auto; text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-card); padding: 1.25rem; box-shadow: var(--shadow-1); }
	.panel .title { margin: 0 0 0.35rem; font: 600 1rem var(--disp); color: var(--ink); }
	.panel .detail { margin: 0; color: var(--danger); font-size: 0.9rem; }
	.actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }

	/* ───────── Keyframes ───────── */
	@keyframes nav-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes title-in {
		from { opacity: 0; transform: translateY(5px); }
		to { opacity: 1; transform: none; }
	}
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	/* ───────── Responsive ───────── */
	@media (max-width: 1180px) {
		.account-action span { display: none; }
		.account-action { width: 40px; min-width: 40px; padding: 0; }
	}
	@media (max-width: 1080px) {
		.workspace { grid-template-columns: 224px minmax(0, 1fr); }
		.topbar { gap: 10px; }
	}
	@media (max-width: 800px) {
		.workspace { display: block; }
		.sidebar {
			position: fixed;
			left: 0;
			top: 0;
			width: min(84vw, 290px);
			transform: translateX(-102%);
			transition: transform var(--motion-base, 220ms) var(--ease-out, ease);
			box-shadow: none;
		}
		.sidebar.open { transform: translateX(0); box-shadow: var(--shadow-3); }
		.scrim {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 25;
			border: 0;
			border-radius: 0;
			background: rgba(1, 18, 34, 0.48);
			animation: fade-in var(--motion-fast, 140ms) var(--ease-out, ease) both;
		}
		.menu-toggle { display: grid; flex: none; }
		.topbar { min-height: 56px; padding: 8px 16px; }
		.page-context span { font-size: 0.92rem; }
		.topbar-actions { gap: 6px; }
		.divider { display: none; }
		.logout span { display: none; }
		.logout { width: 40px; min-width: 40px; padding: 0; }
		.content { padding: 20px 16px 32px; }
	}
	@media (max-width: 520px) {
		.topbar { gap: 9px; }
		.page-context p { font-size: 0.56rem; }
		.page-context span { max-width: 38vw; font-size: 0.84rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.sidebar,
		.nav-link,
		.nav-link::before,
		.nav-link :global(svg),
		.nav-wrap::before,
		.nav-wrap::after,
		.topbar,
		.content,
		.scrim,
		.boot { transition: none; animation: none; }
		.nav-group,
		.page-context span { animation: none; }
		.main-nav { scroll-behavior: auto; scroll-snap-type: none; }
	}
</style>