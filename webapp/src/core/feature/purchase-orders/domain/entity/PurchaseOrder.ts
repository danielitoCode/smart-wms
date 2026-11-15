export type PurchaseOrderStatus = 'OPEN' | 'PARTIAL' | 'RECEIVED' | 'CLOSED' | 'ARCHIVED';
export type PurchaseOrderLineStatus = 'PENDING' | 'PARTIAL' | 'RECEIVED';

export type PurchaseOrderLine = {
  poLineId: number;
  lineNumber: number;
  itemId: number;
  quantityOrdered: number;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number | null;
  status: PurchaseOrderLineStatus;
  sku?: string | null;
  itemName?: string | null;
  upc?: string | null;
  mpn?: string | null;
};

export type PurchaseOrder = {
  poId: number;
  poNumber: string;
  poBarcode: string | null;
  vendorId?: string | null;
  vendorName: string | null;
  status: PurchaseOrderStatus;
  expectedDate: string | null;
  warehouseId: number;
  notes: string | null;
  createdAt: string | null;
  receivedAt: string | null;
  createdBy: string | null;
  lines: PurchaseOrderLine[];
};

export type PurchaseOrderPage = {
  items: PurchaseOrder[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
};

export type PurchaseOrderReceipt = {
  receiptId: number;
  poLineId: number | null;
  lineNumber: number | null;
  itemId: number;
  sku: string;
  itemName: string;
  quantityReceived: number;
  binId: number;
  binCode: string;
  warehouseId: number;
  receivedBy: string;
  receivedAt: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  notes: string | null;
};

export type ListPurchaseOrdersParams = {
  warehouseId?: number | null;
  search?: string;
  status?: PurchaseOrderStatus | '';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
  includeArchived?: boolean;
};

export type CreatePurchaseOrderLine = {
  itemId: number;
  quantityOrdered: number;
  unitCost?: number | null;
};

export type CreatePurchaseOrder = {
  poNumber: string;
  warehouseId: number;
  lines: CreatePurchaseOrderLine[];
  poBarcode?: string | null;
  vendorName?: string | null;
  expectedDate?: string | null;
  notes?: string | null;
};

export type UpdatePurchaseOrder = Partial<
  Pick<PurchaseOrder, 'poNumber' | 'poBarcode' | 'vendorName' | 'expectedDate' | 'notes' | 'status'>
>;

export type AddPurchaseOrderLine = {
  itemId: number;
  quantityOrdered: number;
  unitCost?: number | null;
};

export type UpdatePurchaseOrderLine = {
  quantityOrdered: number;
};
