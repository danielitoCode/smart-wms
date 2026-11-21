/** Tipos mínimos para el embed syndication de X/Twitter. */
export type TweetEntity =
	| { type: 'text'; text: string }
	| { type: 'url' | 'hashtag' | 'mention' | 'symbol'; text: string; href: string };

export type TweetPhoto = {
	url: string;
	width?: number;
	height?: number;
};

export type TweetVideo = {
	poster?: string;
	src: string;
};

export type DisplayTweet = {
	id: string;
	url: string;
	text: string;
	entities: TweetEntity[];
	createdAt?: string;
	user: {
		name: string;
		screen_name: string;
		url: string;
		profile_image_url_https: string;
		verified?: boolean;
		is_blue_verified?: boolean;
	};
	photos?: TweetPhoto[];
	video?: TweetVideo;
};

export type TweetLogo = 'twitter' | 'x';
