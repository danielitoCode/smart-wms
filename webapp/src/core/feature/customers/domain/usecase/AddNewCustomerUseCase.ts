import type {CustomerRepository} from "#core/feature/customers/domain/repository/CustomerRepository.ts";
import type {Customer} from "#core/feature/customers/domain/entity/Customer.ts";

export class AddNewCustomerUseCase {
    constructor(private readonly repository: CustomerRepository) {}

    async execute(newCustomer: Customer): Promise<void> {
        if (newCustomer.customerName === "") return
        await this.repository.addCustomer(newCustomer)
    }
}