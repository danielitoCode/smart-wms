import { describe, expect, it, vi } from 'vitest';
import { SalesOrderRepositoryImpl } from '../../../../../core/feature/sales-orders/data/repository/SalesOrderRepositoryImpl';
import type { SalesOrderRemoteDataSource } from '../../../../../core/feature/sales-orders/data/datasource/SalesOrderRemoteDataSource';
import type { SalesOrderDetailResponseDto } from '../../../../../core/feature/sales-orders/data/dto/SalesOrderDto';
import type { CreateSalesOrderInput } from '../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

const detailResponse = {
  sales_order: {
    so_id: 101,
    so_number: 'SO-101',
    so_barcode: 'SO-101-BARCODE',
    customer_name: 'Customer',
    customer_phone: '555',
    customer_email: 'customer@example.test',
    customer_address: 'Customer address',
    status: 'OPEN',
    priority: 0,
    warehouse_id: 2,
    order_type: 'sale',
    parent_so_id: null,
    parent_so_number: null,
    ship_method: 'GROUND',
    ship_address: 'Delivery address',
    order_date: '2026-11-01',
    ship_by_date: '2026-12-01',
    created_at: '2026-11-01T10:00:00Z',
    created_by: 'admin',
    carrier: null,
    tracking_number: null,
    shipped_at: null,
    shipped_date_local: null,
    printed_at: null,
    picked_at: null,
    packed_at: null,
    memo: 'memo',
    order_total: '0.00',
    customer_shipping_paid: null,
    source_system: null,
    order_origin: 'MARKETPLACE',
    cancellation_reason: null,
    backorder_opened_at: null,
    backorder_fulfillable_at: null
  },
  lines: [],
  pick_tasks: []
} as unknown as SalesOrderDetailResponseDto;

describe('SalesOrderRepositoryImpl contracts', () => {
  it('maps every supported create field to the backend snake-case DTO', async () => {
    const datasource = {
      create: vi.fn().mockResolvedValue(detailResponse)
    } as unknown as SalesOrderRemoteDataSource;
    const repository = new SalesOrderRepositoryImpl(datasource);
    const input: CreateSalesOrderInput = {
      soNumber: 'SO-101',
      soBarcode: 'SO-101-BARCODE',
      warehouseId: 2,
      customerName: 'Customer',
      customerEmail: 'customer@example.test',
      customerPhone: '555',
      customerAddress: 'Customer address',
      orderOrigin: 'MARKETPLACE',
      shipAddress: 'Delivery address',
      shipMethod: 'GROUND',
      shipByDate: '2026-12-01',
      memo: 'memo',
      lines: [{ itemId: 7, quantityOrdered: 3 }]
    };

    const order = await repository.create(input);

    expect(datasource.create).toHaveBeenCalledWith({
      so_number: 'SO-101',
      so_barcode: 'SO-101-BARCODE',
      warehouse_id: 2,
      customer_name: 'Customer',
      customer_email: 'customer@example.test',
      customer_phone: '555',
      customer_address: 'Customer address',
      order_origin: 'MARKETPLACE',
      ship_address: 'Delivery address',
      ship_method: 'GROUND',
      ship_by_date: '2026-12-01',
      memo: 'memo',
      lines: [{ item_id: 7, quantity_ordered: 3 }]
    });
    expect(order.salesOrderId).toBe(101);
    expect(order.orderDate).toBe('2026-11-01');
    expect(order.packedAt).toBeNull();
  });

  it('maps header update fields without renaming or dropping memo/origin/source metadata', async () => {
    const datasource = {
      update: vi.fn().mockResolvedValue(undefined)
    } as unknown as SalesOrderRemoteDataSource;
    const repository = new SalesOrderRepositoryImpl(datasource);

    await repository.update(101, {
      memo: 'new memo',
      orderOrigin: 'MARKETPLACE',
      sourceSystem: 'SHOPIFY',
      priority: 4,
      status: 'PICKED',
      trackingNumber: 'TRACK-1',
      carrier: 'UPS'
    });

    expect(datasource.update).toHaveBeenCalledWith(101, {
      memo: 'new memo',
      order_origin: 'MARKETPLACE',
      source_system: 'SHOPIFY',
      priority: 4,
      status: 'PICKED',
      tracking_number: 'TRACK-1',
      carrier: 'UPS'
    });
  });
});
