import type { Customer, CustomerSearchQuery } from '../entity/Customer';

export interface CustomerRepository {
  search(query: CustomerSearchQuery): Promise<Customer[]>;
}
