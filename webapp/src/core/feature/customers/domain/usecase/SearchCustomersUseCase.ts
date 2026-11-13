import type { Customer, CustomerSearchQuery } from '../entity/Customer';
import type { CustomerRepository } from '../repository/CustomerRepository';

export class SearchCustomersUseCase {
  constructor(private readonly repository: CustomerRepository) {}

  execute(query: CustomerSearchQuery): Promise<Customer[]> {
    const search = query.search.trim();
    if (search.length < 2) {
      throw new Error('Escribe al menos dos caracteres para buscar clientes');
    }

    return this.repository.search({ search });
  }
}
