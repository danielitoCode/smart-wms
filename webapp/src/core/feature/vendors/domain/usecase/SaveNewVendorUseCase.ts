import type {VendorRepository} from "#core/feature/vendors/domain/repository/VendorRepository.ts";
import type {CreateVendor} from "#core/feature/vendors/domain/entity/Vendor.ts";

export class SaveNewVendorUseCase {
    constructor(private readonly repository: VendorRepository) {}

    async execute(newVendor: CreateVendor) {
        if (newVendor.vendorName === "") throw new Error("A Vendor name cant be empty")
        await this.repository.saveVendor(newVendor)
    }
}