import { createImportsDependencies } from '../../di/imports.dependencies';
import { CSV_IMPORT_TYPES, type ImportJob, type ImportResult, type CsvImportType, type ImportSource } from '../../domain/entity/CsvImport';
import { parseImportFile, type ImportRecord } from '../../domain/service/ImportFileParser';
import { MAX_IMPORT_BODY_BYTES } from '../../domain/usecase/ImportsUseCases';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

export function createImportsState(dependencies: ReturnType<typeof createImportsDependencies> = createImportsDependencies()) {
	const deps = dependencies;
	let importType = $state<CsvImportType>('items');
	let source = $state<ImportSource | null>(null);
	let records = $state<ImportRecord[]>([]);
	let importing = $state(false);
	let attempted = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ImportResult | null>(null);
	let job = $state<ImportJob | null>(null);

	function clearFile() {
		source = null;
		records = [];
		result = null;
		error = null;
		job = null;
		attempted = false;
	}

	function setImportType(value: CsvImportType) {
		importType = value;
		clearFile();
	}

	async function prepareFile(file: File) {
		clearFile();
		try {
			if (!file.size) throw new Error('El archivo está vacío');
			if (file.size > MAX_IMPORT_BODY_BYTES) throw new Error('El archivo supera el límite de 10 MiB del servidor');
			const extension = file.name.toLowerCase().split('.').pop();
			if (extension !== 'csv' && extension !== 'json') throw new Error('Formato no admitido. Selecciona un archivo .csv o .json');
			const parsed = parseImportFile(file.name, await file.text());
			const bodyBytes = new TextEncoder().encode(JSON.stringify({ records: parsed })).byteLength;
			if (bodyBytes > MAX_IMPORT_BODY_BYTES) throw new Error('El contenido serializado supera el límite de 10 MiB del servidor');
			records = parsed;
			source = { name: file.name, size: file.size, format: extension };
			job = { source, importType, status: 'ready', result: null };
			return true;
		} catch (cause) {
			error = toUserMessage(cause, 'No se pudo leer el archivo');
			return false;
		}
	}

	async function executeImport() {
		if (importing || attempted || !records.length || !source) return false;
		attempted = true;
		importing = true;
		error = null;
		job = { source, importType, status: 'running', result: null };
		try {
			const response = await deps.executeImport.execute(importType, records);
			result = response;
			job = {
				source,
				importType,
				status: response.skipped === 0 ? 'completed' : response.imported > 0 ? 'partial' : 'failed',
				result
			};
			return true;
		} catch (cause) {
			// The server may have committed rows before the connection failed.
			// Without an idempotency key, retrying the same file is unsafe.
			error = `No se pudo confirmar el resultado. El servidor podría haber procesado algunas filas. Verifica los datos importados antes de preparar otro archivo. Detalle: ${toUserMessage(cause, 'Error al ejecutar la importación')}`;
			job = { source, importType, status: 'unknown', result: null };
			return false;
		} finally {
			importing = false;
		}
	}

	return {
		get importType() { return importType; },
		get source() { return source; },
		get records() { return records; },
		get importing() { return importing; },
		get attempted() { return attempted; },
		get error() { return error; },
		get result() { return result; },
		get job() { return job; },
		get types() { return CSV_IMPORT_TYPES; },
		setImportType,
		prepareFile,
		clearFile,
		executeImport
	};
}
