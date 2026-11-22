import { createCustomersDependencies } from '../../di/customers.dependencies';
import type { Customer, CustomerOrdersPage, CustomerPage } from '../../domain/entity/Customer';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createCustomersDependencies();
const PER_PAGE = 50;

export function createCustomersState(t: (source: string) => string = (source) => source) {
	let customers = $state<Customer[]>([]);
	let customerPage = $state<CustomerPage | null>(null);
	let selectedCustomer = $state<Customer | null>(null);
	let customerOrders = $state<CustomerOrdersPage | null>(null);
	let query = $state('');
	let warehouseId = $state<number | null>(null);
	let loading = $state(false);
	let detailLoading = $state(false);
	let error = $state<string | null>(null);
	let detailError = $state<string | null>(null);
	let page = $state(1);
	let ordersPage = $state(1);
	let requestVersion = 0;
	let detailRequestVersion = 0;

	async function load(nextPage = 1) {
		const version = ++requestVersion;
		++detailRequestVersion;
		loading = true;
		detailLoading = false;
		error = null;
		selectedCustomer = null;
		customerOrders = null;
		page = nextPage;
		try {
			if (query.trim()) {
				const result = await deps.searchCustomers.execute({ search: query.trim(), warehouseId: warehouseId ?? undefined });
				if (version !== requestVersion) return;
				customers = result;
				customerPage = null;
			} else {
				const result = await deps.listCustomers.execute({ page: nextPage, perPage: PER_PAGE, warehouseId: warehouseId ?? undefined });
				if (version !== requestVersion) return;
				customerPage = result;
				customers = result.customers;
			}
		} catch (err) {
			if (version === requestVersion) {
				error = toUserMessage(err, t('No se pudieron cargar los clientes'));
				customers = [];
				customerPage = null;
			}
		} finally {
			if (version === requestVersion) loading = false;
		}
	}

	async function selectCustomer(customer: Customer) {
		const version = ++detailRequestVersion;
		selectedCustomer = customer;
		detailLoading = true;
		detailError = null;
		ordersPage = 1;
		try {
			const [detail, orders] = await Promise.all([
				deps.getCustomerDetail.execute({ customerName: customer.name, warehouseId: warehouseId ?? undefined }),
				deps.getCustomerOrders.execute({ customerName: customer.name, page: 1, perPage: PER_PAGE, warehouseId: warehouseId ?? undefined })
			]);
			if (version !== detailRequestVersion || selectedCustomer?.id !== customer.id) return;
			selectedCustomer = detail ?? customer;
			customerOrders = orders;
		} catch (err) {
			if (version === detailRequestVersion) detailError = toUserMessage(err, t('No se pudo cargar el detalle del cliente'));
		} finally {
			if (version === detailRequestVersion) detailLoading = false;
		}
	}

	async function loadOrders(nextPage: number) {
		if (!selectedCustomer) return;
		const version = ++detailRequestVersion;
		const customerName = selectedCustomer.name;
		ordersPage = nextPage;
		detailLoading = true;
		detailError = null;
		try {
			const result = await deps.getCustomerOrders.execute({
				customerName, page: nextPage, perPage: PER_PAGE,
				warehouseId: warehouseId ?? undefined
			});
			if (version === detailRequestVersion && selectedCustomer?.name === customerName) customerOrders = result;
		} catch (err) {
			if (version === detailRequestVersion) detailError = toUserMessage(err, t('No se pudo cargar el historial de pedidos'));
		} finally {
			if (version === detailRequestVersion) detailLoading = false;
		}
	}

	function setQuery(value: string) { query = value; }

	function setWarehouseId(value: number | null) {
		if (warehouseId === value) return;
		warehouseId = value;
		// Invalidate list/detail requests immediately, before the screen effect
		// schedules the next load for the new warehouse.
		++requestVersion;
		++detailRequestVersion;
		customers = [];
		customerPage = null;
		selectedCustomer = null;
		customerOrders = null;
		page = 1;
		ordersPage = 1;
		loading = false;
		detailLoading = false;
		error = null;
		detailError = null;
	}
	function closeDetail() { ++detailRequestVersion; selectedCustomer = null; customerOrders = null; detailLoading = false; }

	return {
		get customers() { return customers; }, get customerPage() { return customerPage; },
		get selectedCustomer() { return selectedCustomer; }, get customerOrders() { return customerOrders; },
		get query() { return query; }, get warehouseId() { return warehouseId; },
		get loading() { return loading; }, get detailLoading() { return detailLoading; },
		get error() { return error; }, get detailError() { return detailError; },
		get page() { return page; }, get ordersPage() { return ordersPage; },
		setQuery, setWarehouseId, load, selectCustomer, loadOrders, closeDetail
	};
}
