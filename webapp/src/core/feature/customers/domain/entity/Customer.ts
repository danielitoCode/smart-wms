/**
 * Canonical customer master data.
 * Mirrors the customers aggregate introduced by inbound customer migration.
 * Sales orders may also retain customer snapshots for historical accuracy.
 */

/** PostgreSQL UUID string used by the customer endpoints. */
export type CustomerId = string;

export type Customer = {
	canonicalId: CustomerId;
	externalId: string;
	customerName: string | null;
	email: string | null;
	phone: string | null;
	billingAddress: string | null;
	shippingAddress: string | null;
	taxId: string | null;
	isActive: boolean | null;
	createdAt: string;
	updatedAt: string;
	latestInboundId: number;
};

/** Payload for creating a customer (name required from admin/UI flows). */
export type CreateCustomer = {
	customerName: string;
	email?: string | null;
	phone?: string | null;
	billingAddress?: string | null;
	shippingAddress?: string | null;
	taxId?: string | null;
	isActive?: boolean | null;
};

/** Partial update; omitted fields are left unchanged. */
export type UpdateCustomer = {
	customerName?: string | null;
	email?: string | null;
	phone?: string | null;
	billingAddress?: string | null;
	shippingAddress?: string | null;
	taxId?: string | null;
	isActive?: boolean | null;
};
