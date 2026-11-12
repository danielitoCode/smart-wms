import type { CreateCustomer, Customer, UpdateCustomer } from '../../domain/entity/Customer';
import type { CreateCustomerDto, CustomerDto, UpdateCustomerDto } from '../dto/CustomerDto';

export const CustomerMapper = {
	toDomain(dto: CustomerDto): Customer {
		return {
			canonicalId: dto.canonical_id,
			externalId: dto.external_id,
			customerName: dto.customer_name,
			email: dto.email,
			phone: dto.phone,
			billingAddress: dto.billing_address,
			shippingAddress: dto.shipping_address,
			taxId: dto.tax_id,
			isActive: dto.is_active,
			createdAt: dto.created_at ?? '',
			updatedAt: dto.updated_at ?? '',
			latestInboundId: dto.latest_inbound_id
		};
	},

	toCreateDto(input: CreateCustomer): CreateCustomerDto {
		return {
			customer_name: input.customerName,
			email: input.email,
			phone: input.phone,
			billing_address: input.billingAddress,
			shipping_address: input.shippingAddress,
			tax_id: input.taxId,
			is_active: input.isActive
		};
	},

	toUpdateDto(input: UpdateCustomer): UpdateCustomerDto {
		const dto: UpdateCustomerDto = {};
		if (input.customerName !== undefined) dto.customer_name = input.customerName;
		if (input.email !== undefined) dto.email = input.email;
		if (input.phone !== undefined) dto.phone = input.phone;
		if (input.billingAddress !== undefined) dto.billing_address = input.billingAddress;
		if (input.shippingAddress !== undefined) dto.shipping_address = input.shippingAddress;
		if (input.taxId !== undefined) dto.tax_id = input.taxId;
		if (input.isActive !== undefined) dto.is_active = input.isActive;
		return dto;
	}
};
