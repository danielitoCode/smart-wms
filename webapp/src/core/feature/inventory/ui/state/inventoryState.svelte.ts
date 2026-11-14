import { getContext } from 'svelte';
import { createInventoryDependencies } from '../../di/inventory.dependencies';
import type { InventoryStock } from '../../domain/entity/InventoryStock';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { beginWarehouseScopedRequest } from '../../../../infrastructure/warehouse/WarehouseRequestScope';
import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';

const deps = createInventoryDependencies();

function isAbort(err: unknown): boolean {
	return (
		(err instanceof DOMException && err.name === 'AbortError') ||
		(err instanceof Error && /abort/i.test(err.message))
	);
}

/**
 * Inventory overview state (F0.3).
 * Binds to warehouseSelection when present; drops stale responses after warehouse switch.
 */
export function createInventoryOverviewState() {
	const warehouseSelection = getContext<WarehouseSelectionState | undefined>('warehouseSelection');

	let items = $state<InventoryStock[]>([]);
	let warehouseId = $state<number | undefined>(warehouseSelection?.warehouseId ?? undefined);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let loadedOnce = $state(false);

	async function load(overrideWarehouseId?: number) {
		if (loading) return false;
		const scope = warehouseSelection?.beginScopedRequest() ?? beginWarehouseScopedRequest();

		if (overrideWarehouseId !== undefined) {
			warehouseId =
				Number.isInteger(overrideWarehouseId) && overrideWarehouseId > 0
					? overrideWarehouseId
					: undefined;
		} else if (warehouseSelection?.warehouseId != null) {
			try {
				warehouseId = warehouseSelection.requireWarehouseId();
			} catch {
				warehouseId = warehouseSelection.warehouseId ?? undefined;
			}
		}

		loading = true;
		error = null;
		try {
			const data = await deps.getInventoryOverview.execute({ warehouseId });
			if (!scope.isCurrent()) return false;
			items = data;
			loadedOnce = true;
			return true;
		} catch (err) {
			if (!scope.isCurrent() || isAbort(err)) return false;
			error = toUserMessage(err, 'No se pudo cargar el inventario');
			items = [];
			return false;
		} finally {
			scope.release();
			if (scope.isCurrent()) loading = false;
		}
	}

	function invalidate() {
		items = [];
		loadedOnce = false;
		error = null;
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
		get generation() {
			return warehouseSelection?.generation ?? 0;
		},
		setWarehouseId: (v: number | undefined) => {
			warehouseId = v;
		},
		load,
		invalidate
	};
}
