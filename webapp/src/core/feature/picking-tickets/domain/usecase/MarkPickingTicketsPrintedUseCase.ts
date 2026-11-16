import type { MarkPrintedResult } from '../entity/PickingTicket';
import type { PickingTicketRepository } from '../repository/PickingTicketRepository';
export class MarkPickingTicketsPrintedUseCase {
  constructor(private readonly repository: PickingTicketRepository) {}
  execute(ids: number[]): Promise<MarkPrintedResult> {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('Selecciona al menos un ticket');
    if (ids.some((id) => !Number.isInteger(id) || id < 1)) throw new Error('Todos los identificadores deben ser enteros positivos');
    const uniqueIds = [...new Set(ids)];
    return this.repository.markPrinted(uniqueIds);
  }
}
