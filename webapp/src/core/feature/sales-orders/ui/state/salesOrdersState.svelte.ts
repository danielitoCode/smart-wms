import { createSalesOrdersDependencies } from '../../di/sales-orders.dependencies';
import type { SalesOrder } from '../../domain/entity/SalesOrder';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createSalesOrdersDependencies();

export function createSalesOrdersState() {
	let orders = $state<SalesOrder[]>([]);
	let statusFilter = $state('');
	let warehouseId = $state<number | null>(null);
	let query = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let loadedOnce = $state(false);
	let cancellingId = $state<number | null>(null);

	async function load() {
		if (loading) return false;
		loading = true;
		error = null;
		try {
			orders = await deps.listSalesOrders.execute({
				status: statusFilter || undefined,
				warehouseId: warehouseId ?? undefined,
				q: query || undefined,
				perPage: 200
			});
			loadedOnce = true;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudieron cargar los pedidos de venta');
			orders = [];
			return false;
		} finally {
			loading = false;
		}
	}

	async function cancel(id: number) {
		if (cancellingId != null) return false;
		cancellingId = id;
		error = null;
		try {
			const updated = await deps.cancelSalesOrder.execute(id);
			orders = orders.map((o) => (o.id === id ? updated : o));
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cancelar el pedido');
			return false;
		} finally {
			cancellingId = null;
		}
	}

	function setStatusFilter(value: string) {
		statusFilter = value;
	}

	function setWarehouseId(value: number | null) {
		warehouseId = value;
	}

	function setQuery(value: string) {
		query = value;
	}

	return {
		get orders() {
			return orders;
		},
		get statusFilter() {
			return statusFilter;
		},
		get warehouseId() {
			return warehouseId;
		},
		get query() {
			return query;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get loadedOnce() {
			return loadedOnce;
		},
		get cancellingId() {
			return cancellingId;
		},
		setStatusFilter,
		setWarehouseId,
		setQuery,
		load,
		cancel
	};
}

export function createSalesOrderDetailState(soId: number) {
	let order = $state<SalesOrder | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let cancelling = $state(false);

	async function load() {
		if (loading) return false;
		loading = true;
		error = null;
		try {
			order = await deps.getSalesOrder.execute(soId);
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cargar el pedido');
			order = null;
			return false;
		} finally {
			loading = false;
		}
	}

	async function cancel() {
		if (cancelling || !order) return false;
		cancelling = true;
		error = null;
		try {
			order = await deps.cancelSalesOrder.execute(soId);
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudo cancelar el pedido');
			return false;
		} finally {
			cancelling = false;
		}
	}

	return {
		get order() {
			return order;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		get cancelling() {
			return cancelling;
		},
		load,
		cancel
	};
}
