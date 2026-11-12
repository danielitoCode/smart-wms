import type { Customer, CustomerId, UpdateCustomer } from '../entity/Customer';
import type { CustomerRepository } from '../repository/CustomerRepository';

export class ModifyCustomerUseCase {
	constructor(private readonly repository: CustomerRepository) {}

	execute(id: CustomerId, input: UpdateCustomer): Promise<Customer> {
		const value = id?.trim() ?? '';
		if (!value) {
			throw new Error('customer id is required');
		}
		if (input.customerName !== undefined) {
			const name = input.customerName?.trim() ?? '';
			if (!name) {
				throw new Error('El nombre del cliente no puede quedar vacío');
			}
			return this.repository.update(value, { ...input, customerName: name });
		}
		return this.repository.update(value, input);
	}
}
