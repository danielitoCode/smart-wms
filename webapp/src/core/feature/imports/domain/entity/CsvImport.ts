export type CsvImportType =
	| 'items'
	| 'bins'
	| 'purchase-orders'
	| 'sales-orders'
	| 'inventory-adjustments';

export type CsvImportResult = {
	importType: CsvImportType;
	created: number;
	updated: number;
	errors: Array<{ row?: number; message: string }>;
	raw: unknown;
};

export const CSV_IMPORT_TYPES: Array<{ value: CsvImportType; label: string; description: string }> = [
	{ value: 'items', label: 'Productos', description: 'SKU, UPC, peso y cantidad inicial' },
	{ value: 'bins', label: 'Ubicaciones', description: 'Bins con zona, pasillo y tipo' },
	{ value: 'purchase-orders', label: 'Órdenes de compra', description: 'PO con proveedor y líneas' },
	{ value: 'sales-orders', label: 'Pedidos de venta', description: 'SO con cliente y líneas' },
	{ value: 'inventory-adjustments', label: 'Ajustes de inventario', description: 'Ajustes masivos de existencias' }
];
