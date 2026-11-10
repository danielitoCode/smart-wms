import { describe, it, expect, vi } from 'vitest';
import { ListBinsUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/ListBinsUseCase';
import type { WarehouseRepository } from '../../../../../../core/feature/warehouses/domain/repository/WarehouseRepository';

describe('ListBinsUseCase', () => {
	it('validates optional filters', async () => {
		const repo = {
			listActive: vi.fn(),
			listAdmin: vi.fn(),
			getById: vi.fn(),
			listZones: vi.fn(),
			listBins: vi.fn().mockResolvedValue([])
		} as WarehouseRepository;
		const uc = new ListBinsUseCase(repo);
		await expect(uc.execute({ warehouseId: 0 })).rejects.toThrow(/warehouseId/);
		await expect(uc.execute({ zoneId: -1 })).rejects.toThrow(/zoneId/);
		await expect(uc.execute({ page: 0 })).rejects.toThrow(/page/);
	});

	it('forwards valid params', async () => {
		const repo = {
			listActive: vi.fn(),
			listAdmin: vi.fn(),
			getById: vi.fn(),
			listZones: vi.fn(),
			listBins: vi.fn().mockResolvedValue([])
		} as WarehouseRepository;
		const uc = new ListBinsUseCase(repo);
		await uc.execute({ warehouseId: 1, zoneId: 4, page: 2 });
		expect(repo.listBins).toHaveBeenCalledWith({ warehouseId: 1, zoneId: 4, page: 2 });
	});
});
