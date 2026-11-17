import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
  RefundHeaderDto, RefundListDto, RefundDetailDto, RefundRelatedDto
} from '../dto/RefundDto';

export class RefundsRemoteDataSource {
  constructor(private api: ApiClient) {}

  async list(query: { status?: string; search?: string } = {}): Promise<RefundHeaderDto[]> {
    const params = new URLSearchParams({ order_type: 'refund', per_page: '100' });
    if (query.status) params.set('status', query.status);
    if (query.search?.trim()) params.set('q', query.search.trim());
    const response = await this.api.get<RefundListDto>('/api/admin/sales-orders?' + params);
    return response.sales_orders ?? [];
  }

  detail(id: number): Promise<RefundDetailDto> {
    return this.api.get<RefundDetailDto>('/api/admin/sales-orders/' + id);
  }

  related(id: number): Promise<RefundRelatedDto> {
    return this.api.get<RefundRelatedDto>('/api/admin/sales-orders/' + id + '/related');
  }
}
