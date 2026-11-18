import type { PickingTicket } from '../entity/PickingTicket';
import type { PickingTicketRepository } from '../repository/PickingTicketRepository';
export class GetPickingTicketUseCase {
  constructor(private readonly repository: PickingTicketRepository) {}
  execute(id: number): Promise<PickingTicket> {
    if (!Number.isInteger(id) || id < 1) throw new Error('El identificador del pedido debe ser un entero positivo');
    return this.repository.getTicket(id);
  }
}
