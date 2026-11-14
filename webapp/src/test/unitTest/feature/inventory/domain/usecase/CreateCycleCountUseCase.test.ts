import { describe, it, expect, vi } from 'vitest';
import { CreateCycleCountUseCase } from '../../../../../../core/feature/inventory/domain/usecase/CreateCycleCountUseCase';
import type { InventoryRepository } from '../../../../../../core/feature/inventory/domain/repository/InventoryRepository';
import type { CycleCountSummary } from '../../../../../../core/feature/inventory/domain/entity/CycleCount';

function createRepo(overrides: Partial<InventoryRepository> = {}): InventoryRepository {
	return {
		getOverview: vi.fn(),
		getItemInventory: vi.fn(),
		createCycleCounts: vi.fn(),
		getCycleCount: vi.fn(),
		submitCycleCount: vi.fn(),
		...overrides
	};
}

describe('CreateCycleCountUseCase', () => {
	it('delegates valid warehouse and unique bins to the repository', async () => {
		const expected: CycleCountSummary[] = [{
			countId: 1, warehouseId: 1, binId: 3, binCode: 'A-01-01',
			status: 'PENDING', lineCount: 2, assignedTo: 'admin'
		}];
		const repo = createRepo({ createCycleCounts: vi.fn().mockResolvedValue(expected) });
		const result = await new CreateCycleCountUseCase(repo).execute(1, [3, 4]);
		expect(repo.createCycleCounts).toHaveBeenCalledWith(1, [3, 4]);
		expect(result).toEqual(expected);
	});

	it('rejects invalid warehouseId', () => {
		expect(() => new CreateCycleCountUseCase(createRepo()).execute(0, [1])).toThrow(/warehouseId/);
	});

	it('rejects empty binIds', () => {
		expect(() => new CreateCycleCountUseCase(createRepo()).execute(1, [])).toThrow(/binIds/);
	});

	it('rejects invalid bin identifiers', () => {
		expect(() => new CreateCycleCountUseCase(createRepo()).execute(1, [1, 0])).toThrow(/binId/);
	});

	it('rejects duplicate bins before creating duplicate count records', () => {
		const repo = createRepo();
		expect(() => new CreateCycleCountUseCase(repo).execute(1, [3, 3])).toThrow(/duplicates/);
		expect(repo.createCycleCounts).not.toHaveBeenCalled();
	});
});
