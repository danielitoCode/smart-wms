import type {CustomerRepository} from "#core/feature/customers/domain/repository/CustomerRepository.ts";
import type {Customer} from "#core/feature/customers/domain/entity/Customer.ts";

export class DeleteCustomerUseCase {
    constructor(private readonly repository: CustomerRepository) {}

    async execute(customerId: number): Promise<void> {
        if (customerId === null) return
        await this.repository.deleteCustomer(customerId)
    }
}