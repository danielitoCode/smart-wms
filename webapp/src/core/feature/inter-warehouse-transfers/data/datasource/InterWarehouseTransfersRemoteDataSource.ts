import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { InterWarehouseTransferDto, InterWarehouseTransferListDto, InterWarehouseTransferCreateResponseDto } from '../dto/InterWarehouseTransferDto';

export class InterWarehouseTransfersRemoteDataSource {
  constructor(private readonly api: ApiClient) {}
  async list(limit = 100): Promise<InterWarehouseTransferDto[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await this.api.get<InterWarehouseTransferListDto>(`/api/admin/inter-warehouse-transfers?${params.toString()}`);
    return response.transfers ?? [];
  }
  async create(body: unknown): Promise<InterWarehouseTransferCreateResponseDto> {
    return this.api.post<InterWarehouseTransferCreateResponseDto>('/api/admin/inter-warehouse-transfer', body);
  }
}