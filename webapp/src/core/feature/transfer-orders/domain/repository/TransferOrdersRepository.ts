import type { CreateTransferOrder, TransferOrder, TransferOrderImportResult, TransferOrderPage, TransferOrderQuery, TransferOrderWarehouse } from '../entity/TransferOrder';

export interface TransferOrdersRepository {
  list(query?: TransferOrderQuery): Promise<TransferOrderPage>;
  warehouses(): Promise<TransferOrderWarehouse[]>;
  detail(id: number): Promise<TransferOrder>;
  pickerDetail(id: number): Promise<TransferOrder>;
  create(input: CreateTransferOrder): Promise<TransferOrderImportResult>;
  startPicking(id: number): Promise<{ batchId: number; batchNumber: string; tasksCreated: number }>;
  submitPickerResult(id: number): Promise<{ approvalId: number; status: string; transferOrderStatus: string; lineCount: number }>;
  approve(id: number, approvalId: number): Promise<void>;
  reject(id: number, approvalId: number, reason: string): Promise<void>;
  cancel(id: number): Promise<void>;
  remove(id: number): Promise<void>;
  shortClose(id: number, lineId: number): Promise<void>;
}
