import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { Warehouse } from '../../domain/entity/Warehouse';
import type { AuthUser } from '../../../../infrastructure/auth/AuthSession';
import {
	assertWarehouseAuthorized,
	canSelectWarehouseContext,
	resolveSelectableWarehouseIds,
	resolveActiveWarehouseId
} from '../../domain/context/WarehouseContext';
import {
	beginWarehouseScopedRequest,
	getWarehouseGeneration,
	notifyWarehouseChanged
} from '../../../../infrastructure/warehouse/WarehouseRequestScope';

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

function sameIds(a: readonly number[], b: readonly number[]): boolean {
	return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function createWarehouseSelectionState() {
	let warehouses = $state<Warehouse[]>([]);
	let warehouseId = $state<number | null>(null);
	let canSelect = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let initialized = $state(false);
	let selectableIds = $state<number[]>([]);
	let authorityRole = $state('USER');
	let assignedIds = $state<number[]>([]);
	let generation = $state(0);
	let loadEpoch = 0;

	function applyActiveId(next: number | null, opts?: { silent?: boolean }) {
		const prev = warehouseId;
		warehouseId = next;
		persistId(next);
		if (!opts?.silent && prev !== next) {
			generation = notifyWarehouseChanged();
		} else {
			generation = getWarehouseGeneration();
		}
	}

	function buildAuthority(user: AuthUser | null) {
		return {
			role: user?.role ?? 'USER',
			assignedWarehouseIds: [...(user?.warehouseIds ?? [])],
			allowedPages: user?.allowedPages ?? []
		};
	}

	async function load(user: AuthUser | null) {
		const epoch = ++loadEpoch;
		loading = true;
		error = null;
		const savedId = readSavedId();
		const authority = buildAuthority(user);
		authorityRole = authority.role;
		assignedIds = [...authority.assignedWarehouseIds];
		canSelect = canSelectWarehouseContext(authority);

		try {
			// Operational list is authenticated and warehouse-scoped by Flask.
			// It returns labels only for active warehouses the caller can access;
			// do not substitute fabricated WH-{id} entries when this request fails.
			const catalog = await deps.listWarehouses.execute();
			if (epoch !== loadEpoch) return;

			warehouses = catalog;
			selectableIds = resolveSelectableWarehouseIds(
				authority,
				catalog.map((warehouse) => warehouse.id)
			);
			const next = resolveActiveWarehouseId({
				authorizedIds: selectableIds,
				savedId,
				previousId: warehouseId
			});
			applyActiveId(next, { silent: !initialized });
			if (next == null) {
				error = authority.role === 'ADMIN'
					? 'No hay almacenes activos disponibles.'
					: 'No tienes almacenes activos asignados.';
			}
			initialized = true;
		} catch (err) {
			if (epoch !== loadEpoch) return;
			warehouses = [];
			selectableIds = [];
			applyActiveId(null);
			error = 'No se pudo validar el catálogo de almacenes. Las operaciones que requieren un almacén quedan bloqueadas.';
			initialized = true;
		} finally {
			if (epoch === loadEpoch) loading = false;
		}
	}

	async function syncFromUser(user: AuthUser | null) {
		if (!user) {
			warehouses = [];
			selectableIds = [];
			applyActiveId(null);
			initialized = false;
			error = null;
			return;
		}
		const nextAuthority = buildAuthority(user);
		const scopeChanged =
			nextAuthority.role !== authorityRole ||
			!sameIds(nextAuthority.assignedWarehouseIds, assignedIds);
		if (!initialized || scopeChanged || error !== null) {
			await load(user);
			return;
		}

		authorityRole = nextAuthority.role;
		assignedIds = [...nextAuthority.assignedWarehouseIds];
		canSelect = canSelectWarehouseContext(nextAuthority);
		selectableIds = resolveSelectableWarehouseIds(
			nextAuthority,
			warehouses.map((warehouse) => warehouse.id)
		);
		if (warehouseId != null && !selectableIds.includes(warehouseId)) {
			const next = resolveActiveWarehouseId({
				authorizedIds: selectableIds,
				savedId: readSavedId(),
				previousId: null
			});
			applyActiveId(next);
		} else {
			persistId(warehouseId);
		}
		if (warehouseId == null && selectableIds.length === 0) {
			error = 'No tienes almacenes activos asignados.';
		} else {
			error = null;
		}
	}

	function select(id: number) {
		try {
			assertWarehouseAuthorized(
				{
					role: authorityRole,
					assignedWarehouseIds: assignedIds,
					allowedPages: canSelect ? ['warehouses'] : []
				},
				id,
				selectableIds
			);
		} catch {
			return;
		}
		if (!selectableIds.includes(id)) return;
		if (warehouseId === id) return;
		applyActiveId(id);
	}

	async function reload(user: AuthUser | null) {
		initialized = false;
		await load(user);
	}

	function beginScopedRequest() {
		return beginWarehouseScopedRequest();
	}

	function requireWarehouseId(): number {
		if (warehouseId == null) throw new Error(error ?? 'No hay almacén activo');
		assertWarehouseAuthorized(
			{
				role: authorityRole,
				assignedWarehouseIds: assignedIds,
				allowedPages: canSelect ? ['warehouses'] : []
			},
			warehouseId,
			selectableIds
		);
		return warehouseId;
	}

	return {
		get warehouses() { return warehouses; },
		get warehouseId() { return warehouseId; },
		get canSelect() { return canSelect; },
		get loading() { return loading; },
		get error() { return error; },
		get initialized() { return initialized; },
		get selectableIds() { return selectableIds; },
		get generation() { return generation; },
		load,
		reload,
		syncFromUser,
		select,
		beginScopedRequest,
		requireWarehouseId
	};
}

export type WarehouseSelectionState = ReturnType<typeof createWarehouseSelectionState>;
