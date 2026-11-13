import type { CreateSalesOrderInput, SalesOrder } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class CreateSalesOrderUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(input: CreateSalesOrderInput): Promise<SalesOrder> {
    const soNumber = input.soNumber?.trim() ?? '';
    if (!soNumber) throw new Error('soNumber is required');
    if (!Number.isInteger(input.warehouseId) || input.warehouseId < 1) {
      throw new Error('warehouseId must be an integer >= 1');
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new Error('at least one line is required');
    }
    const itemIds = new Set<number>();
    for (const line of input.lines) {
      if (!Number.isInteger(line.itemId) || line.itemId < 1) {
        throw new Error('each line.itemId must be an integer >= 1');
      }
      if (!Number.isInteger(line.quantityOrdered) || line.quantityOrdered < 1 || line.quantityOrdered > 1_000_000) {
        throw new Error('each line.quantityOrdered must be an integer between 1 and 1,000,000');
      }
      if (itemIds.has(line.itemId)) throw new Error('duplicate item lines are not allowed');
      itemIds.add(line.itemId);
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
      shipByDate: input.shipByDate?.trim() || undefined,
      memo: input.memo?.trim() || undefined,
      orderOrigin: input.orderOrigin?.trim() || undefined,
      lines: input.lines.map(({ itemId, quantityOrdered }) => ({ itemId, quantityOrdered }))
    });
  }
}
