/** Shared types for StickyCardStack. */

export interface StickyCardItem {
	title: string;
	src: string;
	alt?: string;
}

export interface StickyCardStackProps {
	items: StickyCardItem[];
	/** Hint text above the stack */
	hint?: string;
	class?: string;
}
