export type SalesOrderStatus =
  | 'OPEN' | 'FRAUD_REVIEW' | 'WAITING_STOCK' | 'PICKED' | 'PACKED'
  | 'SHIPPED' | 'REFUNDED' | 'CANCELLED' | 'PARTIALLY_RECEIVED'
  | 'RECEIVED' | 'CLOSED' | (string & {});

export type SalesOrderType =
  | 'sale' | 'refund' | 'backorder' | 'replacement' | 'exchange' | 'return'
  | (string & {});

export type SalesOrderAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
};

export type SalesOrderSummary = {
  salesOrderId: number;
  salesOrderNumber: string;
  barcode: string | null;
  warehouseId: number;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  status: SalesOrderStatus;
  orderType: SalesOrderType;
  parentSalesOrderId: number | null;
  shipMethod: string | null;
  shipByDate: string | null;
  createdAt: string | null;
  createdBy: string | null;
  priority: number;
  memo: string | null;
  carrier: string | null;
  trackingNumber: string | null;
};

export type SalesOrderLine = {
  soLineId: number;
  salesOrderId: number;
  itemId: number;
  lineNumber: number;
  sku: string | null;
  itemName: string | null;
  upc: string | null;
  quantityOrdered: number;
  quantityAllocated: number;
  quantityPicked: number;
  quantityPacked: number;
  quantityShipped: number;
  quantityReceived: number;
  status: string;
};

export type PickTask = {
  pickTaskId: number;
  soLineId: number;
  itemId: number;
  sku: string;
  itemName: string;
  binId: number;
  binCode: string;
  quantityPicked: number;
  pickedAt: string | null;
  pickedBy: string | null;
  status: string;
};

export type SalesOrder = SalesOrderSummary & {
  customerId: string | null;
  customerEmail: string | null;
  billingAddress: SalesOrderAddress;
  shippingAddress: SalesOrderAddress;
  shipAddress: string | null;
  orderDate: string | null;
  orderOrigin: string | null;
  sourceSystem: string | null;
  memo: string | null;
  orderTotal: string | null;
  customerShippingPaid: string | null;
  shippedDateLocal: string | null;
  shippedAt: string | null;
  orderType: SalesOrderType;
  parentSalesOrderNumber: string | null;
  cancellationReason: string | null;
  lines: SalesOrderLine[];
  pickTasks: PickTask[];
};

export type SalesOrderPage = {
  items: SalesOrderSummary[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
};

export type SalesOrderListQuery = {
  search?: string;
  status?: string;
  warehouseId?: number | null;
  page?: number;
  perPage?: number;
  excludePostFulfillment?: boolean;
};

export type CreateSalesOrderLine = { itemId: number; quantityOrdered: number; lineNumber?: number };
export type CreateSalesOrder = {
  salesOrderNumber: string;
  warehouseId: number;
  lines: CreateSalesOrderLine[];
  barcode?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  shipMethod?: string | null;
  shipAddress?: string | null;
  shipByDate?: string | null;
  memo?: string | null;
  orderOrigin?: string | null;
};

export type UpdateSalesOrder = Partial<Omit<CreateSalesOrder, 'lines' | 'warehouseId'>> & {
  priority?: number;
  status?: SalesOrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  sourceSystem?: string | null;
};

export type SalesOrderLineInput = { itemId: number; quantityOrdered: number };
export type PartialFulfillInput = {
  lines: Array<{ soLineId: number; shortQuantity: number }>;
  reasonDetail?: string | null;
};
export type RelatedSalesOrder = {
  soId: number;
  soNumber: string;
  status: string;
  orderType: string;
  parentSoId: number | null;
  depth: number;
  voidedAt: string | null;
};
export type SalesOrderDetail = {
  order: SalesOrder;
  related: RelatedSalesOrder[];
};

export type RevertSalesOrderInput = {
  newStatus: string;
  releasePickTaskIds: number[];
};

export type CreateRmaInput = {
  lines: Array<{ itemId: number; quantity: number; originalSoLineId?: number | null }>;
  memo?: string | null;
};

export type ReceiveReturnInput = {
  itemId: number;
  quantity: number;
  warehouseId: number;
  binId: number;
  notes?: string | null;
  idempotencyKey?: string;
};
