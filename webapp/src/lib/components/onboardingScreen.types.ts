/** Shared types for OnboardingScreen (outside .svelte for clean type imports). */

export interface OnboardingCompleteData {
	businessName: string;
	legalName: string;
}

export interface OnboardingScreenProps {
	title?: string;
	subtitle?: string;
	businessNameLabel?: string;
	businessNamePlaceholder?: string;
	legalNameLabel?: string;
	legalNamePlaceholder?: string;
	nextButtonText?: string;
	finishButtonText?: string;
	tooltipMainText?: string;
	tooltipSubText?: string;
	rightSectionDescription?: string;
	/** Called when the user finishes the last step */
	onComplete?: (data: OnboardingCompleteData) => void;
	class?: string;
}
