import type { Customer } from '../../domain/entity/Customer';
import type { CustomerRepository, ListCustomersParams } from '../../domain/repository/CustomerRepository';
import type { CustomerRemoteDataSource } from '../datasource/CustomerRemoteDataSource';
import { CustomerMapper } from '../mapper/CustomerMapper';

export class CustomerRepositoryImpl implements CustomerRepository {
	constructor(private readonly datasource: CustomerRemoteDataSource) {}

	async list(params?: ListCustomersParams): Promise<Customer[]> {
		const q = params?.q?.trim();
		if (q) {
			const hits = await this.datasource.search(q, params?.warehouseId);
			return hits
				.map((h) => CustomerMapper.fromSearchHit(h))
				.filter((c): c is Customer => c != null);
		}

		const rows = await this.datasource.listFromSalesOrders(params?.warehouseId);
		return CustomerMapper.fromSalesOrderProjection(rows, params?.warehouseId);
	}
}
