import { getContext } from 'svelte';
import { createInventoryDependencies } from '../../di/inventory.dependencies';
import { createWarehousesDependencies } from '../../../warehouses/di/warehouses.dependencies';
import type { Bin, Warehouse } from '../../../warehouses/domain/entity/Warehouse';
import type { InventoryPage, InventoryStock } from '../../domain/entity/InventoryStock';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { beginWarehouseScopedRequest } from '../../../../infrastructure/warehouse/WarehouseRequestScope';
import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';

const deps = createInventoryDependencies();
const warehouseDeps = createWarehousesDependencies();
const PAGE_SIZE = 50;
const BIN_PAGE_SIZE = 200;

export function createInventoryOverviewState() {
	const warehouseSelection = getContext<WarehouseSelectionState | undefined>('warehouseSelection');

	let result = $state<InventoryPage>({
		items: [],
		page: 1,
		perPage: PAGE_SIZE,
		total: 0,
		pages: 1
	});
	let warehouses = $state<Warehouse[]>([]);
	let bins = $state<Bin[]>([]);
	let binsWarehouseId: number | undefined;
	let warehouseId = $state<number | undefined>(warehouseSelection?.warehouseId ?? undefined);
	let binId = $state<number | undefined>();
	let itemId = $state<number | undefined>();
	let query = $state('');
	let page = $state(1);
	let loading = $state(false);
	let loadingOptions = $state(false);
	let error = $state<string | null>(null);
	let loadedOnce = $state(false);
	let requestVersion = 0;

	async function refreshBins() {
		if (warehouseId == null) {
			bins = [];
			binId = undefined;
			binsWarehouseId = undefined;
			return;
		}
		if (binsWarehouseId === warehouseId) return;

		const response = await warehouseDeps.listBins.execute({
			warehouseId,
			page: 1,
			perPage: BIN_PAGE_SIZE
		});
		bins = response.items;
		binsWarehouseId = warehouseId;
		if (binId != null && !bins.some((bin) => bin.id === binId)) {
			binId = undefined;
		}
	}

	async function initialize() {
		loadingOptions = true;
		error = null;
		try {
			warehouses = await warehouseDeps.listAdminWarehouses.execute();
			if (warehouseId == null && warehouses.length > 0) {
				warehouseId = warehouses[0].id;
			}
			await load({ warehouseId, page: 1 });
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudieron cargar los filtros del inventario');
			return false;
		} finally {
			loadingOptions = false;
		}
	}

	async function load(overrides: { warehouseId?: number; page?: number } = {}) {
		const scope = warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();
		const version = ++requestVersion;

		if (Object.prototype.hasOwnProperty.call(overrides, 'warehouseId')) {
			warehouseId = overrides.warehouseId;
		} else if (warehouseSelection?.warehouseId != null) {
			warehouseId = warehouseSelection.warehouseId;
		}
		if (overrides.page !== undefined) page = overrides.page;

		loading = true;
		error = null;
		try {
			await refreshBins();
			if (!scope.isCurrent() || version !== requestVersion) return false;
			const data = await deps.getInventoryOverview.execute({
				warehouseId,
				binId,
				itemId,
				query,
				page,
				perPage: PAGE_SIZE
			});
			if (!scope.isCurrent() || version !== requestVersion) return false;
			result = data;
			loadedOnce = true;
			return true;
		} catch (err) {
			if (!scope.isCurrent() || version !== requestVersion) return false;
			error = toUserMessage(err, 'No se pudo cargar el inventario');
			result = { ...result, items: [] };
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent() && version === requestVersion) loading = false;
		}
	}

	function applyFilters() {
		page = 1;
		return load({ warehouseId, page: 1 });
	}

	function setWarehouseId(value: number | undefined) {
		if (value !== warehouseId) {
			warehouseId = value;
			binId = undefined;
			binsWarehouseId = undefined;
			bins = [];
		}
		page = 1;
	}

	function setBinId(value: number | undefined) {
		binId = value;
		page = 1;
	}

	function setItemId(value: number | undefined) {
		itemId = value;
		page = 1;
	}

	function setQuery(value: string) {
		query = value;
		page = 1;
	}

	function setPage(value: number) {
		if (Number.isInteger(value) && value >= 1 && value <= result.pages) {
			page = value;
			void load({ warehouseId, page: value });
		}
	}

	function invalidate() {
		result = { ...result, items: [] };
		loadedOnce = false;
		error = null;
	}

	return {
		get items(): InventoryStock[] { return result.items; },
		get page() { return result.page; },
		get pages() { return result.pages; },
		get perPage() { return result.perPage; },
		get total() { return result.total; },
		get warehouses() { return warehouses; },
		get bins() { return bins; },
		get warehouseId() { return warehouseId; },
		get binId() { return binId; },
		get itemId() { return itemId; },
		get query() { return query; },
		get loading() { return loading; },
		get loadingOptions() { return loadingOptions; },
		get error() { return error; },
		get loadedOnce() { return loadedOnce; },
		get generation() { return warehouseSelection?.generation ?? 0; },
		setWarehouseId,
		setBinId,
		setItemId,
		setQuery,
		setPage,
		applyFilters,
		initialize,
		load,
		invalidate
	};
}
