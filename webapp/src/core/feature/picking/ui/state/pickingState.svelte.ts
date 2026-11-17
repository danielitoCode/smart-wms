import { createPickingDependencies } from '../../di/picking.dependencies';
import type { WarehouseSelectionState } from '../../../warehouses/ui/state/warehouseSelectionState.svelte';
import type { ActiveBatch, CreateBatchResult, PickTask, WaveCreateResult, WaveValidateResult } from '../../domain/entity/Picking';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createPickingDependencies();

export function createPickingState(warehouseSelection: WarehouseSelectionState) {
	let batch = $state<ActiveBatch | null>(null);
	let task = $state<PickTask | null>(null);
	let scannedBarcode = $state('');
	let quantityPicked = $state(1);
	let loading = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let info = $state<string | null>(null);
	let validateBarcode = $state('');
	let validateResult = $state<WaveValidateResult | null>(null);
	let validatedSoIds = $state<number[]>([]);
	let soIdsInput = $state('');
	let waveResult = $state<WaveCreateResult | null>(null);
	let batchIdentifiersInput = $state('');
	let createBatchResult = $state<CreateBatchResult | null>(null);

	function activeWarehouseId() {
		return warehouseSelection.requireWarehouseId();
	}

	async function refresh() {
		if (loading || busy) return false;
		loading = true;
		let requestedWarehouseId: number | null = null;
		error = null;
		info = null;
		try {
			const warehouseId = activeWarehouseId();
			requestedWarehouseId = warehouseId;
			batch = await deps.getActiveBatch.execute(warehouseId);
			if (batch.active && batch.batchId) {
				if (batch.warehouseId !== warehouseId) {
					throw new Error('El lote activo no pertenece al almacén seleccionado');
				}
				task = await deps.getNextTask.execute(batch.batchId);
				if (task) {
					quantityPicked = task.quantityToPick;
					scannedBarcode = task.upc ?? '';
				} else {
					info = 'Todas las tareas del batch están completas';
				}
			} else {
				batch = null;
				task = null;
				info = 'No hay batch activo de picking en este almacén';
			}
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el batch');
			batch = null;
			task = null;
			return false;
		} finally {
			loading = false;
			if (requestedWarehouseId != null && warehouseSelection.warehouseId !== requestedWarehouseId) void refresh();
		}
	}

	async function validateWaveSo() {
		if (busy || loading) return false;
		if (!validateBarcode.trim()) { error = 'Indica un SO barcode'; return false; }
		busy = true; error = null; validateResult = null;
		try {
			const result = await deps.waveValidate.execute(validateBarcode.trim(), activeWarehouseId());
			validateResult = result;
			if (result.valid && result.kind === 'TO') {
				info = `TO ${result.toNumber ?? validateBarcode.trim()} validada · lote ${result.batchNumber ?? result.batchId ?? 'activo'} · continúa con las tareas del lote`;
			} else if (result.valid && result.soId != null && !validatedSoIds.includes(result.soId)) {
				validatedSoIds = [...validatedSoIds, result.soId];
				soIdsInput = validatedSoIds.join(', ');
			}
			if (!result.valid) error = result.error ?? result.message ?? 'Pedido no válido para picking';
			else if (result.kind !== 'TO') info = `SO ${result.soNumber} válida · líneas ${result.lineCount ?? 0} · unidades ${result.totalUnits ?? 0}`;
			return result.valid;
		} catch (err) { error = toUserMessage(err, 'No se pudo validar el SO'); return false; }
		finally { busy = false; }
	}

	function clearValidated() {
		validatedSoIds = []; soIdsInput = ''; validateResult = null; validateBarcode = '';
	}

	async function createWave() {
		if (busy || loading) return false;
		const soIds = soIdsInput.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)
			.map(Number).filter(n => Number.isInteger(n) && n > 0);
		if (!soIds.length) { error = 'Selecciona al menos un pedido validado'; return false; }
		busy = true; error = null; waveResult = null; info = null;
		try {
			waveResult = await deps.waveCreate.execute(soIds, activeWarehouseId());
			info = `Wave ${waveResult.batchNumber} · ${waveResult.totalUnits} unidades · ${waveResult.totalPicks} tareas`;
			clearValidated();
			return true;
		} catch (err) { error = toUserMessage(err, 'No se pudo crear el wave'); return false; }
		finally { busy = false; await refresh(); }
	}

	async function createBatch() {
		if (busy || loading) return false;
		const identifiers = batchIdentifiersInput.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
		if (!identifiers.length) { error = 'Indica al menos un pedido'; return false; }
		busy = true; error = null; createBatchResult = null; info = null;
		try {
			createBatchResult = await deps.createBatch.execute(identifiers, activeWarehouseId());
			info = `Batch ${createBatchResult.batchNumber} (#${createBatchResult.batchId}) · pedidos ${createBatchResult.totalOrders}`;
			batchIdentifiersInput = '';
			return true;
		} catch (err) { error = toUserMessage(err, 'No se pudo crear el batch'); return false; }
		finally { busy = false; await refresh(); }
	}

	async function confirm() {
		if (!task || busy || loading) return false;
		if (!scannedBarcode.trim()) { error = 'Indica el barcode escaneado'; return false; }
		if (!Number.isInteger(quantityPicked) || quantityPicked <= 0) { error = 'quantity_picked debe ser un entero > 0'; return false; }
		busy = true; error = null; info = null;
		try {
			const result = await deps.confirmPick.execute({ pickTaskId: task.pickTaskId, warehouseId: activeWarehouseId(), scannedBarcode: scannedBarcode.trim(), quantityPicked });
			info = result.message;
			return true;
		} catch (err) { error = toUserMessage(err, 'No se pudo confirmar el pick'); return false; }
		finally { busy = false; await refresh(); }
	}

	async function shortPick() {
		if (!task || busy || loading) return false;
		busy = true; error = null; info = null;
		try {
			const result = await deps.shortPick.execute({ pickTaskId: task.pickTaskId, warehouseId: activeWarehouseId(), quantityAvailable: 0 });
			info = result.message; return true;
		} catch (err) { error = toUserMessage(err, 'No se pudo reportar short'); return false; }
		finally { busy = false; await refresh(); }
	}

	async function completeBatch() {
		if (!batch?.batchId || busy || loading) return false;
		busy = true; error = null;
		try {
			const result = await deps.completeBatch(batch.batchId, activeWarehouseId());
			info = result.message; return true;
		} catch (err) { error = toUserMessage(err, 'No se pudo completar el batch'); return false; }
		finally { busy = false; await refresh(); }
	}

	return {
		get batch() { return batch; }, get task() { return task; },
		get scannedBarcode() { return scannedBarcode; }, get quantityPicked() { return quantityPicked; },
		get loading() { return loading; }, get busy() { return busy; },
		get error() { return error; }, get info() { return info; },
		get warehouseId() { return warehouseSelection.warehouseId; },
		get soIdsInput() { return soIdsInput; }, get waveResult() { return waveResult; },
		get validateBarcode() { return validateBarcode; }, get validateResult() { return validateResult; },
		get validatedSoIds() { return validatedSoIds; },
		get batchIdentifiersInput() { return batchIdentifiersInput; },
		get createBatchResult() { return createBatchResult; },
		setScannedBarcode: (v: string) => scannedBarcode = v,
		setQuantityPicked: (v: number) => quantityPicked = v,
		setSoIdsInput: (v: string) => soIdsInput = v,
		setValidateBarcode: (v: string) => validateBarcode = v,
		setBatchIdentifiersInput: (v: string) => batchIdentifiersInput = v,
		refresh, validateWaveSo, clearValidated, createWave, createBatch, confirm, shortPick, completeBatch
	};
}
