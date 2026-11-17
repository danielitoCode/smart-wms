import { apiClient } from '../../../infrastructure/api/ApiClient';
import { AuditLogRemoteDataSource } from '../data/datasource/AuditLogRemoteDataSource';
import { AuditLogRepositoryImpl } from '../data/repository/AuditLogRepositoryImpl';
import { FilterAuditLogUseCase, ListAuditLogUseCase } from '../domain/usecase/AuditLogUseCases';

export function createAuditLogDependencies() {
	const repository = new AuditLogRepositoryImpl(new AuditLogRemoteDataSource(apiClient));
	const list = new ListAuditLogUseCase(repository);
	return {
		list,
		filter: new FilterAuditLogUseCase(list)
	};
}
