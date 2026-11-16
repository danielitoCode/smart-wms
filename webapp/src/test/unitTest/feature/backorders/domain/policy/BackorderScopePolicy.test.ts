import { describe, expect, it } from 'vitest';
import { resolveBackorderWarehouseScope } from '../../../../../core/feature/backorders/domain/policy/BackorderScopePolicy';

describe('resolveBackorderWarehouseScope', () => {
  it('sends the selected assigned warehouse for a scoped operator', () => {
    expect(resolveBackorderWarehouseScope({
      role: 'USER', allowedPages: ['backorders'], assignedWarehouseIds: [2, 3],
      selectedWarehouseId: 3
    })).toBe(3);
  });

  it('rejects a warehouse outside the operator assignment', () => {
    expect(() => resolveBackorderWarehouseScope({
      role: 'USER', allowedPages: ['backorders'], assignedWarehouseIds: [2],
      selectedWarehouseId: 9
    })).toThrow(/No tienes acceso/);
  });

  it('does not allow an unscoped request for a non-admin without warehouse browsing permission', () => {
    expect(() => resolveBackorderWarehouseScope({
      role: 'USER', allowedPages: ['backorders'], assignedWarehouseIds: [2],
      selectedWarehouseId: null
    })).toThrow(/Selecciona un almacén/);
  });

  it('allows unscoped browsing only to ADMIN or warehouse-browsing grants', () => {
    expect(resolveBackorderWarehouseScope({
      role: 'ADMIN', allowedPages: [], assignedWarehouseIds: [], selectedWarehouseId: null
    })).toBeNull();
    expect(resolveBackorderWarehouseScope({
      role: 'USER', allowedPages: ['backorders', 'warehouses'],
      assignedWarehouseIds: [], selectedWarehouseId: null
    })).toBeNull();
  });
});
