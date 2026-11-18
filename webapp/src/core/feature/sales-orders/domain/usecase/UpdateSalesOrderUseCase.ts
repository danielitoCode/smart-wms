import type { UpdateSalesOrder } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class UpdateSalesOrderUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(id: number, input: UpdateSalesOrder): Promise<void> {
    if (!Number.isInteger(id) || id < 1) throw new Error('El identificador del pedido no es válido');
    if (!Object.keys(input).length) throw new Error('Indica al menos un campo para actualizar');
    if (input.salesOrderNumber !== undefined && !input.salesOrderNumber.trim()) {
      throw new Error('El número del pedido no puede quedar vacío');
    }
    if (input.priority !== undefined && (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 10)) {
      throw new Error('La prioridad debe estar entre 0 y 10');
    }
    return this.repository.update(id, input);
  }
}
