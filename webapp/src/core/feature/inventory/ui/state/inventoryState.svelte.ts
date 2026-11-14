import { getContext } from 'svelte';
import { createInventoryDependencies } from '../../di/inventory.dependencies';
import type { InventoryPage, InventoryStock } from '../../domain/entity/InventoryStock';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { beginWarehouseScopedRequest } from '../../../../infrastructure/warehouse/WarehouseRequestScope';
import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';

const deps = createInventoryDependencies();
const PAGE_SIZE = 50;

export function createInventoryOverviewState() {
	const warehouseSelection = getContext<WarehouseSelectionState | undefined>('warehouseSelection');

	let result = $state<InventoryPage>({
		items: [],
		page: 1,
		perPage: PAGE_SIZE,
		total: 0,
		pages: 1
	});
	let warehouseId = $state<number | undefined>(warehouseSelection?.warehouseId ?? undefined);
	let binId = $state<number | undefined>();
	let itemId = $state<number | undefined>();
	let query = $state('');
	let page = $state(1);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let loadedOnce = $state(false);
	let requestVersion = 0;

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
		warehouseId = value;
		binId = undefined;
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
		get warehouseId() { return warehouseId; },
		get binId() { return binId; },
		get itemId() { return itemId; },
		get query() { return query; },
		get loading() { return loading; },
		get error() { return error; },
		get loadedOnce() { return loadedOnce; },
		get generation() { return warehouseSelection?.generation ?? 0; },
		setWarehouseId,
		setBinId,
		setItemId,
		setQuery,
		setPage,
		applyFilters,
		load,
		invalidate
	};
}
