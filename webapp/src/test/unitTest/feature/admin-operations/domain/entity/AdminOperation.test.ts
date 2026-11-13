import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AdminOperationKey,
  AdminOperationProjectionMap,
  AdminOperationResult,
  AdminOperationRow,
  BackorderProjection,
  PosActivityProjection
} from '../../../../../../core/feature/admin-operations/domain/entity/AdminOperation';

describe('AdminOperation domain contracts', () => {
  it('keeps each operation row bound to its own projection', () => {
    expectTypeOf<Extract<AdminOperationRow, { feature: 'backorders' }>['data']>()
      .toEqualTypeOf<BackorderProjection>();
    expectTypeOf<AdminOperationProjectionMap['pos-activity']>()
      .toEqualTypeOf<PosActivityProjection>();
    expectTypeOf<AdminOperationKey>().toEqualTypeOf<
      | 'backorders'
      | 'count-approvals'
      | 'fraud'
      | 'inter-warehouse-transfers'
      | 'adjustments'
      | 'pos-activity'
      | 'preferred-bins'
      | 'purchase-orders'
      | 'refunds'
      | 'returns'
      | 'transfer-orders'
      | 'users'
      | 'vendors'
    >();
    expect(true).toBe(true);
  });

  it('requires the POS summary only as a nullable POS-specific result field', () => {
    expectTypeOf<Extract<AdminOperationResult, { feature: 'pos-activity' }>['summary']>()
      .toMatchTypeOf<{ today: { netCents: number } } | null>();
    expectTypeOf<Extract<AdminOperationResult, { feature: 'vendors' }>['summary']>()
      .toEqualTypeOf<null>();
    expect(true).toBe(true);
  });
});
