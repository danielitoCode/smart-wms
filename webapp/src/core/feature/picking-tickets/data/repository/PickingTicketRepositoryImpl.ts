import type { PickingTicketRepository } from '../../domain/repository/PickingTicketRepository';
import type { MarkPrintedResult, PickingTicket } from '../../domain/entity/PickingTicket';
import type { PickingTicketRemoteDataSource } from '../datasource/PickingTicketRemoteDataSource';
import { PickingTicketMapper } from '../mapper/PickingTicketMapper';
export class PickingTicketRepositoryImpl implements PickingTicketRepository {
  constructor(private readonly datasource: PickingTicketRemoteDataSource) {}
  async getTicket(id: number): Promise<PickingTicket> {
    return PickingTicketMapper.toTicket(await this.datasource.getTicket(id));
  }
  async markPrinted(ids: number[]): Promise<MarkPrintedResult> {
    return PickingTicketMapper.toMarked(await this.datasource.markPrinted(ids));
  }
}
