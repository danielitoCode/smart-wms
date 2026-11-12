import type { CustomerId } from '../entity/Customer';
import type { CustomerRepository } from '../repository/CustomerRepository';

export class DeleteCustomerUseCase {
	constructor(private readonly repository: CustomerRepository) {}

	execute(id: CustomerId): Promise<void> {
		const value = id?.trim() ?? '';
		if (!value) {
			throw new Error('customer id is required');
		}
		return this.repository.delete(value);
	}
}
