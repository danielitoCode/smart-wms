export type CsvImportType =
	| 'items'
	| 'bins'
	| 'purchase-orders'
	| 'sales-orders'
	| 'inventory-adjustments';

export type ImportSource = {
	name: string;
	size: number;
	format: 'csv' | 'json';
};

export type ImportRowError = {
	row: number;
	message: string;
};

export type ImportResult = {
	importType: CsvImportType;
	total: number;
	imported: number;
	skipped: number;
	errors: ImportRowError[];
	message: string;
};

export type ImportJob = {
	source: ImportSource;
	importType: CsvImportType;
	status: 'ready' | 'running' | 'completed' | 'partial' | 'failed' | 'unknown';
	result: ImportResult | null;
};

export const CSV_IMPORT_TYPES: Array<{ value: CsvImportType; label: string; description: string }> = [
	{ value: 'items', label: 'Productos', description: 'SKU, nombre, descripción y datos de producto' },
	{ value: 'bins', label: 'Ubicaciones', description: 'Código, zona, almacén y configuración del bin' },
	{ value: 'purchase-orders', label: 'Órdenes de compra', description: 'Cabecera y líneas de órdenes de compra' },
	{ value: 'sales-orders', label: 'Pedidos de venta', description: 'Cabecera, cliente, direcciones y líneas de venta' },
	{ value: 'inventory-adjustments', label: 'Ajustes de inventario', description: 'Correcciones aprobadas de existencias por SKU, almacén y bin' }
];

export const MAX_IMPORT_RECORDS = 5000;
export const IMPORT_PREVIEW_ROWS = 20;
