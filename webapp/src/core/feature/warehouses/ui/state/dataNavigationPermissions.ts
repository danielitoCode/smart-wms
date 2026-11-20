export type DataSection = 'warehouses' | 'zones' | 'bins' | 'preferred-bins';

export function canAccessDataSection(
	section: DataSection,
	allowedPages: readonly string[],
	isAdmin: boolean
): boolean {
	return isAdmin || allowedPages.includes(section);
}

export function getDataLandingPath(
	role: string | null | undefined,
	allowedPages: readonly string[]
): string | null {
	if (role === 'ADMIN') return '/data/warehouses';
	if (allowedPages.includes('warehouses')) return '/data/warehouses';
	if (allowedPages.includes('zones')) return '/data/zones';
	if (allowedPages.includes('bins')) return '/data/bins';
	if (allowedPages.includes('preferred-bins')) return '/data/preferred-bins';
	return null;
}
