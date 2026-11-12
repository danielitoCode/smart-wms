import type {
	CreateCustomer,
	Customer,
	CustomerId,
	UpdateCustomer
} from '../entity/Customer';

export interface CustomerRepository {
	getById(id: CustomerId): Promise<Customer>;
	list(query?: { search?: string; active?: boolean | null }): Promise<Customer[]>;
	create(input: CreateCustomer): Promise<Customer>;
	update(id: CustomerId, input: UpdateCustomer): Promise<Customer>;
	delete(id: CustomerId): Promise<void>;
}
