import type { Customer, CustomerId } from '../entity/Customer';
import type { CustomerRepository } from '../repository/CustomerRepository';

export class GetCustomerByIdUseCase {
	constructor(private readonly repository: CustomerRepository) {}

	execute(id: CustomerId): Promise<Customer> {
		const value = id?.trim() ?? '';
		if (!value) {
			throw new Error('customer id is required');
		}
		return this.repository.getById(value);
	}
}
