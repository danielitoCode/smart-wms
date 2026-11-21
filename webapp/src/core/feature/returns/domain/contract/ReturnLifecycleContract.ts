export type ReturnCapability =
  | 'createReturn'
  | 'getReturn'
  | 'approveRma'
  | 'receiveReturn'
  | 'classifyReturnedItem'
  | 'restockReturn'
  | 'voidReturn';

export type ReturnCapabilityStatus = 'SUPPORTED' | 'NOT_SUPPORTED';

export const RETURN_CAPABILITIES: Readonly<Record<ReturnCapability, ReturnCapabilityStatus>> = {
  createReturn: 'SUPPORTED',
  getReturn: 'SUPPORTED',
  approveRma: 'NOT_SUPPORTED',
  receiveReturn: 'SUPPORTED',
  classifyReturnedItem: 'NOT_SUPPORTED',
  restockReturn: 'NOT_SUPPORTED',
  voidReturn: 'SUPPORTED'
} as const;

export class ReturnCapabilityNotSupportedError extends Error {
  readonly code = 'R7_CAPABILITY_NOT_SUPPORTED';
  constructor(readonly capability: ReturnCapability) {
    super(`La operación ${capability} no está soportada por el backend actual`);
    this.name = 'ReturnCapabilityNotSupportedError';
  }
}

/**
 * ReceiveReturn is the only goods-in mutation currently exposed by Flask.
 * It writes item_receipts and increments inventory in the same transaction.
 * The destination bin is a location choice, NOT a condition classification.
 * There is no separate approve, classify, quarantine, discard or restock API.
 */
export const RETURN_BACKEND_CONTRACT = {
  createReturn: { method: 'POST', path: '/api/admin/sales-orders/{saleId}/create-rma', status: 'SUPPORTED', idempotent: false },
  getReturn: { method: 'GET', path: '/api/admin/sales-orders/{rmaId}', status: 'SUPPORTED' },
  listReturns: { method: 'GET', path: '/api/admin/sales-orders?order_type=return', status: 'SUPPORTED' },
  receiveReturn: { method: 'POST', path: '/api/admin/sales-orders/{rmaId}/receive-return', status: 'SUPPORTED', sideEffect: 'RECEIPT_AND_INVENTORY_RESTOCK' },
  voidReturn: { method: 'POST', path: '/api/admin/sales-orders/{rmaId}/void-return', status: 'SUPPORTED', permission: 'ADMIN' },
  approveRma: { status: 'NOT_SUPPORTED' },
  classifyReturnedItem: { status: 'NOT_SUPPORTED' },
  restockReturn: { status: 'NOT_SUPPORTED', note: 'El endpoint receive-return ya incrementa stock; no existe una decisión independiente de disposición.' }
} as const;
