export type RefundCapability = 'getRefund' | 'createRefund';
export type RefundCapabilityStatus = 'SUPPORTED' | 'NOT_SUPPORTED';

export const REFUND_CAPABILITIES: Readonly<Record<RefundCapability, RefundCapabilityStatus>> = {
  getRefund: 'SUPPORTED',
  createRefund: 'NOT_SUPPORTED'
} as const;

export class RefundCapabilityNotSupportedError extends Error {
  readonly code = 'R7_REFUND_CAPABILITY_NOT_SUPPORTED';
  constructor(readonly capability: RefundCapability) {
    super(`La operación ${capability} no está disponible desde la aplicación administrativa`);
    this.name = 'RefundCapabilityNotSupportedError';
  }
}

/**
 * Flask exposes POST /api/v1/pos/refund behind X-WMS-Token (POS token),
 * not the authenticated admin session. The Svelte admin API client cannot
 * execute that POS transaction. Admin sales-order GETs only read credit memos.
 */
export const REFUND_BACKEND_CONTRACT = {
  getRefund: { method: 'GET', path: '/api/admin/sales-orders/{refundId}', status: 'SUPPORTED', readOnly: true },
  listRefunds: { method: 'GET', path: '/api/admin/sales-orders?order_type=refund', status: 'SUPPORTED', readOnly: true },
  related: { method: 'GET', path: '/api/admin/sales-orders/{refundId}/related', status: 'SUPPORTED', readOnly: true },
  createRefund: { method: 'POST', path: '/api/v1/pos/refund', status: 'NOT_SUPPORTED', reason: 'Requiere X-WMS-Token POS y contrato de pago; no es un endpoint de sesión administrativa.' }
} as const;
