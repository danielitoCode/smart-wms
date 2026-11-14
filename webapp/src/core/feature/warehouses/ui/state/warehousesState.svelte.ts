import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { CreateWarehouseInput, UpdateWarehouseInput, Warehouse } from '../../domain/entity/Warehouse';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createWarehousesDependencies();

export function createWarehousesState() {
	let warehouses = $state<Warehouse[]>([]);
	let total = $state(0);
	let page = $state(1);
	let pages = $state(1);
	let perPage = $state(50);
	let loading = $state(false);
	let mutating = $state(false);
	let error = $state<string | null>(null);
	let loadedOnce = $state(false);

	async function load(nextPage = page) {
		if (loading) return false;
		loading = true;
		error = null;
		try {
			const result = await deps.listAdminWarehouses.executePage({ page: nextPage, perPage });
			warehouses = result.items;
			total = result.total;
			page = result.page;
			pages = result.pages;
			perPage = result.perPage;
			loadedOnce = true;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudieron cargar los almacenes');
			warehouses = [];
			total = 0;
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
		get warehouses() { return warehouses; }, get loading() { return loading; },
		get mutating() { return mutating; }, get error() { return error; },
		get loadedOnce() { return loadedOnce; },
		get total() { return total; }, get page() { return page; }, get pages() { return pages; }, get perPage() { return perPage; },
		load, create, update, remove, clearError() { error = null; }
	};
}
