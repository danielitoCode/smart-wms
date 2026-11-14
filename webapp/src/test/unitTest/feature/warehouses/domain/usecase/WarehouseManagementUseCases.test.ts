import { describe, expect, it, vi } from 'vitest';
import { DeleteWarehouseUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/DeleteWarehouseUseCase';
import { CreateWarehouseUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/CreateWarehouseUseCase';
import { UpdateWarehouseUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/UpdateWarehouseUseCase';
import { CreateZoneUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/CreateZoneUseCase';
import { UpdateZoneUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/UpdateZoneUseCase';
import { DeleteZoneUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/DeleteZoneUseCase';
import { CreateBinUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/CreateBinUseCase';
import { UpdateBinUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/UpdateBinUseCase';
import type { WarehouseManagementRepository } from '../../../../../../core/feature/warehouses/domain/repository/WarehouseManagementRepository';

function createRepository(): WarehouseManagementRepository {
	return {
		listActive: vi.fn(), listAdmin: vi.fn(), listAdminPage: vi.fn(), getById: vi.fn(), listZones: vi.fn(), listBins: vi.fn(),
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
	it('deletes by the canonical numeric warehouse id and propagates backend restrictions', async () => {
		const repository = createRepository();
		vi.mocked(repository.deleteWarehouse).mockRejectedValueOnce(new Error('Cannot delete warehouse with existing bins'));
		await expect(new DeleteWarehouseUseCase(repository).execute(14)).rejects.toThrow(/existing bins/);
		expect(repository.deleteWarehouse).toHaveBeenCalledWith(14);
	});
	it('rejects invalid warehouse identifiers before deletion', async () => {
		const repository = createRepository();
		await expect(new DeleteWarehouseUseCase(repository).execute(0)).rejects.toThrow(/positive integer/);
		expect(repository.deleteWarehouse).not.toHaveBeenCalled();
	});
	it('rejects empty warehouse updates instead of sending an empty update', async () => {
		const repository = createRepository();
		await expect(new UpdateWarehouseUseCase(repository).execute({ id: 1 })).rejects.toThrow(/at least one/);
		expect(repository.updateWarehouse).not.toHaveBeenCalled();
	});
	it('keeps the warehouse relationship when creating a zone', async () => {
		const repository = createRepository();
		vi.mocked(repository.createZone).mockResolvedValue({ id: 4, warehouseId: 8, code: 'PICK', name: 'Picking', zoneType: 'PICKING', active: true });
		await new CreateZoneUseCase(repository).execute({ warehouseId: 8, code: 'PICK', name: 'Picking', zoneType: 'PICKING' });
		expect(repository.createZone).toHaveBeenCalledWith({ warehouseId: 8, code: 'PICK', name: 'Picking', zoneType: 'PICKING' });
	});

	it('enforces PostgreSQL zone_code and zone_name lengths on create', async () => {
		const repository = createRepository();
		const useCase = new CreateZoneUseCase(repository);
		await expect(useCase.execute({ warehouseId: 1, code: 'C'.repeat(21), name: 'Valid', zoneType: 'STORAGE' })).rejects.toThrow(/1 to 20/);
		await expect(useCase.execute({ warehouseId: 1, code: 'VALID', name: 'N'.repeat(101), zoneType: 'STORAGE' })).rejects.toThrow(/1 to 100/);
		expect(repository.createZone).not.toHaveBeenCalled();
	});
	it('enforces PostgreSQL zone_code and zone_name lengths on update', async () => {
		const repository = createRepository();
		const useCase = new UpdateZoneUseCase(repository);
		await expect(useCase.execute({ id: 1, code: 'C'.repeat(21) })).rejects.toThrow(/1 to 20/);
		await expect(useCase.execute({ id: 1, name: 'N'.repeat(101) })).rejects.toThrow(/1 to 100/);
		expect(repository.updateZone).not.toHaveBeenCalled();
	});
	it('keeps both warehouse and zone relationships when creating a bin', async () => {
		const repository = createRepository();
		vi.mocked(repository.createBin).mockResolvedValue({
			id: 12, warehouseId: 8, zoneId: 4, zoneName: 'Picking', code: 'A-01', barcode: 'BC-01',
			binType: 'Pickable', aisle: null, rowNumber: null, levelNumber: null, positionNumber: null,
			pickSequence: 0, putawaySequence: 0, active: true, maxWeightLbs: null, maxVolumeCuft: null,
			quantityOnHand: 0, quantityAllocated: 0, inventoryLines: 0
		});
		await new CreateBinUseCase(repository).execute({ warehouseId: 8, zoneId: 4, code: 'A-01', barcode: 'BC-01', binType: 'Pickable' });
		expect(repository.createBin).toHaveBeenCalledWith(expect.objectContaining({ warehouseId: 8, zoneId: 4, code: 'A-01', barcode: 'BC-01' }));
	});
		it('validates bin capacity updates and rejects empty patches', async () => {
		const repository = createRepository();
		const useCase = new UpdateBinUseCase(repository);
		await expect(useCase.execute({ id: 12 })).rejects.toThrow(/at least one/);
		await expect(useCase.execute({ id: 12, maxWeightLbs: -0.5 })).rejects.toThrow(/maxWeightLbs/);
		await expect(useCase.execute({ id: 12, maxVolumeCuft: Number.POSITIVE_INFINITY })).rejects.toThrow(/maxVolumeCuft/);
		expect(repository.updateBin).not.toHaveBeenCalled();
	});
	it('normalizes zone updates without allowing warehouse reassignment', async () => {
		const repository = createRepository();
		vi.mocked(repository.updateZone).mockResolvedValue({ id: 4, warehouseId: 8, code: 'PICK', name: 'Picking', zoneType: 'PICKING', active: false });
		await new UpdateZoneUseCase(repository).execute({ id: 4, code: ' PICK ', name: ' Picking ', active: false });
		expect(repository.updateZone).toHaveBeenCalledWith({ id: 4, code: 'PICK', name: 'Picking', active: false });
	});
	it('rejects invalid zone updates and empty patches', async () => {
		const repository = createRepository();
		await expect(new UpdateZoneUseCase(repository).execute({ id: 4 })).rejects.toThrow(/at least one/);
		await expect(new UpdateZoneUseCase(repository).execute({ id: 0, name: 'Invalid' })).rejects.toThrow(/zone id/);
		expect(repository.updateZone).not.toHaveBeenCalled();
	});
	it('deletes by canonical zone id and propagates the 409 bins restriction', async () => {
		const repository = createRepository();
		vi.mocked(repository.deleteZone).mockRejectedValueOnce(new Error('Zone cannot be deleted because 2 bin(s) are assigned'));
		await expect(new DeleteZoneUseCase(repository).execute(4)).rejects.toThrow(/bin\(s\)/);
		expect(repository.deleteZone).toHaveBeenCalledWith(4);
	});
	it('rejects nonexistent zone identifiers before deletion', async () => {
		const repository = createRepository();
		await expect(new DeleteZoneUseCase(repository).execute(0)).rejects.toThrow(/positive integer/);
		expect(repository.deleteZone).not.toHaveBeenCalled();
	});
	it('rejects unsupported zone types before reaching the API', async () => {
		const repository = createRepository();
		await expect(new CreateZoneUseCase(repository).execute({
			warehouseId: 1, code: 'A', name: 'Area', zoneType: 'OTHER' as never
		})).rejects.toThrow(/zone type/);
		expect(repository.createZone).not.toHaveBeenCalled();
	});
	it('validates bin capacities and aisle storage limits before creating', async () => {
		const repository = createRepository();
		const useCase = new CreateBinUseCase(repository);
		const base = { warehouseId: 1, zoneId: 2, code: 'A-1', barcode: 'BC-1', binType: 'Pickable' as const };
		await expect(useCase.execute({ ...base, aisle: 'A'.repeat(11) })).rejects.toThrow(/aisle cannot exceed 10/);
		await expect(useCase.execute({ ...base, maxWeightLbs: -1 })).rejects.toThrow(/maxWeightLbs/);
		await expect(useCase.execute({ ...base, maxVolumeCuft: Number.NaN })).rejects.toThrow(/maxVolumeCuft/);
		expect(repository.createBin).not.toHaveBeenCalled();
		await expect(useCase.execute({ ...base, maxWeightLbs: 12.345 })).rejects.toThrow(/two decimal places/);
		await expect(useCase.execute({ ...base, code: 'C'.repeat(51) })).rejects.toThrow(/1 to 50/);
		await expect(useCase.execute({ ...base, barcode: 'B'.repeat(101) })).rejects.toThrow(/1 to 100/);
	});

	it('validates bin foreign keys and barcode before creating', async () => {
		const repository = createRepository();
		await expect(new CreateBinUseCase(repository).execute({
			warehouseId: 1, zoneId: 0, code: 'A-1', barcode: 'BC-1', binType: 'Pickable'
		})).rejects.toThrow(/zoneId/);
		expect(repository.createBin).not.toHaveBeenCalled();
	});
});
