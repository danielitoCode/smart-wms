import { getContext } from 'svelte';
import { createInventoryDependencies } from '../../di/inventory.dependencies';
import { createWarehousesDependencies } from '../../../warehouses/di/warehouses.dependencies';
import type { Bin, Warehouse } from '../../../warehouses/domain/entity/Warehouse';
import type { InventoryPage, InventoryStock } from '../../domain/entity/InventoryStock';
import type { ItemBarcodeLookup } from '../../domain/entity/ItemBarcodeLookup';
import type { OperationalBinLookup } from '../../../warehouses/domain/entity/Warehouse';
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
	let itemBarcodeResult = $state<ItemBarcodeLookup | null>(null);
	let binContentsResult = $state<OperationalBinLookup | null>(null);
	let lookupLoading = $state(false);
	let lookupError = $state<string | null>(null);
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
		const version = ++requestVersion;
		const scope = beginWarehouseScopedRequest();
		if (overrides.warehouseId !== undefined) {
			warehouseId = overrides.warehouseId;
		} else if (warehouseSelection?.warehouseId != null) {
			warehouseId = warehouseSelection.warehouseId ?? undefined;
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
			result = {
				items: Array.isArray(data.items) ? data.items : [],
				page: data.page ?? 1,
				perPage: data.perPage ?? PAGE_SIZE,
				total: data.total ?? 0,
				pages: data.pages ?? 1
			};
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

	function requireSelectedWarehouse(): number {
		if (!warehouseSelection) throw new Error('No se pudo validar el contexto del almacén.');
		const authorizedId = warehouseSelection.requireWarehouseId();
		if (warehouseId == null || authorizedId !== warehouseId) {
			throw new Error('El almacén seleccionado no está autorizado o ha cambiado.');
		}
		return authorizedId;
	}

	async function lookupBarcode(barcode: string): Promise<boolean> {
		const normalized = barcode.trim();
		if (!normalized) {
			lookupError = 'Introduce o escanea un código de producto.';
			return false;
		}
		let selectedWarehouseId: number;
		try { selectedWarehouseId = requireSelectedWarehouse(); }
		catch (err) { lookupError = toUserMessage(err, 'Selecciona un almacén autorizado antes de buscar un producto.'); return false; }
		const version = ++requestVersion;
		const scope = beginWarehouseScopedRequest();
		lookupLoading = true;
		lookupError = null;
		itemBarcodeResult = null;
		binContentsResult = null;
		try {
			const item = await deps.lookupBarcode.execute(normalized);
			if (!scope.isCurrent() || version !== requestVersion || warehouseId !== selectedWarehouseId) return false;
			const stock = await deps.getItemInventory.execute(item.itemId, {
				warehouseId: selectedWarehouseId,
				page: 1,
				perPage: PAGE_SIZE
			});
			if (!scope.isCurrent() || version !== requestVersion || warehouseId !== selectedWarehouseId) return false;
			itemBarcodeResult = item;
			result = { ...stock, items: stock.items.filter(row => row.warehouseId == null || row.warehouseId === selectedWarehouseId) };
			page = 1;
			loadedOnce = true;
			return true;
		} catch (err) {
			if (!scope.isCurrent() || version !== requestVersion || warehouseId !== selectedWarehouseId) return false;
			lookupError = toUserMessage(err, 'No se pudo localizar el código del producto');
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent() && version === requestVersion) lookupLoading = false;
		}
	}

	async function lookupBinContents(barcode: string): Promise<boolean> {
		const normalized = barcode.trim();
		if (!normalized) {
			lookupError = 'Introduce o escanea un código de ubicación.';
			return false;
		}
		let selectedWarehouseId: number;
		try { selectedWarehouseId = requireSelectedWarehouse(); }
		catch (err) { lookupError = toUserMessage(err, 'Selecciona un almacén autorizado antes de buscar una ubicación.'); return false; }
		const version = ++requestVersion;
		const scope = beginWarehouseScopedRequest();
		lookupLoading = true;
		lookupError = null;
		itemBarcodeResult = null;
		binContentsResult = null;
		try {
			const contents = await warehouseDeps.lookupOperationalBin.execute(normalized);
			if (!scope.isCurrent() || version !== requestVersion || warehouseId !== selectedWarehouseId) return false;
			if (contents.bin.warehouseId !== selectedWarehouseId) {
				lookupError = 'La ubicación encontrada no pertenece al almacén seleccionado.';
				return false;
			}
			binContentsResult = contents;
			binId = contents.bin.id;
			itemId = undefined;
			query = '';
			page = 1;
			const stock = await deps.getInventoryOverview.execute({
				warehouseId: selectedWarehouseId,
				binId: contents.bin.id,
				page: 1,
				perPage: PAGE_SIZE
			});
			if (!scope.isCurrent() || version !== requestVersion || warehouseId !== selectedWarehouseId) return false;
			result = stock;
			loadedOnce = true;
			return true;
		} catch (err) {
			if (!scope.isCurrent() || version !== requestVersion || warehouseId !== selectedWarehouseId) return false;
			lookupError = toUserMessage(err, 'No se pudo consultar el contenido de la ubicación');
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent() && version === requestVersion) lookupLoading = false;
		}
	}

	function clearLookups() {
		itemBarcodeResult = null;
		binContentsResult = null;
		lookupError = null;
		lookupLoading = false;
		requestVersion++;
	}

	function applyFilters() {
		page = 1;
		return load({ warehouseId, page: 1 });
	}

	function setWarehouseId(value: number | undefined) {
		if (value !== warehouseId) {
			warehouseId = value;
			clearLookups();
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
		clearLookups();
		result = { ...result, items: [] };
		loadedOnce = false;
		error = null;
	}

	return {
		get items(): InventoryStock[] {
			return Array.isArray(result?.items) ? result.items : [];
		},
		get page() {
			return result.page;
		},
		get pages() {
			return result.pages;
		},
		get perPage() {
			return result.perPage;
		},
		get total() {
			return result.total;
		},
		get warehouses() {
			return warehouses;
		},
		get bins() {
			return bins;
		},
		get warehouseId() {
			return warehouseId;
		},
		get binId() {
			return binId;
		},
		get itemId() {
			return itemId;
		},
		get query() {
			return query;
		},
		get loading() {
			return loading;
		},
		get loadingOptions() {
			return loadingOptions;
		},
		get error() {
			return error;
		},
		get loadedOnce() {
			return loadedOnce;
		},
		get itemBarcodeResult() { return itemBarcodeResult; },
		get binContentsResult() { return binContentsResult; },
		get lookupLoading() { return lookupLoading; },
		get lookupError() { return lookupError; },
		get generation() {
			return warehouseSelection?.generation ?? 0;
		},
		setWarehouseId,
		setBinId,
		setItemId,
		setQuery,
		setPage,
		applyFilters,
		lookupBarcode,
		lookupBinContents,
		clearLookups,
		initialize,
		load,
		invalidate
	};
}
