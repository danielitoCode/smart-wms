import type { DisplayTweet, TweetEntity, TweetPhoto, TweetVideo } from './types';

/**
 * Fetch público vía CDN syndication (mismo endpoint que usa react-tweet).
 */
export async function fetchTweet(id: string): Promise<DisplayTweet | null> {
	const url = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(id)}&token=0`;
	const res = await fetch(url);
	if (!res.ok) return null;
	const raw = await res.json();
	if (!raw || raw.__typename === 'TweetTombstone' || !raw.id_str) return null;
	return mapSyndication(raw);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSyndication(raw: any): DisplayTweet {
	const user = raw.user ?? {};
	const screen = user.screen_name ?? 'user';
	const id = String(raw.id_str ?? raw.id);

	const entities: TweetEntity[] = buildEntities(
		raw.text ?? raw.full_text ?? '',
		raw.entities
	);

	const photos: TweetPhoto[] | undefined = (raw.photos ?? raw.mediaDetails ?? [])
		.filter((m: { type?: string }) => !m.type || m.type === 'photo')
		.map((p: { url?: string; media_url_https?: string; width?: number; height?: number }) => ({
			url: p.url ?? p.media_url_https ?? '',
			width: p.width,
			height: p.height
		}))
		.filter((p: TweetPhoto) => p.url);

	let video: TweetVideo | undefined;
	const vid = raw.video ?? raw.mediaDetails?.find((m: { type?: string }) => m.type === 'video');
	if (vid) {
		const variants = vid.variants ?? [];
		const mp4 = variants.find((v: { type?: string }) => v.type === 'video/mp4') ?? variants[0];
		if (mp4?.src) {
			video = { poster: vid.poster ?? vid.media_url_https, src: mp4.src };
		}
	}

	return {
		id,
		url: `https://x.com/${screen}/status/${id}`,
		text: raw.text ?? raw.full_text ?? '',
		entities,
		createdAt: raw.created_at,
		user: {
			name: user.name ?? screen,
			screen_name: screen,
			url: `https://x.com/${screen}`,
			profile_image_url_https: (user.profile_image_url_https ?? user.profile_image_url ?? '').replace(
				'_normal',
				'_bigger'
			),
			verified: Boolean(user.verified),
			is_blue_verified: Boolean(user.is_blue_verified)
		},
		photos: photos?.length ? photos : undefined,
		video
	};
}

function buildEntities(
	text: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	rawEntities: any
): TweetEntity[] {
	if (!text) return [];
	type Span = { start: number; end: number; entity: TweetEntity };
	const spans: Span[] = [];

	const push = (
		list:
			| {
					indices: [number, number];
					text?: string;
					screen_name?: string;
					url?: string;
					expanded_url?: string;
					display_url?: string;
			  }[]
			| undefined,
		kind: 'url' | 'hashtag' | 'mention' | 'symbol'
	) => {
		if (!list) return;
		for (const item of list) {
			const [start, end] = item.indices ?? [0, 0];
			let label = text.slice(start, end);
			let href = '#';
			if (kind === 'url') {
				href = item.expanded_url ?? item.url ?? '#';
				label = item.display_url ? item.display_url : label;
			} else if (kind === 'hashtag') {
				href = `https://x.com/hashtag/${encodeURIComponent(item.text ?? label.replace('#', ''))}`;
			} else if (kind === 'mention') {
				href = `https://x.com/${item.screen_name ?? label.replace('@', '')}`;
			} else if (kind === 'symbol') {
				href = `https://x.com/search?q=%24${encodeURIComponent(item.text ?? '')}`;
			}
			spans.push({ start, end, entity: { type: kind, text: label, href } });
		}
	};

	push(rawEntities?.urls, 'url');
	push(rawEntities?.hashtags, 'hashtag');
	push(rawEntities?.user_mentions, 'mention');
	push(rawEntities?.symbols, 'symbol');

	spans.sort((a, b) => a.start - b.start);

	const out: TweetEntity[] = [];
	let cursor = 0;
	for (const s of spans) {
		if (s.start > cursor) {
			out.push({ type: 'text', text: escapeHtml(text.slice(cursor, s.start)) });
		}
		if (s.start >= cursor) {
			out.push(s.entity);
			cursor = s.end;
		}
	}
	if (cursor < text.length) {
		out.push({ type: 'text', text: escapeHtml(text.slice(cursor)) });
	}
	if (!out.length) {
		out.push({ type: 'text', text: escapeHtml(text) });
	}
	return out;
}

function escapeHtml(s: string) {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/\n/g, '<br/>');
}

/** Demo estático si el CDN no responde (lab / offline). */
export const DEMO_TWEET: DisplayTweet = {
	id: 'demo',
	url: 'https://x.com/xai/status/0',
	text: 'Smart WMS — recepción, picking y shipping en un solo flujo. Migración frontend a SvelteKit en curso.',
	entities: [
		{
			type: 'text',
			text: 'Smart WMS — recepción, picking y shipping en un solo flujo. Migración frontend a '
		},
		{ type: 'hashtag', text: '#SvelteKit', href: 'https://x.com/hashtag/SvelteKit' },
		{ type: 'text', text: ' en curso.' }
	],
	user: {
		name: 'Smart WMS',
		screen_name: 'smartwms',
		url: 'https://x.com/smartwms',
		profile_image_url_https:
			'https://abs.twimg.com/sticky/default_profile_images/default_profile_bigger.png',
		verified: true
	},
	photos: [
		{
			url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=500&fit=crop',
			width: 800,
			height: 500
		}
	]
};
