import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { InterWarehouseTransferDto, InterWarehouseTransferListDto, InterWarehouseTransferCreateResponseDto } from '../dto/InterWarehouseTransferDto';

export class InterWarehouseTransfersRemoteDataSource {
  constructor(private readonly api: ApiClient) {}
  async list(limit = 100, filters: { fromWarehouseId?: number; toWarehouseId?: number } = {}): Promise<InterWarehouseTransferDto[]> {
    const query = new URLSearchParams({ limit: String(Math.min(500, Math.max(1, Math.trunc(limit)))) });
    if (filters.fromWarehouseId !== undefined) query.set('from_warehouse_id', String(filters.fromWarehouseId));
    if (filters.toWarehouseId !== undefined) query.set('to_warehouse_id', String(filters.toWarehouseId));
    const response = await this.api.get<InterWarehouseTransferListDto>('/api/admin/inter-warehouse-transfers?' + query.toString());
    return Array.isArray(response.transfers) ? response.transfers : [];
  }
  create(body: unknown): Promise<InterWarehouseTransferCreateResponseDto> {
    return this.api.post<InterWarehouseTransferCreateResponseDto>('/api/admin/inter-warehouse-transfer', body);
  }
}
