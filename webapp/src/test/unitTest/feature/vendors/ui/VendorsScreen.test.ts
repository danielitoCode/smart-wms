import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import VendorsScreen from '../../../../../core/feature/vendors/ui/screens/VendorsScreen.svelte';

const vm = vi.hoisted(() => ({
	vendors: [{
		canonicalId: 'a8098c1a-f86e-4e7a-9b7d-2a2d5c9d1f10',
		externalId: 'EXT-1', vendorName: 'Acme Supplies', contactName: 'Buyer',
		email: 'buyer@acme.test', phone: '555-0100', billingAddress: 'Billing Road',
		remitToAddress: 'Remit Road', taxId: 'TAX-1', paymentTerms: 'Net 30', isActive: true,
		createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z'
	}],
	pagination: { page: 2, pages: 3, total: 101, perPage: 50 },
	loading: false, detailLoading: false, saving: false, error: null, detailError: null,
	search: 'Acme', filter: 'active', page: 2, editing: null,
	detail: {
		canonicalId: 'a8098c1a-f86e-4e7a-9b7d-2a2d5c9d1f10', externalId: 'EXT-1',
		vendorName: 'Acme Supplies', contactName: 'Buyer', email: 'buyer@acme.test',
		phone: '555-0100', billingAddress: 'Billing Road', remitToAddress: 'Remit Road',
		taxId: 'TAX-1', paymentTerms: 'Net 30', isActive: true,
		createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z'
	},
	load: vi.fn(), loadDetail: vi.fn(), closeDetail: vi.fn(), setSearch: vi.fn(), setFilter: vi.fn(),
	setPage: vi.fn(), setEditing: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn(), remove: vi.fn()
}));

vi.mock('../../../../../core/feature/vendors/ui/state/vendorsState.svelte', () => ({
	createVendorsState: () => vm
}));

describe('VendorsScreen UI', () => {
	it('renders filters, complete pagination and CRUD actions in Spanish', () => {
		const i18n = { t: (value: string) => value };
		const { body } = render(VendorsScreen, { context: new Map([['i18n', i18n]]) });
		for (const text of ['Proveedores', 'Buscar proveedor', 'Activos', 'Inactivos', 'Todos', 'Nuevo proveedor', 'Página', '2 / 3 · 101', 'Editar', 'Desactivar', 'Eliminar']) {
			expect(body).toContain(text);
		}
		expect(body).toContain('Acme Supplies');
	});

	it('renders the complete contact, tax and address detail projection', () => {
		const i18n = { t: (value: string) => value };
		const { body } = render(VendorsScreen, { context: new Map([['i18n', i18n]]) });
		for (const text of ['Detalle del proveedor', 'ID canónico', 'ID externo', 'Dirección de facturación', 'Billing Road', 'Dirección de envío / Remitente', 'Remit Road', 'Identificación fiscal', 'TAX-1', 'Net 30']) {
			expect(body).toContain(text);
		}
	});
});
