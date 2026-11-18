import { describe, expect, it, vi } from 'vitest';
import { CreateBatchUseCase } from '../../../../../../core/feature/picking/domain/usecase/CreateBatchUseCase';
import type { PickingRepository } from '../../../../../../core/feature/picking/domain/repository/PickingRepository';

describe('CreateBatchUseCase', () => {
	it('requires at least one identifier and positive warehouse', async () => {
		const repo = { createBatch: vi.fn() } as unknown as PickingRepository;
		const uc = new CreateBatchUseCase(repo);
		expect(() => uc.execute([], 1)).toThrow(/so_identifiers/);
		expect(() => uc.execute(['SO-1'], 0)).toThrow(/warehouse_id/);
		expect(repo.createBatch).not.toHaveBeenCalled();
	});

	it('delegates trimmed identifiers to repository', async () => {
		const repo = {
			createBatch: vi.fn().mockResolvedValue({
				batchId: 9,
				batchNumber: 'BATCH-9',
				totalOrders: 1,
				totalItems: 2,
				tasks: [],
				orders: []
			})
		} as unknown as PickingRepository;
		const uc = new CreateBatchUseCase(repo);
		const result = await uc.execute([' SO-1 ', 'SO-2'], 1);
		expect(repo.createBatch).toHaveBeenCalledWith(['SO-1', 'SO-2'], 1);
		expect(result.batchId).toBe(9);
	});
});
