import type { Zone } from '../entity/Warehouse';

/** Prevents a stale or forged UI selection from mutating a zone outside the active warehouse. */
export function assertZoneBelongsToWarehouse(
	zoneId: number,
	warehouseId: number,
	zones: readonly Zone[]
): Zone {
	if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
		throw new Error('warehouseId must be a positive integer');
	}
	if (!Number.isInteger(zoneId) || zoneId <= 0) {
		throw new Error('zone id must be a positive integer');
	}
	const zone = zones.find((candidate) => candidate.id === zoneId);
	if (!zone || zone.warehouseId !== warehouseId) {
		throw new Error('Zone does not belong to the active warehouse');
	}
	return zone;
}
