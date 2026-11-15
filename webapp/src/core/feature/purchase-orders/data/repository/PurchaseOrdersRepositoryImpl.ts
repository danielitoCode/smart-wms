import type {
  AddPurchaseOrderLine, CreatePurchaseOrder, ListPurchaseOrdersParams, PurchaseOrder,
  PurchaseOrderPage, PurchaseOrderReceipt, UpdatePurchaseOrder
} from '../../domain/entity/PurchaseOrder';
import type { PurchaseOrdersRepository } from '../../domain/repository/PurchaseOrdersRepository';
import type { PurchaseOrdersRemoteDataSource } from '../datasource/PurchaseOrdersRemoteDataSource';
import { PurchaseOrderMapper as mapper } from '../mapper/PurchaseOrderMapper';

export class PurchaseOrdersRepositoryImpl implements PurchaseOrdersRepository {
  constructor(private readonly remote: PurchaseOrdersRemoteDataSource) {}

  async list(params: ListPurchaseOrdersParams = {}): Promise<PurchaseOrderPage> {
    const result = await this.remote.list(params);
    return {
      items: result.purchase_orders.map(order => mapper.header(order)),
      total: result.total, page: result.page, perPage: result.per_page, pages: result.pages
    };
  }

  async detail(id: number): Promise<PurchaseOrder> {
    const result = await this.remote.detail(id);
    return mapper.header(result.purchase_order, result.lines);
  }

  async create(input: CreatePurchaseOrder): Promise<PurchaseOrder> {
    const result = await this.remote.create(mapper.create(input));
    return mapper.header(result.purchase_order, result.lines);
  }

  update(id: number, input: UpdatePurchaseOrder): Promise<void> {
    return this.remote.update(id, mapper.update(input));
  }

  addLine(id: number, input: AddPurchaseOrderLine): Promise<void> {
    return this.remote.addLine(id, mapper.addLine(input));
  }

  updateLine(id: number, lineId: number, input: { quantityOrdered: number }): Promise<void> {
    return this.remote.updateLine(id, lineId, input.quantityOrdered);
  }

  deleteLine(id: number, lineId: number): Promise<void> {
    return this.remote.deleteLine(id, lineId);
  }

  async listReceipts(id: number): Promise<PurchaseOrderReceipt[]> {
    const result = await this.remote.listReceipts(id);
    return result.receipts.map(mapper.receipt);
  }

  close(id: number): Promise<void> { return this.remote.close(id); }
  reopen(id: number): Promise<void> { return this.remote.reopen(id); }
}
