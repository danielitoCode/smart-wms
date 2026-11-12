import type { CreateVendor, UpdateVendor, Vendor, VendorId, VendorListQuery, VendorPage } from '../entity/Vendor';

export interface VendorRepository {
	list(query?: VendorListQuery): Promise<VendorPage>;
	getById(vendorId: VendorId): Promise<Vendor>;
	create(input: CreateVendor): Promise<Vendor>;
	update(vendorId: VendorId, input: UpdateVendor): Promise<Vendor>;
	delete(vendorId: VendorId): Promise<void>;
}
