export type CsvImportResponseDto = {
	message?: string;
	total: number;
	imported: number;
	skipped: number;
	errors: Array<{ row: number; error: string }>;
};
