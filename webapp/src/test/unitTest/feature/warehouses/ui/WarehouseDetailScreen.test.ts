import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import WarehouseDetailScreen from '../../../../../core/feature/warehouses/ui/screens/WarehouseDetailScreen.svelte';

const vm = vi.hoisted(() => ({
	warehouse: { id: 1, code: 'WH-01', name: 'Central', address: null, active: true },
	zones: [{ id: 11, warehouseId: 1, code: 'PICK', name: 'Picking', zoneType: 'PICKING', active: true, binsCount: 4 }],
	bins: [], binSearch: '', binTotal: 0, binPage: 1, binPages: 1,
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
		expect(body).toContain('svelte-1qez22i">4</td>');
		expect(body).toContain('Activo');
		expect(body).toContain('Editar');
		expect(body).toContain('Eliminar');
	});

	it('does not render a zone-to-bin filter action when the bins feature is unavailable', () => {
		const i18n = { t: (message: string) => message };
		const { body } = render(WarehouseDetailScreen, {
			props: { warehouseId: 1, showZones: true, showBins: false, includeBins: false },
			context: new Map<string, any>([['i18n', i18n]])
		});
		expect(body).not.toContain('>Ubicaciones</button>');
	});
});
