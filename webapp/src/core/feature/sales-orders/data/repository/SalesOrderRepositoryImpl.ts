import type {
  CreateRmaInput,
  CreateSalesOrder,
  PartialFulfillInput,
  ReceiveReturnInput,
  RelatedSalesOrder,
  RevertSalesOrderInput,
  SalesOrder,
  SalesOrderListQuery,
  SalesOrderPage,
  UpdateSalesOrder
} from '../../domain/entity/SalesOrder';
import type { SalesOrderRepository } from '../../domain/repository/SalesOrderRepository';
import type { SalesOrderRemoteDataSource } from '../datasource/SalesOrderRemoteDataSource';
import { SalesOrderMapper } from '../mapper/SalesOrderMapper';

/**
 * Translates domain operations into remote API calls.
 *
 * Mutation endpoints intentionally return acknowledgements rather than
 * complete aggregates, so this repository exposes Promise<void> for them.
 */
export class SalesOrderRepositoryImpl implements SalesOrderRepository {
  constructor(private readonly datasource: SalesOrderRemoteDataSource) {}

  async list(query?: SalesOrderListQuery): Promise<SalesOrderPage> {
    const response = await this.datasource.list(query);
    return SalesOrderMapper.toPage(response);
  }

  async getById(id: number): Promise<SalesOrder> {
    const response = await this.datasource.detail(id);
    return SalesOrderMapper.toDetail(response);
  }

  async related(id: number): Promise<RelatedSalesOrder[]> {
    const response = await this.datasource.related(id);
    return SalesOrderMapper.toRelated(response.records);
  }

  async create(input: CreateSalesOrder): Promise<SalesOrder> {
    const response = await this.datasource.create(input);
    return SalesOrderMapper.toDetail(response);
  }

  async update(id: number, input: UpdateSalesOrder): Promise<void> {
    await this.datasource.update(id, input);
  }

  async cancel(id: number): Promise<void> {
    await this.datasource.cancel(id);
  }

  async revertStatus(id: number, input: RevertSalesOrderInput): Promise<void> {
    await this.datasource.revertStatus(id, input);
  }

  async addLine(
    id: number,
    input: { itemId: number; quantityOrdered: number }
  ): Promise<void> {
    await this.datasource.addLine(id, input);
  }

  async updateLine(id: number, lineId: number, quantity: number): Promise<void> {
    await this.datasource.updateLine(id, lineId, quantity);
  }

  async deleteLine(id: number, lineId: number): Promise<void> {
    await this.datasource.deleteLine(id, lineId);
  }

  async adminShip(id: number): Promise<void> {
    await this.datasource.adminShip(id);
  }

  async partialFulfill(id: number, input: PartialFulfillInput): Promise<void> {
    await this.datasource.partialFulfill(id, input);
  }

  async adminPick(
    id: number,
    lines: Array<{ soLineId: number; binId: number; quantity: number }>
  ): Promise<void> {
    await this.datasource.adminPick(id, lines);
  }

  async createRma(id: number, input: CreateRmaInput): Promise<void> {
    await this.datasource.createRma(id, input);
  }

  async receiveReturn(id: number, input: ReceiveReturnInput): Promise<void> {
    await this.datasource.receiveReturn(id, input);
  }

  async voidReturn(id: number): Promise<void> {
    await this.datasource.voidReturn(id);
  }
}
