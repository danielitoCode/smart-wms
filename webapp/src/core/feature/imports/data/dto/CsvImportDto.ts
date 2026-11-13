export type CsvImportResponseDto = {
	created?: number;
	updated?: number;
	errors?: Array<{ row?: number; message?: string; error?: string }>;
	[key: string]: unknown;
};
