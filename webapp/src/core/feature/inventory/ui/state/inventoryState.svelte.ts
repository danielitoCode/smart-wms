import { createInventoryDependencies } from '../../di/inventory.dependencies';
import type { InventoryStock } from '../../domain/entity/InventoryStock';

const deps = createInventoryDependencies();

/**
 * UI state for inventory overview (Svelte 5 runes).
 * Loads data through the domain use case — no direct HTTP from the UI.
 */
export function createInventoryOverviewState() {
	let items = $state<InventoryStock[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load(warehouseId?: number) {
		loading = true;
		error = null;
		try {
			items = await deps.getInventoryOverview.execute({ warehouseId });
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo cargar el inventario';
			items = [];
		} finally {
			loading = false;
		}
	}

	return {
		get items() {
			return items;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		load
	};
}
