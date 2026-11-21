import type { Return, ReturnBinOption, ReturnReceipt, ReturnWarehouseOption } from '../entity/Return';
import type { ReturnableOrderLine } from '../entity/ReturnableOrder';

export interface ReturnsRepository {
  list(q?: { status?: string; search?: string }): Promise<Return[]>;
  originals(search?: string): Promise<{ salesOrderId: number; salesOrderNumber: string; customerName: string | null; warehouseId: number; status: string }[]>;
  returnableOrder(id: number): Promise<{ salesOrderId: number; salesOrderNumber: string; customerName: string | null; warehouseId: number; status: string; lines: ReturnableOrderLine[] }>;
  createReturn(id: number, value: { lines: { itemId: number; quantity: number; originalSalesOrderLineId: number }[]; memo?: string | null }): Promise<{ so_id: number; so_number: string; message?: string }>;
  detail(id: number): Promise<Return>;
  saveMemo(id: number, memo: string): Promise<void>;
  receive(id: number, v: { itemId: number; quantity: number; warehouseId: number; binId: number; notes?: string | null; idempotencyKey: string }): Promise<{ receipt_id: number; status: string; replayed?: boolean }>;
  void(id: number): Promise<void>;
  warehouses(): Promise<ReturnWarehouseOption[]>;
  bins(warehouseId: number, query: string): Promise<ReturnBinOption[]>;
  receipts(id: number): Promise<ReturnReceipt[]>;
}
