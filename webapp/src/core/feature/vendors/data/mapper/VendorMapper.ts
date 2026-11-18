import type { CreateVendor, UpdateVendor, Vendor, VendorPage } from '../../domain/entity/Vendor';
import type { VendorDto, VendorListDto, VendorMutationDto } from '../dto/VendorDto';

function requiredText(value: string | null | undefined, field: string): string {
	if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing ${field} returned by vendors API`);
	return value;
}

export const VendorMapper = {
	toDomain(dto: VendorDto): Vendor {
		return {
			canonicalId: requiredText(dto.canonical_id, 'vendor canonical id'),
			externalId: requiredText(dto.external_id, 'vendor external id'),
			vendorName: dto.vendor_name,
			contactName: dto.contact_name,
			email: dto.email,
			phone: dto.phone,
			billingAddress: dto.billing_address,
			remitToAddress: dto.remit_to_address,
			taxId: dto.tax_id,
			paymentTerms: dto.payment_terms,
			isActive: dto.is_active,
			createdAt: requiredText(dto.created_at, 'vendor created_at'),
			updatedAt: requiredText(dto.updated_at, 'vendor updated_at')
		};
	},
	toPage(dto: VendorListDto): VendorPage {
		if (!Array.isArray(dto.vendors)) throw new Error('Invalid vendors list returned by API');
		return {
			items: dto.vendors.map(this.toDomain),
			total: dto.total,
			page: dto.page,
			perPage: dto.per_page,
			pages: dto.pages
		};
	},
	toCreateDto(input: CreateVendor): VendorMutationDto {
		return {
			vendor_name: input.vendorName,
			contact_name: input.contactName,
			email: input.email,
			phone: input.phone,
			billing_address: input.billingAddress,
			remit_to_address: input.remitToAddress,
			tax_id: input.taxId,
			payment_terms: input.paymentTerms,
			is_active: input.isActive
		};
	},
	toUpdateDto(input: UpdateVendor): VendorMutationDto {
		const dto: VendorMutationDto = {};
		if (input.vendorName !== undefined) dto.vendor_name = input.vendorName;
		if (input.contactName !== undefined) dto.contact_name = input.contactName;
		if (input.email !== undefined) dto.email = input.email;
		if (input.phone !== undefined) dto.phone = input.phone;
		if (input.billingAddress !== undefined) dto.billing_address = input.billingAddress;
		if (input.remitToAddress !== undefined) dto.remit_to_address = input.remitToAddress;
		if (input.taxId !== undefined) dto.tax_id = input.taxId;
		if (input.paymentTerms !== undefined) dto.payment_terms = input.paymentTerms;
		if (input.isActive !== undefined) dto.is_active = input.isActive;
		return dto;
	}
};
