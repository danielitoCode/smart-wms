import type { Customer } from '../../domain/entity/Customer';
import type { CustomerRepository } from '../../domain/repository/CustomerRepository';
import type { CustomerRemoteDataSource } from '../datasource/CustomerRemoteDataSource';
import { CustomerMapper } from '../mapper/CustomerMapper';

export class CustomerRepositoryImpl implements CustomerRepository {
  constructor(private readonly datasource: CustomerRemoteDataSource) {}

  async search(query: { search: string }): Promise<Customer[]> {
    const response = await this.datasource.search(query);
    return response.results
      .filter((result) => result.type === 'customer')
      .map(CustomerMapper.fromSearchResult);
  }
}
