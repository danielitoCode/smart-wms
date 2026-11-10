import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { Warehouse } from '../../domain/entity/Warehouse';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createWarehousesDependencies();

export function createWarehousesState() {
	let warehouses = $state<Warehouse[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let loadedOnce = $state(false);

	async function load() {
		if (loading) return false;
		loading = true;
		error = null;
		try {
			warehouses = await deps.listWarehouses.execute();
			loadedOnce = true;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudieron cargar los almacenes');
			warehouses = [];
			return false;
		} finally {
			loading = false;
		}
	}

	return {
		get warehouses() {
			return warehouses;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get loadedOnce() {
			return loadedOnce;
		},
		load
	};
}
