import type { UpdateVendor, Vendor, VendorId } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';
export class ModifyVendorUseCase {
 constructor(private readonly repository: VendorRepository) {}
 execute(id: VendorId, vendor: UpdateVendor): Promise<Vendor> {
  return this.repository.modifyVendor(id, vendor);
 }
}