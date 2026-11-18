import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { TransferOrderDetailDto, TransferOrderImportDto, TransferOrderListDto, TransferOrderPickerDto, TransferOrderWarehouseListDto } from '../dto/TransferOrderDto';

export class TransferOrdersRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  async list(query: { status?: string; sourceWarehouseId?: number; destinationWarehouseId?: number; page?: number; perPage?: number } = {}): Promise<TransferOrderListDto> {
    const params = new URLSearchParams({ page: String(query.page ?? 1), per_page: String(query.perPage ?? 50) });
    if (query.status) params.set('status', query.status);
    if (query.sourceWarehouseId != null) params.set('source_warehouse_id', String(query.sourceWarehouseId));
    if (query.destinationWarehouseId != null) params.set('destination_warehouse_id', String(query.destinationWarehouseId));
    return this.api.get<TransferOrderListDto>('/api/admin/transfer-orders?' + params.toString());
  }

  async warehouses(): Promise<TransferOrderWarehouseListDto> {
    return this.api.get<TransferOrderWarehouseListDto>('/api/warehouses/list');
  }

  detail(id: number): Promise<TransferOrderDetailDto> {
    return this.api.get<TransferOrderDetailDto>('/api/admin/transfer-orders/' + id);
  }

  pickerDetail(id: number): Promise<TransferOrderPickerDto> {
    return this.api.get<TransferOrderPickerDto>('/api/admin/picker/transfer-orders/' + id);
  }

  create(body: unknown): Promise<TransferOrderImportDto> {
    return this.api.post<TransferOrderImportDto>('/api/admin/transfer-orders/import', body);
  }

  startPicking(id: number): Promise<{ batch_id: number; batch_number: string; tasks_created: number }> {
    return this.api.post<{ batch_id: number; batch_number: string; tasks_created: number }>('/api/admin/transfer-orders/' + id + '/start-picking');
  }

  submitPickerResult(id: number): Promise<{ to_approval_id: number; status: string; to_status: string; line_count: number }> {
    return this.api.post<{ to_approval_id: number; status: string; to_status: string; line_count: number }>('/api/admin/picker/transfer-orders/' + id + '/submit');
  }

  approve(id: number, approvalId: number): Promise<unknown> {
    return this.api.post('/api/admin/transfer-orders/' + id + '/approvals/' + approvalId + '/approve');
  }

  reject(id: number, approvalId: number, reason: string): Promise<unknown> {
    return this.api.post('/api/admin/transfer-orders/' + id + '/approvals/' + approvalId + '/reject', { rejection_reason: reason || null });
  }

  cancel(id: number): Promise<unknown> {
    return this.api.post('/api/admin/transfer-orders/' + id + '/cancel');
  }

  remove(id: number): Promise<unknown> {
    return this.api.delete('/api/admin/transfer-orders/' + id);
  }

  shortClose(id: number, lineId: number): Promise<unknown> {
    return this.api.post('/api/admin/transfer-orders/' + id + '/lines/' + lineId + '/short-close');
  }
}
