import { describe, expect, it } from 'vitest';
import { resolveBackorderWarehouseScope } from '../../../../../../core/feature/backorders/domain/policy/BackorderScopePolicy';

describe('resolveBackorderWarehouseScope', () => {
  it('sends the selected assigned warehouse for a scoped operator', () => {
    expect(resolveBackorderWarehouseScope({
      role: 'USER', assignedWarehouseIds: [2, 3], selectedWarehouseId: 3
    })).toBe(3);
  });

  it('rejects a warehouse outside the operator assignment', () => {
    expect(() => resolveBackorderWarehouseScope({
      role: 'USER', assignedWarehouseIds: [2], selectedWarehouseId: 9
    })).toThrow(/No tienes acceso/);
  });

  it('does not allow an unscoped request for a non-admin', () => {
    expect(() => resolveBackorderWarehouseScope({
      role: 'USER', assignedWarehouseIds: [2], selectedWarehouseId: null
    })).toThrow(/Selecciona un almacén/);
  });

  it('rejects non-positive selected warehouse identifiers', () => {
    expect(() => resolveBackorderWarehouseScope({
      role: 'USER', assignedWarehouseIds: [2], selectedWarehouseId: 0
    })).toThrow(/no es válido/);
  });

  it('allows unscoped browsing only to ADMIN', () => {
    expect(resolveBackorderWarehouseScope({
      role: 'ADMIN', assignedWarehouseIds: [], selectedWarehouseId: null
    })).toBeNull();
  });

  it('allows ADMIN to select one warehouse without an assignment', () => {
    expect(resolveBackorderWarehouseScope({
      role: 'ADMIN', assignedWarehouseIds: [], selectedWarehouseId: 9
    })).toBe(9);
  });
});


import { canCancelBackorder } from '../../../../../core/feature/backorders/domain/policy/BackorderScopePolicy';

describe('canCancelBackorder', () => {
  it('allows only explicit child backorders with a parent order number', () => {
    expect(canCancelBackorder({
      orderType: 'backorder', parentSalesOrderNumber: 'SO-10'
    } as never)).toBe(true);
  });

  it.each(['sale', 'replacement', 'exchange', 'refund', 'return'])(
    'does not expose cancel for POS/post-fulfillment order type %s',
    (orderType) => {
      expect(canCancelBackorder({
        orderType, parentSalesOrderNumber: 'SO-10'
      } as never)).toBe(false);
    }
  );

  it('does not expose cancel for a POS shortage without a parent', () => {
    expect(canCancelBackorder({
      orderType: 'sale', parentSalesOrderNumber: null
    } as never)).toBe(false);
  });
});
