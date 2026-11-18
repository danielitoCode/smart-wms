import type { ImportsRepository } from '../../domain/repository/ImportsRepository';
import type { ImportResult, CsvImportType } from '../../domain/entity/CsvImport';
import type { ImportRecord } from '../../domain/service/ImportFileParser';
import { ImportsRemoteDataSource } from '../datasource/ImportsRemoteDataSource';
import { CsvImportMapper } from '../mapper/CsvImportMapper';

export class ImportsRepositoryImpl implements ImportsRepository {
	constructor(private readonly remote: ImportsRemoteDataSource) {}

	async importRows(importType: CsvImportType, records: ImportRecord[]): Promise<ImportResult> {
		const dto = await this.remote.importRows(importType, records);
		return CsvImportMapper.toDomain(importType, dto);
	}
}
