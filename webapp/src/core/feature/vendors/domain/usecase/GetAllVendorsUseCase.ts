import type {VendorRepository} from "#core/feature/vendors/domain/repository/VendorRepository.ts";
import type {Vendor} from "#core/feature/vendors/domain/entity/Vendor.ts";

export class GetAllVendorsUseCase {
    constructor(private readonly repository: VendorRepository) {}

    execute(): Promise<Vendor[]> {
        return this.repository.getAllVendors()
    }
}