import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { PickingTicketRemoteDataSource } from '../../../../../core/feature/picking-tickets/data/datasource/PickingTicketRemoteDataSource';
function apiMock() {
  return { get: vi.fn().mockResolvedValue({}), post: vi.fn().mockResolvedValue({}) } as unknown as ApiClient;
}
describe('PickingTicketRemoteDataSource', () => {
  it('uses the real sales-order picking-ticket GET endpoint', async () => {
    const api = apiMock();
    await new PickingTicketRemoteDataSource(api).getTicket(37);
    expect(api.get).toHaveBeenCalledWith('/api/admin/sales-orders/37/picking-ticket');
  });
  it('posts a batch of sales-order ids to mark-printed', async () => {
    const api = apiMock();
    await new PickingTicketRemoteDataSource(api).markPrinted([37, 38]);
    expect(api.post).toHaveBeenCalledWith('/api/admin/sales-orders/mark-printed', { so_ids: [37, 38] });
  });
  it('propagates mark-printed failures for the UI to expose and retry', async () => {
    const api = apiMock();
    vi.mocked(api.post).mockRejectedValueOnce(new Error('server unavailable'));
    await expect(new PickingTicketRemoteDataSource(api).markPrinted([37])).rejects.toThrow('server unavailable');
  });
});
