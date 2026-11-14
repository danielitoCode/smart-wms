import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import WarehouseDetailScreen from '../../../../../core/feature/warehouses/ui/screens/WarehouseDetailScreen.svelte';

const vm = vi.hoisted(() => ({
	warehouse: { id: 1, code: 'WH-01', name: 'Central', address: null, active: true },
	zones: [{ id: 11, warehouseId: 1, code: 'PICK', name: 'Picking', zoneType: 'PICKING', active: true, binsCount: 4 }],
	bins: [{ id: 3, warehouseId: 1, zoneId: 11, zoneName: 'Picking', code: 'A-01-01', barcode: 'BC-01', binType: 'Pickable', aisle: 'A', rowNumber: 1, levelNumber: 1, positionNumber: 1, pickSequence: 4, putawaySequence: 0, active: true, maxWeightLbs: 125, maxVolumeCuft: 32, quantityOnHand: 11, quantityAllocated: 3, inventoryLines: 2 }], binSearch: '', binTotal: 1, binPage: 1, binPages: 1,
	selectedZoneId: null, selectedBinDetail: null, loading: false, binsLoading: false,
	mutating: false, error: null,
	load: vi.fn(), loadBinsForZone: vi.fn(), searchBins: vi.fn(), createZone: vi.fn(),
	updateZone: vi.fn(), removeZone: vi.fn(), createBin: vi.fn(), updateBin: vi.fn(),
	removeBin: vi.fn(), viewBin: vi.fn(), exportAllBins: vi.fn(), clearError: vi.fn(),
	setError: vi.fn(), closeBinDetail: vi.fn()
}));

vi.mock('../../../../../core/feature/warehouses/ui/state/warehouseDetailState.svelte', () => ({
	createWarehouseDetailState: () => vm
}));
vi.mock('../../../../../core/infrastructure/auth/AuthSession', () => ({
	authSession: { getUser: () => ({ role: 'ADMIN', allowedPages: ['bins'] }) }
}));

describe('WarehouseDetailScreen zones workspace', () => {
	it('renders zone identity, status and the number of associated bins', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(WarehouseDetailScreen, {
			props: { warehouseId: 1, showZones: true, showBins: false, includeBins: false },
			context: new Map<string, any>([['i18n', i18n]])
		});
		expect(body).toContain('Central');
		expect(body).toContain('PICK');
		expect(body).toContain('Picking');
		expect(body).toContain('Preparación');
		expect(body).toContain('Ubicaciones asociadas');
		expect(body).toContain('>4</td>');
		expect(body).toContain('Activo');
		expect(body).toContain('Editar');
		expect(body).toContain('Eliminar');
	});

	it('links each zone to the bins workspace using its zone_id', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(WarehouseDetailScreen, {
			props: { warehouseId: 1, showZones: true, showBins: false, includeBins: false },
			context: new Map<string, any>([['i18n', i18n]])
		});
		expect(body).toContain('href="/data/bins?zone_id=11"');
		expect(body).toContain('Ver ubicaciones');
	});
	it('renders stock occupancy and configured capacities in the bins catalogue', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(WarehouseDetailScreen, {
			props: { warehouseId: 1, showZones: false, showBins: true, includeBins: true },
			context: new Map<string, any>([['i18n', i18n]])
		});
		expect(body).toContain('Existencias');
		expect(body).toContain('Filtrar por zona');
		expect(body).toContain('Todas las zonas');
		expect(body).toContain('Filtrar por tipo');
		expect(body).toContain('Todos los tipos');
		expect(body).toContain('Picking');
		expect(body).toContain('11 (3 asignadas)');
		expect(body).toContain('125 lb · 32 ft³');
		expect(body).toContain('A-01-01');
	});

});
