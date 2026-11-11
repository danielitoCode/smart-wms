import { describe, it, expect, vi } from 'vitest';
import { SubmitCycleCountUseCase } from '../../../../../../core/feature/inventory/domain/usecase/SubmitCycleCountUseCase';
import type { InventoryRepository } from '../../../../../../core/feature/inventory/domain/repository/InventoryRepository';

function createRepo(overrides: Partial<InventoryRepository> = {}): InventoryRepository {
	return {
		getOverview: vi.fn(),
		createCycleCounts: vi.fn(),
		getCycleCount: vi.fn(),
		submitCycleCount: vi.fn(),
		...overrides
	};
}

describe('SubmitCycleCountUseCase', () => {
	it('submits valid lines', async () => {
		const repo = createRepo({
			submitCycleCount: vi.fn().mockResolvedValue({
				status: 'COMPLETED',
				totalLines: 1,
				linesWithVariance: 0,
				adjustments: []
			})
		});
		const useCase = new SubmitCycleCountUseCase(repo);

		const result = await useCase.execute(10, [{ countLineId: 1, countedQuantity: 5 }]);

		expect(repo.submitCycleCount).toHaveBeenCalledWith(10, [
			{ countLineId: 1, countedQuantity: 5 }
		]);
		expect(result.status).toBe('COMPLETED');
	});

	it('rejects negative countedQuantity', async () => {
		const useCase = new SubmitCycleCountUseCase(createRepo());
		expect(() => (
			useCase.execute(1, [{ countLineId: 1, countedQuantity: -1 }])
		))).toThrow(/countedQuantity/);
	});

	it('rejects empty lines', async () => {
		const useCase = new SubmitCycleCountUseCase(createRepo());
		expect(() => (useCase.execute(1, [])))).toThrow(/lines/);
	});
});
