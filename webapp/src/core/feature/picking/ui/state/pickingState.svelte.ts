import { createPickingDependencies } from '../../di/picking.dependencies';
import type {
	ActiveBatch,
	CreateBatchResult,
	PickTask,
	WaveCreateResult,
	WaveValidateResult
} from '../../domain/entity/Picking';
import { authSession } from '../../../../infrastructure/auth/AuthSession';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createPickingDependencies();

export function createPickingState() {
	const defaultWh = authSession.getUser()?.warehouseIds?.[0] ?? 1;

	let batch = $state<ActiveBatch | null>(null);
	let task = $state<PickTask | null>(null);
	let scannedBarcode = $state('');
	let quantityPicked = $state(1);
	let loading = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let info = $state<string | null>(null);

	let warehouseId = $state(defaultWh);

	// Wave validate — accumulate validated SO ids for wave-create
	let validateBarcode = $state('');
	let validateResult = $state<WaveValidateResult | null>(null);
	let validatedSoIds = $state<number[]>([]);

	// Wave create
	let soIdsInput = $state('');
	let waveResult = $state<WaveCreateResult | null>(null);

	// Create-batch (SO identifiers / barcodes)
	let batchIdentifiersInput = $state('');
	let createBatchResult = $state<CreateBatchResult | null>(null);

	async function refresh() {
		if (loading) return false;
		loading = true;
		error = null;
		info = null;
		try {
			batch = await deps.getActiveBatch.execute();
			if (batch.active && batch.batchId) {
				task = await deps.getNextTask.execute(batch.batchId);
				if (task) {
					quantityPicked = task.quantityToPick;
					scannedBarcode = task.upc ?? '';
				} else {
					info = 'Todas las tareas del batch estan completas';
				}
			} else {
				task = null;
				info = 'No hay batch activo de picking';
			}
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el batch');
			batch = null;
			task = null;
		} finally {
			loading = false;
		}
	}

	async function validateWaveSo() {
		if (busy || loading) return false;
		if (!validateBarcode.trim()) {
			error = 'Indica un SO barcode';
			return false;
		}
		busy = true;
		error = null;
		validateResult = null;
		try {
			const result = await deps.waveValidate.execute(validateBarcode, warehouseId);
			validateResult = result;
			if (result.valid && result.soId != null && !validatedSoIds.includes(result.soId)) {
				validatedSoIds = [...validatedSoIds, result.soId];
				soIdsInput = validatedSoIds.join(', ');
			}
			if (!result.valid) {
				error = result.error ?? result.message ?? 'SO no valida para wave';
			} else {
				info = `SO ${result.soNumber} valida · lineas ${result.lineCount ?? 0} · unidades ${result.totalUnits ?? 0}`;
			}
			return result.valid;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo validar el SO');
			return false;
		} finally {
			busy = false;
		}
	}

	function clearValidated() {
		validatedSoIds = [];
		soIdsInput = '';
		validateResult = null;
		validateBarcode = '';
	}

	async function createWave() {
		if (busy || loading) return false;
		const soIds = soIdsInput
			.split(/[\s,;]+/)
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => Number(s))
			.filter((n) => Number.isInteger(n) && n > 0);

		busy = true;
		error = null;
		waveResult = null;
		info = null;
		try {
			waveResult = await deps.waveCreate.execute(soIds, warehouseId);
			info = `Wave batch #${waveResult.batchId} (${waveResult.batchStatus})`;
			clearValidated();
			await refresh();
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo crear el wave');
			return false;
		} finally {
			busy = false;
		}
	}

	async function createBatch() {
		if (busy || loading) return false;
		const identifiers = batchIdentifiersInput
			.split(/[\s,;]+/)
			.map((s) => s.trim())
			.filter(Boolean);

		busy = true;
		error = null;
		createBatchResult = null;
		info = null;
		try {
			createBatchResult = await deps.createBatch.execute(identifiers, warehouseId);
			info = `Batch ${createBatchResult.batchNumber} (#${createBatchResult.batchId}) · orders ${createBatchResult.totalOrders}`;
			batchIdentifiersInput = '';
			await refresh();
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo crear el batch');
			return false;
		} finally {
			busy = false;
		}
	}

	async function confirm() {
		if (!task || busy || loading) return false;
		if (!scannedBarcode.trim()) {
			error = 'Indica el barcode escaneado';
			return false;
		}
		if (!Number.isInteger(quantityPicked) || quantityPicked <= 0) {
			error = 'quantity_picked debe ser un entero > 0';
			return false;
		}
		busy = true;
		error = null;
		info = null;
		try {
			const result = await deps.confirmPick.execute({
				pickTaskId: task.pickTaskId,
				scannedBarcode,
				quantityPicked
			});
			info = result.message;
			await refresh();
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo confirmar el pick');
			return false;
		} finally {
			busy = false;
		}
	}

	async function shortPick() {
		if (!task || busy || loading) return false;
		busy = true;
		error = null;
		info = null;
		try {
			const result = await deps.shortPick.execute({
				pickTaskId: task.pickTaskId,
				quantityAvailable: 0
			});
			info = result.message;
			await refresh();
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo reportar short');
			return false;
		} finally {
			busy = false;
		}
	}

	async function completeBatch() {
		if (!batch?.batchId || busy || loading) return false;
		busy = true;
		error = null;
		try {
			const result = await deps.completeBatch(batch.batchId);
			info = result.message;
			await refresh();
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo completar el batch');
			return false;
		} finally {
			busy = false;
		}
	}

	return {
		get batch() {
			return batch;
		},
		get task() {
			return task;
		},
		get scannedBarcode() {
			return scannedBarcode;
		},
		get quantityPicked() {
			return quantityPicked;
		},
		get loading() {
			return loading;
		},
		get busy() {
			return busy;
		},
		get error() {
			return error;
		},
		get info() {
			return info;
		},
		get warehouseId() {
			return warehouseId;
		},
		get soIdsInput() {
			return soIdsInput;
		},
		get waveResult() {
			return waveResult;
		},
		get validateBarcode() {
			return validateBarcode;
		},
		get validateResult() {
			return validateResult;
		},
		get validatedSoIds() {
			return validatedSoIds;
		},
		get batchIdentifiersInput() {
			return batchIdentifiersInput;
		},
		get createBatchResult() {
			return createBatchResult;
		},
		setScannedBarcode: (v: string) => {
			scannedBarcode = v;
		},
		setQuantityPicked: (v: number) => {
			quantityPicked = v;
		},
		setWarehouseId: (v: number) => {
			warehouseId = v;
		},
		setSoIdsInput: (v: string) => {
			soIdsInput = v;
		},
		setValidateBarcode: (v: string) => {
			validateBarcode = v;
		},
		setBatchIdentifiersInput: (v: string) => {
			batchIdentifiersInput = v;
		},
		refresh,
		validateWaveSo,
		clearValidated,
		createWave,
		createBatch,
		confirm,
		shortPick,
		completeBatch
	};
}
