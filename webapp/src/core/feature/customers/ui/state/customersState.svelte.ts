import { createCustomersDependencies } from '../../di/customers.dependencies';
import type { Customer } from '../../domain/entity/Customer';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createCustomersDependencies();

export function createCustomersState() {
	let customers = $state<Customer[]>([]);
	let query = $state('');
	let warehouseId = $state<number | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let loadedOnce = $state(false);

	async function load() {
		if (loading) return false;
		loading = true;
		error = null;
		try {
			customers = await deps.listCustomers.execute({
				q: query || undefined,
				warehouseId: warehouseId ?? undefined
			});
			loadedOnce = true;
			return true;
		} catch (err) {
			error = toUserMessage(err, 'No se pudieron cargar los clientes');
			customers = [];
			return false;
		} finally {
			loading = false;
		}
	}

	function setQuery(value: string) {
		query = value;
	}

	function setWarehouseId(value: number | null) {
		warehouseId = value;
	}

	return {
		get customers() {
			return customers;
		},
		get query() {
			return query;
		},
		get warehouseId() {
			return warehouseId;
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
		setQuery,
		setWarehouseId,
		load
	};
}
