import { describe, expect, it } from 'vitest';
import { CustomerMapper } from '../../../../../../core/feature/customers/data/mapper/CustomerMapper';

describe('CustomerMapper', () => {
  it('maps the customer projection and its order count', () => {
    expect(CustomerMapper.fromSearchResult({
      type: 'customer',
      id: 'Acme Ltd',
      label: 'Acme Ltd',
      sublabel: '12 orders'
    })).toEqual({ id: 'Acme Ltd', name: 'Acme Ltd', orderCount: 12 });
  });

  it('supports singular order labels and rejects unrelated results', () => {
    expect(CustomerMapper.fromSearchResult({
      type: 'customer', id: 'A', label: 'A', sublabel: '1 order'
    }).orderCount).toBe(1);
    expect(() => CustomerMapper.fromSearchResult({
      type: 'item', id: 1, label: 'SKU-1', sublabel: 'Item'
    })).toThrow(/no válido/);
  });
});
