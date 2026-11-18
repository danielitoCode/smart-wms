import type {
  AdminOperationKey,
  AdminOperationQuery,
  AdminOperationResult
} from '../entity/AdminOperation.ts';
import type { AdminOperationsRepository } from '../repository/AdminOperationsRepository';

export class ListAdminOperationUseCase {
  constructor(private readonly repository: AdminOperationsRepository) {}

  execute(
    feature: AdminOperationKey,
    query?: AdminOperationQuery
  ): Promise<AdminOperationResult> {
    return this.repository.list(feature, query);
  }
}
