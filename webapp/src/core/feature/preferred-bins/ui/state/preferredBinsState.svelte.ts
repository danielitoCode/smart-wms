import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { createItemsDependencies } from '../../../items/di/items.dependencies';
import { createWarehousesDependencies } from '../../../warehouses/di/warehouses.dependencies';
import { createPreferredBinsDependencies, type PreferredBinsDependencies } from '../../di/preferredBins.dependencies';
import type { Item } from '../../../items/domain/entity/Item';
import type { Bin, Warehouse } from '../../../warehouses/domain/entity/Warehouse';
import type { PreferredBin } from '../../domain/entity/PreferredBin';

type StateDependencies = {
	preferred: PreferredBinsDependencies;
	items: ReturnType<typeof createItemsDependencies>;
	warehouses: ReturnType<typeof createWarehousesDependencies>;
};

const defaultDependencies: StateDependencies = {
	preferred: createPreferredBinsDependencies(),
	items: createItemsDependencies(),
	warehouses: createWarehousesDependencies()
};

export function createPreferredBinsState(dependencies: StateDependencies = defaultDependencies) {
	let rows = $state<PreferredBin[]>([]);
	let warehouseOptions = $state<Warehouse[]>([]);
	let binOptions = $state<Bin[]>([]);
	let itemOptions = $state<Item[]>([]);
	let selectedItem = $state<Item | null>(null);
	let selectedWarehouseId = $state<number | null>(null);
	let filterWarehouseId = $state<number | null>(null);
	let selectedBinId = $state<number | null>(null);
	let itemQuery = $state('');
	let binQuery = $state('');
	let rowsQuery = $state('');
	let priority = $state(1);
	let loading = $state(false);
	let loadingCatalogs = $state(false);
	let loadingBins = $state(false);
	let searchingItems = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let rowsRequest = 0;
	let itemSearchRequest = 0;
	let binSearchRequest = 0;

	async function loadRows() {
		const requestId = ++rowsRequest;
		loading = true;
		error = null;
		try {
			const result = await dependencies.preferred.list.execute({
				search: rowsQuery,
				warehouseId: filterWarehouseId ?? undefined
			});
			if (requestId !== rowsRequest) return false;
			rows = [...result].sort((a, b) => a.sku?.localeCompare(b.sku ?? '') || a.priority - b.priority || a.preferredBinId - b.preferredBinId);
			return true;
		} catch (cause) {
			if (requestId === rowsRequest) error = toUserMessage(cause, 'No se pudieron cargar las ubicaciones preferidas');
			return false;
		} finally {
			if (requestId === rowsRequest) loading = false;
		}
	}

	async function loadCatalogs() {
		loadingCatalogs = true;
		error = null;
		try {
			const result = await dependencies.warehouses.listAdminWarehouses.execute();
			warehouseOptions = result.filter(warehouse => warehouse.active);
			if (warehouseOptions.length === 1) selectedWarehouseId = warehouseOptions[0].id;
			await loadRows();
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudieron cargar los almacenes');
		} finally {
			loadingCatalogs = false;
		}
	}

	async function searchRows(query: string) {
		rowsQuery = query;
		return loadRows();
	}

	async function setWarehouseFilter(id: number | null) {
		filterWarehouseId = id;
		return loadRows();
	}

	async function searchItemCatalog(query: string) {
		itemQuery = query;
		if (selectedItem && query !== selectedItem.sku + ' · ' + selectedItem.name) selectedItem = null;
		const requestId = ++itemSearchRequest;
		if (query.trim().length < 2) {
			itemOptions = [];
			searchingItems = false;
			return;
		}
		searchingItems = true;
		try {
			const result = await dependencies.items.searchItems.execute(query);
			if (requestId === itemSearchRequest) itemOptions = result;
		} catch (cause) {
			if (requestId === itemSearchRequest) error = toUserMessage(cause, 'No se pudieron buscar los productos');
		} finally {
			if (requestId === itemSearchRequest) searchingItems = false;
		}
	}

	function chooseItem(item: Item) {
		selectedItem = item;
		itemQuery = item.sku + ' · ' + item.name;
		itemOptions = [];
	}

	async function loadBins(query = '') {
		binQuery = query;
		selectedBinId = null;
		const requestId = ++binSearchRequest;
		if (!selectedWarehouseId) {
			binOptions = [];
			return;
		}
		loadingBins = true;
		error = null;
		try {
			const all: Bin[] = [];
			let page = 1;
			let pages = 1;
			do {
				const result = await dependencies.warehouses.listBins.execute({
					warehouseId: selectedWarehouseId,
					q: query.trim() || undefined,
					page,
					perPage: 1000
				});
				if (requestId !== binSearchRequest) return;
				all.push(...result.items);
				pages = result.pages;
				page += 1;
			} while (page <= pages);
			binOptions = all.filter(bin => bin.active && bin.binType === 'Pickable' && bin.warehouseId === selectedWarehouseId);
		} catch (cause) {
			if (requestId === binSearchRequest) error = toUserMessage(cause, 'No se pudieron cargar las ubicaciones del almacén');
		} finally {
			if (requestId === binSearchRequest) loadingBins = false;
		}
	}

	async function chooseWarehouse(id: number | null) {
		selectedWarehouseId = id;
		selectedBinId = null;
		binOptions = [];
		binQuery = '';
		if (id) await loadBins();
	}

	async function add() {
		if (!selectedItem || !selectedWarehouseId || !selectedBinId) {
			error = 'Selecciona un producto, un almacén y una ubicación';
			return false;
		}
		const bin = binOptions.find(candidate => candidate.id === selectedBinId);
		if (!bin) {
			error = 'La ubicación seleccionada ya no pertenece al catálogo del almacén';
			return false;
		}
		saving = true;
		error = null;
		try {
			await dependencies.preferred.add.execute({
				itemId: selectedItem.id,
				binId: bin.id,
				priority,
				warehouseId: selectedWarehouseId,
				binWarehouseId: bin.warehouseId,
				binType: bin.binType
			});
			await loadRows();
			selectedBinId = null;
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo asignar la ubicación preferida');
			return false;
		} finally {
			saving = false;
		}
	}

	async function updatePriority(id: number, nextPriority: number) {
		saving = true;
		error = null;
		try {
			await dependencies.preferred.updatePriority.execute(id, nextPriority);
			await loadRows();
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo actualizar la prioridad');
			return false;
		} finally {
			saving = false;
		}
	}

	async function remove(id: number) {
		saving = true;
		error = null;
		try {
			await dependencies.preferred.remove.execute(id);
			await loadRows();
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo eliminar la relación');
			return false;
		} finally {
			saving = false;
		}
	}

	return {
		get rows() { return rows; },
		get warehouseOptions() { return warehouseOptions; },
		get binOptions() { return binOptions; },
		get itemOptions() { return itemOptions; },
		get selectedItem() { return selectedItem; },
		get selectedWarehouseId() { return selectedWarehouseId; },
		get filterWarehouseId() { return filterWarehouseId; },
		get selectedBinId() { return selectedBinId; },
		get itemQuery() { return itemQuery; },
		get binQuery() { return binQuery; },
		get rowsQuery() { return rowsQuery; },
		get priority() { return priority; },
		get loading() { return loading; },
		get loadingCatalogs() { return loadingCatalogs; },
		get loadingBins() { return loadingBins; },
		get searchingItems() { return searchingItems; },
		get saving() { return saving; },
		get error() { return error; },
		setPriority(value: number) { priority = value; },
		setSelectedBinId(value: number | null) { selectedBinId = value; },
		loadCatalogs,
		searchRows,
		setWarehouseFilter,
		searchItemCatalog,
		chooseItem,
		chooseWarehouse,
		loadBins,
		loadRows,
		add,
		updatePriority,
		remove
	};
}
