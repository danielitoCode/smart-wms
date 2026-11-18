import { createCustomersDependencies } from '../../di/customers.dependencies';
import type { Customer, CustomerOrdersPage, CustomerPage } from '../../domain/entity/Customer';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createCustomersDependencies();
const PER_PAGE = 50;

export function createCustomersState() {
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

	async function load(nextPage = 1) {
		const version = ++requestVersion;
		loading = true;
		error = null;
		selectedCustomer = null;
		customerOrders = null;
		page = nextPage;
		try {
			if (query.trim()) {
				customers = await deps.searchCustomers.execute({ search: query.trim(), warehouseId: warehouseId ?? undefined });
				customerPage = null;
			} else {
				customerPage = await deps.listCustomers.execute({ page: nextPage, perPage: PER_PAGE, warehouseId: warehouseId ?? undefined });
				customers = customerPage.customers;
			}
		} catch (err) {
			if (version === requestVersion) {
				error = toUserMessage(err, 'No se pudieron cargar los clientes');
				customers = [];
				customerPage = null;
			}
		} finally {
			if (version === requestVersion) loading = false;
		}
	}

	async function selectCustomer(customer: Customer) {
		selectedCustomer = customer;
		detailLoading = true;
		detailError = null;
		ordersPage = 1;
		try {
			const [detail, orders] = await Promise.all([
				deps.getCustomerDetail.execute({ customerName: customer.name, warehouseId: warehouseId ?? undefined }),
				deps.getCustomerOrders.execute({ customerName: customer.name, page: 1, perPage: PER_PAGE, warehouseId: warehouseId ?? undefined })
			]);
			if (selectedCustomer?.id !== customer.id) return;
			selectedCustomer = detail ?? customer;
			customerOrders = orders;
		} catch (err) {
			detailError = toUserMessage(err, 'No se pudo cargar el detalle del cliente');
		} finally {
			detailLoading = false;
		}
	}

	async function loadOrders(nextPage: number) {
		if (!selectedCustomer) return;
		ordersPage = nextPage;
		detailLoading = true;
		detailError = null;
		try {
			customerOrders = await deps.getCustomerOrders.execute({
				customerName: selectedCustomer.name, page: nextPage, perPage: PER_PAGE,
				warehouseId: warehouseId ?? undefined
			});
		} catch (err) {
			detailError = toUserMessage(err, 'No se pudo cargar el historial de pedidos');
		} finally {
			detailLoading = false;
		}
	}

	function setQuery(value: string) { query = value; }
	function setWarehouseId(value: number | null) { warehouseId = value; }
	function closeDetail() { selectedCustomer = null; customerOrders = null; }

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
