import { describe, expect, it } from 'vitest';
import { validateImportWarehouseScope } from '../../../../../core/feature/imports/domain/policy/ImportWarehouseScopePolicy';

const assignedUser = {
	role: 'USER',
	assignedWarehouseIds: [12],
	activeWarehouse: { id: 12, code: 'WH-12' }
};

describe('R8.4 import warehouse preflight', () => {
	it('accepts bins and order rows only for the active assigned warehouse', () => {
		expect(validateImportWarehouseScope('bins', [{ warehouse_id: '12' }], assignedUser)).toEqual([]);
		expect(validateImportWarehouseScope('purchase-orders', [{ warehouse_id: 12 }], assignedUser)).toEqual([]);
		expect(validateImportWarehouseScope('sales-orders', [{ warehouse_id: '12' }], assignedUser)).toEqual([]);
	});

	it('rejects missing, invalid and foreign warehouse IDs with source row numbers', () => {
		expect(validateImportWarehouseScope('bins', [
			{ warehouse_id: '12' },
			{ warehouse_id: '0' },
			{ warehouse_id: '13' }
		], assignedUser)).toEqual([
			{ row: 2, message: 'warehouse_id debe ser un entero positivo.' },
			{ row: 3, message: 'warehouse_id (13) no coincide con el almacén activo (12, WH-12).' }
		]);
	});

	it('rejects stale or unassigned active warehouse context', () => {
		expect(validateImportWarehouseScope('items', [{ sku: 'A' }], {
			...assignedUser,
			activeWarehouse: null
		})).toHaveLength(1);
		expect(validateImportWarehouseScope('items', [{ sku: 'A' }], {
			...assignedUser,
			activeWarehouse: { id: 13, code: 'WH-13' }
		})).toHaveLength(1);
	});

	it('blocks non-admin inventory adjustments because bin-to-warehouse scope is not enforced by Flask', () => {
		expect(validateImportWarehouseScope('inventory-adjustments', [
			{ warehouse: 'WH-12', bin: 'PICK-01' }
		], assignedUser)[0].message).toContain('no valida que cada bin pertenezca');
	});

	it('validates admin inventory adjustment warehouse and required bin', () => {
		expect(validateImportWarehouseScope('inventory-adjustments', [
			{ warehouse: 'WH-12', bin: 'PICK-01' }
		], { ...assignedUser, role: 'ADMIN', assignedWarehouseIds: [] })).toEqual([]);
		expect(validateImportWarehouseScope('inventory-adjustments', [
			{ warehouse: 'WH-13', bin: '' }
		], { ...assignedUser, role: 'ADMIN', assignedWarehouseIds: [] })).toHaveLength(2);
	});

	it('blocks non-admin item imports that carry initial stock or a default bin', () => {
		expect(validateImportWarehouseScope('items', [{ sku: 'A', name: 'Item' }], assignedUser)).toEqual([]);
		expect(validateImportWarehouseScope('items', [{ sku: 'A', default_bin: 'B-01' }], assignedUser)).toHaveLength(1);
		expect(validateImportWarehouseScope('items', [{ sku: 'A', quantity: '5' }], assignedUser)).toHaveLength(1);
	});
});
