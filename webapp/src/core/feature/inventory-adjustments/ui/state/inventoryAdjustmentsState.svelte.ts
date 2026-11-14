import { createInventoryAdjustmentsDependencies } from '../../di/inventoryAdjustments.dependencies';
import type {
	CreateInventoryAdjustment,
	InventoryAdjustment,
	InventoryAdjustmentDecision,
	InventoryAdjustmentStatus
} from '../../domain/entity/InventoryAdjustment';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const dependencies = createInventoryAdjustmentsDependencies();

export function createInventoryAdjustmentsState() {
	let rows = $state<InventoryAdjustment[]>([]);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let pendingOnly = $state(false);

	async function load(
		warehouseId: number | null,
		options: { pendingOnly?: boolean; status?: InventoryAdjustmentStatus | null } = {}
	) {
		loading = true;
		error = null;
		pendingOnly = options.pendingOnly ?? false;
		try {
			const query = { warehouseId, page: 1, perPage: 200 };
			rows = pendingOnly
				? await dependencies.pending.execute(query)
				: await dependencies.list.execute({ ...query, status: options.status ?? null });
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudieron cargar los ajustes');
			rows = [];
		} finally {
			loading = false;
		}
	}

	async function createDirect(input: CreateInventoryAdjustment, warehouseId: number | null) {
		saving = true;
		error = null;
		try {
			await dependencies.createDirect.execute(input);
			await load(warehouseId);
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo aplicar el ajuste directo');
			return false;
		} finally {
			saving = false;
		}
	}

	async function review(decision: InventoryAdjustmentDecision, warehouseId: number | null) {
		saving = true;
		error = null;
		try {
			if (decision.action === 'approve') {
				await dependencies.approve.execute(decision.adjustmentId);
			} else {
				await dependencies.reject.execute(decision.adjustmentId);
			}
			await load(warehouseId, { pendingOnly: true });
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo revisar el ajuste');
			return false;
		} finally {
			saving = false;
		}
	}

	return {
		get rows() { return rows; },
		get loading() { return loading; },
		get saving() { return saving; },
		get error() { return error; },
		get pendingOnly() { return pendingOnly; },
		load,
		createDirect,
		review
	};
}
