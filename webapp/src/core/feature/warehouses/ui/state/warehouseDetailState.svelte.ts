import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type {
	Bin, BinDetail, BinPage, CreateBinInput, CreateZoneInput, UpdateBinInput,
	UpdateZoneInput, Warehouse, Zone
} from '../../domain/entity/Warehouse';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createWarehousesDependencies();

export function createWarehouseDetailState(warehouseId: number, includeBins = true) {
	let warehouse = $state<Warehouse | null>(null);
	let zones = $state<Zone[]>([]);
	let bins = $state<Bin[]>([]);
	let binPage = $state(1);
	let binPages = $state(1);
	let binTotal = $state(0);
	let binPerPage = $state(50);
	let binSearch = $state('');
	let selectedZoneId = $state<number | null>(null);
	let selectedBinDetail = $state<BinDetail | null>(null);
	let loading = $state(false);
	let binsLoading = $state(false);
	let mutating = $state(false);
	let error = $state<string | null>(null);
	let binsRequestVersion = 0;

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
			// The operational lookup is available to authenticated warehouse users;
			// the admin detail endpoint is only a fallback for inactive warehouses.
			const activeWarehouses = await deps.listWarehouses.execute();
			warehouse = activeWarehouses.find(row => row.id === warehouseId) ?? await deps.getWarehouse.execute(warehouseId);
			zones = await deps.listZones.execute(warehouseId);
			if (includeBins) await loadBinsForZone(null, 1);
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el almacén');
			return false;
		} finally {
			loading = false;
		}
	}

	async function loadBinsForZone(zoneId: number | null, page = 1) {
		if (!includeBins) return false;
		selectedZoneId = zoneId;
		const requestVersion = ++binsRequestVersion;
		binsLoading = true;
		error = null;
		try {
			const result: BinPage = await deps.listBins.execute({
				warehouseId, ...(zoneId != null ? { zoneId } : {}), page, perPage: binPerPage,
				...(binSearch.trim() ? { q: binSearch.trim() } : {})
			});
			if (requestVersion !== binsRequestVersion) return false;
			bins = result.items; binPage = result.page; binPages = result.pages;
			binTotal = result.total; binPerPage = result.perPage;
			return true;
		} catch (err) {
			if (requestVersion !== binsRequestVersion) return false;
			error = toUserMessage(err, 'No se pudieron cargar los bins');
			bins = []; binTotal = 0;
			return false;
		} finally {
			if (requestVersion === binsRequestVersion) binsLoading = false;
		}
	}

	async function searchBins(value: string) { binSearch = value; return loadBinsForZone(selectedZoneId, 1); }
	async function createZone(input: Omit<CreateZoneInput, 'warehouseId'>) {
		return mutate(async () => { await deps.createZone.execute({ ...input, warehouseId }); zones = await deps.listZones.execute(warehouseId); }, 'No se pudo crear la zona');
	}
	async function updateZone(input: UpdateZoneInput) {
		return mutate(async () => { await deps.updateZone.execute(input); zones = await deps.listZones.execute(warehouseId); }, 'No se pudo actualizar la zona');
	}
	async function removeZone(id: number) {
		return mutate(async () => {
			await deps.deleteZone.execute(id); zones = await deps.listZones.execute(warehouseId);
			if (selectedZoneId === id && includeBins) await loadBinsForZone(null, 1);
		}, 'No se pudo eliminar la zona');
	}
	async function createBin(input: Omit<CreateBinInput, 'warehouseId'>) {
		return mutate(async () => { await deps.createBin.execute({ ...input, warehouseId }); await loadBinsForZone(selectedZoneId, 1); }, 'No se pudo crear el bin');
	}
	async function updateBin(input: UpdateBinInput) {
		return mutate(async () => { await deps.updateBin.execute(input); await loadBinsForZone(selectedZoneId, binPage); }, 'No se pudo actualizar el bin');
	}
	async function removeBin(id: number) {
		return mutate(async () => { await deps.deleteBin.execute(id); selectedBinDetail = null; await loadBinsForZone(selectedZoneId, binPage); }, 'No se pudo eliminar el bin');
	}
	async function viewBin(id: number) {
		error = null;
		try { selectedBinDetail = await deps.getBinDetail.execute(id); return true; }
		catch (err) { error = toUserMessage(err, 'No se pudo cargar el detalle del bin'); return false; }
	}
	async function exportAllBins(): Promise<Bin[]> {
		const all: Bin[] = []; let page = 1; let pages = 1;
		do {
			const result = await deps.listBins.execute({
				warehouseId, ...(selectedZoneId != null ? { zoneId: selectedZoneId } : {}),
				page, perPage: 50, ...(binSearch.trim() ? { q: binSearch.trim() } : {})
			});
			all.push(...result.items); pages = result.pages; page += 1;
		} while (page <= pages && page <= 200);
		return all;
	}
	async function mutate(action: () => Promise<void>, fallback: string) {
		if (mutating) return false;
		mutating = true; error = null;
		try { await action(); return true; }
		catch (err) { error = toUserMessage(err, fallback); return false; }
		finally { mutating = false; }
	}

	return {
		get warehouse() { return warehouse; }, get zones() { return zones; }, get bins() { return bins; },
		get binPage() { return binPage; }, get binPages() { return binPages; }, get binTotal() { return binTotal; },
		get binPerPage() { return binPerPage; }, get binSearch() { return binSearch; },
		get selectedZoneId() { return selectedZoneId; }, get selectedBinDetail() { return selectedBinDetail; },
		get loading() { return loading; }, get binsLoading() { return binsLoading; },
		get mutating() { return mutating; }, get error() { return error; },
		clearError() { error = null; }, setError(message: string) { error = message; }, closeBinDetail() { selectedBinDetail = null; },
		load, loadBinsForZone, searchBins, createZone, updateZone, removeZone,
		createBin, updateBin, removeBin, viewBin, exportAllBins
	};
}
