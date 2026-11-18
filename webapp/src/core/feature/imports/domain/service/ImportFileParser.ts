import { MAX_IMPORT_RECORDS } from '../entity/CsvImport';
export { MAX_IMPORT_RECORDS } from '../entity/CsvImport';

export type ImportRecord = Record<string, unknown>;

function parseCsvRows(source: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < source.length; i += 1) {
		const char = source[i];
		if (quoted) {
			if (char === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
			else if (char === '"') quoted = false;
			else cell += char;
		} else if (char === '"' && cell.length === 0) quoted = true;
		else if (char === ',') { row.push(cell); cell = ''; }
		else if (char === '\n' || char === '\r') {
			if (char === '\r' && source[i + 1] === '\n') i += 1;
			row.push(cell);
			if (row.some((value) => value.trim() !== '')) rows.push(row);
			row = []; cell = '';
		} else cell += char;
	}
	if (quoted) throw new Error('El CSV contiene una comilla sin cerrar');
	row.push(cell);
	if (row.some((value) => value.trim() !== '')) rows.push(row);
	return rows;
}

function parseCsv(source: string): ImportRecord[] {
	const rows = parseCsvRows(source.replace(/^\uFEFF/, ''));
	if (rows.length < 2) throw new Error('El CSV debe incluir encabezados y al menos una fila de datos');
	const headers = rows[0].map((header) => header.trim());
	if (headers.some((header) => !header)) throw new Error('El CSV contiene un encabezado vacío');
	if (new Set(headers).size !== headers.length) throw new Error('El CSV contiene encabezados duplicados');
	return rows.slice(1).map((values, index) => {
		if (values.length !== headers.length) throw new Error(`La fila ${index + 2} tiene ${values.length} columnas; se esperaban ${headers.length}`);
		return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
	});
}

function isRecord(value: unknown): value is ImportRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseImportFile(name: string, source: string): ImportRecord[] {
	const extension = name.toLowerCase().split('.').pop();
	let records: ImportRecord[];
	if (extension === 'json') {
		const parsed: unknown = JSON.parse(source);
		const candidate = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.records) ? parsed.records : null;
		if (!candidate) throw new Error('El JSON debe ser un array de registros o un objeto con la propiedad records');
		if (!candidate.every(isRecord)) throw new Error('Cada elemento del JSON debe ser un objeto');
		records = candidate;
	} else if (extension === 'csv') records = parseCsv(source);
	else throw new Error('Formato no admitido. Selecciona un archivo .csv o .json');
	if (!records.length) throw new Error('El archivo no contiene filas de datos');
	if (records.length > MAX_IMPORT_RECORDS) throw new Error(`El máximo permitido por importación es de ${MAX_IMPORT_RECORDS} registros`);
	return records;
}
