import type { CsvImportResult, CsvImportType } from '../entity/CsvImport';

export interface ImportsRepository {
	importRows(importType: CsvImportType, rows: Record<string, string>[]): Promise<CsvImportResult>;
}
