import { createPutawayDependencies, type PutawayDependencies } from '../../di/putaway.dependencies';
import type { ConfirmPutawayResult, PendingPutawayItem, StagingBinSummary, PutawaySuggestion } from '../../domain/entity/Putaway';
import { authSession } from '../../../../infrastructure/auth/AuthSession';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

export function createPutawayState(dependencies: PutawayDependencies = createPutawayDependencies()) {
	const defaultWh = authSession.getUser()?.warehouseIds?.[0] ?? 1;
	let warehouseId = $state(defaultWh);
	let items = $state<PendingPutawayItem[]>([]);
	let stagingBins = $state<StagingBinSummary[]>([]);
	let toBinByKey = $state<Record<string, string>>({});
	let toBarcodeByKey = $state<Record<string, string>>({});
	let suggestions = $state<Record<string, PutawaySuggestion>>({});
	let loading = $state(false);
	let submittingKey = $state<string | null>(null);
	let error = $state<string | null>(null);
	let feedback = $state<string | null>(null);
	let lastResult = $state<ConfirmPutawayResult | null>(null);
	let loadedOnce = $state(false);

	function keyOf(item: PendingPutawayItem) { return String(item.inventoryId); }

	async function load() {
		if (loading || submittingKey != null) return false;
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			error = 'warehouseId debe ser un entero positivo';
			return false;
		}
		loading = true;
		error = null;
		feedback = null;
		lastResult = null;
		try {
			const [pending, summary] = await Promise.all([
				dependencies.listPending.execute(warehouseId),
				dependencies.stagingSummary.execute(warehouseId)
			]);
			items = pending;
			stagingBins = summary;
			toBinByKey = Object.fromEntries(pending.filter(item => item.suggestedBin).map(item => [keyOf(item), String(item.suggestedBin!.binId)]));
			toBarcodeByKey = {};
			loadedOnce = true;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar la mercancía pendiente de ubicación');
			items = [];
			stagingBins = [];
			return false;
		} finally {
			loading = false;
		}
	}

	function setWarehouseId(value: number) {
		warehouseId = Number.isFinite(value) ? Math.trunc(value) : 0;
	}
	function setToBin(item: PendingPutawayItem, value: string) {
		toBinByKey = { ...toBinByKey, [keyOf(item)]: value };
	}
	function setToBarcode(item: PendingPutawayItem, value: string) {
		toBarcodeByKey = { ...toBarcodeByKey, [keyOf(item)]: value };
	}

	async function suggest(item: PendingPutawayItem) {
		error = null;
		try {
			const result = await dependencies.suggestDestination.execute(item.itemId);
			suggestions = { ...suggestions, [keyOf(item)]: result };
			const bin = result.suggestedBin;
			if (bin) {
				toBinByKey = { ...toBinByKey, [keyOf(item)]: String(bin.binId) };
				feedback = 'Destino sugerido actualizado: ' + bin.binCode;
			} else {
				const remaining = { ...toBinByKey };
				delete remaining[keyOf(item)];
				toBinByKey = remaining;
				feedback = 'No existe una ubicación preferida o predeterminada válida para este producto';
			}
			return result;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo obtener la sugerencia de ubicación');
			return null;
		}
	}

	async function updatePreferred(item: PendingPutawayItem) {
		const suggestion = suggestions[keyOf(item)];
		const binId = suggestion ? suggestion.suggestedBin?.binId : item.suggestedBin?.binId;
		if (!binId) {
			error = 'No hay una ubicación Pickable sugerida para establecer como preferida';
			return false;
		}
		try {
			const result = await dependencies.updatePreferredBin.execute(item.itemId, binId);
			await load();
			feedback = result.message;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo actualizar la ubicación preferida');
			return false;
		}
	}

	async function confirm(item: PendingPutawayItem) {
		if (loading || submittingKey != null) return false;
		const k = keyOf(item);
		const barcode = toBarcodeByKey[k]?.trim();
		const toBinId = Number(toBinByKey[k]);
		if (!barcode && (!Number.isInteger(toBinId) || toBinId <= 0)) {
			error = 'Escanea el código de barras del destino o selecciona una ubicación válida';
			return false;
		}
		if (!barcode && toBinId === item.binId) {
			error = 'El bin destino debe ser distinto del origen (' + item.binCode + ')';
			return false;
		}
		submittingKey = k;
		error = null;
		feedback = null;
		try {
			const result = await dependencies.confirm.execute({
				itemId: item.itemId,
				...(item.binBarcode ? { fromBinBarcode: item.binBarcode } : { fromBinId: item.binId }),
				...(barcode ? { toBinBarcode: barcode } : { toBinId }),
				quantity: item.quantity,
				lotNumber: item.lotNumber
			});
			submittingKey = null;
			await load();
			lastResult = result;
			feedback = 'Put-away completado: ' + result.item + ' · ' + result.fromBin + ' → ' + result.toBin;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo confirmar el put-away');
			return false;
		} finally {
			submittingKey = null;
		}
	}

	return {
		get warehouseId() { return warehouseId; },
		get items() { return items; },
		get stagingBins() { return stagingBins; },
		get toBinByKey() { return toBinByKey; },
		get toBarcodeByKey() { return toBarcodeByKey; },
		get suggestions() { return suggestions; },
		get loading() { return loading; },
		get submittingKey() { return submittingKey; },
		get error() { return error; },
		get feedback() { return feedback; },
		get lastResult() { return lastResult; },
		get loadedOnce() { return loadedOnce; },
		setWarehouseId, setToBin, setToBarcode, load, confirm, suggest, updatePreferred, keyOf
	};
}
