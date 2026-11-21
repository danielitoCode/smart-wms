import { describe, expect, it } from 'vitest';
import { REFUND_BACKEND_CONTRACT, REFUND_CAPABILITIES, RefundCapabilityNotSupportedError } from '../../../../../core/feature/refunds/domain/contract/RefundLifecycleContract';
import { CreateRefundUseCase } from '../../../../../core/feature/refunds/domain/usecase/RefundUseCases';

describe('R7 refund capability gate', () => {
  it('keeps admin refund creation unsupported and read-only lookup supported', () => {
    expect(REFUND_CAPABILITIES.getRefund).toBe('SUPPORTED');
    expect(REFUND_CAPABILITIES.createRefund).toBe('NOT_SUPPORTED');
    expect(REFUND_BACKEND_CONTRACT.createRefund.path).toBe('/api/v1/pos/refund');
  });
  it('does not invoke a payment mutation from the admin application', () => {
    expect(() => new CreateRefundUseCase().execute()).toThrowError(RefundCapabilityNotSupportedError);
  });
});
