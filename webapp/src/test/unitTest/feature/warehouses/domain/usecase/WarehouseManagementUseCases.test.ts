import { describe, expect, it, vi } from 'vitest';
import { CreateWarehouseUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/CreateWarehouseUseCase';
import { UpdateWarehouseUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/UpdateWarehouseUseCase';
import { CreateZoneUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/CreateZoneUseCase';
import { CreateBinUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/CreateBinUseCase';
import type { WarehouseManagementRepository } from '../../../../../../core/feature/warehouses/domain/repository/WarehouseManagementRepository';

function createRepository(): WarehouseManagementRepository {
	return {
		listActive: vi.fn(), listAdmin: vi.fn(), getById: vi.fn(), listZones: vi.fn(), listBins: vi.fn(),
		createWarehouse: vi.fn(), updateWarehouse: vi.fn(), deleteWarehouse: vi.fn(),
		createZone: vi.fn(), updateZone: vi.fn(), deleteZone: vi.fn(),
		createBin: vi.fn(), updateBin: vi.fn(), deleteBin: vi.fn(), getBinById: vi.fn()
	};
}

describe('Warehouse management use cases', () => {
	it('normalizes and delegates warehouse creation', async () => {
		const repository = createRepository();
		await new CreateWarehouseUseCase(repository).execute({ code: ' WH-01 ', name: ' Main ', address: ' Address ' });
		expect(repository.createWarehouse).toHaveBeenCalledWith({ code: 'WH-01', name: 'Main', address: 'Address' });
	});
	it('rejects empty warehouse updates instead of sending an empty update', async () => {
		const repository = createRepository();
		await expect(new UpdateWarehouseUseCase(repository).execute({ id: 1 })).rejects.toThrow(/at least one/);
		expect(repository.updateWarehouse).not.toHaveBeenCalled();
	});
	it('rejects unsupported zone types before reaching the API', async () => {
		const repository = createRepository();
		await expect(new CreateZoneUseCase(repository).execute({
			warehouseId: 1, code: 'A', name: 'Area', zoneType: 'OTHER' as never
		})).rejects.toThrow(/zone type/);
		expect(repository.createZone).not.toHaveBeenCalled();
	});
	it('validates bin foreign keys and barcode before creating', async () => {
		const repository = createRepository();
		await expect(new CreateBinUseCase(repository).execute({
			warehouseId: 1, zoneId: 0, code: 'A-1', barcode: 'BC-1', binType: 'Pickable'
		})).rejects.toThrow(/zoneId/);
		expect(repository.createBin).not.toHaveBeenCalled();
	});
});
