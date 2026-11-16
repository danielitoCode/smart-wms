import { describe, expect, it } from 'vitest';
import { groupOrdersByAddress, shippingGroupKey } from '../../../../../../core/feature/picking-tickets/domain/policy/pickingGroups';
const order = (id: number, postalCode: string, shipByDate: string | null = null) => ({
  id, customerName: 'Acme', shipAddress: null, shipByDate,
  shippingAddress: { name: 'Receiving', line1: '12 Elm St.', line2: null, city: 'Miami', state: 'FL', postalCode, country: 'US' }
});
describe('Picking ticket shipping groups', () => {
  it('normalizes punctuation and ZIP+4 when identifying same destinations', () => {
    expect(shippingGroupKey(order(1, '33101-1234'))).toBe(shippingGroupKey(order(2, '33101')));
  });
  it('keeps unaddressed orders out of multi-order groups', () => {
    expect(groupOrdersByAddress([{
      customerName: null, shipAddress: null, shippingAddress: {
        name: null, line1: null, line2: null, city: null, state: null, postalCode: null
      }
    }])).toEqual([]);
  });
  it('groups only pairs or larger and sorts groups by earliest ship-by date', () => {
    const late = order(1, '33101', '2026-11-28');
    const latePeer = order(2, '33101', '2026-11-30');
    const early = order(3, '33102', '2026-11-18');
    const earlyPeer = order(4, '33102', '2026-11-21');
    const singleton = order(5, '33103', '2026-11-17');
    const groups = groupOrdersByAddress([late, singleton, early, latePeer, earlyPeer]);
    expect(groups.map((group) => group.orders.map((entry) => entry.id))).toEqual([[3, 4], [1, 2]]);
  });
});
