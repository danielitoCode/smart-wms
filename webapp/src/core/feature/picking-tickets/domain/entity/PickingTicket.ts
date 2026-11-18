export interface PickingTicketLine {
  salesOrderLineId: number;
  lineNumber: number | null;
  sku: string;
  itemName: string;
  upc: string | null;
  quantityOrdered: number;
  quantityShipped: number;
  preferredBinCode: string | null;
}
export interface PickingTicketOrder {
  salesOrderId: number;
  salesOrderNumber: string;
  customerName: string | null;
  status: string;
  warehouseId: number;
  shipMethod: string | null;
  legacyShippingAddress: string | null;
  orderDate: string | null;
  shipByDate: string | null;
  createdAt: string | null;
  shippingAddress: {
    name: string | null; line1: string | null; line2: string | null;
    city: string | null; state: string | null; postalCode: string | null; country: string | null;
  };
}
export interface PickingTicketBranding {
  logoUrl: string | null;
  companyName: string | null;
  companyAddress: string | null;
  returnsText: string | null;
}
export interface PickingTicket {
  order: PickingTicketOrder;
  lines: PickingTicketLine[];
  branding: PickingTicketBranding;
}
export interface MarkPrintedResult {
  marked: Array<{ salesOrderId: number; printedAt: string }>;
}
