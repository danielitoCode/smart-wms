/** Shared types for BlobCard (outside .svelte for clean type imports). */

export interface BlobCardColors {
	/** Main blob color */
	colorPrimary?: string;
	/** Secondary blob color */
	colorSecondary?: string;
	/** Accent (also used for grid + header tint) */
	colorAccent?: string;
	/** Highlight blob color */
	colorHighlight?: string;
}

export interface BlobCardProps extends BlobCardColors {
	class?: string;
}
