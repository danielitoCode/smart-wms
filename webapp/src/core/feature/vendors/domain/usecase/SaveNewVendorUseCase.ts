import type { CreateVendor, Vendor } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';

export class SaveNewVendorUseCase {
 constructor(private readonly repository: VendorRepository) {}
 execute(vendor: CreateVendor): Promise<Vendor> {
  if (!vendor.vendorName.trim()) throw new Error('El nombre del proveedor es obligatorio');
  return this.repository.saveVendor(vendor);
 }
}