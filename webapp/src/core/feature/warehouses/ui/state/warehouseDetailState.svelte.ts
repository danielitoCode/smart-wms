import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { Bin, BinPage, Warehouse, Zone } from '../../domain/entity/Warehouse';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createWarehousesDependencies();

export function createWarehouseDetailState(warehouseId: number) {
	let warehouse = $state<Warehouse | null>(null);
	let zones = $state<Zone[]>([]);
	let bins = $state<Bin[]>([]);
	let binPage = $state(1);
	let binPages = $state(1);
	let binTotal = $state(0);
	let binPerPage = $state(50);
	let binSearch = $state('');
	let selectedZoneId = $state<number | null>(null);
	let loading = $state(false);
	let binsLoading = $state(false);
	let error = $state<string | null>(null);

	async function load() {
		if (loading) return false;
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			error = 'warehouseId inválido';
			return false;
		}
		loading = true;
		error = null;
		warehouse = null;
		zones = [];
		bins = [];
		selectedZoneId = null;
		try {
			const [wh, zoneList] = await Promise.all([
				deps.getWarehouse.execute(warehouseId),
				deps.listZones.execute(warehouseId)
			]);
			warehouse = wh;
			zones = zoneList;
			await loadBinsForZone(null, 1);
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el almacén');
			return false;
		} finally {
			loading = false;
		}
	}

	async function loadBinsForZone(zoneId: number | null, page = 1) {
		if (binsLoading) return false;
		selectedZoneId = zoneId;
		binsLoading = true;
		error = null;
		try {
			const result: BinPage = await deps.listBins.execute({
				warehouseId,
				...(zoneId != null ? { zoneId } : {}),
				page,
				perPage: binPerPage,
				...(binSearch.trim() ? { q: binSearch.trim() } : {})
			});
			bins = result.items;
			binPage = result.page;
			binPages = result.pages;
			binTotal = result.total;
			binPerPage = result.perPage;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudieron cargar los bins');
			bins = [];
			binTotal = 0;
			return false;
		} finally {
			binsLoading = false;
		}
	}

	async function searchBins(value: string) {
		binSearch = value;
		return loadBinsForZone(selectedZoneId, 1);
	}

	return {
		get warehouse() { return warehouse; },
		get zones() { return zones; },
		get bins() { return bins; },
		get binPage() { return binPage; },
		get binPages() { return binPages; },
		get binTotal() { return binTotal; },
		get binPerPage() { return binPerPage; },
		get binSearch() { return binSearch; },
		get selectedZoneId() { return selectedZoneId; },
		get loading() { return loading; },
		get binsLoading() { return binsLoading; },
		get error() { return error; },
		load,
		loadBinsForZone,
		searchBins
	};
}
