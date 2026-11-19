import type { OverrideKey, PageKey, PermissionCapability } from './PermissionCatalog';
import { ALL_OVERRIDE_KEYS } from './PermissionCatalog';

export type AccessRole = 'ADMIN' | 'USER' | string;

export function canAccessPages(
	role: AccessRole,
	allowedPages: readonly string[],
	requiredKeys: readonly string[]
): boolean {
	if (requiredKeys.length === 0 || role === 'ADMIN') return true;
	return requiredKeys.every((key) => allowedPages.includes(key));
}

/**
 * UX gate for a capability on a page key.
 * Does not replace Flask 403 — only hides controls / blocks route shell.
 */
export function canPerform(
	role: AccessRole,
	allowedPages: readonly string[],
	allowedOverrides: readonly string[] = [],
	grant: { pageKey: PageKey; capability: PermissionCapability; overrideKey?: OverrideKey }
): boolean {
	if (role === 'ADMIN') return true;
	if (!allowedPages.includes(grant.pageKey)) return false;
	if (grant.overrideKey && !allowedOverrides.includes(grant.overrideKey)) return false;
	// Flask currently uses the same page_key for open/read/action/approve
	// except overrides. capability is reserved for future splits.
	void grant.capability;
	return true;
}

export function hasOverride(
	role: AccessRole,
	allowedOverrides: readonly string[],
	overrideKey: OverrideKey
): boolean {
	if (role === 'ADMIN') return true;
	return allowedOverrides.includes(overrideKey);
}

/** Preferencia de aterrizaje interno tras login o splash, por page key. */
const HOME_ROUTE_CANDIDATES: { pageKey: string; path: string }[] = [
	{ pageKey: 'inventory', path: '/inventory' },
	{ pageKey: 'receiving', path: '/receiving' },
	{ pageKey: 'putaway', path: '/putaway' },
	{ pageKey: 'cycle-counts', path: '/cycle-count' },
	{ pageKey: 'sales-orders', path: '/management/sales-orders' },
	{ pageKey: 'purchase-orders', path: '/management/purchase-orders' },
	{ pageKey: 'items', path: '/items' },
	{ pageKey: 'preferred-bins', path: '/data/preferred-bins' },
	{ pageKey: 'warehouses', path: '/warehouses' },
	{ pageKey: 'vendors', path: '/management/vendors' },
	{ pageKey: 'users', path: '/management/users' },
	{ pageKey: 'settings', path: '/management/settings' }
];

export function resolveHomePath(input: {
	role: AccessRole;
	allowedPages: readonly string[];
	mustChangePassword?: boolean;
}): string {
	if (input.mustChangePassword) return '/change-password';
	if (input.role === 'ADMIN') return '/inventory';
	for (const candidate of HOME_ROUTE_CANDIDATES) {
		if (input.allowedPages.includes(candidate.pageKey)) return candidate.path;
	}
	return '/inventory';
}

/**
 * Route → required page keys (AND).
 * Aligned to Flask gates; discrepancies documented in PermissionMatrix.
 */
export function requiredPageKeysForPath(pathname: string): string[] {
	if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return ['dashboard'];
	if (pathname === '/sales-orders' || pathname.startsWith('/sales-orders/')) return ['sales-orders'];
	if (pathname === '/customers' || pathname.startsWith('/customers/')) return ['sales-orders'];
	if (pathname === '/inventory' || pathname.startsWith('/inventory/')) return ['inventory'];
	if (pathname === '/cycle-count' || pathname.startsWith('/cycle-count/')) return ['cycle-counts'];
	if (pathname === '/receiving' || pathname.startsWith('/receiving/')) return ['receiving'];
	if (pathname === '/putaway' || pathname.startsWith('/putaway/')) return ['putaway'];
	if (pathname === '/items' || pathname.startsWith('/items/')) return ['items'];
	if (pathname === '/picking-tickets' || pathname.startsWith('/picking-tickets/')) return ['picking-tickets'];
	if (pathname === '/picking-batches' || pathname.startsWith('/picking-batches/')) return ['picking-batches'];
	if (pathname === '/picking' || pathname.startsWith('/picking/')) return []; // mobile flow; not in ALL_PAGE_KEYS
	if (pathname === '/packing' || pathname.startsWith('/packing/')) return [];
	if (pathname === '/shipping' || pathname.startsWith('/shipping/')) return [];

	// Gestión operativa
	if (pathname.startsWith('/management/backorders')) return ['backorders'];
	// Page open: count-approvals. Approve APIs still need adjustments (matrix).
	if (pathname.startsWith('/management/count-approvals')) return ['count-approvals'];
	// FIX F0.2: fraud routes are gated by fraud in Flask, not sales-orders
	if (pathname.startsWith('/management/fraud')) return ['fraud'];
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

	// Plataforma
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

export { ALL_OVERRIDE_KEYS };


/**
 * Explicit route policy for the authenticated Svelte application shell.
 * A null policy means the path has not been reviewed and must fail closed.
 */
export type RouteAccessPolicy =
	| { kind: 'authenticated' }
	| { kind: 'all'; pageKeys: readonly string[] }
	| { kind: 'any'; pageKeys: readonly string[] };

export function canAccessAnyPages(
	role: AccessRole,
	allowedPages: readonly string[],
	requiredKeys: readonly string[]
): boolean {
	if (role === 'ADMIN') return true;
	return requiredKeys.some((key) => allowedPages.includes(key));
}

export function routeAccessPolicyForPath(pathname: string): RouteAccessPolicy | null {
	const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

	// These operational scanner flows are authenticated, then authorized
	// by Flask's allowed_functions / endpoint-specific checks, not page grants.
	if (
		path === '/picking' || path.startsWith('/picking/') ||
		path === '/packing' || path.startsWith('/packing/') ||
		path === '/shipping' || path.startsWith('/shipping/') ||
		path === '/change-password' || path.startsWith('/change-password/')
	) {
		return { kind: 'authenticated' };
	}

	// The Data landing page is a tab container: any one of these page grants
	// is sufficient to enter it; each child route still has its own gate.
	if (path === '/data') {
		return { kind: 'any', pageKeys: ['warehouses', 'bins', 'zones', 'preferred-bins'] };
	}

	const pageKeys = requiredPageKeysForPath(path);
	return pageKeys.length > 0 ? { kind: 'all', pageKeys } : null;
}
