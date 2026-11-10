import { createInventoryDependencies } from '../../di/inventory.dependencies';
import type { InventoryStock } from '../../domain/entity/InventoryStock';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { authSession } from '../../../../infrastructure/auth/AuthSession';

const deps = createInventoryDependencies();

/**
 * UI state for inventory overview (Svelte 5 runes).
 * Loads data through the domain use case — no direct HTTP from the UI.
 */
export function createInventoryOverviewState() {
	const defaultWh = authSession.getUser()?.warehouseIds?.[0];

	let items = $state<InventoryStock[]>([]);
	let warehouseId = $state<number | undefined>(defaultWh);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let loadedOnce = $state(false);

	async function load(overrideWarehouseId?: number) {
		if (loading) return false;
		if (overrideWarehouseId !== undefined) {
			warehouseId =
				Number.isInteger(overrideWarehouseId) && overrideWarehouseId > 0
					? overrideWarehouseId
					: undefined;
		}
		loading = true;
		error = null;
		try {
			items = await deps.getInventoryOverview.execute({
				warehouseId: warehouseId
			});
			loadedOnce = true;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el inventario');
			items = [];
			return false;
		} finally {
			loading = false;
		}
	}

	return {
		get items() {
			return items;
		},
		get warehouseId() {
			return warehouseId;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get loadedOnce() {
			return loadedOnce;
		},
		setWarehouseId: (v: number | undefined) => {
			warehouseId = v;
		},
		load
	};
}
