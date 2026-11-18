/** Shared types for ProductDetail template. */

export interface ProductOption {
	value: string;
	label: string;
}

export interface ProductData {
	name: string;
	price: number;
	originalPrice?: number;
	rating?: number;
	ratingCount?: number;
	description: string;
	composition?: string;
	deliveryReturns?: string;
	dimensions?: string;
	images: string[];
	colors?: ProductOption[];
	finishes?: ProductOption[];
}

export interface ProductDetailProps {
	product?: ProductData;
	onAddToCart?: (payload: {
		quantity: number;
		color: string;
		finish: string;
	}) => void;
	onBuyNow?: (payload: {
		quantity: number;
		color: string;
		finish: string;
	}) => void;
	class?: string;
}
