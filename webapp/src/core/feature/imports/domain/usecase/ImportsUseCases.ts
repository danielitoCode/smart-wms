import { MAX_IMPORT_RECORDS, type CsvImportType, type ImportResult } from '../entity/CsvImport';
import type { ImportsRepository } from '../repository/ImportsRepository';
import type { ImportRecord } from '../service/ImportFileParser';

export class ExecuteImportUseCase {
	constructor(private readonly repository: ImportsRepository) {}

	execute(importType: CsvImportType, rows: ImportRecord[]): Promise<ImportResult> {
		if (!rows.length) throw new Error('El archivo no contiene filas de datos');
		if (rows.length > MAX_IMPORT_RECORDS) {
			throw new Error(`El máximo permitido por importación es de ${MAX_IMPORT_RECORDS} registros`);
		}
		return this.repository.importRows(importType, rows);
	}
}
