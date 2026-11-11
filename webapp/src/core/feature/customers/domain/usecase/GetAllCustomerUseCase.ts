import type {CustomerRepository} from "#core/feature/customers/domain/repository/CustomerRepository.ts";
import type {Customer} from "#core/feature/customers/domain/entity/Customer.ts";

export class GetAllCustomerUseCase {
    constructor(private readonly repository: CustomerRepository) {}

    async execute(): Promise<Customer[]> {
        return this.repository.getAllCustomer()
    }
}