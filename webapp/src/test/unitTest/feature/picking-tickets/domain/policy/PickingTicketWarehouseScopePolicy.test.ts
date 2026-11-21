import { describe, expect, it } from 'vitest';
import { canViewPickingTicketInWarehouse } from '../../../../../../core/feature/picking-tickets/domain/policy/PickingTicketWarehouseScopePolicy';

describe('canViewPickingTicketInWarehouse', () => {
  it('requires the selected warehouse to match the ticket for non-admin users', () => {
    expect(canViewPickingTicketInWarehouse({ role: 'USER', selectedWarehouseId: 4, ticketWarehouseId: 4 })).toBe(true);
    expect(canViewPickingTicketInWarehouse({ role: 'USER', selectedWarehouseId: 4, ticketWarehouseId: 9 })).toBe(false);
    expect(canViewPickingTicketInWarehouse({ role: 'USER', selectedWarehouseId: null, ticketWarehouseId: 4 })).toBe(false);
  });

  it('allows ADMIN global ticket access but rejects invalid ticket warehouse IDs', () => {
    expect(canViewPickingTicketInWarehouse({ role: 'ADMIN', selectedWarehouseId: null, ticketWarehouseId: 4 })).toBe(true);
    expect(canViewPickingTicketInWarehouse({ role: 'ADMIN', selectedWarehouseId: null, ticketWarehouseId: 0 })).toBe(false);
  });
});
