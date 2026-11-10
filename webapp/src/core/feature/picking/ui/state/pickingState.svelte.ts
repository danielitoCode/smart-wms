import { createPickingDependencies } from '../../di/picking.dependencies';
import type { ActiveBatch, PickTask, WaveCreateResult } from '../../domain/entity/Picking';
import { authSession } from '../../../../infrastructure/auth/AuthSession';

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
	let soIdsInput = $state('');
	let waveResult = $state<WaveCreateResult | null>(null);

	async function refresh() {
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
					info = 'Todas las tareas del batch están completas';
				}
			} else {
				task = null;
				info = 'No hay batch activo de picking';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo cargar el batch';
			batch = null;
			task = null;
		} finally {
			loading = false;
		}
	}

	async function createWave() {
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
			await refresh();
			return true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo crear el wave';
			return false;
		} finally {
			busy = false;
		}
	}

	async function confirm() {
		if (!task) return false;
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
			error = err instanceof Error ? err.message : 'No se pudo confirmar el pick';
			return false;
		} finally {
			busy = false;
		}
	}

	async function shortPick() {
		if (!task) return false;
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
			error = err instanceof Error ? err.message : 'No se pudo reportar short';
			return false;
		} finally {
			busy = false;
		}
	}

	async function completeBatch() {
		if (!batch?.batchId) return false;
		busy = true;
		error = null;
		try {
			const result = await deps.completeBatch(batch.batchId);
			info = result.message;
			await refresh();
			return true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo completar el batch';
			return false;
		} finally {
			busy = false;
		}
	}

	return {
		get batch() { return batch; },
		get task() { return task; },
		get scannedBarcode() { return scannedBarcode; },
		get quantityPicked() { return quantityPicked; },
		get loading() { return loading; },
		get busy() { return busy; },
		get error() { return error; },
		get info() { return info; },
		get warehouseId() { return warehouseId; },
		get soIdsInput() { return soIdsInput; },
		get waveResult() { return waveResult; },
		setScannedBarcode: (v: string) => { scannedBarcode = v; },
		setQuantityPicked: (v: number) => { quantityPicked = v; },
		setWarehouseId: (v: number) => { warehouseId = v; },
		setSoIdsInput: (v: string) => { soIdsInput = v; },
		refresh,
		createWave,
		confirm,
		shortPick,
		completeBatch
	};
}
