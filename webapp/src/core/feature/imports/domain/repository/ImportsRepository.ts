import type { ImportResult, CsvImportType } from '../entity/CsvImport';
import type { ImportRecord } from '../service/ImportFileParser';

export interface ImportsRepository {
	importRows(importType: CsvImportType, rows: ImportRecord[]): Promise<ImportResult>;
}
