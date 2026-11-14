import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { createItemsDependencies } from '../../../items/di/items.dependencies';
import { createWarehousesDependencies } from '../../../warehouses/di/warehouses.dependencies';
import { createPreferredBinsDependencies } from '../../di/preferredBins.dependencies';
import type { Item } from '../../../items/domain/entity/Item';
import type { Bin, Warehouse } from '../../../warehouses/domain/entity/Warehouse';
import type { PreferredBin } from '../../domain/entity/PreferredBin';

const preferred = createPreferredBinsDependencies();
const items = createItemsDependencies();
const warehouses = createWarehousesDependencies();

export function createPreferredBinsState() {
	let rows = $state<PreferredBin[]>([]);
	let warehouseOptions = $state<Warehouse[]>([]);
	let binOptions = $state<Bin[]>([]);
	let itemOptions = $state<Item[]>([]);
	let selectedItem = $state<Item | null>(null);
	let selectedWarehouseId = $state<number | null>(null);
	let selectedBinId = $state<number | null>(null);
	let itemQuery = $state('');
	let binQuery = $state('');
	let priority = $state(1);
	let loading = $state(false);
	let loadingBins = $state(false);
	let searchingItems = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function loadRows() {
		if (!selectedItem) {
			rows = [];
			return;
		}
		loading = true;
		error = null;
		try {
			rows = await preferred.list.execute({ itemId: selectedItem.id });
			rows = [...rows].sort((a, b) => a.priority - b.priority || a.preferredBinId - b.preferredBinId);
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudieron cargar las ubicaciones preferidas');
		} finally {
			loading = false;
		}
	}

	async function loadCatalogs() {
		loading = true;
		error = null;
		try {
			const result = await warehouses.listAdminWarehouses.execute();
			warehouseOptions = result.filter(warehouse => warehouse.active);
			if (warehouseOptions.length === 1) selectedWarehouseId = warehouseOptions[0].id;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudieron cargar los almacenes');
		} finally {
			loading = false;
		}
	}

	async function searchItemCatalog(query: string) {
		itemQuery = query;
		if (query.trim().length < 2) {
			itemOptions = [];
			return;
		}
		searchingItems = true;
		try {
			itemOptions = await items.searchItems.execute(query);
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudieron buscar los productos');
		} finally {
			searchingItems = false;
		}
	}

	function chooseItem(item: Item) {
		selectedItem = item;
		itemQuery = item.sku + ' · ' + item.name;
		itemOptions = [];
		void loadRows();
	}

	async function loadBins(query = '') {
		binQuery = query;
		selectedBinId = null;
		if (!selectedWarehouseId) {
			binOptions = [];
			return;
		}
		loadingBins = true;
		error = null;
		try {
			const page = await warehouses.listBins.execute({
				warehouseId: selectedWarehouseId,
				q: query.trim() || undefined,
				page: 1,
				perPage: 1000
			});
			binOptions = page.items.filter(bin => bin.active && bin.binType === 'Pickable' && bin.warehouseId === selectedWarehouseId);
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudieron cargar las ubicaciones del almacén');
		} finally {
			loadingBins = false;
		}
	}

	async function chooseWarehouse(id: number | null) {
		selectedWarehouseId = id;
		selectedBinId = null;
		binOptions = [];
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
			await preferred.add.execute({
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
			await preferred.updatePriority.execute(id, nextPriority);
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
			await preferred.remove.execute(id);
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
		get selectedBinId() { return selectedBinId; },
		get itemQuery() { return itemQuery; },
		get binQuery() { return binQuery; },
		get priority() { return priority; },
		get loading() { return loading; },
		get loadingBins() { return loadingBins; },
		get searchingItems() { return searchingItems; },
		get saving() { return saving; },
		get error() { return error; },
		setPriority(value: number) { priority = value; },
		setSelectedBinId(value: number | null) { selectedBinId = value; },
		loadCatalogs,
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
