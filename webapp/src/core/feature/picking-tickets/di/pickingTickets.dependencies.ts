import { apiClient } from '#core/infrastructure/api/ApiClient.ts';
import { PickingTicketRemoteDataSource } from '../data/datasource/PickingTicketRemoteDataSource';
import { PickingTicketRepositoryImpl } from '../data/repository/PickingTicketRepositoryImpl';
import { GetPickingTicketUseCase } from '../domain/usecase/GetPickingTicketUseCase';
import { MarkPickingTicketsPrintedUseCase } from '../domain/usecase/MarkPickingTicketsPrintedUseCase';
export function createPickingTicketsDependencies() {
  const repository = new PickingTicketRepositoryImpl(new PickingTicketRemoteDataSource(apiClient));
  return {
    getTicket: new GetPickingTicketUseCase(repository),
    markPrinted: new MarkPickingTicketsPrintedUseCase(repository)
  };
}
