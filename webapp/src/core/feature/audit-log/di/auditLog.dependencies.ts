import { apiClient } from '../../../infrastructure/api/ApiClient';
import { AuditLogRemoteDataSource } from '../data/datasource/AuditLogRemoteDataSource';
import { AuditLogRepositoryImpl } from '../data/repository/AuditLogRepositoryImpl';
import { ListAuditLogUseCase } from '../domain/usecase/AuditLogUseCases';

export function createAuditLogDependencies() {
	const repository = new AuditLogRepositoryImpl(new AuditLogRemoteDataSource(apiClient));
	return {
		list: new ListAuditLogUseCase(repository)
	};
}
