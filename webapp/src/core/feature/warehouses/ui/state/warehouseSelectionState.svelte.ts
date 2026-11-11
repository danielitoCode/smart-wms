import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { Warehouse } from '../../domain/entity/Warehouse';
import type { AuthUser } from '../../../../infrastructure/auth/AuthSession';
import { resolveWarehouseSelection } from '../../../auth/domain/policy/AccessPolicy';

const deps = createWarehousesDependencies();
const STORAGE_KEY = 'sentry_warehouse_id';
function readSavedId(): number | null {
	if (typeof sessionStorage === 'undefined') return null;
	const raw = sessionStorage.getItem(STORAGE_KEY);
	const id = raw ? Number(raw) : NaN;
	return Number.isInteger(id) && id > 0 ? id : null;
}
function persistId(id: number | null) {
	if (typeof sessionStorage === 'undefined') return;
	if (id == null) sessionStorage.removeItem(STORAGE_KEY);
	else sessionStorage.setItem(STORAGE_KEY, String(id));
}

export function createWarehouseSelectionState() {
	let warehouses = $state<Warehouse[]>([]);
	let warehouseId = $state<number | null>(null);
	let canSelect = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let initialized = $state(false);
	let selectableIds = $state<number[]>([]);

	async function load(user: AuthUser | null) {
		if (loading || initialized) return;
		loading = true;
		error = null;
		const savedId = readSavedId();
		canSelect = user?.role === 'ADMIN' || (user?.allowedPages ?? []).includes('warehouses');
		try {
			if (canSelect) {
				warehouses = await deps.listAdminWarehouses.execute();
				selectableIds = warehouses.map(row => row.id);
				warehouseId = resolveWarehouseSelection({ role: user?.role ?? 'USER', allowedPages: user?.allowedPages ?? [], assignedWarehouseIds: user?.warehouseIds ?? [], availableWarehouseIds: selectableIds, savedId });
				persistId(warehouseId);
			} else {
				// Match React WarehouseProvider: users without the warehouses page
				// grant keep the persisted selection but do not receive the global picker.
				selectableIds = [...(user?.warehouseIds ?? [])];
				warehouseId = resolveWarehouseSelection({ role: user?.role ?? 'USER', allowedPages: user?.allowedPages ?? [], assignedWarehouseIds: selectableIds, availableWarehouseIds: [], savedId });
				persistId(warehouseId);
			}
			initialized = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'No se pudo cargar el almacén seleccionado';
			selectableIds = [...(user?.warehouseIds ?? [])];
			warehouseId = resolveWarehouseSelection({ role: user?.role ?? 'USER', allowedPages: user?.allowedPages ?? [], assignedWarehouseIds: selectableIds, availableWarehouseIds: [], savedId });
			persistId(warehouseId);
			initialized = true;
		} finally {
			loading = false;
		}
	}

	function select(id: number) {
		if (!Number.isInteger(id) || id <= 0 || !selectableIds.includes(id)) return;
		warehouseId = id;
		persistId(id);
	}
	async function reload(user: AuthUser | null) {
		initialized = false;
		warehouses = [];
		await load(user);
	}

	return {
		get warehouses() { return warehouses; }, get warehouseId() { return warehouseId; },
		get canSelect() { return canSelect; }, get loading() { return loading; },
		get error() { return error; }, get initialized() { return initialized; },
		load, reload, select
	};
}

export type WarehouseSelectionState = ReturnType<typeof createWarehouseSelectionState>;
