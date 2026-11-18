import type { Customer } from '../entity/Customer';
import type { CustomerRepository } from '../repository/CustomerRepository';

export class GetCustomerDetailUseCase {
	constructor(private readonly repository: CustomerRepository) {}

	execute(input: { customerName: string; warehouseId?: number }): Promise<Customer | null> {
		const customerName = input.customerName.trim();
		if (!customerName) throw new Error('customerName is required');
		if (input.warehouseId != null && (!Number.isInteger(input.warehouseId) || input.warehouseId < 1)) {
			throw new Error('warehouseId must be an integer >= 1 when provided');
		}
		return this.repository.getDetail(customerName, input.warehouseId);
	}
}
