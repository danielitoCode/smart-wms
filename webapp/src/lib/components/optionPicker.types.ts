/** Shared types for OptionPicker. */

export type OptionIcon = 'lock' | 'globe' | 'users' | 'eye';

export interface OptionItem {
	id: string;
	label: string;
	/** Built-in icon key (SVG inline) */
	icon?: OptionIcon;
}

export interface OptionPickerProps {
	options?: OptionItem[];
	value?: string;
	onChange?: (id: string) => void;
	class?: string;
}
