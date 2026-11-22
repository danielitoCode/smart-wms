import { describe, expect, it } from 'vitest';
import { validateImportWarehouseScope } from '../../../../../core/feature/imports/domain/policy/ImportWarehouseScopePolicy';

const assignedUser = {
	role: 'USER',
	assignedWarehouseIds: [12],
	activeWarehouse: { id: 12, code: 'WH-12' },
	availableBinCodes: ['PICK-01', 'STAGE-01'],
	binCatalogVerified: true
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

	it('requires a verified active-warehouse bin catalog for inventory adjustments', () => {
		expect(validateImportWarehouseScope('inventory-adjustments', [
			{ warehouse: 'WH-12', bin: 'PICK-01' }
		], { ...assignedUser, binCatalogVerified: false })[0].message).toContain('catálogo de bins');
		expect(validateImportWarehouseScope('inventory-adjustments', [
			{ warehouse: 'WH-12', bin: 'PICK-01' }
		], assignedUser)).toEqual([]);
		expect(validateImportWarehouseScope('inventory-adjustments', [
			{ warehouse: 'WH-12', bin: 'FOREIGN-BIN' }
		], assignedUser)[0].message).toContain('no pertenece');
	});

	it('checks both warehouse code and bin membership for inventory adjustments', () => {
		expect(validateImportWarehouseScope('inventory-adjustments', [
			{ warehouse: 'WH-13', bin: 'PICK-01' },
			{ warehouse: 'WH-12', bin: '' }
		], { ...assignedUser, role: 'ADMIN', assignedWarehouseIds: [] })).toHaveLength(2);
	});

	it('allows product master rows but validates any initial stock/default bin against the active warehouse', () => {
		expect(validateImportWarehouseScope('items', [{ sku: 'A', name: 'Item' }], assignedUser)).toEqual([]);
		expect(validateImportWarehouseScope('items', [{ sku: 'A', default_bin: 'PICK-01' }], assignedUser)).toEqual([]);
		expect(validateImportWarehouseScope('items', [{ sku: 'A', default_bin: 'FOREIGN' }], assignedUser)).toHaveLength(1);
		expect(validateImportWarehouseScope('items', [{ sku: 'A', quantity: '5' }], assignedUser)).toHaveLength(1);
	});
});
