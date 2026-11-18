import type { CustomerOrdersPage } from '../entity/Customer';
import type { CustomerRepository } from '../repository/CustomerRepository';

export class GetCustomerOrdersUseCase {
	constructor(private readonly repository: CustomerRepository) {}

	execute(input: { customerName: string; page?: number; perPage?: number; warehouseId?: number }): Promise<CustomerOrdersPage> {
		const customerName = input.customerName.trim();
		if (!customerName) throw new Error('customerName is required');
		const page = input.page ?? 1;
		const perPage = input.perPage ?? 50;
		if (!Number.isInteger(page) || page < 1) throw new Error('page must be an integer >= 1');
		if (!Number.isInteger(perPage) || perPage < 1 || perPage > 1000) throw new Error('perPage must be between 1 and 1000');
		if (input.warehouseId != null && (!Number.isInteger(input.warehouseId) || input.warehouseId < 1)) {
			throw new Error('warehouseId must be an integer >= 1 when provided');
		}
		return this.repository.getOrders({ customerName, page, perPage, warehouseId: input.warehouseId });
	}
}
