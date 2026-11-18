import { createImportsDependencies } from '../../di/imports.dependencies';
import { CSV_IMPORT_TYPES, type ImportJob, type ImportResult, type CsvImportType, type ImportSource } from '../../domain/entity/CsvImport';
import { parseImportFile, type ImportRecord } from '../../domain/service/ImportFileParser';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

export function createImportsState(dependencies: ReturnType<typeof createImportsDependencies> = createImportsDependencies()) {
	const deps = dependencies;
	let importType = $state<CsvImportType>('items');
	let source = $state<ImportSource | null>(null);
	let records = $state<ImportRecord[]>([]);
	let importing = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ImportResult | null>(null);
	let failedRows = $state<ImportRecord[]>([]);
	let job = $state<ImportJob | null>(null);

	function setImportType(value: CsvImportType) {
		importType = value; result = null; failedRows = []; records = []; source = null; error = null; job = null;
	}

	async function prepareFile(file: File) {
		error = null; result = null; failedRows = []; records = []; source = null; job = null;
		try {
			if (!file.size) throw new Error('El archivo está vacío');
			const extension = file.name.toLowerCase().split('.').pop();
			if (extension !== 'csv' && extension !== 'json') throw new Error('Formato no admitido. Selecciona un archivo .csv o .json');
			const parsed = parseImportFile(file.name, await file.text());
			records = parsed;
			source = { name: file.name, size: file.size, format: extension };
			job = { source, importType, status: 'ready', result: null };
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo leer el archivo');
			return false;
		}
	}

	async function runRows(rows: ImportRecord[], originalRows: ImportRecord[]) {
		if (importing || !rows.length || !source) return false;
		importing = true; error = null;
		job = { source, importType, status: 'running', result: null };
		try {
			const response = await deps.executeImport.execute(importType, rows);
			const normalizedErrors = response.errors.map((item) => {
				const originalIndex = rows === records ? item.row - 1 : originalRows.indexOf(rows[item.row - 1]);
				return { ...item, row: originalIndex >= 0 ? originalIndex + 1 : item.row };
			});
			result = { ...response, errors: normalizedErrors };
			failedRows = normalizedErrors.map((item) => originalRows[item.row - 1]).filter((row): row is ImportRecord => Boolean(row));
			job = { source, importType, status: response.skipped === 0 ? 'completed' : response.imported > 0 ? 'partial' : 'failed', result };
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo ejecutar la importación');
			job = { source, importType, status: 'failed', result: null };
			return false;
		} finally { importing = false; }
	}

	return {
		get importType() { return importType; },
		get source() { return source; },
		get records() { return records; },
		get importing() { return importing; },
		get error() { return error; },
		get result() { return result; },
		get failedRows() { return failedRows; },
		get job() { return job; },
		get types() { return CSV_IMPORT_TYPES; },
		setImportType,
		prepareFile,
		executeImport: () => runRows(records, records),
		retryFailedRows: () => runRows(failedRows, records)
	};
}
