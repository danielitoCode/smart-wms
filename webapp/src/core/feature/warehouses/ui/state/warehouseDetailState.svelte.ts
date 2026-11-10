import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { Bin, Warehouse, Zone } from '../../domain/entity/Warehouse';

const deps = createWarehousesDependencies();

export function createWarehouseDetailState(warehouseId: number) {
	let warehouse = $state<Warehouse | null>(null);
	let zones = $state<Zone[]>([]);
	let bins = $state<Bin[]>([]);
	let selectedZoneId = $state<number | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			const [wh, zoneRows, binRows] = await Promise.all([
				deps.getWarehouse.execute(warehouseId).catch(async () => {
					const list = await deps.listWarehouses.execute();
					const found = list.find((w) => w.id === warehouseId);
					if (!found) throw new Error('Almacén no encontrado');
					return found;
				}),
				deps.listZones.execute(warehouseId),
				deps.listBins.execute({ warehouseId })
			]);
			warehouse = wh;
			zones = zoneRows;
			bins = binRows;
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo cargar el almacén';
			warehouse = null;
			zones = [];
			bins = [];
		} finally {
			loading = false;
		}
	}

	function selectZone(zoneId: number | null) {
		selectedZoneId = zoneId;
	}

	async function loadBinsForZone(zoneId: number | null) {
		selectedZoneId = zoneId;
		loading = true;
		error = null;
		try {
			bins = await deps.listBins.execute({
				warehouseId,
				zoneId: zoneId ?? undefined
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudieron cargar los bins';
			bins = [];
		} finally {
			loading = false;
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
		get error() {
			return error;
		},
		load,
		selectZone,
		loadBinsForZone
	};
}
