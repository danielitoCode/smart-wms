import type { UpdateVendor, Vendor, VendorId } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';
import { isVendorId } from './GetVendorByIdUseCase';

const LIMITS = { vendorName: 200, contactName: 200, email: 255, phone: 50, billingAddress: 2000, remitToAddress: 2000, taxId: 64, paymentTerms: 64 } as const;

export class ModifyVendorUseCase {
	constructor(private readonly repository: VendorRepository) {}

	execute(id: VendorId, input: UpdateVendor): Promise<Vendor> {
		if (!isVendorId(id)) throw new Error('vendor id must be a valid UUID');
		const update: UpdateVendor = {};
		for (const field of Object.keys(LIMITS) as Array<keyof typeof LIMITS>) {
			const value = input[field];
			if (value === undefined) continue;
			if (field === 'vendorName' && (value === null || !value.trim())) {
				throw new Error('El nombre del proveedor no puede quedar vacío');
			}
			if (value !== null && value.length > LIMITS[field]) {
				throw new Error(`${field} no puede superar ${LIMITS[field]} caracteres`);
			}
			(update as Record<string, unknown>)[field] = typeof value === 'string' ? value.trim() || null : value;
		}
		if (input.isActive !== undefined) update.isActive = input.isActive;
		if (Object.keys(update).length === 0) throw new Error('Debe proporcionar al menos un campo para actualizar');
		return this.repository.update(id, update);
	}
}
