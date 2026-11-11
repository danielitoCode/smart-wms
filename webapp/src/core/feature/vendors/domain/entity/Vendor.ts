/**
 * Canonical vendor entity backed by the vendors table.
 *
 * Only canonical_id, external_id and timestamps are guaranteed non-null by
 * the database. Descriptive vendor columns (including vendor_name and
 * is_active) are nullable on persisted/imported rows, even though the admin
 * create request requires vendor_name and defaults is_active to true.
 */
export type Vendor = {
	canonicalId: string;
	externalId: string;
	vendorName: string | null;
	contactName: string | null;
	email: string | null;
	phone: string | null;
	billingAddress: string | null;
	remitToAddress: string | null;
	taxId: string | null;
	paymentTerms: string | null;
	isActive: boolean | null;
	createdAt: string;
	updatedAt: string;
};

/** Mirrors CreateVendorRequest: vendor_name is required; remaining fields optional. */
export type CreateVendor = {
	vendorName: string;
	contactName?: string | null;
	email?: string | null;
	phone?: string | null;
	billingAddress?: string | null;
	remitToAddress?: string | null;
	taxId?: string | null;
	paymentTerms?: string | null;
	isActive?: boolean | null;
};

/** Mirrors UpdateVendorRequest; omitted properties are left unchanged. */
export type UpdateVendor = {
	vendorName?: string | null;
	contactName?: string | null;
	email?: string | null;
	phone?: string | null;
	billingAddress?: string | null;
	remitToAddress?: string | null;
	taxId?: string | null;
	paymentTerms?: string | null;
	isActive?: boolean | null;
};
