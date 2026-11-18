/** Shared types for Tags picker. */

export type Tag = {
	id: string;
	label: string;
};

export interface TagsProps {
	tags?: Tag[];
	class?: string;
}
