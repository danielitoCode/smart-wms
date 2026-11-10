import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { Bin, Warehouse, Zone } from '../../domain/entity/Warehouse';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createWarehousesDependencies();

/**
 * Detail state for a single warehouse (zones + bins).
 * Compatible with WarehouseDetailScreen: createWarehouseDetailState(warehouseId).
 */
export function createWarehouseDetailState(warehouseId: number) {
	let warehouse = $state<Warehouse | null>(null);
	let zones = $state<Zone[]>([]);
	let bins = $state<Bin[]>([]);
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
			await loadBinsForZone(null);
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el almacén');
			return false;
		} finally {
			loading = false;
		}
	}

	async function loadBinsForZone(zoneId: number | null) {
		if (binsLoading) return false;
		selectedZoneId = zoneId;
		binsLoading = true;
		try {
			bins = await deps.listBins.execute({
				warehouseId,
				...(zoneId != null ? { zoneId } : {})
			});
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudieron cargar los bins');
			bins = [];
			return false;
		} finally {
			binsLoading = false;
		}
	}

	return {
		get warehouse() {
			return warehouse;
		},
		get zones() {
			return zones;
		},
		get bins() {
			return bins;
		},
		get selectedZoneId() {
			return selectedZoneId;
		},
		get loading() {
			return loading;
		},
		get binsLoading() {
			return binsLoading;
		},
		get error() {
			return error;
		},
		load,
		loadBinsForZone
	};
}
