import type {
  AdminOperationKey,
  AdminOperationQuery,
  AdminOperationResult
} from '../entity/AdminOperation.ts';

export interface AdminOperationsRepository {
  list(feature: AdminOperationKey, query?: AdminOperationQuery): Promise<AdminOperationResult>;
}
