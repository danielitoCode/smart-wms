import type { ImportsRepository } from '../repository/ImportsRepository';
import type { CsvImportType } from '../entity/CsvImport';

export class ImportCsvUseCase {
	constructor(private readonly repository: ImportsRepository) {}
	execute(importType: CsvImportType, rows: Record<string, string>[]) {
		if (!rows.length) throw new Error('El archivo no contiene filas de datos');
		return this.repository.importRows(importType, rows);
	}
}
