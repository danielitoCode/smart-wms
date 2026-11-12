import type {CustomerRepository} from "#core/feature/customers/domain/repository/CustomerRepository.ts";
import type {Customer} from "#core/feature/customers/domain/entity/Customer.ts";

export class GetCustomerByIdUseCase {
    constructor(private readonly repository: CustomerRepository) {}

    execute(customerId: number): Promise<Customer | null> {
        if (customerId === null) throw new Error('customerId must be valid number');
        return this.repository.getById(customerId)
    }
}