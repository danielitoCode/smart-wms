import type {CustomerRepository} from "#core/feature/customers/domain/repository/CustomerRepository.ts";
import type {Customer} from "#core/feature/customers/domain/entity/Customer.ts";

export class GetCustomerByIdUseCase {
    constructor(private readonly repository: CustomerRepository) {}

    async execute(customerId: number): Promise<Customer | null> {
        if (customerId === null) return null
        return this.repository.getById(customerId)
    }
}