import { describe, it, expect, vi } from 'vitest';
import { ListPendingPutawayUseCase } from '../../../../../../core/feature/putaway/domain/usecase/ListPendingPutawayUseCase';
import type { PutawayRepository } from '../../../../../../core/feature/putaway/domain/repository/PutawayRepository';

describe('ListPendingPutawayUseCase', () => {
	it('rejects invalid warehouseId', async () => {
		const repo = {
			listPending: vi.fn(),
			suggest: vi.fn(),
			confirm: vi.fn()
		} as PutawayRepository;
		const uc = new ListPendingPutawayUseCase(repo);
		expect(() => uc.execute(0)).toThrow(/warehouseId/);
	});

	it('delegates to repository', async () => {
		const repo = {
			listPending: vi.fn().mockResolvedValue([]),
			suggest: vi.fn(),
			confirm: vi.fn()
		} as PutawayRepository;
		const uc = new ListPendingPutawayUseCase(repo);
		await uc.execute(3);
		expect(repo.listPending).toHaveBeenCalledWith(3);
	});
});
