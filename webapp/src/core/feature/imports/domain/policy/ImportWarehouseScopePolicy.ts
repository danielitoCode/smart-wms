import type { CsvImportType } from '../entity/CsvImport';
import type { ImportRecord } from '../service/ImportFileParser';

export type ImportWarehouseContext = {
	role: string;
	assignedWarehouseIds: readonly number[];
	activeWarehouse: { id: number; code: string } | null;
	availableBinCodes?: readonly string[];
	binCatalogVerified?: boolean;
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

function hasBin(context: ImportWarehouseContext, code: string): boolean {
	return context.binCatalogVerified === true &&
		(context.availableBinCodes ?? []).some((item) => item.toLocaleLowerCase() === code.toLocaleLowerCase());
}

/**
 * Client-side safety check only. Flask remains the authorization boundary.
 * Rows are constrained to the selected warehouse because the import endpoint
 * does not enforce each row's warehouse/bin relationship.
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
		if (!context.binCatalogVerified) {
			return [{ row: null, message: 'No se pudo verificar el catálogo de bins del almacén activo. La importación queda bloqueada.' }];
		}
		const issues: ImportPreflightIssue[] = [];
		records.forEach((record, index) => {
			const rowWarehouse = normalized(record.warehouse);
			const bin = normalized(record.bin);
			if (!rowWarehouse) {
				issues.push({ row: index + 1, message: 'La columna warehouse es obligatoria.' });
			} else if (rowWarehouse.toLocaleLowerCase() !== active.code.toLocaleLowerCase()) {
				issues.push({
					row: index + 1,
					message: `warehouse (${rowWarehouse}) no coincide con el almacén activo (${active.code}).`
				});
			}
			if (!bin) issues.push({ row: index + 1, message: 'La columna bin es obligatoria.' });
			else if (!hasBin(context, bin)) issues.push({ row: index + 1, message: `El bin ${bin} no pertenece al catálogo del almacén activo.` });
		});
		return issues;
	}

	if (importType === 'items') {
		const issues: ImportPreflightIssue[] = [];
		records.forEach((record, index) => {
			const defaultBin = normalized(record.default_bin);
			const quantity = Number(record.quantity);
			if (context.role !== 'ADMIN' && Number.isFinite(quantity) && quantity > 0 && !defaultBin) {
				issues.push({ row: index + 1, message: 'La cantidad inicial requiere un default_bin del almacén activo.' });
			}
			if (defaultBin && !hasBin(context, defaultBin)) {
				issues.push({ row: index + 1, message: `El default_bin ${defaultBin} no pertenece al catálogo del almacén activo o no pudo verificarse.` });
			}
		});
		return issues;
	}

	return [];
}
