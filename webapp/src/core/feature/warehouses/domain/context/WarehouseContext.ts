/**
 * Domain rules for the active warehouse context.
 * Flask remains authority for scope; these rules only shape client selection.
 */

export type WarehouseAuthority = {
	role: string;
	/** From /api/auth/me warehouse_ids */
	assignedWarehouseIds: readonly number[];
	/** Page grants control master-data UI access, never warehouse assignment scope. */
	allowedPages: readonly string[];
};

export function isAdmin(role: string): boolean {
	return role === 'ADMIN';
}

/** Warehouse selection is allowed only within the user's assigned scope. */
export function canSelectWarehouseContext(authority: WarehouseAuthority): boolean {
	return isAdmin(authority.role) ||
		authority.allowedPages.includes('warehouses') ||
		authority.allowedPages.includes('zones') ||
		authority.allowedPages.includes('bins');
}

/**
 * IDs the user may select in the UI.
 * Non-ADMIN: strictly /me warehouse_ids (never trust a free-typed UI id).
 * ADMIN: full available catalog when provided.
 */
export function authorizedWarehouseIds(
	authority: WarehouseAuthority,
	catalogIds: readonly number[] = []
): number[] {
	if (isAdmin(authority.role)) {
		return catalogIds.length > 0 ? [...catalogIds] : [...authority.assignedWarehouseIds];
	}
	return [...authority.assignedWarehouseIds];
}

/**
 * Operational picker options must exist in the server-returned active catalog.
 * For non-admin users this is intersected with /me assignments; the catalog
 * endpoint is already warehouse-scoped by Flask.
 */
export function resolveSelectableWarehouseIds(
	authority: WarehouseAuthority,
	activeCatalogIds: readonly number[]
): number[] {
	if (isAdmin(authority.role)) return [...activeCatalogIds];
	const assigned = new Set(authority.assignedWarehouseIds);
	return activeCatalogIds.filter((id) => assigned.has(id));
}

/** P-11: drop persisted ids no longer authorized. */
export function resolveActiveWarehouseId(input: {
	authorizedIds: readonly number[];
	savedId: number | null;
	previousId?: number | null;
}): number | null {
	const { authorizedIds, savedId, previousId = null } = input;
	if (savedId != null && authorizedIds.includes(savedId)) return savedId;
	if (previousId != null && authorizedIds.includes(previousId)) return previousId;
	return authorizedIds[0] ?? null;
}

export function assertWarehouseAuthorized(
	authority: WarehouseAuthority,
	warehouseId: number,
	catalogIds: readonly number[] = []
): void {
	if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
		throw new Error('warehouseId must be a positive integer');
	}
	const allowed = authorizedWarehouseIds(authority, catalogIds);
	if (isAdmin(authority.role)) return;
	if (!allowed.includes(warehouseId)) {
		throw new Error('Warehouse not authorized for this user');
	}
}
