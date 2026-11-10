import { createInventoryDependencies } from '../../di/inventory.dependencies';
import type {
	CycleCountDetail,
	CycleCountSubmitResult,
	CycleCountSummary
} from '../../domain/entity/CycleCount';
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
	/** counted quantities keyed by countLineId */
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
		const binIds = binIdsInput
			.split(/[\s,;]+/)
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => Number(s))
			.filter((n) => Number.isInteger(n) && n > 0);

		if (binIds.length === 0) {
			error = 'Indica al menos un bin_id válido';
			return false;
		}

		busy = true;
		error = null;
		info = null;
		submitResult = null;
		try {
			created = await deps.createCycleCount.execute(warehouseId, binIds);
			info = `Creados ${created.length} conteo(s)`;
			if (created[0]) {
				await loadDetail(created[0].countId);
			}
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo crear el cycle count');
			return false;
		} finally {
			busy = false;
		}
	}

	async function loadDetail(countId: number) {
		if (loading) return false;
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
			const next: Record<number, number> = {};
			for (const line of detail.lines) {
				next[line.countLineId] = line.countedQuantity ?? line.expectedQuantity ?? 0;
			}
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
		countsByLine = { ...countsByLine, [countLineId]: n < 0 ? 0 : n };
	}

	async function submit() {
		if (!detail || busy || loading) return false;
		if (detail.status === 'COMPLETED') {
			error = 'Este conteo ya está completado';
			return false;
		}
		if (detail.lines.length === 0) {
			error = 'El conteo no tiene líneas';
			return false;
		}

		for (const line of detail.lines) {
			const q = countsByLine[line.countLineId];
			if (!Number.isInteger(q) || q < 0) {
				error = `Cantidad inválida en línea ${line.sku ?? line.countLineId}`;
				return false;
			}
		}

		busy = true;
		error = null;
		info = null;
		submitResult = null;
		const countId = detail.countId;
		try {
			const lines = detail.lines.map((l) => ({
				countLineId: l.countLineId,
				countedQuantity: countsByLine[l.countLineId] ?? 0
			}));
			submitResult = await deps.submitCycleCount.execute(countId, lines);
			info = `Conteo ${submitResult.status} · variaciones ${submitResult.linesWithVariance}`;
			try {
				await loadDetail(countId);
			} catch {
				/* keep submit result even if reload fails */
			}
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo enviar el conteo');
			return false;
		} finally {
			busy = false;
		}
	}

	return {
		get warehouseId() {
			return warehouseId;
		},
		get binIdsInput() {
			return binIdsInput;
		},
		get created() {
			return created;
		},
		get selectedCountId() {
			return selectedCountId;
		},
		get detail() {
			return detail;
		},
		get countsByLine() {
			return countsByLine;
		},
		get submitResult() {
			return submitResult;
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
		setWarehouseId: (v: number) => {
			warehouseId = Number.isFinite(v) ? Math.trunc(v) : 1;
		},
		setBinIdsInput: (v: string) => {
			binIdsInput = v;
		},
		setCounted,
		create,
		loadDetail,
		submit
	};
}
