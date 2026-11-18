import type {
	Customer,
	CustomerOrdersPage,
	CustomerPage
} from '../../domain/entity/Customer';
import type {
	CustomerRepository,
	GetCustomerOrdersParams,
	ListCustomersParams,
	SearchCustomersParams
} from '../../domain/repository/CustomerRepository';
import type { CustomerRemoteDataSource } from '../datasource/CustomerRemoteDataSource';
import type { SalesOrderCustomerDto } from '../dto/CustomerDto';
import { CustomerMapper, customerKey } from '../mapper/CustomerMapper';

const DEFAULT_PER_PAGE = 50;

function exactCustomerRows(rows: SalesOrderCustomerDto[], name: string): SalesOrderCustomerDto[] {
	const key = customerKey(name);
	return rows.filter((row) => customerKey(row.customer_name ?? '') === key);
}

export class CustomerRepositoryImpl implements CustomerRepository {
	constructor(private readonly datasource: CustomerRemoteDataSource) {}

	async list(params: ListCustomersParams = {}): Promise<CustomerPage> {
		const page = params.page ?? 1;
		const perPage = params.perPage ?? DEFAULT_PER_PAGE;
		const response = await this.datasource.listSalesOrders(page, perPage, params.warehouseId);
		const rows = response.sales_orders ?? [];
		return {
			customers: CustomerMapper.fromSalesOrderProjection(rows),
			page: response.page ?? page,
			perPage: response.per_page ?? perPage,
			totalOrders: response.total ?? rows.length,
			totalPages: response.pages ?? 1
		};
	}

	async search(params: SearchCustomersParams): Promise<Customer[]> {
		const hits = await this.datasource.search(params.q, params.warehouseId);
		return hits.map(CustomerMapper.fromSearchHit).filter((value): value is Customer => value !== null);
	}

	async getOrders(params: GetCustomerOrdersParams): Promise<CustomerOrdersPage> {
		const page = params.page ?? 1;
		const perPage = params.perPage ?? DEFAULT_PER_PAGE;
		const response = await this.datasource.searchSalesOrders(params.customerName, page, perPage, params.warehouseId);
		const candidates = response.sales_orders ?? [];
		const rows = exactCustomerRows(candidates, params.customerName);
		return {
			orders: rows.map(CustomerMapper.fromOrder).filter((value) => value !== null),
			page: response.page ?? page,
			perPage: response.per_page ?? perPage,
			matchingSalesOrders: response.total ?? candidates.length,
			totalPages: response.pages ?? 1
		};
	}

	async getDetail(customerName: string, warehouseId?: number): Promise<Customer | null> {
		const [ordersResponse, searchHits] = await Promise.all([
			this.datasource.searchSalesOrders(customerName, 1, DEFAULT_PER_PAGE, warehouseId),
			this.datasource.search(customerName, warehouseId)
		]);
		const rows = exactCustomerRows(ordersResponse.sales_orders ?? [], customerName);
		const aggregate = searchHits.find((hit) => customerKey(hit.label ?? '') === customerKey(customerName));
		const customer = rows.length
			? CustomerMapper.fromSalesOrderProjection(rows)[0] ?? null
			: aggregate ? CustomerMapper.fromSearchHit(aggregate) : null;
		if (!customer) return null;

		// Global search performs a GROUP BY customer_name and returns the full
		// count within the selected warehouse, unlike the current source page.
		if (aggregate) customer.orderCount = CustomerMapper.fromSearchHit(aggregate)?.orderCount ?? customer.orderCount;
		if (!rows.length) return customer;

		const firstOrderId = rows.find((row) => Number.isInteger(row.so_id) && row.so_id! > 0)?.so_id;
		if (!firstOrderId) return customer;
		const detail = await this.datasource.getSalesOrderDetail(firstOrderId);
		return CustomerMapper.mergeDetail(customer, detail.sales_order ?? {});
	}
}
