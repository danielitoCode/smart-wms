import { describe, it, expect } from 'vitest';
import { MAX_IMPORT_RECORDS, parseImportFile } from '#core/feature/imports/domain/service/ImportFileParser';

describe('Import file parser', () => {
	it('parses quoted CSV cells, commas, escaped quotes and embedded newlines', () => {
		const rows = parseImportFile('items.csv', 'sku,name,description\nA-1,"Widget, blue","line 1\nline ""2"""');
		expect(rows).toEqual([{ sku: 'A-1', name: 'Widget, blue', description: 'line 1\nline "2"' }]);
	});
	it('accepts JSON arrays and records wrappers', () => {
		expect(parseImportFile('items.json', '[{"sku":"A"}]')).toEqual([{ sku: 'A' }]);
		expect(parseImportFile('items.json', '{"records":[{"sku":"B"}]}')).toEqual([{ sku: 'B' }]);
	});
	it('rejects empty data, malformed CSV, duplicate headers and unsupported formats', () => {
		expect(() => parseImportFile('x.csv', 'sku,name')).toThrow();
		expect(() => parseImportFile('x.csv', 'sku,sku\nA,B')).toThrow(/duplicados/);
		expect(() => parseImportFile('x.csv', 'sku,name\n"A,Widget')).toThrow(/comilla/);
		expect(() => parseImportFile('x.xls', 'data')).toThrow(/Formato/);
	});
	it('enforces the backend record ceiling before submission', () => {
		const rows = Array.from({ length: MAX_IMPORT_RECORDS + 1 }, (_, i) => ({ sku: String(i) }));
		expect(() => parseImportFile('x.json', JSON.stringify(rows))).toThrow('5000');
	});
});
