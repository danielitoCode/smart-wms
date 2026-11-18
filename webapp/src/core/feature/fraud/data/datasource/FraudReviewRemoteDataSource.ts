import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
  FraudAuditHistoryDto,
  FraudReviewDetailDto,
  FraudReviewListDto
} from '../dto/FraudReviewDto';

export class FraudReviewRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  list(warehouseId: number, query = '', page = 1): Promise<FraudReviewListDto> {
    const params = new URLSearchParams({
      status: 'FRAUD_REVIEW',
      warehouse_id: String(warehouseId),
      page: String(page),
      per_page: '50'
    });
    if (query.trim()) params.set('q', query.trim());
    return this.api.get<FraudReviewListDto>('/api/admin/sales-orders?' + params.toString());
  }

  getDetail(id: number): Promise<FraudReviewDetailDto> {
    return this.api.get<FraudReviewDetailDto>('/api/admin/sales-orders/' + id);
  }

  getAuditHistory(id: number, page = 1): Promise<FraudAuditHistoryDto> {
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    return this.api.get<FraudAuditHistoryDto>(
      '/api/admin/sales-orders/' + id + '/audit-history?' + params.toString()
    );
  }

  async updateMemo(id: number, memo: string, expectedMemo: string | null): Promise<void> {
    await this.api.request('/api/admin/sales-orders/' + id + '/memo', {
      method: 'PATCH',
      body: { memo, expected_memo: expectedMemo }
    });
  }

  async pushToQueue(id: number): Promise<void> {
    await this.api.post<unknown>('/api/admin/sales-orders/' + id + '/push-to-queue');
  }
}
