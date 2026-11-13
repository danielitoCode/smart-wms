import type { Customer } from '../entity/Customer';
import type { CustomerRepository, ListCustomersParams } from '../repository/CustomerRepository';

export class ListCustomersUseCase {
	constructor(private readonly repository: CustomerRepository) {}

	execute(input: ListCustomersParams = {}): Promise<Customer[]> {
		if (input.warehouseId != null && (!Number.isInteger(input.warehouseId) || input.warehouseId < 1)) {
			throw new Error('warehouseId must be an integer >= 1 when provided');
		}
		const q = input.q?.trim() || undefined;
		if (q != null && q.length === 1) {
			throw new Error('search query must be at least 2 characters');
		}
		return this.repository.list({
			q,
			warehouseId: input.warehouseId
		});
	}
}
