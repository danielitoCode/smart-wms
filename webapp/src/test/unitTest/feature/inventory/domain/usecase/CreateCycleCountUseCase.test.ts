import { describe, it, expect, vi } from 'vitest';
import { CreateCycleCountUseCase } from '../../../../../../core/feature/inventory/domain/usecase/CreateCycleCountUseCase';
import type { InventoryRepository } from '../../../../../../core/feature/inventory/domain/repository/InventoryRepository';
import type { CycleCountSummary } from '../../../../../../core/feature/inventory/domain/entity/CycleCount';

function createRepo(overrides: Partial<InventoryRepository> = {}): InventoryRepository {
	return {
		getOverview: vi.fn(),
		createCycleCounts: vi.fn(),
		getCycleCount: vi.fn(),
		submitCycleCount: vi.fn(),
		...overrides
	};
}

describe('CreateCycleCountUseCase', () => {
	it('delegates to repository with valid input', async () => {
		const expected: CycleCountSummary[] = [
			{
				countId: 1,
				binId: 3,
				binCode: 'A-01-01',
				status: 'PENDING',
				lines: 2,
				assignedTo: 'admin'
			}
		];
		const repo = createRepo({
			createCycleCounts: vi.fn().mockResolvedValue(expected)
		});
		const useCase = new CreateCycleCountUseCase(repo);

		const result = await useCase.execute(1, [3, 4]);

		expect(repo.createCycleCounts).toHaveBeenCalledWith(1, [3, 4]);
		expect(result).toEqual(expected);
	});

	it('rejects invalid warehouseId', async () => {
		const useCase = new CreateCycleCountUseCase(createRepo());
		expect(() => (useCase.execute(0, [1])))).toThrow(/warehouseId/);
	});

	it('rejects empty binIds', async () => {
		const useCase = new CreateCycleCountUseCase(createRepo());
		expect(() => (useCase.execute(1, [])))).toThrow(/binIds/);
	});
});
