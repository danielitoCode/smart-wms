import type {
  CreateSalesOrderInput, SalesOrder, SalesOrderPage, UpdateSalesOrder,
  PartialFulfillInput, RevertSalesOrderInput, CreateRmaInput, ReceiveReturnInput,
  RelatedSalesOrder, UpdateSalesOrderAddressInput, AvailableSalesOrderBin,
  UpdateSalesOrderAllocationInput, UpdateSalesOrderAllocationResult, AdminShipResult
} from '../../domain/entity/SalesOrder';
import type { ListSalesOrdersParams, SalesOrderRepository } from '../../domain/repository/SalesOrderRepository';
import type { SalesOrderRemoteDataSource } from '../datasource/SalesOrderRemoteDataSource';
import type {
  CreateSalesOrderRequestDto, UpdateSalesOrderRequestDto,
  UpdateSalesOrderAddressRequestDto, AdminPickRequestDto,
  PartialFulfillRequestDto, RevertSalesOrderStatusRequestDto,
  CreateRmaRequestDto, ReceiveRmaRequestDto
} from '../dto/SalesOrderDto';
import { SalesOrderMapper } from '../mapper/SalesOrderMapper';


export class SalesOrderRepositoryImpl implements SalesOrderRepository {
  constructor(private readonly datasource: SalesOrderRemoteDataSource) {}
  async list(params?: ListSalesOrdersParams): Promise<SalesOrder[]> {
    return (await this.listPage(params)).items;
  }
  async listPage(params?: ListSalesOrdersParams): Promise<SalesOrderPage> {
    return SalesOrderMapper.toPage(await this.datasource.list(params));
  }
  async listSourceSystems(): Promise<import('../../domain/entity/SalesOrder').SalesOrderSourceSystem[]> {
    const response = await this.datasource.listSourceSystems();
    return response.source_systems.map((entry) => ({
      sourceSystem: entry.source_system,
      kind: entry.kind
    }));
  }
  async getById(id: number): Promise<SalesOrder> {
    return SalesOrderMapper.toDetail(await this.datasource.getById(id));
  }
  async create(input: CreateSalesOrderInput): Promise<SalesOrder> {
    const payload: CreateSalesOrderRequestDto = {
      so_number: input.soNumber,
      warehouse_id: input.warehouseId,
      lines: input.lines.map(({ itemId, quantityOrdered }) => ({
        item_id: itemId,
        quantity_ordered: quantityOrdered
      }))
    };
    if (input.customerName != null && input.customerName !== '') payload.customer_name = input.customerName;
    if (input.customerEmail != null && input.customerEmail !== '') payload.customer_email = input.customerEmail;
    if (input.customerPhone != null && input.customerPhone !== '') payload.customer_phone = input.customerPhone;
    if (input.customerAddress != null && input.customerAddress !== '') payload.customer_address = input.customerAddress;
    if (input.shipAddress != null && input.shipAddress !== '') payload.ship_address = input.shipAddress;
    if (input.shipMethod != null && input.shipMethod !== '') payload.ship_method = input.shipMethod;
    if (input.shipByDate != null && input.shipByDate !== '') payload.ship_by_date = input.shipByDate;
    if (input.memo != null && input.memo !== '') payload.memo = input.memo;
    if (input.orderOrigin != null && input.orderOrigin !== '') payload.order_origin = input.orderOrigin;
    return SalesOrderMapper.toDetail(await this.datasource.create(payload));
  }
  async update(id: number, input: UpdateSalesOrder): Promise<void> {
    const payload: UpdateSalesOrderRequestDto = {};
    if (input.salesOrderNumber !== undefined) payload.so_number = input.salesOrderNumber;
    else if (input.soNumber !== undefined) payload.so_number = input.soNumber;
    if (input.customerName !== undefined) payload.customer_name = input.customerName;
    if (input.customerPhone !== undefined) payload.customer_phone = input.customerPhone;
    if (input.customerEmail !== undefined) payload.customer_email = input.customerEmail;
    if (input.customerAddress !== undefined) payload.customer_address = input.customerAddress;
    if (input.shipAddress !== undefined) payload.ship_address = input.shipAddress;
    if (input.shipMethod !== undefined) payload.ship_method = input.shipMethod;
    if (input.shipByDate !== undefined) payload.ship_by_date = input.shipByDate;
    if (input.shippedAt !== undefined) payload.shipped_at = input.shippedAt;
    if (input.trackingNumber !== undefined) payload.tracking_number = input.trackingNumber;
    if (input.carrier !== undefined) payload.carrier = input.carrier;
    if (input.memo !== undefined) payload.memo = input.memo;
    if (input.orderOrigin !== undefined) payload.order_origin = input.orderOrigin;
    if (input.sourceSystem !== undefined) payload.source_system = input.sourceSystem;
    if (input.priority !== undefined) payload.priority = input.priority;
    if (input.status !== undefined) payload.status = input.status;
    if (!Object.keys(payload).length) throw new Error('No hay campos compatibles para actualizar');
    await this.datasource.update(id, payload);
  }
  async updateAddress(id: number, input: UpdateSalesOrderAddressInput): Promise<void> {
    const addressFields = {
      name: 'name', line1: 'line1', line2: 'line2', city: 'city',
      state: 'state', postalCode: 'postal_code', country: 'country', phone: 'phone'
    } as const;
    const payload: UpdateSalesOrderAddressRequestDto = {};
    for (const [group, address] of Object.entries({
      billing: input.billingAddress,
      shipping: input.shippingAddress
    })) {
      if (!address) continue;
      for (const [field, value] of Object.entries(address)) {
        const apiField = addressFields[field as keyof typeof addressFields];
        if (!apiField || value === null || value === undefined) continue;
        const key = (group + '_address_' + apiField) as keyof UpdateSalesOrderAddressRequestDto;
        payload[key] = value;
      }
    }
    if (!Object.keys(payload).length) {
      throw new Error('No hay campos de dirección compatibles para actualizar');
    }
    await this.datasource.updateAddress(id, payload);
  }
  async updateAllocation(id: number, lineId: number, input: UpdateSalesOrderAllocationInput): Promise<UpdateSalesOrderAllocationResult> {
    const response = await this.datasource.updateAllocation(id, lineId, input);
    return {
      soLineId: response.so_line_id,
      quantityAllocated: response.quantity_allocated,
      unchanged: response.unchanged ?? false
    };
  }
  async cancel(id: number): Promise<SalesOrder> {
    await this.datasource.cancel(id);
    return this.getById(id);
  }
  addLine(id: number, input: { itemId: number; quantityOrdered: number }): Promise<void> {
    return this.datasource.addLine(id, { item_id: input.itemId, quantity_ordered: input.quantityOrdered });
  }
  updateLine(id: number, lineId: number, quantity: number): Promise<void> {
    return this.datasource.updateLine(id, lineId, { quantity_ordered: quantity });
  }
  deleteLine(id: number, lineId: number): Promise<void> { return this.datasource.deleteLine(id, lineId); }
  async adminShip(id: number, acknowledgeShortfall = false): Promise<AdminShipResult> {
    const response = await this.datasource.adminShip(id, { acknowledge_shortfall: acknowledgeShortfall });
    return {
      fulfillmentId: response.fulfillment_id,
      linesShipped: response.lines_shipped,
      totalQuantity: response.total_quantity
    };
  }
  async getAvailableBins(id: number, lineId: number): Promise<AvailableSalesOrderBin[]> {
    const response = await this.datasource.getAvailableBins(id, lineId);
    return response.bins.map((bin) => ({
      binId: bin.bin_id,
      binCode: bin.bin_code,
      zoneName: bin.zone_name,
      quantityOnHand: bin.quantity_on_hand,
      quantityAllocated: bin.quantity_allocated,
      quantityAvailable: bin.quantity_available,
      preferredPriority: bin.preferred_priority
    }));
  }
  adminPick(id: number, lines: Array<{ soLineId: number; binId: number; quantity: number }>): Promise<void> {
    const payload: AdminPickRequestDto = {
      lines: lines.map(({ soLineId, binId, quantity }) => ({
        so_line_id: soLineId, bin_id: binId, quantity
      }))
    };
    return this.datasource.adminPick(id, payload);
  }
  partialFulfill(id: number, input: PartialFulfillInput): Promise<void> {
    const payload: PartialFulfillRequestDto = {
      lines: input.lines.map(({ soLineId, shortQuantity }) => ({ so_line_id: soLineId, short_qty: shortQuantity })),
      reason_detail: input.reason
    };
    return this.datasource.partialFulfill(id, payload);
  }
  revertStatus(id: number, input: RevertSalesOrderInput): Promise<void> {
    const payload: RevertSalesOrderStatusRequestDto = {
      new_status: input.newStatus,
      release_pick_task_ids: input.releasePickTaskIds
    };
    return this.datasource.revertStatus(id, payload);
  }
  async related(id: number): Promise<RelatedSalesOrder[]> {
    const response = await this.datasource.related(id);
    return SalesOrderMapper.toRelated(response.records);
  }
  createRma(id: number, input: CreateRmaInput): Promise<void> {
    const payload: CreateRmaRequestDto = {
      lines: input.lines.map((line) => ({
        item_id: line.itemId, quantity: line.quantity,
        ...(line.originalSoLineId == null ? {} : { original_so_line_id: line.originalSoLineId })
      })),
      memo: input.reason ?? null
    };
    return this.datasource.createRma(id, payload);
  }
  receiveReturn(id: number, input: ReceiveReturnInput): Promise<void> {
    const payload: ReceiveRmaRequestDto = {
      item_id: input.itemId, quantity: input.quantity,
      warehouse_id: input.warehouseId, bin_id: input.binId,
      ...(input.notes == null ? {} : { notes: input.notes }),
      ...(input.idempotencyKey == null ? {} : { idempotency_key: input.idempotencyKey })
    };
    return this.datasource.receiveReturn(id, payload);
  }
  voidReturn(id: number): Promise<void> { return this.datasource.voidReturn(id); }
}
