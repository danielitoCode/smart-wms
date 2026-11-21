import type { ReturnableOrderLine } from '../entity/ReturnableOrder';

export type RequestedReturnLine = {
  originalSalesOrderLineId: number;
  itemId: number;
  quantity: number;
};

export function getReturnableQuantity(quantityShipped: number, quantityAlreadyAuthorized: number): number {
  if (!Number.isSafeInteger(quantityShipped) || !Number.isSafeInteger(quantityAlreadyAuthorized)) return 0;
  return Math.max(0, quantityShipped - quantityAlreadyAuthorized);
}

export function validateReturnRequest(
  availableLines: ReturnableOrderLine[],
  requested: RequestedReturnLine[]
): { valid: boolean; reason?: string } {
  if (requested.length === 0) return { valid: false, reason: 'Selecciona al menos una línea para devolver' };
  const seen = new Set<number>();
  for (const line of requested) {
    if (!Number.isSafeInteger(line.originalSalesOrderLineId) || line.originalSalesOrderLineId <= 0 ||
        !Number.isSafeInteger(line.itemId) || line.itemId <= 0 ||
        !Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      return { valid: false, reason: 'Las cantidades e identificadores deben ser enteros positivos' };
    }
    if (seen.has(line.originalSalesOrderLineId)) return { valid: false, reason: 'No se puede repetir una línea original' };
    seen.add(line.originalSalesOrderLineId);
    const available = availableLines.find(x => x.originalSalesOrderLineId === line.originalSalesOrderLineId);
    if (!available || available.itemId !== line.itemId || line.quantity > available.quantityRemaining) {
      return { valid: false, reason: 'La cantidad supera lo enviado menos las devoluciones ya autorizadas' };
    }
  }
  return { valid: true };
}
