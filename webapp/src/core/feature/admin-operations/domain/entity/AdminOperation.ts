export type AdminOperationKey =
  | 'backorders'
  | 'count-approvals'
  | 'fraud'
  | 'inter-warehouse-transfers'
  | 'adjustments'
  | 'pos-activity'
  | 'preferred-bins'
  | 'purchase-orders'
  | 'refunds'
  | 'returns'
  | 'transfer-orders'
  | 'users'
  | 'vendors';

export type AdminOperationQuery = {
  warehouseId?: number | null;
  search?: string;
  tab?: 'waiting' | 'ready-to-ship';
  date?: string;
  status?: string;
  channel?: 'counter' | 'phone';
  terminalId?: string;
  cashierId?: string;
  sourceWarehouseId?: number;
  destinationWarehouseId?: number;
  active?: boolean;
  page?: number;
  perPage?: number;
};

export type BackorderItemProjection = {
  sku: string;
  itemName: string;
  quantity: number;
  openPurchaseOrder: {
    number: string;
    expectedDate: string | null;
    quantityRemaining: number;
  } | null;
};

export type BackorderProjection = {
  salesOrderNumber: string;
  parentSalesOrderNumber: string | null;
  customerName: string | null;
  status: string;
  daysWaiting: number;
  items: BackorderItemProjection[];
};

export type AdjustmentProjection = {
  adjustmentId: number;
  cycleCountId: number | null;
  sku: string;
  itemName: string;
  binCode: string;
  expectedQuantity: number | null;
  countedQuantity: number | null;
  quantityChange: number;
  reasonCode: string;
  reasonDetail: string | null;
  status: string;
  adjustedBy: string;
  adjustedAt: string | null;
};

export type SalesOrderProjection = {
  salesOrderNumber: string;
  parentSalesOrderNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  orderSource: string | null;
  status: string;
  createdAt: string | null;
  memo: string | null;
  orderTotal: number | null;
};

export type InterWarehouseTransferProjection = {
  transferId: number;
  sku: string;
  itemName: string;
  quantity: number;
  sourceWarehouseName: string;
  sourceWarehouseCode: string;
  sourceBinCode: string;
  destinationWarehouseName: string;
  destinationWarehouseCode: string;
  destinationBinCode: string;
  transferredBy: string;
  transferredAt: string | null;
  status: string;
};

export type PosActivityProjection = {
  salesOrderNumber: string;
  createdAt: string | null;
  channel: string;
  status: string;
  terminalId: string | null;
  customerName: string | null;
  totalCents: number;
  paymentMethod: string | null;
  externalTransactionReference: string | null;
  orderType: 'sale' | 'refund';
};

export type PreferredBinProjection = {
  sku: string;
  itemName: string;
  binCode: string;
  zoneName: string | null;
  priority: number;
  notes: string | null;
  updatedAt: string | null;
};

export type PurchaseOrderProjection = {
  purchaseOrderNumber: string;
  vendorName: string | null;
  warehouseId: number;
  status: string;
  expectedDate: string | null;
  createdAt: string | null;
  receivedAt: string | null;
  createdBy: string | null;
};

export type TransferOrderProjection = {
  transferOrderNumber: string;
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  status: string;
  createdBy: string;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UserProjection = {
  username: string;
  fullName: string;
  role: string;
  active: boolean;
  warehouseIds: number[];
  allowedFunctions: string[];
  createdAt: string | null;
  lastLogin: string | null;
};

export type VendorProjection = {
  vendorName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  paymentTerms: string | null;
  active: boolean | null;
};

export type AdminOperationProjectionMap = {
  backorders: BackorderProjection;
  'count-approvals': AdjustmentProjection;
  fraud: SalesOrderProjection;
  'inter-warehouse-transfers': InterWarehouseTransferProjection;
  adjustments: AdjustmentProjection;
  'pos-activity': PosActivityProjection;
  'preferred-bins': PreferredBinProjection;
  'purchase-orders': PurchaseOrderProjection;
  refunds: SalesOrderProjection;
  returns: SalesOrderProjection;
  'transfer-orders': TransferOrderProjection;
  users: UserProjection;
  vendors: VendorProjection;
};

export type AdminOperationRow = {
  [K in AdminOperationKey]: {
    feature: K;
    id: string | number;
    data: AdminOperationProjectionMap[K];
  }
}[AdminOperationKey];

export type AdminOperationPagination = {
  page: number;
  perPage: number;
  total: number;
  pages: number;
};

export type AdminOperationPosSummary = {
  date: string;
  isToday: boolean;
  today: {
    salesCount: number;
    refundCount: number;
    netCents: number;
    salesTotalCents: number;
    refundTotalCents: number;
    averageSaleCents: number;
    counterCents: number;
    counterCount: number;
    phoneCents: number;
    phoneCount: number;
  };
  week: { thisTotalCents: number; lastTotalCents: number };
  activeTerminals: string[];
  differenceFromYesterdayCents: number;
};

export type AdminOperationResult = {
  [K in AdminOperationKey]: {
    feature: K;
    rows: Extract<AdminOperationRow, { feature: K }>[];
    summary: K extends 'pos-activity' ? AdminOperationPosSummary | null : null;
    pagination: AdminOperationPagination | null;
  }
}[AdminOperationKey];
