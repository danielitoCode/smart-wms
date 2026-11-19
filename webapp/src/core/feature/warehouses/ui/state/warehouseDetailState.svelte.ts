import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type {
	Bin, BinDetail, BinPage, BinType, CreateBinInput, CreateZoneInput, UpdateBinInput,
	UpdateZoneInput, Warehouse, Zone
} from '../../domain/entity/Warehouse';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { authSession } from '../../../../infrastructure/auth/AuthSession';
import { assertZoneBelongsToWarehouse } from '../../domain/context/ZoneContext';
import { beginWarehouseScopedRequest } from '../../../../infrastructure/warehouse/WarehouseRequestScope';

const deps = createWarehousesDependencies();

export function createWarehouseDetailState(warehouseId: number, includeBins = true, includeZones = true) {
	let warehouse = $state<Warehouse | null>(null);
	let zones = $state<Zone[]>([]);
	let bins = $state<Bin[]>([]);
	let binPage = $state(1);
	let binPages = $state(1);
	let binTotal = $state(0);
	let binPerPage = $state(50);
	let binSearch = $state('');
	let binTypeFilter = $state<BinType | null>(null);
	let selectedZoneId = $state<number | null>(null);
	let selectedBinDetail = $state<BinDetail | null>(null);
	let loading = $state(false);
	let binsLoading = $state(false);
	let mutating = $state(false);
	let error = $state<string | null>(null);
	let binsRequestVersion = 0;
	let binDetailRequestVersion = 0;

	function assertBinBelongsToWarehouse(bin: Bin, label = 'bin'): void {
		if (bin.warehouseId !== warehouseId) {
			throw new Error(`The ${label} belongs to another warehouse`);
		}
	}

	async function refreshZones(): Promise<Zone[]> {
		if (!includeZones) { zones = []; return zones; }
		const result = await deps.listZones.execute(warehouseId);
		if (result.some((zone) => zone.warehouseId !== warehouseId)) {
			throw new Error('The zones response contains a zone from another warehouse');
		}
		zones = result;
		return zones;
	}

	function findLoadedBin(id: number): Bin {
		if (!Number.isInteger(id) || id <= 0) throw new Error('bin id must be a positive integer');
		const bin = bins.find((candidate) => candidate.id === id);
		if (!bin) throw new Error('Bin is not present in the active warehouse result');
		assertBinBelongsToWarehouse(bin);
		return bin;
	}

	async function load(initialZoneId: number | null = null) {
		if (loading) return false;
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			error = 'warehouseId inválido';
			return false;
		}
		const scopedRequest = beginWarehouseScopedRequest();
		loading = true;
		error = null;
		warehouse = null;
		zones = [];
		bins = [];
		selectedZoneId = null;
		try {
			// Warehouse metadata is page-protected. Users with only Zones/Bins
			// grants operate on the persisted warehouse ID without receiving the
			// full admin warehouse list or detail projection.
			const user = authSession.getUser();
			const canReadWarehouse = user?.role === 'ADMIN' || (user?.allowedPages ?? []).includes('warehouses');
			warehouse = canReadWarehouse
				? await deps.getWarehouse.execute(warehouseId)
				: { id: warehouseId, code: String(warehouseId), name: 'Almacén seleccionado', address: null, active: true, createdAt: null };
			await refreshZones();
			if (!scopedRequest.isCurrent()) return false;
			if (initialZoneId != null && includeZones && !zones.some(zone => zone.id === initialZoneId)) {
				throw new Error('La zona seleccionada no pertenece al almacén activo');
			}
			if (includeBins && !(await loadBinsForZone(initialZoneId, 1))) return false;
			return true;
		} catch (err) {
			if (!scopedRequest.isCurrent()) return false;
			error = toUserMessage(err, 'No se pudo cargar el almacén');
			return false;
		} finally {
			scopedRequest.release();
			if (scopedRequest.isCurrent()) loading = false;
		}
	}

	async function loadBinsForZone(zoneId: number | null, page = 1) {
		if (!includeBins) return false;
		selectedZoneId = zoneId;
		const requestVersion = ++binsRequestVersion;
		const scopedRequest = beginWarehouseScopedRequest();
		binsLoading = true;
		error = null;
		try {
			if (zoneId != null && includeZones) assertZoneBelongsToWarehouse(zoneId, warehouseId, zones);
			const result: BinPage = await deps.listBins.execute({
				warehouseId, ...(zoneId != null ? { zoneId } : {}), ...(binTypeFilter ? { binType: binTypeFilter } : {}), page, perPage: binPerPage,
				...(binSearch.trim() ? { q: binSearch.trim() } : {})
			});
			if (requestVersion !== binsRequestVersion || !scopedRequest.isCurrent()) return false;
			if (result.items.some((bin) => bin.warehouseId !== warehouseId || (zoneId != null && bin.zoneId !== zoneId))) {
				throw new Error('The bins response contains a bin from another warehouse or outside the selected zone');
			}
			bins = result.items; binPage = result.page; binPages = result.pages;
			binTotal = result.total; binPerPage = result.perPage;
			return true;
		} catch (err) {
			if (requestVersion !== binsRequestVersion || !scopedRequest.isCurrent()) return false;
			error = toUserMessage(err, 'No se pudieron cargar los bins');
			bins = []; binTotal = 0;
			return false;
		} finally {
			scopedRequest.release();
			if (requestVersion === binsRequestVersion && scopedRequest.isCurrent()) binsLoading = false;
		}
	}

	async function searchBins(value: string) { binSearch = value; return loadBinsForZone(selectedZoneId, 1); }
	async function filterBinsByType(value: string) {
		binTypeFilter = value === 'Staging' || value === 'PickableStaging' || value === 'Pickable' ? value : null;
		return loadBinsForZone(selectedZoneId, 1);
	}
	async function createZone(input: Omit<CreateZoneInput, 'warehouseId'>) {
		return mutate(async () => { await deps.createZone.execute({ ...input, warehouseId }); await refreshZones(); }, 'No se pudo crear la zona');
	}
	async function updateZone(input: UpdateZoneInput) {
		return mutate(async () => {
			assertZoneBelongsToWarehouse(input.id, warehouseId, zones);
			await deps.updateZone.execute(input);
			await refreshZones();
		}, 'No se pudo actualizar la zona');
	}
	async function removeZone(id: number) {
		return mutate(async () => {
			assertZoneBelongsToWarehouse(id, warehouseId, zones);
			await deps.deleteZone.execute(id); await refreshZones();
			if (selectedZoneId === id && includeBins) await loadBinsForZone(null, 1);
		}, 'No se pudo eliminar la zona');
	}
	async function createBin(input: Omit<CreateBinInput, 'warehouseId'>) {
		return mutate(async () => {
			assertZoneBelongsToWarehouse(input.zoneId, warehouseId, zones);
			await deps.createBin.execute({ ...input, warehouseId });
			await loadBinsForZone(selectedZoneId, 1);
		}, 'No se pudo crear el bin');
	}
	async function updateBin(input: UpdateBinInput) {
		return mutate(async () => {
			findLoadedBin(input.id);
			if (input.zoneId !== undefined && includeZones) assertZoneBelongsToWarehouse(input.zoneId, warehouseId, zones);
			else if (input.zoneId !== undefined && !includeZones) throw new Error('Zone changes require the Zones permission');
			await deps.updateBin.execute(input);
			await loadBinsForZone(selectedZoneId, binPage);
		}, 'No se pudo actualizar el bin');
	}
	async function removeBin(id: number) {
		return mutate(async () => { findLoadedBin(id); await deps.deleteBin.execute(id); selectedBinDetail = null; await loadBinsForZone(selectedZoneId, binPage); }, 'No se pudo eliminar el bin');
	}
	async function viewBin(id: number) {
		const requestVersion = ++binDetailRequestVersion;
		error = null;
		selectedBinDetail = null;
		const scopedRequest = beginWarehouseScopedRequest();
		try {
			const detail = await deps.getBinDetail.execute(id);
			if (requestVersion !== binDetailRequestVersion || !scopedRequest.isCurrent()) return false;
			assertBinBelongsToWarehouse(detail.bin, 'bin detail');
			selectedBinDetail = detail;
			return true;
		} catch (err) {
			if (requestVersion !== binDetailRequestVersion || !scopedRequest.isCurrent()) return false;
			error = toUserMessage(err, 'No se pudo cargar el detalle del bin');
			selectedBinDetail = null;
			return false;
		} finally { scopedRequest.release(); }
	}
	async function exportAllBins(): Promise<Bin[]> {
		const all: Bin[] = []; let page = 1; let pages = 1;
		const scopedRequest = beginWarehouseScopedRequest();
		try { do {
			const result = await deps.listBins.execute({
				warehouseId, ...(selectedZoneId != null ? { zoneId: selectedZoneId } : {}),
				...(binTypeFilter ? { binType: binTypeFilter } : {}),
				page, perPage: 1000, ...(binSearch.trim() ? { q: binSearch.trim() } : {})
			});
			if (!scopedRequest.isCurrent()) throw new Error('Warehouse context changed during bin export');
			if (result.items.some((bin) => bin.warehouseId !== warehouseId || (selectedZoneId != null && bin.zoneId !== selectedZoneId))) {
				throw new Error('The bins export contains a bin outside the active warehouse or zone');
			}
			all.push(...result.items); pages = result.pages; page += 1;
		} while (page <= pages);
		return all;
		} finally { scopedRequest.release(); }
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
		get binPerPage() { return binPerPage; }, get binSearch() { return binSearch; }, get binTypeFilter() { return binTypeFilter; },
		get selectedZoneId() { return selectedZoneId; }, get selectedBinDetail() { return selectedBinDetail; },
		get loading() { return loading; }, get binsLoading() { return binsLoading; },
		get mutating() { return mutating; }, get error() { return error; },
		clearError() { error = null; }, setError(message: string) { error = message; }, closeBinDetail() { binDetailRequestVersion += 1; selectedBinDetail = null; },
		load, loadBinsForZone, searchBins, filterBinsByType, createZone, updateZone, removeZone,
		createBin, updateBin, removeBin, viewBin, exportAllBins
	};
}
