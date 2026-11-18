/**
 * RMA projection over a child SalesOrder (order_type='return').
 * Physical goods-in receipts are persisted in item_receipts.
 */
import type { SalesOrder, SalesOrderLine } from '../../../sales-orders/domain/entity/SalesOrder';

export type ReturnStatus = 'OPEN' | 'PARTIALLY_RECEIVED' | 'RECEIVED';
export type ReturnLine = SalesOrderLine & { originalSalesOrderLineId: number | null };

export interface ReturnReceipt {
  receiptId: number; soLineId: number | null; itemId: number; sku: string; itemName: string;
  quantityReceived: number; binId: number; binCode: string; warehouseId: number;
  warehouseCode: string; receivedBy: string; receivedAt: string | null; notes: string | null;
}

export type Return = Omit<SalesOrder, 'orderType' | 'lines' | 'status' | 'externalId'> & {
  orderType: 'return'; status: ReturnStatus; parentSalesOrderId: number | null;
  parentSalesOrderNumber: string | null; lines: ReturnLine[]; receipts: ReturnReceipt[];
  voidedAt: string | null; voidedBy: string | null;
};
export type CreateReturnLine = { itemId: number; quantity: number; originalSalesOrderLineId?: number | null };
/** RMA creation maps reason/notes to sales_orders.memo in the current API contract. */
export type CreateReturn = { lines: CreateReturnLine[]; memo?: string | null };
export type ReceiveReturn = { itemId:number; quantity:number; warehouseId:number; binId:number; notes?:string|null; idempotencyKey?:string|null };
export type ReturnWarehouseOption = {warehouseId:number;warehouseCode:string;warehouseName:string};
export type ReturnBinOption = {binId:number;binCode:string;warehouseId:number;zoneName?:string|null};
