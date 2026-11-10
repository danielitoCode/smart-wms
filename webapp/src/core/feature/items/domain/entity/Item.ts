/**
 * Item (SKU) master data from SentryWMS admin / lookup surfaces.
 */
export type Item = {
	id: number;
	sku: string;
	name: string;
	upc: string | null;
	mpn: string | null;
	category: string | null;
	active: boolean;
};
