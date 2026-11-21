import type { OverrideKey, PageKey, PermissionCapability } from './PermissionCatalog';
import { ALL_OVERRIDE_KEYS } from './PermissionCatalog';

export type AccessRole = 'ADMIN' | 'USER' | string;
export type OperationalFunctionKey = 'pick' | 'pack' | 'ship';

/** UX gate for the mobile scanner grants returned by /api/auth/me. */
export function canAccessOperationalFunction(
	role: AccessRole,
	allowedFunctions: readonly string[],
	functionKey: OperationalFunctionKey
): boolean {
	return role === 'ADMIN' || allowedFunctions.includes(functionKey);
}

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
function isPathOrChild(pathname: string, prefix: string): boolean {
	return pathname === prefix || pathname.startsWith(prefix + '/');
}

export function requiredPageKeysForPath(pathname: string): string[] {
	if (isPathOrChild(pathname, '/dashboard')) return ['dashboard'];
	if (isPathOrChild(pathname, '/sales-orders')) return ['sales-orders'];
	if (isPathOrChild(pathname, '/customers')) return ['sales-orders'];
	if (isPathOrChild(pathname, '/inventory')) return ['inventory'];
	if (isPathOrChild(pathname, '/cycle-count')) return ['cycle-counts'];
	if (isPathOrChild(pathname, '/receiving')) return ['receiving'];
	if (isPathOrChild(pathname, '/putaway')) return ['putaway'];
	if (isPathOrChild(pathname, '/items')) return ['items'];
	if (isPathOrChild(pathname, '/picking-tickets')) return ['picking-tickets'];
	if (isPathOrChild(pathname, '/picking-batches')) return ['picking-batches'];
	if (pathname === '/picking' || pathname.startsWith('/picking/')) return []; // mobile flow; not in ALL_PAGE_KEYS
	if (pathname === '/packing' || pathname.startsWith('/packing/')) return [];
	if (pathname === '/shipping' || pathname.startsWith('/shipping/')) return [];

	// Gestión operativa
	if (isPathOrChild(pathname, '/management/backorders')) return ['backorders'];
	// Page open: count-approvals. Approve APIs still need adjustments (matrix).
	if (isPathOrChild(pathname, '/management/count-approvals')) return ['count-approvals'];
	// FIX F0.2: fraud routes are gated by fraud in Flask, not sales-orders
	if (isPathOrChild(pathname, '/management/fraud')) return ['fraud'];
	if (isPathOrChild(pathname, '/management/sales-orders')) return ['sales-orders'];
	if (isPathOrChild(pathname, '/management/customers')) return ['sales-orders'];
	if (isPathOrChild(pathname, '/management/inter-warehouse-transfers')) return ['transfer-orders'];
	if (isPathOrChild(pathname, '/management/adjustments')) return ['adjustments'];
	if (isPathOrChild(pathname, '/management/pos-activity')) return ['pos-activity'];
	if (isPathOrChild(pathname, '/management/purchase-orders')) return ['purchase-orders'];
	if (isPathOrChild(pathname, '/management/refunds')) return ['sales-orders'];
	if (isPathOrChild(pathname, '/management/returns')) return ['sales-orders'];
	if (isPathOrChild(pathname, '/management/transfer-orders')) return ['transfer-orders'];
	if (isPathOrChild(pathname, '/management/users')) return ['users'];
	if (isPathOrChild(pathname, '/management/vendors')) return ['vendors'];
	if (isPathOrChild(pathname, '/management/preferred-bins')) return ['preferred-bins'];

	// Plataforma
	if (isPathOrChild(pathname, '/management/settings')) return ['settings'];
	if (isPathOrChild(pathname, '/management/api-tokens')) return ['api-tokens'];
	if (isPathOrChild(pathname, '/management/channels')) return ['channels'];
	if (isPathOrChild(pathname, '/management/webhooks')) return ['webhooks'];
	if (isPathOrChild(pathname, '/management/notifications')) return ['notifications'];
	if (isPathOrChild(pathname, '/management/integrations')) return ['integrations'];
	if (isPathOrChild(pathname, '/management/consumer-groups')) return ['consumer-groups'];
	if (isPathOrChild(pathname, '/management/inbound-activity')) return ['inbound'];
	if (isPathOrChild(pathname, '/management/imports')) return ['imports'];
	if (isPathOrChild(pathname, '/management/audit-log')) return ['audit-log'];

	// Datos maestros
	if (pathname === '/warehouses' || isPathOrChild(pathname, '/data/warehouses')) return ['warehouses'];
	if (isPathOrChild(pathname, '/data/zones')) return ['zones'];
	if (isPathOrChild(pathname, '/data/bins')) return ['bins'];
	if (isPathOrChild(pathname, '/data/preferred-bins')) return ['preferred-bins'];
	if (isPathOrChild(pathname, '/warehouses')) return ['warehouses'];

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
	| { kind: 'function'; functionKey: OperationalFunctionKey }
	| { kind: 'all'; pageKeys: readonly string[] }
	| { kind: 'any'; pageKeys: readonly string[] }
	| { kind: 'allAndAny'; allPageKeys: readonly string[]; anyPageKeys: readonly string[] };

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

	// Scanner workflows use the operational grants returned by /api/auth/me,
	// not the administrative page-permission catalog.
	if (path === '/picking' || path.startsWith('/picking/')) return { kind: 'function', functionKey: 'pick' };
	if (path === '/packing' || path.startsWith('/packing/')) return { kind: 'function', functionKey: 'pack' };
	if (path === '/shipping' || path.startsWith('/shipping/')) return { kind: 'function', functionKey: 'ship' };
	if (path === '/change-password' || path.startsWith('/change-password/')) return { kind: 'authenticated' };

	// The Data landing page is a tab container: any one of these page grants
	// is sufficient to enter it; each child route still has its own gate.
	if (path === '/data') {
		return { kind: 'any', pageKeys: ['warehouses', 'bins', 'zones', 'preferred-bins'] };
	}
	// The printable queue lists through sales-orders (or fraud), while ticket detail/print requires picking-tickets.
	if (isPathOrChild(path, '/picking-tickets')) {
		return { kind: 'allAndAny', allPageKeys: ['picking-tickets'], anyPageKeys: ['sales-orders', 'fraud'] };
	}

	const pageKeys = requiredPageKeysForPath(path);
	return pageKeys.length > 0 ? { kind: 'all', pageKeys } : null;
}
