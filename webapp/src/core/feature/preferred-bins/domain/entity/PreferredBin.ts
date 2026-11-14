/**
 * A preferred picking location assigned to an item.
 * Priorities are unique and contiguous per item, as enforced by Flask.
 */
export type PreferredBin = {
	preferredBinId: number;
	itemId: number;
	binId: number;
	warehouseId: number;
	priority: number;
	updatedAt: string | null;
	sku?: string | null;
	itemName?: string | null;
	binCode?: string | null;
	zoneName?: string | null;
	notes?: string | null;
};

export type PreferredBinCandidate = {
	itemId: number;
	binId: number;
	priority: number;
};

export type PreferredBinBinType = 'Pickable';

export type PreferredBinAssignmentContext = {
	warehouseId: number;
	binWarehouseId: number;
	binType: string;
};

export type PreferredBinListQuery = {
	search?: string;
	itemId?: number;
	warehouseId?: number;
};

export function validatePreferredBinAssignment(context: PreferredBinAssignmentContext): void {
	if (!Number.isInteger(context.warehouseId) || context.warehouseId <= 0) {
		throw new Error('Debe seleccionar un almacén válido');
	}
	if (!Number.isInteger(context.binWarehouseId) || context.binWarehouseId <= 0) {
		throw new Error('La ubicación no tiene un almacén válido');
	}
	if (context.binWarehouseId !== context.warehouseId) {
		throw new Error('La ubicación seleccionada pertenece a otro almacén');
	}
	if (context.binType !== 'Pickable') {
		throw new Error('Solo se pueden asignar ubicaciones de tipo Pickable');
	}
}
