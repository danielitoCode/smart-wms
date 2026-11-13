import type { CreateSalesOrderInput, SalesOrder } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class CreateSalesOrderUseCase {
	constructor(private readonly repository: SalesOrderRepository) {}

	execute(input: CreateSalesOrderInput): Promise<SalesOrder> {
		const soNumber = input.soNumber?.trim() ?? '';
		if (!soNumber) {
			throw new Error('soNumber is required');
		}
		if (!Number.isInteger(input.warehouseId) || input.warehouseId < 1) {
			throw new Error('warehouseId must be an integer >= 1');
		}
		if (!Array.isArray(input.lines) || input.lines.length === 0) {
			throw new Error('at least one line is required');
		}
		for (const line of input.lines) {
			if (!Number.isInteger(line.itemId) || line.itemId < 1) {
				throw new Error('each line.itemId must be an integer >= 1');
			}
			if (!Number.isFinite(line.quantityOrdered) || line.quantityOrdered <= 0) {
				throw new Error('each line.quantityOrdered must be > 0');
			}
		}

		return this.repository.create({
			soNumber,
			warehouseId: input.warehouseId,
			customerName: input.customerName?.trim() || undefined,
			customerEmail: input.customerEmail?.trim() || undefined,
			customerPhone: input.customerPhone?.trim() || undefined,
			customerAddress: input.customerAddress?.trim() || undefined,
			shipAddress: input.shipAddress?.trim() || undefined,
			shipMethod: input.shipMethod?.trim() || undefined,
			memo: input.memo?.trim() || undefined,
			lines: input.lines.map((l) => ({
				itemId: l.itemId,
				quantityOrdered: l.quantityOrdered
			}))
		});
	}
}
