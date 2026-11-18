/** Shared types for SharedTooltipAvatars. */

export interface AvatarItem {
	id: string;
	name: string;
	image: string;
}

export interface SharedTooltipAvatarsProps {
	items: AvatarItem[];
	class?: string;
}
