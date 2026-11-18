import type { ImportResult, CsvImportType } from '../../domain/entity/CsvImport';
import type { CsvImportResponseDto } from '../dto/CsvImportDto';

export const CsvImportMapper = {
	toDomain(importType: CsvImportType, dto: CsvImportResponseDto): ImportResult {
		return {
			importType,
			total: dto.total,
			imported: dto.imported,
			skipped: dto.skipped,
			errors: (dto.errors ?? []).map((error) => ({
				row: error.row,
				message: error.error
			})),
			message: dto.message ?? 'Importación procesada'
		};
	}
};
