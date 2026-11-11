import { describe, expect, it } from 'vitest';
import { canAccessPages, canAccessWarehouse, canSelectWarehouse, requiredPageKeysForPath, resolveWarehouseSelection } from '../../core/feature/auth/domain/policy/AccessPolicy';

describe('AccessPolicy', () => {
	it('lets ADMIN bypass explicit page grants', () => expect(canAccessPages('ADMIN', [], ['items', 'warehouses'])).toBe(true));
	it('requires all grants for compound routes', () => {
		expect(canAccessPages('USER', ['bins'], ['bins', 'zones'])).toBe(false);
		expect(canAccessPages('USER', ['bins', 'zones'], ['bins', 'zones'])).toBe(true);
	});
	it('maps protected routes to their page keys', () => {
		expect(requiredPageKeysForPath('/warehouses/12')).toEqual(['warehouses', 'zones', 'bins']);
		expect(requiredPageKeysForPath('/data/bins')).toEqual(['bins', 'zones']);
		expect(requiredPageKeysForPath('/data/preferred-bins')).toEqual(['preferred-bins']);
		expect(requiredPageKeysForPath('/picking')).toEqual([]);
	});
	it('checks warehouse scope independently from page access', () => {
		expect(canAccessWarehouse('USER', [4, 8], 9)).toBe(false);
		expect(canAccessWarehouse('USER', [4, 8], 8)).toBe(true);
		expect(canAccessWarehouse('ADMIN', [], 9)).toBe(true);
	});
	it('discards a saved warehouse that is no longer assigned', () => {
		expect(resolveWarehouseSelection({ role: 'USER', allowedPages: [], assignedWarehouseIds: [4, 8], availableWarehouseIds: [], savedId: 99 })).toBe(4);
		expect(resolveWarehouseSelection({ role: 'USER', allowedPages: [], assignedWarehouseIds: [], availableWarehouseIds: [], savedId: 99 })).toBeNull();
	});
	it('falls back to assigned warehouses when the management list cannot load', () => {
		expect(resolveWarehouseSelection({ role: 'USER', allowedPages: ['warehouses'], assignedWarehouseIds: [4], availableWarehouseIds: [], savedId: 4 })).toBe(4);
	});
	it('only permits choosing IDs from the authorized candidate set', () => {
		const user = { role: 'USER', allowedPages: [], assignedWarehouseIds: [4, 8], availableWarehouseIds: [] };
		expect(canSelectWarehouse(user, 8)).toBe(true);
		expect(canSelectWarehouse(user, 9)).toBe(false);
	});
});
