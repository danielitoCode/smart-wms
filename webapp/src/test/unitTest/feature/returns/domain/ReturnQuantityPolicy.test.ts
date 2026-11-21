import { describe, expect, it } from 'vitest';
import { getReturnableQuantity, validateReturnRequest } from '../../../../../core/feature/returns/domain/policy/ReturnQuantityPolicy';
import type { ReturnableOrderLine } from '../../../../../core/feature/returns/domain/entity/ReturnableOrder';

const available: ReturnableOrderLine[] = [
  { originalSalesOrderLineId: 11, itemId: 4, sku: 'A', itemName: 'A', quantityShipped: 5, quantityAlreadyAuthorized: 2, quantityRemaining: 3 },
  { originalSalesOrderLineId: 12, itemId: 5, sku: 'B', itemName: 'B', quantityShipped: 1, quantityAlreadyAuthorized: 1, quantityRemaining: 0 }
];

describe('ReturnQuantityPolicy', () => {
  it('subtracts all prior non-voided RMA authorizations from shipped quantity', () => {
    expect(getReturnableQuantity(5, 2)).toBe(3);
    expect(getReturnableQuantity(1, 2)).toBe(0);
    expect(getReturnableQuantity(-1, 0)).toBe(0);
  });
  it('rejects empty, fractional, duplicate and over-limit requests', () => {
    expect(validateReturnRequest(available, [])).toMatchObject({ valid: false });
    expect(validateReturnRequest(available, [{ originalSalesOrderLineId: 11, itemId: 4, quantity: 1.5 }])).toMatchObject({ valid: false });
    expect(validateReturnRequest(available, [
      { originalSalesOrderLineId: 11, itemId: 4, quantity: 1 },
      { originalSalesOrderLineId: 11, itemId: 4, quantity: 1 }
    ])).toMatchObject({ valid: false });
    expect(validateReturnRequest(available, [{ originalSalesOrderLineId: 11, itemId: 4, quantity: 4 }])).toMatchObject({ valid: false });
    expect(validateReturnRequest(available, [{ originalSalesOrderLineId: 12, itemId: 5, quantity: 1 }])).toMatchObject({ valid: false });
    expect(validateReturnRequest([...available, { ...available[0], originalSalesOrderLineId: 13 }], [
      { originalSalesOrderLineId: 11, itemId: 4, quantity: 1 },
      { originalSalesOrderLineId: 13, itemId: 4, quantity: 1 }
    ])).toMatchObject({ valid: false });
  });
  it('accepts quantities within the remaining shipped allowance', () => {
    expect(validateReturnRequest(available, [{ originalSalesOrderLineId: 11, itemId: 4, quantity: 3 }])).toEqual({ valid: true });
  });
});
