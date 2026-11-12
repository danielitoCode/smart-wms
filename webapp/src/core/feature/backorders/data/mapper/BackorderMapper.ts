import type {
    BackorderDto,
    BackorderInboundPurchaseOrderDto,
    BackorderItemDto
} from "#core/feature/backorders/data/dto/BackorderDto.ts";
import type {
    Backorder,
    BackorderInboundPurchaseOrder,
    BackorderItem
} from "#core/feature/backorders/domain/entity/Backorder.ts";

export const BackorderMapper = {
    toBackorder(dto: BackorderDto): Backorder {
        return {
            customerName: dto.customer_name,
            daysWaiting: dto.days_waiting,
            fulfillableSince: dto.fulfillable_since,
            items: dto.items.map( value => this.toBackorderItem(value)),
            openedAt:  dto.opened_at,
            parentSalesOrderId: dto.parent_sales_order_id,
            parentSalesOrderNumber: dto.parent_sales_order_number,
            salesOrderId: dto.sales_order_id,
            salesOrderNumber: dto.sales_order_number,
            status: dto.status,
            warehouseId: dto.warehouse_id

        }
    },

    toBackorderItem(dto: BackorderItemDto): BackorderItem {
        return {
            itemId: dto.item_id,
            itemName: dto.item_name,
            openPurchaseOrder: dto.open_purchase_order ? this.toBackorderInboundPurchaseOrder(dto.open_purchase_order) : null,
            quantity: dto.quantity,
            sku: dto.sku
        }
    },

    toBackorderInboundPurchaseOrder(dto: BackorderInboundPurchaseOrderDto): BackorderInboundPurchaseOrder {
        return {
            expectedDate: dto.expected_date,
            purchaseOrderNumber: dto.purchase_order_number,
            quantityRemaining: dto.quantity_remaining
        }
    }
}

