import type { PreferredBinAssignmentContext, PreferredBinCandidate, PreferredBinListQuery } from '../entity/PreferredBin';
import type { PreferredBinsRepository } from '../repository/PreferredBinsRepository';
import { validatePreferredBinAssignment } from '../entity/PreferredBin';

export type AddPreferredBinInput = PreferredBinCandidate & PreferredBinAssignmentContext;

export class ListPreferredBinsUseCase {
	constructor(private readonly repository: PreferredBinsRepository) {}

	execute(query?: PreferredBinListQuery) {
		if (query?.itemId != null && (!Number.isInteger(query.itemId) || query.itemId <= 0)) {
			throw new Error('El producto seleccionado no es válido');
		}
		if (query?.warehouseId != null && (!Number.isInteger(query.warehouseId) || query.warehouseId <= 0)) {
			throw new Error('El almacén seleccionado no es válido');
		}
		if (query?.search != null && query.search.trim().length > 128) {
			throw new Error('La búsqueda no puede superar 128 caracteres');
		}
		return this.repository.list({
			...query,
			...(query?.search != null ? { search: query.search.trim() } : {})
		});
	}
}

export class AddPreferredBinUseCase {
	constructor(private readonly repository: PreferredBinsRepository) {}

	execute(input: AddPreferredBinInput) {
		if (!Number.isInteger(input.itemId) || input.itemId <= 0) throw new Error('Debe seleccionar un producto válido');
		if (!Number.isInteger(input.binId) || input.binId <= 0) throw new Error('Debe seleccionar una ubicación válida');
		if (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 100) {
			throw new Error('La prioridad debe estar entre 1 y 100');
		}
		validatePreferredBinAssignment(input);
		return this.repository.create({ itemId: input.itemId, binId: input.binId, priority: input.priority });
	}
}

export class UpdatePreferredBinPriorityUseCase {
	constructor(private readonly repository: PreferredBinsRepository) {}

	execute(preferredBinId: number, priority: number) {
		if (!Number.isInteger(preferredBinId) || preferredBinId <= 0) throw new Error('La relación seleccionada no es válida');
		if (!Number.isInteger(priority) || priority < 1 || priority > 100) {
			throw new Error('La prioridad debe estar entre 1 y 100');
		}
		return this.repository.update(preferredBinId, priority);
	}
}

export class RemovePreferredBinUseCase {
	constructor(private readonly repository: PreferredBinsRepository) {}

	execute(preferredBinId: number) {
		if (!Number.isInteger(preferredBinId) || preferredBinId <= 0) throw new Error('La relación seleccionada no es válida');
		return this.repository.remove(preferredBinId);
	}
}
