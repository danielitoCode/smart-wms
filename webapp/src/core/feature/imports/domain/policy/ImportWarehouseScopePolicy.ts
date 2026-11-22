import type { CsvImportType } from '../entity/CsvImport';
import type { ImportRecord } from '../service/ImportFileParser';

export type ImportWarehouseContext = {
	role: string;
	assignedWarehouseIds: readonly number[];
	activeWarehouse: { id: number; code: string } | null;
};

export type ImportPreflightIssue = {
	row: number | null;
	message: string;
};

function normalized(value: unknown): string {
	return String(value ?? '').trim();
}

function positiveId(value: unknown): number | null {
	const raw = normalized(value);
	if (!/^[1-9][0-9]*$/.test(raw)) return null;
	const id = Number(raw);
	return Number.isSafeInteger(id) ? id : null;
}

/**
 * Client-side safety check only. Flask remains the authorization boundary.
 * Multi-warehouse rows are deliberately constrained to the currently selected
 * warehouse because the import endpoint does not enforce each row's warehouse.
 */
export function validateImportWarehouseScope(
	importType: CsvImportType,
	records: readonly ImportRecord[],
	context: ImportWarehouseContext
): ImportPreflightIssue[] {
	const active = context.activeWarehouse;
	if (!active || !Number.isSafeInteger(active.id) || active.id <= 0) {
		return [{ row: null, message: 'Selecciona y valida un almacén activo antes de importar.' }];
	}

	if (context.role !== 'ADMIN' && !context.assignedWarehouseIds.includes(active.id)) {
		return [{ row: null, message: 'El almacén activo ya no pertenece a tus asignaciones. Actualiza tu sesión.' }];
	}

	if (importType === 'bins' || importType === 'purchase-orders' || importType === 'sales-orders') {
		const issues: ImportPreflightIssue[] = [];
		records.forEach((record, index) => {
			const rowWarehouseId = positiveId(record.warehouse_id);
			if (rowWarehouseId === null) {
				issues.push({ row: index + 1, message: 'warehouse_id debe ser un entero positivo.' });
			} else if (rowWarehouseId !== active.id) {
				issues.push({
					row: index + 1,
					message: `warehouse_id (${rowWarehouseId}) no coincide con el almacén activo (${active.id}, ${active.code}).`
				});
			}
		});
		return issues;
	}

	if (importType === 'inventory-adjustments') {
		if (context.role !== 'ADMIN') {
			return [{
				row: null,
				message: 'Importación bloqueada para usuarios no ADMIN: el servidor no valida que cada bin pertenezca al almacén asignado.'
			}];
		}
		const issues: ImportPreflightIssue[] = [];
		records.forEach((record, index) => {
			const rowWarehouse = normalized(record.warehouse);
			if (!rowWarehouse) {
				issues.push({ row: index + 1, message: 'La columna warehouse es obligatoria.' });
			} else if (rowWarehouse.toLocaleLowerCase() !== active.code.toLocaleLowerCase()) {
				issues.push({
					row: index + 1,
					message: `warehouse (${rowWarehouse}) no coincide con el almacén activo (${active.code}).`
				});
			}
			if (!normalized(record.bin)) {
				issues.push({ row: index + 1, message: 'La columna bin es obligatoria.' });
			}
		});
		return issues;
	}

	if (importType === 'items' && context.role !== 'ADMIN') {
		const unsafeRow = records.findIndex((record) =>
			normalized(record.default_bin) !== '' ||
			(Number(record.quantity) > 0 && Number.isFinite(Number(record.quantity)))
		);
		if (unsafeRow >= 0) {
			return [{
				row: unsafeRow + 1,
				message: 'La importación de productos con ubicación o cantidad inicial requiere validación de almacén/bin que el servidor no garantiza para cada fila.'
			}];
		}
	}

	return [];
}
