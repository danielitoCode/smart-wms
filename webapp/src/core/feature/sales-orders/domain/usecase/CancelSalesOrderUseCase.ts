import type { SalesOrder } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class CancelSalesOrderUseCase {
	constructor(private readonly repository: SalesOrderRepository) {}

	execute(id: number): Promise<SalesOrder> {
		if (!Number.isInteger(id) || id < 1) {
			throw new Error('id must be an integer >= 1');
		}
		return this.repository.cancel(id);
	}
}
