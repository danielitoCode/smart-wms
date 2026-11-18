/** Shared types for InlineTableControl. */

export interface TableItem {
	id: string;
	expense: string;
	method: string;
	amount: string;
}

export interface InlineTableControlProps {
	data: TableItem[];
	onUpdate?: (item: TableItem) => void;
	class?: string;
}
