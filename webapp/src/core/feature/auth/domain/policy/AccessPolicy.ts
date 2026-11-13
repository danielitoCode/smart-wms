export type AccessRole = 'ADMIN' | 'USER' | string;

export function canAccessPages(
	role: AccessRole,
	allowedPages: readonly string[],
	requiredKeys: readonly string[]
): boolean {
	if (requiredKeys.length === 0 || role === 'ADMIN') return true;
	return requiredKeys.every((key) => allowedPages.includes(key));
}

/** Preferencia de aterrizaje interno tras login o splash, por page key. */
const HOME_ROUTE_CANDIDATES: { pageKey: string; path: string }[] = [
	{ pageKey: 'inventory', path: '/inventory' },
	{ pageKey: 'receiving', path: '/receiving' },
	{ pageKey: 'putaway', path: '/putaway' },
	{ pageKey: 'picking', path: '/picking' },
	{ pageKey: 'packing', path: '/packing' },
	{ pageKey: 'shipping', path: '/shipping' },
	{ pageKey: 'cycle-counts', path: '/cycle-count' },
	{ pageKey: 'sales-orders', path: '/management/sales-orders' },
	{ pageKey: 'purchase-orders', path: '/management/purchase-orders' },
	{ pageKey: 'items', path: '/items' },
	{ pageKey: 'warehouses', path: '/warehouses' },
	{ pageKey: 'vendors', path: '/management/vendors' },
	{ pageKey: 'users', path: '/management/users' },
	{ pageKey: 'settings', path: '/management/settings' }
];

/**
 * Ruta interna por defecto según rol y páginas permitidas.
 * ADMIN → inventario. USER → primera ruta operativa a la que tenga acceso.
 */
export function resolveHomePath(input: {
	role: AccessRole;
	allowedPages: readonly string[];
	mustChangePassword?: boolean;
}): string {
	if (input.mustChangePassword) return '/change-password';
	if (input.role === 'ADMIN') return '/inventory';
	for (const candidate of HOME_ROUTE_CANDIDATES) {
		if (input.allowedPages.includes(candidate.pageKey)) {
			return candidate.path;
		}
	}
	return '/inventory';
}

export function requiredPageKeysForPath(pathname: string): string[] {
	if (pathname === '/inventory' || pathname.startsWith('/inventory/')) return ['inventory'];
	if (pathname === '/cycle-count' || pathname.startsWith('/cycle-count/')) return ['cycle-counts'];
	if (pathname === '/receiving' || pathname.startsWith('/receiving/')) return ['receiving'];
	if (pathname === '/putaway' || pathname.startsWith('/putaway/')) return ['putaway'];
	if (pathname === '/items' || pathname.startsWith('/items/')) return ['items'];

	// Gestión operativa
	if (pathname.startsWith('/management/backorders')) return ['backorders'];
	if (pathname.startsWith('/management/count-approvals')) return ['count-approvals'];
	if (pathname.startsWith('/management/fraud')) return ['sales-orders'];
	if (pathname.startsWith('/management/sales-orders')) return ['sales-orders'];
	if (pathname.startsWith('/management/customers')) return ['sales-orders'];
	if (pathname.startsWith('/management/inter-warehouse-transfers')) return ['transfer-orders'];
	if (pathname.startsWith('/management/adjustments')) return ['adjustments'];
	if (pathname.startsWith('/management/pos-activity')) return ['pos-activity'];
	if (pathname.startsWith('/management/purchase-orders')) return ['purchase-orders'];
	if (pathname.startsWith('/management/refunds')) return ['sales-orders'];
	if (pathname.startsWith('/management/returns')) return ['sales-orders'];
	if (pathname.startsWith('/management/transfer-orders')) return ['transfer-orders'];
	if (pathname.startsWith('/management/users')) return ['users'];
	if (pathname.startsWith('/management/vendors')) return ['vendors'];
	if (pathname.startsWith('/management/preferred-bins')) return ['preferred-bins'];

	// Plataforma / administración
	if (pathname.startsWith('/management/settings')) return ['settings'];
	if (pathname.startsWith('/management/api-tokens')) return ['api-tokens'];
	if (pathname.startsWith('/management/channels')) return ['channels'];
	if (pathname.startsWith('/management/webhooks')) return ['webhooks'];
	if (pathname.startsWith('/management/notifications')) return ['notifications'];
	if (pathname.startsWith('/management/integrations')) return ['integrations'];
	if (pathname.startsWith('/management/consumer-groups')) return ['consumer-groups'];
	if (pathname.startsWith('/management/inbound-activity')) return ['inbound'];
	if (pathname.startsWith('/management/imports')) return ['imports'];
	if (pathname.startsWith('/management/audit-log')) return ['audit-log'];

	// Datos maestros
	if (pathname === '/warehouses' || pathname.startsWith('/data/warehouses')) return ['warehouses'];
	if (pathname.startsWith('/data/zones')) return ['zones'];
	if (pathname.startsWith('/data/bins')) return ['bins', 'zones'];
	if (pathname.startsWith('/data/preferred-bins')) return ['preferred-bins'];
	if (pathname.startsWith('/warehouses/')) return ['warehouses', 'zones', 'bins'];

	return [];
}

export function canAccessWarehouse(
	role: AccessRole,
	assignedWarehouseIds: readonly number[],
	warehouseId: number | null
): boolean {
	return role === 'ADMIN' || warehouseId === null || assignedWarehouseIds.includes(warehouseId);
}

export function resolveWarehouseSelection(input: {
	role: AccessRole;
	allowedPages: readonly string[];
	assignedWarehouseIds: readonly number[];
	availableWarehouseIds: readonly number[];
	savedId: number | null;
}): number | null {
	const canBrowseAll = input.role === 'ADMIN' || input.allowedPages.includes('warehouses');
	const candidates =
		canBrowseAll && input.availableWarehouseIds.length > 0
			? input.availableWarehouseIds
			: input.assignedWarehouseIds;
	if (input.savedId !== null && candidates.includes(input.savedId)) return input.savedId;
	return candidates[0] ?? null;
}

export function canSelectWarehouse(
	input: {
		role: AccessRole;
		allowedPages: readonly string[];
		assignedWarehouseIds: readonly number[];
		availableWarehouseIds: readonly number[];
	},
	warehouseId: number
): boolean {
	const canBrowseAll = input.role === 'ADMIN' || input.allowedPages.includes('warehouses');
	const candidates =
		canBrowseAll && input.availableWarehouseIds.length > 0
			? input.availableWarehouseIds
			: input.assignedWarehouseIds;
	return candidates.includes(warehouseId);
}
