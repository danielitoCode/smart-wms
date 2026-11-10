import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { Warehouse } from '../../domain/entity/Warehouse';

const deps = createWarehousesDependencies();

export function createWarehousesState() {
	let items = $state<Warehouse[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			items = await deps.listWarehouses.execute();
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudieron cargar los almacenes';
			items = [];
		} finally {
			loading = false;
		}
	}

	return {
		get items() {
			return items;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		load
	};
}
