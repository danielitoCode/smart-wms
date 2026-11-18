import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { CsvImportType } from '../../domain/entity/CsvImport';
import type { ImportRecord } from '../../domain/service/ImportFileParser';
import type { CsvImportResponseDto } from '../dto/CsvImportDto';

export class ImportsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	importRows(importType: CsvImportType, records: ImportRecord[]) {
		return this.api.post<CsvImportResponseDto>(`/api/admin/import/${importType}`, { records });
	}
}
