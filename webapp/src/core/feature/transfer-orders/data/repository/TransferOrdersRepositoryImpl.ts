import type { CreateTransferOrder, TransferOrder, TransferOrderImportResult, TransferOrderPage, TransferOrderQuery, TransferOrderWarehouse } from '../../domain/entity/TransferOrder';
import type { TransferOrdersRepository } from '../../domain/repository/TransferOrdersRepository';
import type { TransferOrdersRemoteDataSource } from '../datasource/TransferOrdersRemoteDataSource';
import { TransferOrderMapper as M } from '../mapper/TransferOrderMapper';

export class TransferOrdersRepositoryImpl implements TransferOrdersRepository {
  constructor(private readonly remote: TransferOrdersRemoteDataSource) {}
  async list(query?: TransferOrderQuery): Promise<TransferOrderPage> { return M.page(await this.remote.list(query)); }
  async warehouses(): Promise<TransferOrderWarehouse[]> { return (await this.remote.warehouses()).warehouses.map(M.warehouse); }
  async detail(id: number): Promise<TransferOrder> { const dto = await this.remote.detail(id); return M.header(dto.transfer_order, dto.lines, dto.approvals); }
  async pickerDetail(id: number): Promise<TransferOrder> { const dto = await this.remote.pickerDetail(id); return M.header(dto.transfer_order, dto.lines); }
  async create(input: CreateTransferOrder): Promise<TransferOrderImportResult> { return M.importResult(await this.remote.create(M.create(input))); }
  async startPicking(id: number) { const dto = await this.remote.startPicking(id); return { batchId: dto.batch_id, batchNumber: dto.batch_number, tasksCreated: dto.tasks_created }; }
  async submitPickerResult(id: number) { const dto = await this.remote.submitPickerResult(id); return { approvalId: dto.to_approval_id, status: dto.status, transferOrderStatus: dto.to_status, lineCount: dto.line_count }; }
  async approve(id: number, approvalId: number) { await this.remote.approve(id, approvalId); }
  async reject(id: number, approvalId: number, reason: string) { await this.remote.reject(id, approvalId, reason); }
  async cancel(id: number) { await this.remote.cancel(id); }
  async remove(id: number) { await this.remote.remove(id); }
  async shortClose(id: number, lineId: number) { await this.remote.shortClose(id, lineId); }
}
