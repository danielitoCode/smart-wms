import type { Vendor, VendorId } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';

export class GetVendorByIdUseCase {
	constructor(private readonly repository: VendorRepository) {}

	execute(id: VendorId): Promise<Vendor> {
		if (!isVendorId(id)) throw new Error('vendor id must be a valid UUID');
		return this.repository.getById(id);
	}
}

export function isVendorId(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
