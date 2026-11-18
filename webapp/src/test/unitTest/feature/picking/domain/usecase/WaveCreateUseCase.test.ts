import { describe, it, expect, vi } from 'vitest';
import { WaveCreateUseCase } from '../../../../../../core/feature/picking/domain/usecase/WaveCreateUseCase';
import type { PickingRepository } from '../../../../../../core/feature/picking/domain/repository/PickingRepository';

function createRepo(overrides: Partial<PickingRepository> = {}): PickingRepository {
	return {
		getActiveBatch: vi.fn(),
		getNextTask: vi.fn(),
		confirm: vi.fn(),
		short: vi.fn(),
		completeBatch: vi.fn(),
		cancelBatch: vi.fn(),
		waveValidate: vi.fn(),
		waveCreate: vi.fn(),
		createBatch: vi.fn(),
		...overrides
	};
}

describe('WaveCreateUseCase', () => {
	it('creates wave with so_ids and warehouse_id', async () => {
		const repo = createRepo({
			waveCreate: vi.fn().mockResolvedValue({
				batchId: 1,
				batchStatus: 'IN_PROGRESS',
				totalOrders: 2,
				totalPicks: 5
			})
		});
		const useCase = new WaveCreateUseCase(repo);
		const result = await useCase.execute([1, 2], 1);
		expect(repo.waveCreate).toHaveBeenCalledWith([1, 2], 1);
		expect(result.batchId).toBe(1);
	});

	it('rejects empty so_ids', async () => {
		expect(() => new WaveCreateUseCase(createRepo()).execute([], 1)).toThrow(/so_ids/);
	});
});
