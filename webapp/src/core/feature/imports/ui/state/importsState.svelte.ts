import { createImportsDependencies } from '../../di/imports.dependencies';
import { CSV_IMPORT_TYPES, type CsvImportResult, type CsvImportType } from '../../domain/entity/CsvImport';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createImportsDependencies();

export function createImportsState() {
	let importType = $state<CsvImportType>('items');
	let importing = $state(false);
	let error = $state<string | null>(null);
	let result = $state<CsvImportResult | null>(null);

	function parseCsv(text: string): Record<string, string>[] {
		const lines = text.trim().split(/\r?\n/).filter(Boolean);
		if (lines.length < 2) return [];
		const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
		return lines.slice(1).map((line) => {
			const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
			const obj: Record<string, string> = {};
			headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
			return obj;
		});
	}

	async function importFile(file: File) {
		importing = true; error = null; result = null;
		try {
			const text = await file.text();
			let rows: Record<string, string>[];
			if (file.name.toLowerCase().endsWith('.json')) {
				const parsed = JSON.parse(text);
				rows = Array.isArray(parsed) ? parsed : [];
			} else {
				rows = parseCsv(text);
			}
			result = await deps.importCsv.execute(importType, rows);
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudo importar el archivo');
			return false;
		} finally { importing = false; }
	}

	return {
		get importType() { return importType; },
		get importing() { return importing; },
		get error() { return error; },
		get result() { return result; },
		get types() { return CSV_IMPORT_TYPES; },
		setImportType(v: CsvImportType) { importType = v; },
		importFile
	};
}
