/** Canonical vendor master data persisted in PostgreSQL. */
export type VendorId = string;

export type Vendor = {
	canonicalId: VendorId;
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

export type VendorFilter = 'active' | 'archived' | 'all';
export type VendorListQuery = {
	search?: string;
	filter?: VendorFilter;
	page?: number;
	perPage?: number;
};
export type VendorPage = {
	items: Vendor[];
	total: number;
	page: number;
	perPage: number;
	pages: number;
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
	isActive?: boolean | null;
};

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
