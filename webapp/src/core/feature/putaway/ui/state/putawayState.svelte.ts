import { createPutawayDependencies } from '../../di/putaway.dependencies';
import type { ConfirmPutawayResult, PendingPutawayItem } from '../../domain/entity/Putaway';
import { authSession } from '../../../../infrastructure/auth/AuthSession';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createPutawayDependencies();

export function createPutawayState() {
	const defaultWh = authSession.getUser()?.warehouseIds?.[0] ?? 1;

	let warehouseId = $state(defaultWh);
	let items = $state<PendingPutawayItem[]>([]);
	let toBinByKey = $state<Record<string, string>>({});
	let loading = $state(false);
	let submittingKey = $state<string | null>(null);
	let error = $state<string | null>(null);
	let lastResult = $state<ConfirmPutawayResult | null>(null);
	let loadedOnce = $state(false);

	function keyOf(item: PendingPutawayItem) {
		return `${item.inventoryId}-${item.binId}`;
	}

	async function load() {
		if (loading || submittingKey != null) return false;
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			error = 'warehouseId debe ser un entero positivo';
			return false;
		}
		loading = true;
		error = null;
		lastResult = null;
		try {
			items = await deps.listPending.execute(warehouseId);
			toBinByKey = {};
			loadedOnce = true;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el putaway pendiente');
			items = [];
			return false;
		} finally {
			loading = false;
		}
	}

	function setWarehouseId(value: number) {
		warehouseId = Number.isFinite(value) ? Math.trunc(value) : 1;
	}

	function setToBin(item: PendingPutawayItem, value: string) {
		toBinByKey = { ...toBinByKey, [keyOf(item)]: value };
	}

	async function confirm(item: PendingPutawayItem) {
		if (loading || submittingKey != null) return false;
		const k = keyOf(item);
		const toBinId = Number(toBinByKey[k]);
		if (!Number.isInteger(toBinId) || toBinId <= 0) {
			error = `Bin destino inválido para ${item.sku}`;
			return false;
		}
		if (toBinId === item.binId) {
			error = `El bin destino debe ser distinto del origen (${item.binCode})`;
			return false;
		}
		submittingKey = k;
		error = null;
		try {
			lastResult = await deps.confirm.execute({
				itemId: item.itemId,
				fromBinId: item.binId,
				toBinId,
				quantity: item.quantity,
				lotNumber: item.lotNumber
			});
			await load();
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo confirmar el putaway');
			return false;
		} finally {
			submittingKey = null;
		}
	}

	return {
		get warehouseId() {
			return warehouseId;
		},
		get items() {
			return items;
		},
		get toBinByKey() {
			return toBinByKey;
		},
		get loading() {
			return loading;
		},
		get submittingKey() {
			return submittingKey;
		},
		get error() {
			return error;
		},
		get lastResult() {
			return lastResult;
		},
		get loadedOnce() {
			return loadedOnce;
		},
		setWarehouseId,
		setToBin,
		load,
		confirm,
		keyOf
	};
}
