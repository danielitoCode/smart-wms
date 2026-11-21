export type ReturnableOrderLine = {
  originalSalesOrderLineId: number;
  itemId: number;
  sku: string;
  itemName: string;
  quantityShipped: number;
  quantityAlreadyAuthorized: number;
  quantityRemaining: number;
};

export type ReturnableOrder = {
  salesOrderId: number;
  salesOrderNumber: string;
  status: string;
  warehouseId: number;
  customerName: string | null;
  lines: ReturnableOrderLine[];
};
