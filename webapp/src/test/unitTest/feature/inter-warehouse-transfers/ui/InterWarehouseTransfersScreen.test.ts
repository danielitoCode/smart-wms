import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import InterWarehouseTransfersScreen from '../../../../../core/feature/inter-warehouse-transfers/ui/screens/InterWarehouseTransfersScreen.svelte';

const vm = vi.hoisted(() => ({
  rows: [], warehouses: [
    { id: 1, code: 'WH-A', name: 'Warehouse A', active: true },
    { id: 2, code: 'WH-B', name: 'Warehouse B', active: true }
  ],
  sourceBins: [], destinationBins: [], itemResults: [],
  sourceBinSearching: false, destinationBinSearching: false, itemSearching: false,
  loading: false, saving: false, error: null as string | null,
  fromWarehouseFilter: '', toWarehouseFilter: '',
  setFromWarehouseFilter: vi.fn(), setToWarehouseFilter: vi.fn(),
  searchBins: vi.fn(), searchItems: vi.fn(), load: vi.fn(), create: vi.fn()
}));

vi.mock('../../../../../core/feature/inter-warehouse-transfers/ui/state/interWarehouseTransfersState.svelte', () => ({
  createInterWarehouseTransfersState: () => vm
}));

describe('InterWarehouseTransfersScreen selectors', () => {
  it('renders authorized warehouse selectors and search typeaheads instead of numeric ID inputs', () => {
    const { body } = render(InterWarehouseTransfersScreen, {
      context: new Map([['i18n', { t: (value: string) => value }]])
    });
    expect(body).toContain('Almacén origen');
    expect(body).toContain('Almacén destino');
    expect(body).toContain('Warehouse A (WH-A)');
    expect(body).toContain('Warehouse B (WH-B)');
    expect(body).toContain('Busca código de ubicación');
    expect(body).toContain('Busca por SKU o nombre');
    expect(body).not.toContain('ID de producto');
    expect(body).not.toContain('ID de almacén');
  });

  it('renders independent origin and destination history filters', () => {
    const { body } = render(InterWarehouseTransfersScreen, {
      context: new Map([['i18n', { t: (value: string) => value }]])
    });
    expect(body).toContain('Todos los almacenes autorizados');
    expect(body).toContain('Limpiar filtros');
  });

  it('shows backend failures as an accessible alert', () => {
    vm.error = 'No tienes acceso a ambos almacenes';
    const { body } = render(InterWarehouseTransfersScreen, {
      context: new Map([['i18n', { t: (value: string) => value }]])
    });
    expect(body).toContain('role="alert"');
    expect(body).toContain('No tienes acceso a ambos almacenes');
    vm.error = null;
  });
});
