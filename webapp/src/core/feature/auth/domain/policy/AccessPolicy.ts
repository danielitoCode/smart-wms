export type AccessRole = 'ADMIN' | 'USER' | string;

export function canAccessPages(role: AccessRole, allowedPages: readonly string[], requiredKeys: readonly string[]): boolean {
	if (requiredKeys.length === 0 || role === 'ADMIN') return true;
	return requiredKeys.every(key => allowedPages.includes(key));
}

export function requiredPageKeysForPath(pathname: string): string[] {
	if (pathname === '/inventory' || pathname.startsWith('/inventory/')) return ['inventory'];
	if (pathname === '/cycle-count' || pathname.startsWith('/cycle-count/')) return ['cycle-counts'];
	if (pathname === '/receiving' || pathname.startsWith('/receiving/')) return ['receiving'];
	if (pathname === '/putaway' || pathname.startsWith('/putaway/')) return ['putaway'];
	if (pathname === '/items' || pathname.startsWith('/items/')) return ['items'];
	if (pathname === '/warehouses' || pathname.startsWith('/data/warehouses')) return ['warehouses'];
	if (pathname.startsWith('/data/zones')) return ['zones'];
	if (pathname.startsWith('/data/bins')) return ['bins', 'zones'];
	if (pathname.startsWith('/data/preferred-bins')) return ['preferred-bins'];
	if (pathname.startsWith('/warehouses/')) return ['warehouses', 'zones', 'bins'];
	return [];
}

export function canAccessWarehouse(role: AccessRole, assignedWarehouseIds: readonly number[], warehouseId: number | null): boolean {
	return role === 'ADMIN' || warehouseId === null || assignedWarehouseIds.includes(warehouseId);
}

export function resolveWarehouseSelection(input: { role: AccessRole; allowedPages: readonly string[]; assignedWarehouseIds: readonly number[]; availableWarehouseIds: readonly number[]; savedId: number | null }): number | null {
	const canBrowseAll = input.role === 'ADMIN' || input.allowedPages.includes('warehouses');
	const candidates = canBrowseAll ? input.availableWarehouseIds : input.assignedWarehouseIds;
	if (input.savedId !== null && candidates.includes(input.savedId)) return input.savedId;
	return candidates[0] ?? null;
}

export function canSelectWarehouse(input: { role: AccessRole; allowedPages: readonly string[]; assignedWarehouseIds: readonly number[]; availableWarehouseIds: readonly number[] }, warehouseId: number): boolean {
	const canBrowseAll = input.role === 'ADMIN' || input.allowedPages.includes('warehouses');
	return (canBrowseAll ? input.availableWarehouseIds : input.assignedWarehouseIds).includes(warehouseId);
}
