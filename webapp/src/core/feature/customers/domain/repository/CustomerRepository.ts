import type {Customer} from "#core/feature/customers/domain/entity/Customer.ts";

export interface CustomerRepository {
    getById(id: number): Promise<Customer>;
    getAllCustomer(): Promise<Customer[]>;
    addCustomer(customer: Customer): Promise<void>;
    deleteCustomer(id: number): Promise<void>;
    modifyCustomer(customer: Customer): Promise<void>;
}