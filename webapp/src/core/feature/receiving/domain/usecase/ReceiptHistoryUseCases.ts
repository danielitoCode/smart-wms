import type { ReceiptHistoryEntry, UnreceiveResult } from '../entity/ReceiptHistory';
import type { ReceivingRepository } from '../repository/ReceivingRepository';

export class ListReceiptHistoryUseCase {
  constructor(private readonly repository: ReceivingRepository) {}
  execute(poId: number): Promise<ReceiptHistoryEntry[]> {
    if (!Number.isInteger(poId) || poId <= 0) throw new Error('poId must be a positive integer');
    return this.repository.listReceipts(poId);
  }
}

export class UnreceiveReceiptUseCase {
  constructor(private readonly repository: ReceivingRepository) {}
  execute(receiptId: number, reason?: string): Promise<UnreceiveResult> {
    if (!Number.isInteger(receiptId) || receiptId <= 0) throw new Error('receiptId must be a positive integer');
    if (reason != null && typeof reason !== 'string') throw new Error('reason must be a string');
    const normalized = reason?.trim();
    if (normalized && normalized.length > 500) throw new Error('reason must be 500 characters or fewer');
    return this.repository.unreceive(receiptId, normalized || undefined);
  }
}
