import { describe, expect, it, vi } from 'vitest';
import { TransferOrdersRepositoryImpl } from '../../../../../core/feature/transfer-orders/data/repository/TransferOrdersRepositoryImpl';
import type { TransferOrdersRemoteDataSource } from '../../../../../core/feature/transfer-orders/data/datasource/TransferOrdersRemoteDataSource';

function remoteMock() {
  return {
    list: vi.fn().mockResolvedValue({ transfer_orders: [], total: 0, page: 1, pages: 1, per_page: 50 }),
    warehouses: vi.fn().mockResolvedValue({ warehouses: [{ warehouse_id: 2, warehouse_code: 'WH-2', warehouse_name: 'Origin', is_active: true }] }),
    detail: vi.fn().mockResolvedValue({ transfer_order: { to_id: 12, to_number: 'TO-12', source_warehouse_id: 2, destination_warehouse_id: 4, status: 'OPEN', created_by: 'u', notes: null, external_id: 'x', created_at: null, updated_at: null }, lines: [], approvals: [] }),
    pickerDetail: vi.fn().mockResolvedValue({ transfer_order: { to_id: 12, to_number: 'TO-12', source_warehouse_id: 2, destination_warehouse_id: 4, status: 'PARTIALLY_PICKED', created_by: 'u', notes: null, external_id: 'x', created_at: null, updated_at: null }, lines: [] }),
    create: vi.fn().mockResolvedValue({ to_id: 12, to_number: 'TO-12', source_warehouse_id: 2, destination_warehouse_id: 4, line_count: 1, shortages: [] }),
    startPicking: vi.fn().mockResolvedValue({ batch_id: 3, batch_number: 'B-3', tasks_created: 4 }),
    submitPickerResult: vi.fn().mockResolvedValue({ to_approval_id: 8, status: 'PENDING', to_status: 'AWAITING_APPROVAL', line_count: 1 }),
    approve: vi.fn(), reject: vi.fn(), cancel: vi.fn(), remove: vi.fn(), shortClose: vi.fn()
  } as unknown as TransferOrdersRemoteDataSource & Record<string, ReturnType<typeof vi.fn>>;
}

describe('TransferOrdersRepositoryImpl', () => {
  it('preserves page metadata and forwards the complete filter', async () => {
    const remote = remoteMock();
    const result = await new TransferOrdersRepositoryImpl(remote).list({ page: 2, status: 'OPEN', sourceWarehouseId: 2, destinationWarehouseId: 4 });
    expect(remote.list).toHaveBeenCalledWith({ page: 2, status: 'OPEN', sourceWarehouseId: 2, destinationWarehouseId: 4 });
    expect(result).toMatchObject({ total: 0, page: 1, pages: 1, perPage: 50, orders: [] });
  });

  it('maps the picker-specific projection without requiring approval rows', async () => {
    const result = await new TransferOrdersRepositoryImpl(remoteMock()).pickerDetail(12);
    expect(result.transferOrderId).toBe(12);
    expect(result.approvals).toEqual([]);
  });

  it('maps start-picking and picker-submit responses to application values', async () => {
    const remote = remoteMock();
    const repository = new TransferOrdersRepositoryImpl(remote);
    await expect(repository.startPicking(12)).resolves.toEqual({ batchId: 3, batchNumber: 'B-3', tasksCreated: 4 });
    await expect(repository.submitPickerResult(12)).resolves.toEqual({ approvalId: 8, status: 'PENDING', transferOrderStatus: 'AWAITING_APPROVAL', lineCount: 1 });
  });
});
