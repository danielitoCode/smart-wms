import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FraudReview, FraudReviewDetail } from '../../../../../core/feature/fraud/domain/entity/FraudReview';

const deps = vi.hoisted(() => ({
  list: { execute: vi.fn() },
  detail: { execute: vi.fn() },
  auditHistory: { execute: vi.fn() },
  updateMemo: { execute: vi.fn() },
  push: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/fraud/di/fraudReview.dependencies', () => ({
  createFraudReviewDependencies: () => deps
}));

import { createFraudReviewState } from '../../../../../core/feature/fraud/ui/state/fraudReviewState.svelte';

const row: FraudReview = {
  salesOrderId: 19, salesOrderNumber: 'SO-19', status: 'FRAUD_REVIEW',
  orderType: 'sale', orderSource: null, orderOrigin: null, warehouseId: 4,
  customerName: 'Customer', customerPhone: null, memo: 'previous', createdAt: null,
  billingAddressLine1: null, billingAddressLine2: null, billingAddressCity: null,
  billingAddressState: null, billingAddressPostalCode: null,
  shippingAddressLine1: null, shippingAddressLine2: null, shippingAddressCity: null,
  shippingAddressState: null, shippingAddressPostalCode: null
};

const detail: FraudReviewDetail = { order: row, sourceSystem: null, lines: [] };

describe('Fraud review UI state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.list.execute.mockResolvedValue({ items: [row], page: 2, perPage: 50, total: 51, pages: 2 });
    deps.detail.execute.mockResolvedValue(detail);
    deps.auditHistory.execute.mockResolvedValue({
      entries: [{ logId: 8, actionType: 'SO_MEMO_EDITED', username: 'operator', warehouseId: 4, details: {}, createdAt: null }],
      page: 1, perPage: 20, total: 1, pages: 1
    });
    deps.updateMemo.execute.mockResolvedValue(undefined);
    deps.push.execute.mockResolvedValue(undefined);
  });

  it('loads the requested warehouse and page and exposes pagination metadata', async () => {
    const state = createFraudReviewState();
    await state.load(4, 'SO-19', 2);
    expect(deps.list.execute).toHaveBeenCalledWith(4, 'SO-19', 2);
    expect(state.rows).toHaveLength(1);
    expect(state.page).toBe(2);
    expect(state.pages).toBe(2);
    expect(state.total).toBe(51);
  });

  it('loads scoped detail and audit history for the selected order', async () => {
    const state = createFraudReviewState();
    await state.load(4);
    await state.openDetail(19, 4);
    await Promise.resolve();
    await Promise.resolve();
    expect(deps.detail.execute).toHaveBeenCalledWith(19);
    expect(deps.auditHistory.execute).toHaveBeenCalledWith(19, 1);
    expect(state.auditEntries[0].actionType).toBe('SO_MEMO_EDITED');
    expect(state.auditTotal).toBe(1);
  });

  it('sends the memo version that was loaded to prevent stale overwrites', async () => {
    const state = createFraudReviewState();
    await state.load(4);
    await state.updateMemo(19, 'updated', 4);
    expect(deps.updateMemo.execute).toHaveBeenCalledWith(19, 'updated', 'previous');
    expect(state.rows[0].memo).toBe('updated');
  });

  it('does not open detail for an order from another warehouse', async () => {
    const state = createFraudReviewState();
    await state.load(4);
    await expect(state.openDetail(19, 5)).resolves.toBe(false);
    expect(deps.detail.execute).not.toHaveBeenCalled();
  });

  it('returns to the previous page when releasing the final row on a page', async () => {
    const state = createFraudReviewState();
    await state.load(4, '', 2);
    deps.list.execute
      .mockResolvedValueOnce({ items: [], page: 2, perPage: 50, total: 50, pages: 1 })
      .mockResolvedValueOnce({ items: [row], page: 1, perPage: 50, total: 50, pages: 1 });
    await state.push(19, 4);
    expect(deps.push.execute).toHaveBeenCalledWith(19);
    expect(deps.list.execute).toHaveBeenLastCalledWith(4, '', 1);
    expect(state.page).toBe(1);
  });
});
