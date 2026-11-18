import type { Vendor, VendorId } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';

export class GetVendorByIdUseCase {
	constructor(private readonly repository: VendorRepository) {}

	execute(id: VendorId): Promise<Vendor> {
		if (!isVendorId(id)) throw new Error('vendor id must be a valid UUID');
		return this.repository.getById(id);
	}
}

/** PostgreSQL canonical_id is a UUID; do not substitute external_id or a row index. */
export function isVendorId(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
