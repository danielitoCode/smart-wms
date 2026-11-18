/** Shared types for FormTwoColumn contact template. */

export interface ContactColumn {
	label: string;
	email: string;
}

export interface FormTwoColumnProps {
	title?: string;
	subtitle?: string;
	illustrationUrl?: string;
	illustrationAlt?: string;
	inquiryReasons?: string[];
	budgetOptions?: string[];
	contactColumns?: ContactColumn[];
	submitLabel?: string;
	onSubmit?: (data: FormTwoColumnValues) => void;
	class?: string;
}

export interface FormTwoColumnValues {
	fullName: string;
	email: string;
	company: string;
	jobTitle: string;
	phone: string;
	inquiryReason: string;
	budget: string;
	details: string;
}
