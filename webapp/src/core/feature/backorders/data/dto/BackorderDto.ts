import type {BackorderStatus} from "#core/feature/backorders/domain/entity/Backorder.ts";

export type BackorderInboundPurchaseOrderDto = {
    purchase_order_id?: number;
    purchase_order_number: string;
    expected_date: string | null;
    quantity_remaining: number;
};

export type BackorderItemDto = {
    item_id: number;
    sku: string;
    item_name: string;
    quantity: number;
    open_purchase_order: BackorderInboundPurchaseOrderDto | null;
};

export type BackorderDto = {
    sales_order_id: number;
    sales_order_number: string;
    parent_sales_order_id: number;
    parent_sales_order_number: string;
    warehouse_id: number;
    customer_name: string | null;
    status: BackorderStatus;
    opened_at: string | null;
    fulfillable_since: string | null;
    days_waiting: number;
    cancellation_reason?: string | null;
    items: BackorderItemDto[];
};
