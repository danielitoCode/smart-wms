import type { CsvImportResult, CsvImportType } from '../../domain/entity/CsvImport';
import type { CsvImportResponseDto } from '../dto/CsvImportDto';

export const CsvImportMapper = {
	toDomain(importType: CsvImportType, dto: CsvImportResponseDto): CsvImportResult {
		return {
			importType,
			created: dto.created ?? 0,
			updated: dto.updated ?? 0,
			errors: (dto.errors ?? []).map((e) => ({
				row: e.row,
				message: e.message ?? e.error ?? 'Error de importación'
			})),
			raw: dto
		};
	}
};
