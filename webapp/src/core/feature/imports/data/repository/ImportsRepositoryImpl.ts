import type { ImportsRepository } from '../../domain/repository/ImportsRepository';
import type { CsvImportResult, CsvImportType } from '../../domain/entity/CsvImport';
import { ImportsRemoteDataSource } from '../datasource/ImportsRemoteDataSource';
import { CsvImportMapper } from '../mapper/CsvImportMapper';

export class ImportsRepositoryImpl implements ImportsRepository {
	constructor(private readonly remote: ImportsRemoteDataSource) {}
	async importRows(importType: CsvImportType, rows: Record<string, string>[]): Promise<CsvImportResult> {
		const dto = await this.remote.importRows(importType, rows);
		return CsvImportMapper.toDomain(importType, dto);
	}
}
