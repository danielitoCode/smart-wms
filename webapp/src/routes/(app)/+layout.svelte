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
	type NavItem = { href: string; label: string; icon: IconName; pageKey?: string; hint: string };
	const navGroups: { label: string; items: NavItem[] }[] = $derived([
		{ label: i18n.t('Operaciones'), items: [
			{ href: '/receiving', label: i18n.t('Recepción'), icon: 'inbox', pageKey: 'receiving', hint: i18n.t('Registra mercancía entrante contra órdenes de compra o envíos. Escanea o introduce el código de barras para confirmar cantidades.') },
			{ href: '/putaway', label: i18n.t('Ubicación'), icon: 'map-pin', pageKey: 'putaway', hint: i18n.t('Asigna el stock recibido a ubicaciones (bins) del almacén. Confirma bin de destino y cantidad a ubicar.') },
			{ href: '/picking', label: i18n.t('Preparación'), icon: 'clipboard-list', hint: i18n.t('Prepara pedidos: genera olas, valida stock y confirma la recogida de líneas en ubicaciones.') },
			{ href: '/packing', label: i18n.t('Empaque'), icon: 'package-check', hint: i18n.t('Verifica y embala pedidos ya preparados antes del despacho. Confirma contenido del paquete.') },
			{ href: '/shipping', label: i18n.t('Despacho'), icon: 'truck', hint: i18n.t('Carga y confirma el envío de pedidos empaquetados. Cierra el ciclo de salida del almacén.') }
		]},
		{ label: i18n.t('Control'), items: [
			{ href: '/inventory', label: i18n.t('Inventario'), icon: 'boxes', pageKey: 'inventory', hint: i18n.t('Consulta existencias por SKU, ubicación, lote y almacén. Vista operativa del stock disponible.') },
			{ href: '/cycle-count', label: i18n.t('Conteo cíclico'), icon: 'scan', pageKey: 'cycle-counts', hint: i18n.t('Inicia y registra conteos cíclicos por ubicación para corregir diferencias de inventario.') }
		]},
		{ label: i18n.t('Gestión'), items: [
			{ href: '/management/purchase-orders', label: i18n.t('Compras'), icon: 'clipboard-list', pageKey: 'purchase-orders', hint: i18n.t('Gestiona órdenes de compra a proveedores: alta, seguimiento y recepción planificada.') },
			{ href: '/management/sales-orders', label: i18n.t('Pedidos de venta'), icon: 'package', pageKey: 'sales-orders', hint: i18n.t('Pedidos de cliente: líneas, cumplimiento, envío administrativo y estados del pedido.') },
			{ href: '/management/customers', label: i18n.t('Clientes'), icon: 'user', hint: i18n.t('Consulta y busca clientes asociados a pedidos de venta y almacenes autorizados.') },
			{ href: '/management/vendors', label: i18n.t('Proveedores'), icon: 'truck', pageKey: 'vendors', hint: i18n.t('Alta y mantenimiento de proveedores (contacto, estado activo y datos de compra).') },
			{ href: '/management/backorders', label: i18n.t('Pendientes'), icon: 'scan', pageKey: 'backorders', hint: i18n.t('Líneas pendientes de stock: pedidos que no pudieron completarse por falta de inventario.') },
			{ href: '/management/count-approvals', label: i18n.t('Aprobaciones'), icon: 'clipboard-list', pageKey: 'count-approvals', hint: i18n.t('Aprueba o rechaza conteos cíclicos con variación. Requiere permiso de ajustes/aprobación.') },
			{ href: '/management/adjustments', label: i18n.t('Ajustes'), icon: 'database', pageKey: 'adjustments', hint: i18n.t('Ajustes manuales de inventario (entradas/salidas) con trazabilidad y justificación.') },
			{ href: '/management/inter-warehouse-transfers', label: i18n.t('Movimientos'), icon: 'truck', pageKey: 'transfer-orders', hint: i18n.t('Movimientos de stock entre almacenes: salida en origen y entrada en destino.') },
			{ href: '/management/transfer-orders', label: i18n.t('Órdenes de traslado'), icon: 'truck', pageKey: 'transfer-orders', hint: i18n.t('Órdenes formales de traslado entre almacenes con picking, aprobación y cierre.') },
			{ href: '/management/preferred-bins', label: i18n.t('Ubicaciones preferidas'), icon: 'map-pin', pageKey: 'preferred-bins', hint: i18n.t('Define ubicaciones preferidas por producto para optimizar putaway y picking.') },
			{ href: '/management/fraud', label: i18n.t('Revisión de pedidos'), icon: 'user', pageKey: 'fraud', hint: i18n.t('Pedidos retenidos por revisión: anota observaciones y libéralos a preparación si procede.') },
			{ href: '/management/pos-activity', label: i18n.t('Actividad POS'), icon: 'database', pageKey: 'pos-activity', hint: i18n.t('Actividad del punto de venta vinculada al almacén (ventas y eventos POS).') },
			{ href: '/management/refunds', label: i18n.t('Reembolsos'), icon: 'package', pageKey: 'sales-orders', hint: i18n.t('Consulta notas de crédito / reembolsos emitidos desde el POS (solo lectura operativa).') },
			{ href: '/management/returns', label: i18n.t('Devoluciones'), icon: 'package', pageKey: 'sales-orders', hint: i18n.t('Gestión de devoluciones y RMA asociadas a pedidos de venta.') },
			{ href: '/management/users', label: i18n.t('Usuarios'), icon: 'user', pageKey: 'users', hint: i18n.t('Cuentas, roles, almacenes asignados y claves de página (permisos de acceso).') }
		]},
		{ label: i18n.t('Plataforma'), items: [
			{ href: '/management/settings', label: i18n.t('Ajustes'), icon: 'database', pageKey: 'settings', hint: i18n.t('Parámetros operativos del WMS (recepción, empaque, conteos, tickets, POS).') },
			{ href: '/management/api-tokens', label: i18n.t('Tokens API'), icon: 'lock', pageKey: 'api-tokens', hint: i18n.t('Tokens de API para integraciones externas. Trátalos como secretos.') },
			{ href: '/management/channels', label: i18n.t('Canales'), icon: 'globe', pageKey: 'channels', hint: i18n.t('Canales de venta o origen de pedidos (mapeo con sistemas externos).') },
			{ href: '/management/webhooks', label: i18n.t('Webhooks'), icon: 'globe', pageKey: 'webhooks', hint: i18n.t('Suscripciones HTTP a eventos del WMS (notificaciones salientes).') },
			{ href: '/management/notifications', label: i18n.t('Notificaciones'), icon: 'globe', pageKey: 'notifications', hint: i18n.t('Configuración de notificaciones del sistema hacia usuarios o canales.') },
			{ href: '/management/integrations', label: i18n.t('Integraciones'), icon: 'database', pageKey: 'integrations', hint: i18n.t('Conectores con sistemas externos y pruebas de conectividad.') },
			{ href: '/management/consumer-groups', label: i18n.t('Consumer groups'), icon: 'user', pageKey: 'consumer-groups', hint: i18n.t('Grupos de consumidores de mensajería / eventos de integración.') },
			{ href: '/management/inbound-activity', label: i18n.t('Actividad inbound'), icon: 'inbox', pageKey: 'inbound', hint: i18n.t('Tráfico de entrada por recurso y sistema origen (monitorización inbound).') },
			{ href: '/management/imports', label: i18n.t('Imports'), icon: 'database', pageKey: 'imports', hint: i18n.t('Importaciones masivas de datos maestros u operativos.') },
			{ href: '/management/audit-log', label: i18n.t('Audit log'), icon: 'clipboard-list', pageKey: 'audit-log', hint: i18n.t('Registro de auditoría: quién hizo qué y cuándo en el sistema.') }
		]},
		{ label: i18n.t('Datos'), items: [
			{ href: '/items', label: i18n.t('Items'), icon: 'package', pageKey: 'items', hint: i18n.t('Catálogo de productos (SKU, UPC, dimensiones, estado activo/archivado).') },
			{ href: '/data', label: i18n.t('Maestros'), icon: 'database', hint: i18n.t('Acceso a datos maestros y pantallas de referencia del almacén.') },
			{ href: '/warehouses', label: i18n.t('Almacenes'), icon: 'warehouse', pageKey: 'warehouses', hint: i18n.t('Almacenes, zonas y ubicaciones (bins). Estructura física del inventario.') }
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

	onMount(() => { void bootstrap(); });
</script>

{#if guard.status === 'checking'}
	<SessionBootView status="checking" />
{:else if guard.status === 'error'}
	<SessionBootView status="error" message={guard.message} onRetry={retry} />
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
									<a
										class="nav-link ui-tip"
										class:active={isActive(item.href)}
										href={item.href}
										onclick={() => (sidebarOpen = false)}
									>
										<AppIcon name={item.icon} size={18} />
										<span>{item.label}</span>
										<span class="ui-tip__bubble" role="tooltip">
											<span class="ui-tip__head">
												<AppIcon name={item.icon} size={14} />
												{item.label}
											</span>
											<span class="ui-tip__body">{item.hint}</span>
										</span>
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
					{#if !guard.user?.mustChangePassword}<a class="account-action ui-tip ui-tip--rise" href="/change-password" aria-label={i18n.t('Cambiar contraseña')}><AppIcon name="lock" size={17} /><span>{i18n.t('Contraseña')}</span><span class="ui-tip__bubble" role="tooltip"><span class="ui-tip__head"><AppIcon name="lock" size={14} />{i18n.t('Cambiar contraseña')}</span><span class="ui-tip__body">{i18n.t('Actualiza tu contraseña de acceso. Obligatorio si el sistema lo exige al iniciar sesión.')}</span></span></a>{/if}
					<button type="button" class="account-action ui-tip ui-tip--rise" onclick={logout} aria-label={i18n.t('Cerrar sesión')}>
						<AppIcon name="logout" size={17} /><span>{i18n.t('Salir')}</span>
						<span class="ui-tip__bubble" role="tooltip">
							<span class="ui-tip__head"><AppIcon name="logout" size={14} />{i18n.t('Cerrar sesión')}</span>
							<span class="ui-tip__body">{i18n.t('Cierra la sesión actual y vuelve a la pantalla de acceso.')}</span>
						</span>
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
	.sidebar { position: sticky; top: 0; height: 100dvh; overflow-x: visible; overflow-y: auto; border-right: 1px solid var(--line); background: var(--surface); padding: 1rem 0.75rem; z-index: 100; }
	.brand { display: flex; gap: 0.65rem; align-items: center; padding: 0.35rem 0.5rem 1rem; }
	.mark { width: 2rem; height: 2rem; border-radius: 0.55rem; display: grid; place-items: center; background: var(--navy); color: white; font-weight: 700; }
	.brand strong { display: block; font-size: 0.95rem; }
	.brand small { color: var(--slate); }
	.group-label { margin: 0.85rem 0.5rem 0.35rem; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--slate); }
	.main-nav { overflow: visible; } .main-nav ul { list-style: none; margin: 0; padding: 0; overflow: visible; } .main-nav li { position: relative; }
	.nav-link { display: flex; align-items: center; gap: 0.55rem; padding: 0.45rem 0.55rem; border-radius: 0.55rem; color: var(--ink); text-decoration: none; font-size: 0.9rem; }
	.nav-link:hover { background: color-mix(in oklab, var(--navy) 8%, transparent); }
	.nav-link.active { background: color-mix(in oklab, var(--navy) 14%, transparent); font-weight: 600; }
	.main { min-width: 0; display: flex; flex-direction: column; position: relative; z-index: 1; }
	.topbar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; min-height: 3.25rem; padding: 0.55rem 1rem; border-bottom: 1px solid var(--line); background: var(--surface); position: relative; z-index: 30; }
	.topbar-actions { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
	.menu-btn { display: none; border: 1px solid var(--line); background: var(--surface); border-radius: 0.5rem; padding: 0.35rem; }
	.account-action { display: inline-flex; align-items: center; gap: 0.35rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 0.5rem; padding: 0.35rem 0.55rem; text-decoration: none; font-size: 0.82rem; cursor: pointer; }
	.content { flex: 1; min-width: 0; padding: 0 0 0.5rem; }
	.denied { max-width: 32rem; margin: 2rem auto; padding: 1.25rem; border: 1px solid var(--line); border-radius: 0.75rem; background: var(--surface); }
	.scrim { display: none; }
	@media (max-width: 900px) {
		.shell { grid-template-columns: 1fr; }
		.sidebar { position: fixed; inset: 0 auto 0 0; width: min(18rem, 88vw); z-index: 110; transform: translateX(-105%); transition: transform 0.2s ease; }
		.shell.sidebar-open .sidebar { transform: translateX(0); }
		.menu-btn { display: inline-grid; place-items: center; }
		.scrim { display: block; position: fixed; inset: 0; border: 0; background: rgb(0 0 0 / 0.35); z-index: 100; }
	}
</style>
