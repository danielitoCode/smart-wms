import type { CreateCustomer, Customer } from '../entity/Customer';
import type { CustomerRepository } from '../repository/CustomerRepository';

export class AddNewCustomerUseCase {
	constructor(private readonly repository: CustomerRepository) {}

	execute(input: CreateCustomer): Promise<Customer> {
		const customerName = input.customerName?.trim() ?? '';
		if (!customerName) {
			throw new Error('El nombre del cliente es obligatorio');
		}
		return this.repository.create({ ...input, customerName });
	}
}
