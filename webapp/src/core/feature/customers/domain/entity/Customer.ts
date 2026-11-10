/**
 * Canonical customer master data.
 * Mirrors the customers aggregate introduced by inbound customer migration.
 * Sales orders may also retain customer snapshots for historical accuracy.
 */

export type Customer = {
	canonicalId: string;
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

export type CreateCustomer = {
	customerName?: string | null;
	email?: string | null;
	phone?: string | null;
	billingAddress?: string | null;
	shippingAddress?: string | null;
	taxId?: string | null;
	isActive?: boolean | null;
};

export type UpdateCustomer = Partial<CreateCustomer>;
