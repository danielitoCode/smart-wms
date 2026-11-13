import type { CreateSalesOrder, SalesOrder } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class CreateSalesOrderUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(input: CreateSalesOrder): Promise<SalesOrder> {
    if (!input.salesOrderNumber.trim()) throw new Error('El número del pedido es obligatorio');
    if (!Number.isInteger(input.warehouseId) || input.warehouseId < 1) throw new Error('Selecciona un almacén válido');
    if (!input.lines.length) throw new Error('El pedido debe contener al menos una línea');
    const seenItems = new Set<number>();
    for (const line of input.lines) {
      if (!Number.isInteger(line.itemId) || line.itemId < 1) throw new Error('Cada línea requiere un artículo válido');
      if (!Number.isInteger(line.quantityOrdered) || line.quantityOrdered < 1 || line.quantityOrdered > 1_000_000) {
        throw new Error('La cantidad de cada línea debe estar entre 1 y 1 000 000');
      }
      if (seenItems.has(line.itemId)) throw new Error('No se puede repetir un artículo en el mismo pedido');
      seenItems.add(line.itemId);
    }
    return this.repository.create({ ...input, salesOrderNumber: input.salesOrderNumber.trim() });
  }
}
