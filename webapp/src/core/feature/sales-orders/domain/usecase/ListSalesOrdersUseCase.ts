import type { SalesOrderPage } from '../entity/SalesOrder';
import type { ListSalesOrdersParams, SalesOrderRepository } from '../repository/SalesOrderRepository';

export class ListSalesOrdersUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(input: ListSalesOrdersParams = {}): Promise<SalesOrderPage> {
    if (input.page != null && (!Number.isInteger(input.page) || input.page < 1)) {
      throw new Error('page must be an integer >= 1 when provided');
    }

    if (input.perPage != null && (
      !Number.isInteger(input.perPage) || input.perPage < 1 || input.perPage > 1000
    )) {
      throw new Error('perPage must be an integer between 1 and 1000 when provided');
    }

    if (input.warehouseId != null && (
      !Number.isInteger(input.warehouseId) || input.warehouseId < 1
    )) {
      throw new Error('warehouseId must be an integer >= 1 when provided');
    }

    return this.repository.listPage({
      status: input.status?.trim() || undefined,
      warehouseId: input.warehouseId,
      page: input.page,
      perPage: input.perPage,
      q: input.q?.trim() || undefined,
      excludePostFulfillment: input.excludePostFulfillment ?? false
    });
  }
}
