import type { VendorId } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';
import { isVendorId } from './GetVendorByIdUseCase';

export class DeleteVendorUseCase {
	constructor(private readonly repository: VendorRepository) {}

	async execute(id: VendorId): Promise<void> {
		if (!isVendorId(id)) throw new Error('vendor id must be a valid UUID');
		await this.repository.delete(id);
	}
}
