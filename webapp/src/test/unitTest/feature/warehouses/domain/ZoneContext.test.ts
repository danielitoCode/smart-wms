import { describe, expect, it } from 'vitest';
import { assertZoneBelongsToWarehouse } from '../../../../../core/feature/warehouses/domain/context/ZoneContext';
import type { Zone } from '../../../../../core/feature/warehouses/domain/entity/Warehouse';

const zones: Zone[] = [
	{ id: 11, warehouseId: 1, code: 'PICK', name: 'Picking', zoneType: 'PICKING', active: true, binsCount: 4 },
	{ id: 21, warehouseId: 2, code: 'STORAGE', name: 'Storage', zoneType: 'STORAGE', active: true, binsCount: 2 }
];

describe('ZoneContext', () => {
	it('accepts a zone belonging to the active warehouse', () => {
		expect(assertZoneBelongsToWarehouse(11, 1, zones)).toEqual(zones[0]);
	});
	it('rejects a zone belonging to another warehouse', () => {
		expect(() => assertZoneBelongsToWarehouse(21, 1, zones)).toThrow(/active warehouse/);
	});
	it('rejects a zone that is not in the loaded warehouse projection', () => {
		expect(() => assertZoneBelongsToWarehouse(99, 1, zones)).toThrow(/active warehouse/);
	});
	it('rejects invalid warehouse and zone identifiers', () => {
		expect(() => assertZoneBelongsToWarehouse(11, 0, zones)).toThrow(/warehouseId/);
		expect(() => assertZoneBelongsToWarehouse(0, 1, zones)).toThrow(/zone id/);
	});
});
