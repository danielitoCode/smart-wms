/**
 * Vendor master entity.
 *
 * Vendors are canonically identified by UUID. externalId is the stable
 * upstream-system identifier; the roster can be soft-archived with isActive.
 */

export type Vendor = {
	canonicalId: string;
	externalId: string;
	vendorName: string;
	contactName: string | null;
	email: string | null;
	phone: string | null;
	billingAddress: string | null;
	remitToAddress: string | null;
	taxId: string | null;
	paymentTerms: string | null;
	isActive: boolean;
	createdAt: string | null;
	updatedAt: string | null;
};

export type CreateVendor = {
	vendorName: string;
	contactName?: string | null;
	email?: string | null;
	phone?: string | null;
	billingAddress?: string | null;
	remitToAddress?: string | null;
	taxId?: string | null;
	paymentTerms?: string | null;
	isActive?: boolean;
};

export type UpdateVendor = Partial<CreateVendor>;
