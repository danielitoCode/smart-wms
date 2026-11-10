/**
 * Preferred-bin assignment for an item.
 *
 * Priority is a one-based ordering per item. The preferred-bin set must not
 * contain duplicate priorities; persisted priorities are kept contiguous
 * (1..N). Only Pickable bins are eligible as preferred locations.
 */

export type PreferredBin = {
	preferredBinId: number;
	itemId: number;
	binId: number;
	priority: number;
	updatedAt: string | null;

	/** Optional joined fields used by domain consumers. */
	sku?: string | null;
	itemName?: string | null;
	binCode?: string | null;
	zoneName?: string | null;
};

export type PreferredBinCandidate = {
	itemId: number;
	binId: number;
	priority: number;
};

export type PreferredBinBinType = 'Pickable';
