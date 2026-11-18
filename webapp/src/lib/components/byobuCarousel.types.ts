/** Shared types for ByobuCarousel (outside .svelte for clean type imports). */

export interface ByobuItem {
	image: string;
	alt?: string;
	label?: string;
}

export interface ByobuCarouselProps {
	items: ByobuItem[];
	panelWidth?: number;
	panelHeight?: number;
	foldAngle?: number;
	perspective?: number;
	background?: string;
	borderColor?: string;
	showLabels?: boolean;
	vignette?: boolean;
	autoplay?: boolean;
	autoplaySpeed?: number;
	class?: string;
	ariaLabel?: string;
}
