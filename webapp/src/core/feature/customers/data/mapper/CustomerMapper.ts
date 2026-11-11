import type {CustomerDto} from "#core/feature/customers/data/dto/CustomerDto.ts";
import type {Customer} from "#core/feature/customers/domain/entity/Customer.ts";

export const CustomerMapper = {
    toCustomer(dto: CustomerDto): Customer {
        return {
            billingAddress: dto.billing_address,
            canonicalId: dto.canonical_id,
            createdAt: dto.created_at,
            customerName: dto.customer_name,
            email: dto.email,
            externalId: dto.external_id,
            isActive: dto.is_active,
            latestInboundId: dto.latest_inbound_id,
            phone: dto.phone,
            shippingAddress: dto.shipping_address,
            taxId: dto.tax_id,
            updatedAt: dto.updated_at

        }
    }
}