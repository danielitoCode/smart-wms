import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import TransferOrdersScreen from '../../../../../core/feature/transfer-orders/ui/screens/TransferOrdersScreen.svelte';

const vm = vi.hoisted(() => ({
  rows: [], total: 0, page: 1, pages: 1, status: '', sourceWarehouseId: null,
  destinationWarehouseId: null, warehouses: [], loading: false, saving: false,
  error: null as string | null, notice: null, created: null, importErrors: [],
  selected: {
    transferOrderId: 12, transferOrderNumber: 'TO-12', sourceWarehouseId: 2,
    destinationWarehouseId: 4, status: 'PARTIALLY_PICKED', createdBy: 'operator',
    notes: null, lines: [{
      toLineId: 31, itemId: 7, sku: 'SKU-7', itemName: 'Widget',
      requestedQuantity: 10, committedQuantity: 8, pickedQuantity: 5,
      approvedQuantity: 2, status: 'PARTIALLY_PICKED'
    }], approvals: [{
      approvalId: 9, status: 'REJECTED', submittedBy: 'picker',
      submittedAt: '2026-11-17T10:00:00Z', approvedBy: null, approvedAt: null,
      rejectedAt: '2026-11-17T10:15:00Z', rejectionReason: 'Damaged',
      linesSnapshot: [{ toLineId: 31, itemId: 7, pickedQuantity: 5 }]
    }]
  },
  pickerSnapshot: null,
  load: vi.fn(), loadWarehouses: vi.fn(), detail: vi.fn(), loadPickerDetail: vi.fn(),
  create: vi.fn(), setStatus: vi.fn(), setSourceWarehouse: vi.fn(),
  setDestinationWarehouse: vi.fn(), setPage: vi.fn(), startPicking: vi.fn(),
  submitPickerResult: vi.fn(), approve: vi.fn(), reject: vi.fn(), cancel: vi.fn(),
  remove: vi.fn(), shortClose: vi.fn(), clearSelected: vi.fn(),
  clearCreated: vi.fn()
}));

vi.mock('../../../../../core/feature/transfer-orders/ui/state/transferOrdersState.svelte', () => ({
  createTransferOrdersState: () => vm
}));

describe('TransferOrdersScreen', () => {
  it('shows separate requested, committed, picked, approved and pending quantities', () => {
    const { body } = render(TransferOrdersScreen, {
      context: new Map([['i18n', { t: (value: string) => value }]])
    });
    expect(body).toContain('Reserva pendiente de liberar o aprobar');
    expect(body).toContain('Recogido pendiente de aprobación');
    expect(body).toContain('Faltante inicial');
    expect(body).toContain('Aprobado / transferido');
    expect(body).toContain('SKU-7');
    expect(body).toContain('Reserva pendiente de liberar o aprobar');
    expect(body).toContain('Faltante inicial');
    expect(body).toContain('10');
    expect(body).toContain('8');
    expect(body).toContain('5');
    expect(body).toContain('2');
  });

  it('renders approval snapshot and rejection history without reconstructing missing data', () => {
    const { body } = render(TransferOrdersScreen, {
      context: new Map([['i18n', { t: (value: string) => value }]])
    });
    expect(body).toContain('Snapshot del envío');
    expect(body).toContain('Enviado');
    expect(body).toContain('Damaged');
    expect(body).toContain('Rechazado el');
  });

  it('shows that transfer mutations are disabled until the server supports the staged lifecycle', () => {
    const { body } = render(TransferOrdersScreen, { context: new Map([['i18n', { t: (value: string) => value }]]) });
    expect(body).toContain('Nueva transferencia · no disponible');
    expect(body).toContain('reserva exacta por línea/bin');
    expect(body).toContain('role="status"');
  });

  it('renders normalized HTTP errors as an accessible alert', () => {
    vm.error = 'Conflicto: existe una aprobación pendiente (409)';
    const { body } = render(TransferOrdersScreen, {
      context: new Map([['i18n', { t: (value: string) => value }]])
    });
    expect(body).toContain('role="alert"');
    expect(body).toContain('Conflicto: existe una aprobación pendiente (409)');
    vm.error = null;
  });

});
