import { createWarehousesDependencies } from '../../di/warehouses.dependencies';
import type { Warehouse } from '../../domain/entity/Warehouse';
import type { AuthUser } from '../../../../infrastructure/auth/AuthSession';
import {
	assertWarehouseAuthorized,
	authorizedWarehouseIds,
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

function placeholderWarehouse(id: number): Warehouse {
	return {
		id,
		code: `WH-${id}`,
		name: `Almacén ${id}`,
		address: null,
		active: true,
		createdAt: null
	};
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

	async function load(user: AuthUser | null) {
		const epoch = ++loadEpoch;
		loading = true;
		error = null;
		const savedId = readSavedId();
		authorityRole = user?.role ?? 'USER';
		assignedIds = [...(user?.warehouseIds ?? [])];
		canSelect =
			user?.role === 'ADMIN' || (user?.allowedPages ?? []).includes('warehouses');

		const authority = {
			role: authorityRole,
			assignedWarehouseIds: assignedIds,
			allowedPages: user?.allowedPages ?? []
		};

		try {
			let catalog: Warehouse[] = [];
			if (user?.role === 'ADMIN' || canSelect) {
				try {
					catalog = await deps.listAdminWarehouses.execute();
				} catch {
					catalog = [];
				}
			}
			if (epoch !== loadEpoch) return;

			const catalogIds = catalog.map((w) => w.id);
			selectableIds = authorizedWarehouseIds(authority, catalogIds);

			if (user?.role === 'ADMIN') {
				warehouses = catalog.length > 0 ? catalog : selectableIds.map(placeholderWarehouse);
			} else {
				const byId = new Map(catalog.map((w) => [w.id, w]));
				warehouses = selectableIds.map((id) => byId.get(id) ?? placeholderWarehouse(id));
			}

			const next = resolveActiveWarehouseId({
				authorizedIds: selectableIds,
				savedId,
				previousId: warehouseId
			});
			applyActiveId(next, { silent: !initialized });
			initialized = true;
		} catch (err) {
			if (epoch !== loadEpoch) return;
			error = err instanceof Error ? err.message : 'No se pudo cargar el almacén seleccionado';
			selectableIds = authorizedWarehouseIds(authority, []);
			warehouses = selectableIds.map(placeholderWarehouse);
			const next = resolveActiveWarehouseId({
				authorizedIds: selectableIds,
				savedId,
				previousId: null
			});
			applyActiveId(next, { silent: !initialized });
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
			return;
		}
		if (!initialized) {
			await load(user);
			return;
		}
		authorityRole = user.role;
		assignedIds = [...(user.warehouseIds ?? [])];
		canSelect = user.role === 'ADMIN' || (user.allowedPages ?? []).includes('warehouses');
		const authority = {
			role: authorityRole,
			assignedWarehouseIds: assignedIds,
			allowedPages: user.allowedPages ?? []
		};
		const catalogIds = warehouses.map((w) => w.id);
		selectableIds = authorizedWarehouseIds(authority, catalogIds);
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
		if (warehouseId == null) throw new Error('No hay almacén activo');
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
