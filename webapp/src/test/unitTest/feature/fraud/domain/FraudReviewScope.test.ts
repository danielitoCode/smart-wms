import { describe, expect, it } from 'vitest';
import { isFraudReviewInWarehouse } from '../../../../../core/feature/fraud/domain/entity/FraudReview';

describe('Fraud review warehouse consistency', () => {
  it('accepts an order only for the matching positive active warehouse', () => {
    expect(isFraudReviewInWarehouse({ warehouseId: 4 }, 4)).toBe(true);
    expect(isFraudReviewInWarehouse({ warehouseId: 4 }, 5)).toBe(false);
    expect(isFraudReviewInWarehouse({ warehouseId: 4 }, 0)).toBe(false);
  });
});
