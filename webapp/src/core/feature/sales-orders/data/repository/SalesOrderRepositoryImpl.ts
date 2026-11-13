import type {
  CreateSalesOrderInput, SalesOrder, SalesOrderPage, UpdateSalesOrder,
  PartialFulfillInput, RevertSalesOrderInput, CreateRmaInput, ReceiveReturnInput,
  RelatedSalesOrder, UpdateSalesOrderAddressInput
} from '../../domain/entity/SalesOrder';
import type { ListSalesOrdersParams, SalesOrderRepository } from '../../domain/repository/SalesOrderRepository';
import type { SalesOrderRemoteDataSource } from '../datasource/SalesOrderRemoteDataSource';
import type { SalesOrderDetailResponseDto, SalesOrderDto } from '../dto/SalesOrderDto';
import { SalesOrderMapper } from '../mapper/SalesOrderMapper';

function toDetail(row: SalesOrderDetailResponseDto | SalesOrderDto): SalesOrder {
  const detail = row as Partial<SalesOrderDetailResponseDto>;
  if (detail.sales_order && Array.isArray(detail.lines) && Array.isArray(detail.pick_tasks)) {
    return SalesOrderMapper.toDetail(detail as SalesOrderDetailResponseDto);
  }
  return SalesOrderMapper.toDomain(row as SalesOrderDto);
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
      so_number: input.soNumber, warehouse_id: input.warehouseId,
      lines: input.lines.map(({ itemId, quantityOrdered }) => ({
        item_id: itemId, quantity_ordered: quantityOrdered
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
      shipByDate: 'ship_by_date', shippedAt: 'shipped_at',
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
  async updateAddress(id: number, input: UpdateSalesOrderAddressInput): Promise<void> {
    const addressFields: Record<string, string> = {
      name: 'name',
      line1: 'line1',
      line2: 'line2',
      city: 'city',
      state: 'state',
      postalCode: 'postal_code',
      country: 'country',
      phone: 'phone'
    };
    const payload: Record<string, string> = {};

    for (const [group, address] of Object.entries({
      billing: input.billingAddress,
      shipping: input.shippingAddress
    })) {
      if (!address) continue;

      for (const [field, value] of Object.entries(address)) {
        const apiField = addressFields[field];
        if (apiField && value !== null && value !== undefined) {
          payload[`${group}_address_${apiField}`] = value;
        }
      }
    }

    if (!Object.keys(payload).length) {
      throw new Error('No hay campos de dirección compatibles para actualizar');
    }

    await this.datasource.updateAddress(id, payload);
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
  partialFulfill(id: number, input: PartialFulfillInput): Promise<void> {
    return this.datasource.partialFulfill(id, input);
  }
  revertStatus(id: number, input: RevertSalesOrderInput): Promise<void> {
    return this.datasource.revertStatus(id, input);
  }
  async related(id: number): Promise<RelatedSalesOrder[]> {
    const response = await this.datasource.related(id);
    return SalesOrderMapper.toRelated(response.records);
  }
  createRma(id: number, input: CreateRmaInput): Promise<void> {
    return this.datasource.createRma(id, input);
  }
  receiveReturn(id: number, input: ReceiveReturnInput): Promise<void> {
    return this.datasource.receiveReturn(id, input);
  }
  voidReturn(id: number): Promise<void> { return this.datasource.voidReturn(id); }
}
