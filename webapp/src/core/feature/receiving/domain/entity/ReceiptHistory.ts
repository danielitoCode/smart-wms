export type ReceiptHistoryEntry = {
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

export type UnreceiveResult = {
  message: string;
  receiptId: number;
  poId: number;
  poStatus: 'OPEN' | 'PARTIAL' | 'RECEIVED';
  quantityReversed: number;
  binDecrements: Array<{ binId: number; quantity: number }>;
};
