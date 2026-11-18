/** Shared types for PremiumTestimonial (outside .svelte for clean type imports). */

export interface TestimonialResult {
	/** Short outcome label shown under the quote */
	label: string;
}

export interface Testimonial {
	name: string;
	role: string;
	company: string;
	avatar: string;
	rating: number;
	text: string;
	results: string[];
}

export interface PremiumTestimonialProps {
	title?: string;
	subTitle?: string;
	tagline?: string;
	des?: string;
	/** Optional custom list; defaults to built-in demo set */
	items?: Testimonial[];
	/** Auto-advance interval in ms (0 = off). Default 6000 */
	autoplayMs?: number;
	class?: string;
}
