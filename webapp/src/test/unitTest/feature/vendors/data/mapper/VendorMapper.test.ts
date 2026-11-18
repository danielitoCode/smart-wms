import { describe, expect, it } from 'vitest';
import { VendorMapper } from '../../../../../../core/feature/vendors/data/mapper/VendorMapper';
import type { VendorDto } from '../../../../../../core/feature/vendors/data/dto/VendorDto';

const dto: VendorDto = {
	canonical_id: 'a8098c1a-f86e-4e7a-9b7d-2a2d5c9d1f10', external_id: 'EXT-1',
	vendor_name: 'Acme', contact_name: null, email: null, phone: null,
	billing_address: 'Street 1', remit_to_address: null, tax_id: 'TAX-1',
	payment_terms: 'Net 30', is_active: true,
	created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z'
};

describe('VendorMapper', () => {
	it('maps all nullable backend fields and required timestamps', () => {
		expect(VendorMapper.toDomain(dto)).toEqual({
			canonicalId: dto.canonical_id, externalId: dto.external_id,
			vendorName: 'Acme', contactName: null, email: null, phone: null,
			billingAddress: 'Street 1', remitToAddress: null, taxId: 'TAX-1',
			paymentTerms: 'Net 30', isActive: true,
			createdAt: dto.created_at, updatedAt: dto.updated_at
		});
	});
	it('preserves server pagination metadata', () => {
		expect(VendorMapper.toPage({ vendors: [dto], total: 21, page: 2, per_page: 10, pages: 3 })).toMatchObject({
			total: 21, page: 2, perPage: 10, pages: 3, items: [{ canonicalId: dto.canonical_id }]
		});
	});
	it('does not silently map missing canonical identifiers or timestamps', () => {
		expect(() => VendorMapper.toDomain({ ...dto, canonical_id: '' })).toThrow(/canonical id/);
		expect(() => VendorMapper.toDomain({ ...dto, created_at: null as never })).toThrow(/created_at/);
	});
	it('maps create and update DTOs including nullable address and tax fields', () => {
		expect(VendorMapper.toCreateDto({ vendorName: 'Acme', billingAddress: 'Street', taxId: 'T1' })).toMatchObject({
			vendor_name: 'Acme', billing_address: 'Street', tax_id: 'T1'
		});
		expect(VendorMapper.toUpdateDto({ billingAddress: null, remitToAddress: null })).toEqual({
			billing_address: null, remit_to_address: null
		});
	});
});
