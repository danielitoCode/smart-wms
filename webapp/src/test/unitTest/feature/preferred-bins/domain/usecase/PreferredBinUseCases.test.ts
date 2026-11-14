import { describe, expect, it, vi } from 'vitest';
import type { PreferredBinsRepository } from '../../../../../../core/feature/preferred-bins/domain/repository/PreferredBinsRepository';
import {
	AddPreferredBinUseCase,
	ListPreferredBinCatalogUseCase,
	ListPreferredBinsUseCase,
	RemovePreferredBinUseCase,
	UpdatePreferredBinPriorityUseCase
} from '../../../../../../core/feature/preferred-bins/domain/usecase/PreferredBinUseCases';

function repository(): PreferredBinsRepository {
	return {
		list: vi.fn().mockResolvedValue([]),
		create: vi.fn().mockResolvedValue(undefined),
		update: vi.fn().mockResolvedValue(undefined),
		remove: vi.fn().mockResolvedValue(undefined)
	};
}

describe('Preferred Bins use cases', () => {
	it('validates warehouse and pagination parameters for the feature catalog', async () => {
		const repo = repository();
		const useCase = new ListPreferredBinCatalogUseCase(repo);
		expect(() => useCase.execute({ warehouseId: 0 })).toThrow('almacén');
		expect(() => useCase.execute({ page: 0 })).toThrow('página');
		expect(() => useCase.execute({ perPage: 1001 })).toThrow('página');
		expect(repo.listCatalog).not.toHaveBeenCalled();
	});

	it('rejects a non-existent/invalid item identifier before calling the API', async () => {
		const repo = repository();
		const useCase = new AddPreferredBinUseCase(repo);
		expect(() => useCase.execute({
			itemId: 0, binId: 20, priority: 1,
			warehouseId: 3, binWarehouseId: 3, binType: 'Pickable'
		})).toThrow('producto válido');
		expect(repo.create).not.toHaveBeenCalled();
	});

	it('rejects a bin that belongs to another warehouse', async () => {
		const repo = repository();
		const useCase = new AddPreferredBinUseCase(repo);
		expect(() => useCase.execute({
			itemId: 10, binId: 20, priority: 1,
			warehouseId: 3, binWarehouseId: 4, binType: 'Pickable'
		})).toThrow('otro almacén');
		expect(repo.create).not.toHaveBeenCalled();
	});

	it('rejects non-Pickable bins', async () => {
		const repo = repository();
		const useCase = new AddPreferredBinUseCase(repo);
		expect(() => useCase.execute({
			itemId: 10, binId: 20, priority: 1,
			warehouseId: 3, binWarehouseId: 3, binType: 'PickableStaging'
		})).toThrow('Pickable');
	});

	it('sends valid assignment identifiers and priority to the repository', async () => {
		const repo = repository();
		const useCase = new AddPreferredBinUseCase(repo);
		await useCase.execute({
			itemId: 10, binId: 20, priority: 2,
			warehouseId: 3, binWarehouseId: 3, binType: 'Pickable'
		});
		expect(repo.create).toHaveBeenCalledWith({ itemId: 10, binId: 20, priority: 2 });
	});

	it('allows duplicate requested priorities to be delegated to the backend resequencing contract', async () => {
		const repo = repository();
		const useCase = new AddPreferredBinUseCase(repo);
		await useCase.execute({
			itemId: 10, binId: 21, priority: 1,
			warehouseId: 3, binWarehouseId: 3, binType: 'Pickable'
		});
		expect(repo.create).toHaveBeenCalledTimes(1);
	});

	it('uses the relation identifier, not the bin identifier, for priority update and removal', async () => {
		const repo = repository();
		await new UpdatePreferredBinPriorityUseCase(repo).execute(91, 3);
		await new RemovePreferredBinUseCase(repo).execute(91);
		expect(repo.update).toHaveBeenCalledWith(91, 3);
		expect(repo.remove).toHaveBeenCalledWith(91);
	});

	it('validates list item filters', async () => {
		const repo = repository();
		expect(() => new ListPreferredBinsUseCase(repo).execute({ itemId: -1 })).toThrow();
		expect(repo.list).not.toHaveBeenCalled();
	});
});
