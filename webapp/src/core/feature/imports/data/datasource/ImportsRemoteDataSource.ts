import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { CsvImportType } from '../../domain/entity/CsvImport';
import type { CsvImportResponseDto } from '../dto/CsvImportDto';

export class ImportsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}
	importRows(importType: CsvImportType, rows: Record<string, string>[]) {
		return this.api.post<CsvImportResponseDto>(`/api/admin/import/${importType}`, { rows });
	}
}
