import type { CreateVendor, Vendor } from '../entity/Vendor';
import type { VendorRepository } from '../repository/VendorRepository';

const LIMITS = { vendorName: 200, contactName: 200, email: 255, phone: 50, billingAddress: 2000, remitToAddress: 2000, taxId: 64, paymentTerms: 64 } as const;

export class SaveNewVendorUseCase {
	constructor(private readonly repository: VendorRepository) {}

	execute(input: CreateVendor): Promise<Vendor> {
		const vendorName = input.vendorName?.trim() ?? '';
		if (!vendorName) throw new Error('El nombre del proveedor es obligatorio');
		if (vendorName.length > LIMITS.vendorName) throw new Error('El nombre del proveedor no puede superar 200 caracteres');
		const normalized = { ...input, vendorName } as CreateVendor;
		for (const field of Object.keys(LIMITS) as Array<keyof typeof LIMITS>) {
			const value = normalized[field];
			if (value != null && typeof value === 'string' && value.length > LIMITS[field]) {
				throw new Error(`${field} no puede superar ${LIMITS[field]} caracteres`);
			}
			if (typeof value === 'string') (normalized as Record<string, unknown>)[field] = value.trim() || null;
		}
		return this.repository.create(normalized);
	}
}
