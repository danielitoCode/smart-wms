import type { ApiClient } from '#core/infrastructure/api/ApiClient.ts';
import type {
  BackorderDto, BackorderListDto, CancelBackorderResponseDto
} from '../dto/BackorderDto';
import type { BackorderQueueTab, CancelBackorderReason } from '../../domain/entity/Backorder';

export class BackordersRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  async list(warehouseId: number | null, tab: BackorderQueueTab): Promise<BackorderDto[]> {
    const query = new URLSearchParams({ tab });
    if (warehouseId !== null) query.set('warehouse_id', String(warehouseId));
    const response = await this.api.get<BackorderListDto>('/api/admin/backorders?' + query.toString());
    return response.backorders;
  }

  async cancel(id: number, reason: CancelBackorderReason): Promise<CancelBackorderResponseDto> {
    return this.api.post<CancelBackorderResponseDto>(
      '/api/admin/sales-orders/' + id + '/cancel-backorder',
      { cancellation_reason: reason }
    );
  }
}
