import { describe, expect, it } from 'vitest';
import { requiredPageKeysForPath, canAccessPages } from '../../../../../../core/feature/auth/domain/policy/AccessPolicy';
describe('Picking tickets route access', () => {
  it('requires the picking-tickets page grant for the list and direct print URLs', () => {
    expect(requiredPageKeysForPath('/picking-tickets')).toEqual(['picking-tickets']);
    expect(requiredPageKeysForPath('/picking-tickets/42/print')).toEqual(['picking-tickets']);
    expect(requiredPageKeysForPath('/picking-tickets/print-all?so_ids=42')).toEqual(['picking-tickets']);
  });
  it('allows only administrators or users with the page permission', () => {
    expect(canAccessPages('USER', [], ['picking-tickets'])).toBe(false);
    expect(canAccessPages('USER', ['picking-tickets'], ['picking-tickets'])).toBe(true);
    expect(canAccessPages('ADMIN', [], ['picking-tickets'])).toBe(true);
  });
});
