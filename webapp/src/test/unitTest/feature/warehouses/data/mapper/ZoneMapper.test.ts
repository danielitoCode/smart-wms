import { describe, expect, it } from 'vitest';
import { WarehouseMapper } from '../../../../../../core/feature/warehouses/data/mapper/WarehouseMapper';

describe('WarehouseMapper.toZone', () => {
	it('maps canonical zone and warehouse ids, status, type and associated bins', () => {
		expect(WarehouseMapper.toZone({
			zone_id: 11, warehouse_id: 2, zone_code: 'PICK', zone_name: 'Picking',
			zone_type: 'PICKING', is_active: false, bins_count: 7
		})).toEqual({
			id: 11, warehouseId: 2, code: 'PICK', name: 'Picking',
			zoneType: 'PICKING', active: false, binsCount: 7
		});
	});
	it('rejects unsupported zone types and missing parent warehouse identity', () => {
		expect(() => WarehouseMapper.toZone({
			zone_id: 11, warehouse_id: 2, zone_code: 'X', zone_name: 'X', zone_type: 'UNKNOWN', is_active: true
		})).toThrow(/Unsupported zone type/);
		expect(() => WarehouseMapper.toZone({
			zone_id: 11, warehouse_id: 0, zone_code: 'X', zone_name: 'X', zone_type: 'STORAGE', is_active: true
		})).toThrow(/zone warehouse id/);
	});
});
