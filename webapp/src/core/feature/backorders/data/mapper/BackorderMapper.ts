import type { Backorder, BackorderItem, BackorderQueueTab } from '../../domain/entity/Backorder';
import type { BackorderDto } from '../dto/BackorderDto';

export const BackorderMapper = {
  toDomain(dto: BackorderDto): Backorder {
    const items: BackorderItem[] = dto.items.map((item) => ({
      itemId: null,
      sku: item.sku,
      itemName: item.item_name,
      quantity: item.qty,
      openPurchaseOrder: item.open_po === null ? null : {
        purchaseOrderNumber: item.open_po.po_number,
        expectedDate: item.open_po.expected_date,
        quantityRemaining: item.open_po.quantity_remaining
      }
    }));

    return {
      salesOrderId: dto.so_id,
      salesOrderNumber: dto.so_number,
      // The list contract exposes only parent_so_number, not parent_so_id.
      parentSalesOrderId: undefined,
      parentSalesOrderNumber: dto.parent_so_number,
      warehouseId: dto.warehouse_id,
      customerName: dto.customer_name,
      status: dto.status,
      orderType: dto.order_type,
      openedAt: dto.backorder_opened_at,
      fulfillableSince: dto.fulfillable_since,
      daysWaiting: dto.days_waiting,
      items
    };
  },

  tab(value: BackorderQueueTab): BackorderQueueTab {
    return value;
  }
};
