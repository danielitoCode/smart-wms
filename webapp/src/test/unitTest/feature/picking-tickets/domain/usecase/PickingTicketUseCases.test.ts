import { describe, expect, it, vi } from 'vitest';
import type { PickingTicketRepository } from '../../../../../../core/feature/picking-tickets/domain/repository/PickingTicketRepository';
import { GetPickingTicketUseCase } from '../../../../../../core/feature/picking-tickets/domain/usecase/GetPickingTicketUseCase';
import { MarkPickingTicketsPrintedUseCase } from '../../../../../../core/feature/picking-tickets/domain/usecase/MarkPickingTicketsPrintedUseCase';
function repository(overrides: Partial<PickingTicketRepository> = {}): PickingTicketRepository {
  return { getTicket: vi.fn(), markPrinted: vi.fn(), ...overrides };
}
describe('Picking ticket use cases', () => {
  it('rejects an invalid direct ticket id before calling the repository', () => {
    const repo = repository();
    const useCase = new GetPickingTicketUseCase(repo);
    expect(() => useCase.execute(0)).toThrow(/entero positivo/);
    expect(repo.getTicket).not.toHaveBeenCalled();
  });
  it('loads a ticket by sales-order id', async () => {
    const ticket = { order: { salesOrderId: 9 }, lines: [], branding: {} } as never;
    const repo = repository({ getTicket: vi.fn().mockResolvedValue(ticket) });
    await expect(new GetPickingTicketUseCase(repo).execute(9)).resolves.toBe(ticket);
    expect(repo.getTicket).toHaveBeenCalledWith(9);
  });
  it('rejects empty and invalid print batches', () => {
    const useCase = new MarkPickingTicketsPrintedUseCase(repository());
    expect(() => useCase.execute([])).toThrow(/al menos un ticket/);
    expect(() => useCase.execute([1, 0])).toThrow(/enteros positivos/);
  });
  it('deduplicates ids before marking and accepts an already-printed no-op result', async () => {
    const repo = repository({ markPrinted: vi.fn().mockResolvedValue({ marked: [] }) });
    await expect(new MarkPickingTicketsPrintedUseCase(repo).execute([4, 4, 5])).resolves.toEqual({ marked: [] });
    expect(repo.markPrinted).toHaveBeenCalledWith([4, 5]);
  });
  it('surfaces repository failures instead of swallowing mark-printed errors', async () => {
    const repo = repository({ markPrinted: vi.fn().mockRejectedValue(new Error('offline')) });
    await expect(new MarkPickingTicketsPrintedUseCase(repo).execute([4])).rejects.toThrow('offline');
  });
});
