import type { CustomerPage } from '../entity/Customer';
import type { CustomerRepository, ListCustomersParams } from '../repository/CustomerRepository';

export class ListCustomersUseCase {
	constructor(private readonly repository: CustomerRepository) {}

	execute(input: ListCustomersParams = {}): Promise<CustomerPage> {
		const page = input.page ?? 1;
		const perPage = input.perPage ?? 50;
		if (!Number.isInteger(page) || page < 1) throw new Error('page must be an integer >= 1');
		if (!Number.isInteger(perPage) || perPage < 1 || perPage > 1000) {
			throw new Error('perPage must be an integer between 1 and 1000');
		}
		if (input.warehouseId != null && (!Number.isInteger(input.warehouseId) || input.warehouseId < 1)) {
			throw new Error('warehouseId must be an integer >= 1 when provided');
		}
		return this.repository.list({ page, perPage, warehouseId: input.warehouseId });
	}
}
