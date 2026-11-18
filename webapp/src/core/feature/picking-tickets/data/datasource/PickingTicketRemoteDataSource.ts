import type { ApiClient } from '#core/infrastructure/api/ApiClient.ts';
import type { MarkPrintedRequestDto, MarkPrintedResponseDto, PickingTicketResponseDto } from '../dto/PickingTicketDto';
export class PickingTicketRemoteDataSource {
  constructor(private readonly api: ApiClient) {}
  getTicket(id: number): Promise<PickingTicketResponseDto> {
    return this.api.get<PickingTicketResponseDto>(`/api/admin/sales-orders/${id}/picking-ticket`);
  }
  markPrinted(soIds: number[]): Promise<MarkPrintedResponseDto> {
    const body: MarkPrintedRequestDto = { so_ids: soIds };
    return this.api.post<MarkPrintedResponseDto>('/api/admin/sales-orders/mark-printed', body);
  }
}
