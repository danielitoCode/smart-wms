import { describe, expect, it, vi } from 'vitest';
import { GetCycleCountUseCase } from '#core/feature/inventory/domain/usecase/GetCycleCountUseCase';
import type { InventoryRepository } from '#core/feature/inventory/domain/repository/InventoryRepository';

describe('GetCycleCountUseCase', () => {
	it('rejects non-positive countId', () => {
		const repo = { getCycleCount: vi.fn() } as unknown as InventoryRepository;
		const uc = new GetCycleCountUseCase(repo);
		expect(() => uc.execute(0)).toThrow(/countId/);
	});

	it('loads detail from repository', async () => {
		const repo = {
			getCycleCount: vi.fn().mockResolvedValue({
				countId: 3,
				binId: 1,
				binCode: 'A-01',
				status: 'PENDING',
				lines: []
			})
		} as unknown as InventoryRepository;
		const uc = new GetCycleCountUseCase(repo);
		const detail = await uc.execute(3);
		expect(repo.getCycleCount).toHaveBeenCalledWith(3);
		expect(detail.binCode).toBe('A-01');
	});
});
