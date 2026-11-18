/**
 * Unified path + query serialization for the shared HTTP client.
 * Skips null/undefined/empty string; encodes consistently via URLSearchParams.
 */

export type QueryValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| ReadonlyArray<string | number | boolean>;

export type QueryParams = Record<string, QueryValue>;

/** Build `/api/...` path with normalized query string. */
export function buildApiPath(path: string, query?: QueryParams): string {
	if (!query) return path;

	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item === undefined || item === null || item === '') continue;
				params.append(key, String(item));
			}
			continue;
		}
		params.set(key, String(value));
	}

	const qs = params.toString();
	if (!qs) return path;
	return path.includes('?') ? `${path}&${qs}` : `${path}?${qs}`;
}
