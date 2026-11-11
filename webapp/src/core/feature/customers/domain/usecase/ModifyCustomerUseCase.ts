import type {CustomerRepository} from "#core/feature/customers/domain/repository/CustomerRepository.ts";
import type {Customer} from "#core/feature/customers/domain/entity/Customer.ts";

export class ModifyCustomerUseCase {
    constructor(private readonly repository: CustomerRepository) {}

    async execute(customerId: number, updatedCustomer: Customer): Promise<void> {
        if (customerId === null) return
        if (updatedCustomer.customerName === "") return
        await this.repository.modifyCustomer(updatedCustomer);
    }
}