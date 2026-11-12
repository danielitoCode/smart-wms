import type { Customer } from '../entity/Customer';
import type { CustomerRepository } from '../repository/CustomerRepository';

export class GetAllCustomerUseCase {
	constructor(private readonly repository: CustomerRepository) {}

	execute(query?: { search?: string; active?: boolean | null }): Promise<Customer[]> {
		return this.repository.list(query);
	}
}
