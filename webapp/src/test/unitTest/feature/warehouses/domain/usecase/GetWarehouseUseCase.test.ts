import { describe, it, expect, vi } from 'vitest';
import { GetWarehouseUseCase } from '../../../../../../core/feature/warehouses/domain/usecase/GetWarehouseUseCase';
import type { WarehouseRepository } from '../../../../../../core/feature/warehouses/domain/repository/WarehouseRepository';

describe('GetWarehouseUseCase', () => {
	it('rejects non-integer id', async () => {
		const repo = {
			listActive: vi.fn(),
			listAdmin: vi.fn(),
			getById: vi.fn(),
			listZones: vi.fn(),
			listBins: vi.fn()
		} as WarehouseRepository;
		const uc = new GetWarehouseUseCase(repo);
		await expect(uc.execute(1.5)).rejects.toThrow(/warehouse id/);
		await expect(uc.execute(0)).rejects.toThrow(/warehouse id/);
	});

	it('loads by id', async () => {
		const repo = {
			listActive: vi.fn(),
			listAdmin: vi.fn(),
			getById: vi.fn().mockResolvedValue({ id: 2, code: 'WH2', name: 'B', active: true }),
			listZones: vi.fn(),
			listBins: vi.fn()
		} as WarehouseRepository;
		const uc = new GetWarehouseUseCase(repo);
		const wh = await uc.execute(2);
		expect(wh.code).toBe('WH2');
		expect(repo.getById).toHaveBeenCalledWith(2);
	});
});
