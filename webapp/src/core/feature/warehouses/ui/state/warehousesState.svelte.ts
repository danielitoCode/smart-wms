import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { CreateWarehouseInput, UpdateWarehouseInput, Warehouse } from '../../domain/entity/Warehouse';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createWarehousesDependencies();

export function createWarehousesState() {
	let warehouses = $state<Warehouse[]>([]);
	let loading = $state(false);
	let mutating = $state(false);
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

	async function create(input: CreateWarehouseInput) {
		return mutate(async () => { await deps.createWarehouse.execute(input); });
	}
	async function update(input: UpdateWarehouseInput) {
		return mutate(async () => { await deps.updateWarehouse.execute(input); });
	}
	async function remove(id: number) {
		return mutate(async () => { await deps.deleteWarehouse.execute(id); });
	}
	async function mutate(action: () => Promise<void>) {
		if (mutating) return false;
		mutating = true;
		error = null;
		try {
			await action();
			await load();
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo guardar el almacén');
			return false;
		} finally {
			mutating = false;
		}
	}

	return {
		get warehouses() { return warehouses; },
		get loading() { return loading; },
		get mutating() { return mutating; },
		get error() { return error; },
		get loadedOnce() { return loadedOnce; },
		load, create, update, remove
	};
}
