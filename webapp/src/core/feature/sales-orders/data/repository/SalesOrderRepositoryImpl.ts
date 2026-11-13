import type {
  CreateSalesOrderInput, SalesOrder, SalesOrderPage, UpdateSalesOrder,
  PartialFulfillInput, RevertSalesOrderInput, CreateRmaInput, ReceiveReturnInput
} from '../../domain/entity/SalesOrder';
import type { ListSalesOrdersParams, SalesOrderRepository } from '../../domain/repository/SalesOrderRepository';
import type { SalesOrderRemoteDataSource } from '../datasource/SalesOrderRemoteDataSource';
import { SalesOrderMapper } from '../mapper/SalesOrderMapper';

function toDetail(row: Awaited<ReturnType<SalesOrderRemoteDataSource['getById']>>): SalesOrder {
  if ('sales_order' in row && row.sales_order) return SalesOrderMapper.toDetail(row);
  return SalesOrderMapper.toDomain(row);
}

export class SalesOrderRepositoryImpl implements SalesOrderRepository {
  constructor(private readonly datasource: SalesOrderRemoteDataSource) {}

  async list(params?: ListSalesOrdersParams): Promise<SalesOrder[]> {
    return (await this.listPage(params)).items;
  }

  async listPage(params?: ListSalesOrdersParams): Promise<SalesOrderPage> {
    return SalesOrderMapper.toPage(await this.datasource.list(params));
  }

  async getById(id: number): Promise<SalesOrder> {
    return toDetail(await this.datasource.getById(id));
  }

  async create(input: CreateSalesOrderInput): Promise<SalesOrder> {
    const payload: Record<string, unknown> = {
      so_number: input.soNumber,
      warehouse_id: input.warehouseId,
      lines: input.lines.map((line) => ({
        item_id: line.itemId, quantity_ordered: line.quantityOrdered
      }))
    };
    const optionalFields: Array<[string, string | null | undefined]> = [
      ['customer_name', input.customerName], ['customer_email', input.customerEmail],
      ['customer_phone', input.customerPhone], ['customer_address', input.customerAddress],
      ['ship_address', input.shipAddress], ['ship_method', input.shipMethod],
      ['ship_by_date', input.shipByDate], ['memo', input.memo], ['order_origin', input.orderOrigin]
    ];
    for (const [key, value] of optionalFields) if (value != null && value !== '') payload[key] = value;
    return toDetail(await this.datasource.create(payload));
  }

  async update(id: number, input: UpdateSalesOrder): Promise<void> {
    const fields: Record<string, string> = {
      salesOrderNumber: 'so_number', soNumber: 'so_number',
      customerName: 'customer_name', customerPhone: 'customer_phone',
      customerEmail: 'customer_email', customerAddress: 'customer_address',
      shipAddress: 'ship_address', shipMethod: 'ship_method',
      shipByDate: 'ship_by_date', shippedAt: 'shipped_date_local',
      trackingNumber: 'tracking_number', carrier: 'carrier', memo: 'memo',
      orderOrigin: 'order_origin', sourceSystem: 'source_system',
      priority: 'priority', status: 'status'
    };
    const payload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      const apiKey = fields[key];
      if (apiKey) payload[apiKey] = value;
    }
    if (!Object.keys(payload).length) throw new Error('No hay campos compatibles para actualizar');
    await this.datasource.update(id, payload);
  }

  async cancel(id: number): Promise<SalesOrder> {
    await this.datasource.cancel(id);
    return this.getById(id);
  }

  addLine(id: number, input: { itemId: number; quantityOrdered: number }): Promise<void> {
    return this.datasource.addLine(id, { item_id: input.itemId, quantity_ordered: input.quantityOrdered });
  }
  updateLine(id: number, lineId: number, quantity: number): Promise<void> {
    return this.datasource.updateLine(id, lineId, quantity);
  }
  deleteLine(id: number, lineId: number): Promise<void> { return this.datasource.deleteLine(id, lineId); }
  adminShip(id: number): Promise<void> { return this.datasource.adminShip(id); }
  adminPick(id: number, lines: Array<{ soLineId: number; binId: number; quantity: number }>): Promise<void> {
    return this.datasource.adminPick(id, lines);
  }
  partialFulfill(id: number, input: PartialFulfillInput): Promise<void> { return this.datasource.partialFulfill(id, input); }
  revertStatus(id: number, input: RevertSalesOrderInput): Promise<void> { return this.datasource.revertStatus(id, input); }
  related(id: number): Promise<unknown> { return this.datasource.related(id); }
  createRma(id: number, input: CreateRmaInput): Promise<void> { return this.datasource.createRma(id, input); }
  receiveReturn(id: number, input: ReceiveReturnInput): Promise<void> { return this.datasource.receiveReturn(id, input); }
  voidReturn(id: number): Promise<void> { return this.datasource.voidReturn(id); }
}
