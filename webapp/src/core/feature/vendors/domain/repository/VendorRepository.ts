import type {CreateVendor, UpdateVendor, Vendor} from "#core/feature/vendors/domain/entity/Vendor.ts";

export interface VendorRepository {
    getAllVendors(): Promise<Vendor[]>
    getVendorById(vendorId: number): Promise<void>
    deleteVendor(vendorId: number): Promise<void>
    saveVendor(vendor: CreateVendor): Promise<void>
    modifyVendor(vendor: UpdateVendor): Promise<void>
}