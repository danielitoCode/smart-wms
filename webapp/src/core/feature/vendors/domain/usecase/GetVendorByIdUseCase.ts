import type { VendorId, Vendor } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';

export class GetVendorByIdUseCase {
 constructor(private readonly repository: VendorRepository) {}
 execute(id: VendorId): Promise<Vendor> {
  return this.repository.getVendorById(id);
 }
}