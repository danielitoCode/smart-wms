import type {
  AddPurchaseOrderLine, CreatePurchaseOrder, ListPurchaseOrdersParams,
  PurchaseOrder, PurchaseOrderPage, PurchaseOrderReceipt, UpdatePurchaseOrder,
  UpdatePurchaseOrderLine
} from '../entity/PurchaseOrder';

export interface PurchaseOrdersRepository {
  list(params?: ListPurchaseOrdersParams): Promise<PurchaseOrderPage>;
  detail(id: number): Promise<PurchaseOrder>;
  create(input: CreatePurchaseOrder): Promise<PurchaseOrder>;
  update(id: number, input: UpdatePurchaseOrder): Promise<void>;
  addLine(id: number, input: AddPurchaseOrderLine): Promise<void>;
  updateLine(id: number, lineId: number, input: UpdatePurchaseOrderLine): Promise<void>;
  deleteLine(id: number, lineId: number): Promise<void>;
  listReceipts(id: number): Promise<PurchaseOrderReceipt[]>;
  close(id: number): Promise<void>;
  reopen(id: number): Promise<void>;
}
