/** Shared types for HoverExpand (outside .svelte for clean type imports). */

export interface HoverExpandImage {
	src: string;
	alt: string;
	/** Optional label shown when the panel is expanded (e.g. "# 23") */
	code?: string;
}

export interface HoverExpandProps {
	images: HoverExpandImage[];
	/** Index expanded on first paint (null = none) */
	initialActive?: number | null;
	class?: string;
}
