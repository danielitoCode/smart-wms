import { describe, it, expect, vi } from 'vitest';
import { ListZonesUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/ListZonesUseCase';
import type { WarehouseRepository } from '../../../../../../core/feature/warehouses/domain/repository/WarehouseRepository';

describe('ListZonesUseCase', () => {
	it('lists zones for a warehouse', async () => {
		const repo: WarehouseRepository = {
			listActive: vi.fn(),
			listAdmin: vi.fn(),
			getById: vi.fn(),
			listZones: vi.fn().mockResolvedValue([
				{
					id: 10,
					warehouseId: 1,
					code: 'STG',
					name: 'Staging',
					zoneType: 'STAGING'
				}
			]),
			listBins: vi.fn()
		};
		const useCase = new ListZonesUseCase(repo);
		const result = await useCase.execute(1);
		expect(repo.listZones).toHaveBeenCalledWith(1);
		expect(result[0].code).toBe('STG');
	});

	it('rejects invalid warehouseId', async () => {
		const repo = {
			listActive: vi.fn(),
			listAdmin: vi.fn(),
			getById: vi.fn(),
			listZones: vi.fn(),
			listBins: vi.fn()
		} as WarehouseRepository;
		const useCase = new ListZonesUseCase(repo);
		await expect(useCase.execute(0)).rejects.toThrow(/warehouseId/);
	});
});
