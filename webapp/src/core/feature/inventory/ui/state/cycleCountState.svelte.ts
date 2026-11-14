import { createInventoryDependencies } from '../../di/inventory.dependencies';
import type {
	CycleCountDetail,
	CycleCountSubmitResult,
	CycleCountSummary
} from '../../domain/entity/CycleCount';
import { canSubmitCycleCount } from '../../domain/entity/CycleCount';
import { authSession } from '../../../../infrastructure/auth/AuthSession';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createInventoryDependencies();

export function createCycleCountState() {
	const defaultWh = authSession.getUser()?.warehouseIds?.[0] ?? 1;

	let warehouseId = $state(defaultWh);
	let binIdsInput = $state('');
	let created = $state<CycleCountSummary[]>([]);
	let selectedCountId = $state<number | null>(null);
	let detail = $state<CycleCountDetail | null>(null);
	/** Counted quantities keyed by snapshot countLineId. */
	let countsByLine = $state<Record<number, number>>({});
	let submitResult = $state<CycleCountSubmitResult | null>(null);

	let loading = $state(false);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let info = $state<string | null>(null);

	async function create() {
		if (busy || loading) return false;
		if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
			error = 'warehouseId debe ser un entero positivo';
			return false;
		}
		const rawBinIds = binIdsInput
			.split(/[\\s,;]+/)
			.map((value) => value.trim())
			.filter(Boolean);
		const binIds = rawBinIds.map(Number);
		if (binIds.length === 0 || binIds.some((id) => !Number.isInteger(id) || id <= 0)) {
			error = 'Indica uno o más bin_id enteros positivos';
			return false;
		}
		if (new Set(binIds).size !== binIds.length) {
			error = 'No repitas identificadores de ubicación';
			return false;
		}

		busy = true;
		error = null;
		info = null;
		submitResult = null;
		try {
			created = await deps.createCycleCount.execute(warehouseId, binIds);
			info = `Creados ${created.length} conteo(s)`;
			if (created[0]) await loadDetail(created[0].countId);
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo crear el cycle count');
			return false;
		} finally {
			busy = false;
		}
	}

	async function loadDetail(countId: number) {
		if (loading || busy) return false;
		if (!Number.isInteger(countId) || countId <= 0) {
			error = 'countId inválido';
			return false;
		}
		loading = true;
		error = null;
		selectedCountId = countId;
		submitResult = null;
		try {
			detail = await deps.getCycleCount.execute(countId);
			// Blind-count behavior: do not seed counted values from expected stock.
			const next: Record<number, number> = {};
			for (const line of detail.lines) next[line.countLineId] = line.countedQuantity ?? 0;
			countsByLine = next;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el conteo');
			detail = null;
			return false;
		} finally {
			loading = false;
		}
	}

	function setCounted(countLineId: number, value: number) {
		const n = Number.isFinite(value) ? Math.trunc(value) : 0;
		countsByLine = { ...countsByLine, [countLineId]: Math.min(1_000_000, Math.max(0, n)) };
	}

	async function submit() {
		if (!detail || busy || loading) return false;
		if (!canSubmitCycleCount(detail.status)) {
			error = `El conteo está en estado ${detail.status} y no admite envío`;
			return false;
		}
		if (detail.lines.length === 0) {
			error = 'El conteo no tiene líneas; añade un producto inesperado antes de enviarlo';
			return false;
		}
		for (const line of detail.lines) {
			const quantity = countsByLine[line.countLineId];
			if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000) {
				error = `Cantidad inválida en línea ${line.sku || line.countLineId}`;
				return false;
			}
		}

		busy = true;
		error = null;
		info = null;
		submitResult = null;
		const countId = detail.countId;
		try {
			const lines = detail.lines.map((line) => ({
				countLineId: line.countLineId,
				countedQuantity: countsByLine[line.countLineId] ?? 0
			}));
			submitResult = await deps.submitCycleCount.execute(countId, lines);
			info = `Conteo ${submitResult.status} · variaciones ${submitResult.linesWithVariance}`;
			// Refresh after releasing the busy flag; the use case itself verifies persisted status.
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo enviar el conteo');
			return false;
		} finally {
			busy = false;
			if (submitResult) await loadDetail(countId);
		}
	}

	return {
		get warehouseId() { return warehouseId; },
		get binIdsInput() { return binIdsInput; },
		get created() { return created; },
		get selectedCountId() { return selectedCountId; },
		get detail() { return detail; },
		get countsByLine() { return countsByLine; },
		get submitResult() { return submitResult; },
		get loading() { return loading; },
		get busy() { return busy; },
		get error() { return error; },
		get info() { return info; },
		setWarehouseId: (value: number) => { warehouseId = Number.isFinite(value) ? Math.trunc(value) : 1; },
		setBinIdsInput: (value: string) => { binIdsInput = value; },
		setCounted,
		create,
		loadDetail,
		submit
	};
}
