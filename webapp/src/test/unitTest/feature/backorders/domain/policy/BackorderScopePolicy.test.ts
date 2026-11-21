import { describe, expect, it } from 'vitest';
import { isBackorderQueueContextCurrent, resolveBackorderWarehouseScope } from '../../../../../../core/feature/backorders/domain/policy/BackorderScopePolicy';

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


describe('backorder cancellation queue context', () => {
  it('invalidates a confirmation when the selected warehouse changes, including for admins', () => {
    expect(isBackorderQueueContextCurrent({
      openedWarehouseId: 3, openedTab: 'waiting', selectedWarehouseId: 4, activeTab: 'waiting'
    })).toBe(false);
  });

  it('invalidates a confirmation when the active queue tab changes', () => {
    expect(isBackorderQueueContextCurrent({
      openedWarehouseId: null, openedTab: 'waiting', selectedWarehouseId: null, activeTab: 'ready-to-ship'
    })).toBe(false);
  });

  it('keeps the confirmation valid only while its original queue context is unchanged', () => {
    expect(isBackorderQueueContextCurrent({
      openedWarehouseId: 3, openedTab: 'ready-to-ship', selectedWarehouseId: 3, activeTab: 'ready-to-ship'
    })).toBe(true);
  });
});
