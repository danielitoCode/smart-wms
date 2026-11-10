import { describe, it, expect, vi } from 'vitest';
import { ListWarehousesUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/ListWarehousesUseCase';
import type { WarehouseRepository } from '../../../../../../core/feature/warehouses/domain/repository/WarehouseRepository';

describe('ListWarehousesUseCase', () => {
	it('returns active warehouses from repository', async () => {
		const repo: WarehouseRepository = {
			listActive: vi.fn().mockResolvedValue([
				{ id: 1, code: 'APT-LAB', name: 'Apartment Lab', active: true }
			]),
			listAdmin: vi.fn(),
			getById: vi.fn(),
			listZones: vi.fn(),
			listBins: vi.fn()
		};
		const useCase = new ListWarehousesUseCase(repo);
		const result = await useCase.execute();
		expect(repo.listActive).toHaveBeenCalled();
		expect(result[0].code).toBe('APT-LAB');
	});
});
