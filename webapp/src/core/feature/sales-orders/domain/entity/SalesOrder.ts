/**
 * Sales-order domain model.
 *
 * This model represents the business concepts consumed by the sales-order
 * screens. Wire-format names stay in data/dto and are translated by the mapper.
 */
export type SalesOrderStatus =
  | 'OPEN' | 'FRAUD_REVIEW' | 'WAITING_STOCK' | 'PICKED' | 'PACKED'
  | 'SHIPPED' | 'CANCELLED' | 'REFUNDED' | string;

export interface SalesOrderLine {
  soLineId: number;
  lineId: number | null;
  lineNumber: number | null;
  itemId: number | null;
  sku: string;
  itemName: string;
  upc: string | null;
  quantityOrdered: number;
  quantityAllocated: number;
  quantityPicked: number;
  quantityPacked: number;
  quantityShipped: number;
  quantityReceived: number;
  status: string | null;
}

export interface SalesOrderAddress {
  name: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
}

export type SalesOrderAddressInput = Partial<SalesOrderAddress>;

export interface UpdateSalesOrderAddressInput {
  billingAddress?: SalesOrderAddressInput;
  shippingAddress?: SalesOrderAddressInput;
}

export interface AvailableSalesOrderBin {
  binId: number;
  binCode: string;
  zoneName: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  preferredPriority: number | null;
}

export interface SalesOrderPickTask {
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
}

export interface SalesOrder {
  salesOrderId: number;
  salesOrderNumber: string;
  soNumber: string;
  id: number;
  barcode: string | null;
  status: SalesOrderStatus;
  priority: number;
  warehouseId: number | null;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  shipAddress: string | null;
  shipMethod: string | null;
  shipByDate: string | null;
  orderType: string | null;
  orderOrigin: string | null;
  parentSalesOrderNumber: string | null;
  parentSoId: number | null;
  parentSoNumber: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  memo: string | null;
  orderTotal: number | null;
  customerShippingPaid: number | null;
  sourceSystem: string | null;
  cancellationReason: string | null;
  createdAt: string | null;
  pickedAt: string | null;
  shippedAt: string | null;
  shippedDateLocal: string | null;
  billingAddress: SalesOrderAddress;
  shippingAddress: SalesOrderAddress;
  lines: SalesOrderLine[];
  pickTasks: SalesOrderPickTask[];
}

export interface RelatedSalesOrderLine {
  soLineId: number;
  lineNumber: number | null;
  sku: string;
  itemName: string;
  quantityOrdered: number;
  quantityShipped: number;
  quantityReceived: number;
}

export interface RelatedSalesOrder {
  soId: number;
  soNumber: string;
  status: SalesOrderStatus;
  orderType: string | null;
  warehouseId: number | null;
  customerName: string | null;
  parentSoId: number | null;
  depth: number;
  isCurrent: boolean;
  isVoided: boolean;
  voidedAt: string | null;
  cancellationReason: string | null;
  createdAt: string | null;
  lines: RelatedSalesOrderLine[];
}

export interface SalesOrderPage {
  items: SalesOrder[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export interface CreateSalesOrderLineInput {
  itemId: number;
  quantityOrdered: number;
}

export interface CreateSalesOrderInput {
  soNumber: string;
  warehouseId: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  shipAddress?: string | null;
  shipMethod?: string | null;
  shipByDate?: string | null;
  memo?: string | null;
  orderOrigin?: string | null;
  lines: CreateSalesOrderLineInput[];
}

export type CreateSalesOrder = {
  salesOrderNumber: string;
  warehouseId: number;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shipAddress?: string | null;
  shipMethod?: string | null;
  shipByDate?: string | null;
  memo?: string | null;
  lines: CreateSalesOrderLineInput[];
};

export type UpdateSalesOrder = Partial<{
  salesOrderNumber: string;
  soNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  shipAddress: string | null;
  shipMethod: string | null;
  shipByDate: string | null;
  shippedAt: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  memo: string | null;
  orderOrigin: string | null;
  sourceSystem: string | null;
  priority: number;
  status: SalesOrderStatus;
}>;

export interface PartialFulfillInput {
  lines: Array<{ soLineId: number; shortQuantity: number }>;
  reason: string;
}

export interface RevertSalesOrderInput {
  newStatus: SalesOrderStatus;
  releasePickTaskIds: number[];
}

export interface CreateRmaInput {
  lines: Array<{ itemId: number; quantity: number; originalSoLineId?: number | null }>;
  reason?: string | null;
}

export interface ReceiveReturnInput {
  itemId: number;
  quantity: number;
  warehouseId: number;
  binId: number;
  notes?: string | null;
  idempotencyKey?: string | null;
}
