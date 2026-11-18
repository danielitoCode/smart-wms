/** Shared types for OrderDetail admin template. */

export interface OrderLineItem {
	name: string;
	details: string;
	price: number;
	qty: number;
	image: string;
}

export interface OrderActivity {
	type: 'event' | 'comment' | 'update';
	user: string;
	text: string;
	reactions?: number;
	time: string;
	changes?: string[];
}

export interface OrderCustomer {
	name: string;
	address: string;
	phone: string;
	email: string;
	billingNote?: string;
}

export interface OrderDetailData {
	id: string;
	status: string;
	dateLabel: string;
	flagLabel?: string;
	customer: OrderCustomer;
	items: OrderLineItem[];
	discount: number;
	discountLabel?: string;
	shipping: number;
	shippingLabel?: string;
	taxRate: number;
	paidWith?: string;
	notes?: string;
	fraudRisk?: number;
	fraudRecommendation?: string;
	fraudBody?: string;
	activity: OrderActivity[];
}

export interface OrderDetailProps {
	order?: OrderDetailData;
	class?: string;
}
