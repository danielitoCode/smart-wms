import type { VendorId } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';
export class DeleteVendorUseCase {
 constructor(private readonly repository: VendorRepository) {}
 execute(id: VendorId): Promise<void> { return this.repository.deleteVendor(id); }
}