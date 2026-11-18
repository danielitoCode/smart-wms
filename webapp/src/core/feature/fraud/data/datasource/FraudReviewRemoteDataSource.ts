import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { FraudReviewDetailDto, FraudReviewDto, FraudReviewListDto } from '../dto/FraudReviewDto';

export class FraudReviewRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  async list(warehouseId: number, query = ''): Promise<FraudReviewDto[]> {
    const params = new URLSearchParams({
      status: 'FRAUD_REVIEW',
      warehouse_id: String(warehouseId),
      per_page: '100'
    });
    if (query.trim()) params.set('q', query.trim());
    const response = await this.api.get<FraudReviewListDto>(
      '/api/admin/sales-orders?' + params.toString()
    );
    return response.sales_orders ?? [];
  }

  getDetail(id: number): Promise<FraudReviewDetailDto> {
    return this.api.get<FraudReviewDetailDto>('/api/admin/sales-orders/' + id);
  }

  async updateMemo(id: number, memo: string): Promise<void> {
    await this.api.request('/api/admin/sales-orders/' + id + '/memo', {
      method: 'PATCH',
      body: { memo }
    });
  }

  async pushToQueue(id: number): Promise<void> {
    await this.api.post<unknown>('/api/admin/sales-orders/' + id + '/push-to-queue');
  }
}
