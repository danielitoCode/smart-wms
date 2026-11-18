/** Shared types for DisperseCarousel. */

export interface DisperseItem {
	title: string;
	image: string;
	/** Optional alt text for the image */
	alt?: string;
}

export interface DisperseCarouselProps {
	items: DisperseItem[];
	/** Auto-cycle interval in ms. 0 = off. */
	autoPlay?: number;
	class?: string;
}
