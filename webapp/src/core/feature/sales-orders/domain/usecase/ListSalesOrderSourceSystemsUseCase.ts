import type { SalesOrderSourceSystem } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export class ListSalesOrderSourceSystemsUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(): Promise<SalesOrderSourceSystem[]> {
    return this.repository.listSourceSystems();
  }
}
