<script lang="ts">
	import CardStack from './CardStack.svelte';

	type Person = {
		id: string;
		image: string;
		title: string;
		tagline: string;
		counts: { like: number; comment: number };
	};

	const people: Person[] = [
		{
			id: 'hari',
			image:
				'https://assets.lummi.ai/assets/QmPyqQgSM8sDVrcQxRwUA6fTDaeXkLMvpf6Z3Kx4aCg3pU?auto=format&w=500',
			title: 'Hari Lamichhane',
			tagline: 'Software Engineer',
			counts: { like: 142, comment: 23 }
		},
		{
			id: 'sudha',
			image:
				'https://assets.lummi.ai/assets/QmVDPTUj31YYC4ycLmn3r1FhuSZDHBdK4d3Pk4gdbyB5MZ?auto=format&w=200',
			title: 'Sudha Shrestha',
			tagline: 'ML Engineer',
			counts: { like: 98, comment: 17 }
		},
		{
			id: 'sofia',
			image:
				'https://assets.lummi.ai/assets/QmXp6StB1i36XHbbmppop5AwtQgnyom8bYTZqPkLVNGJnk?auto=format&w=200',
			title: 'Sofia',
			tagline: 'Software Engineer',
			counts: { like: 176, comment: 41 }
		},
		{
			id: 'someone',
			image:
				'https://assets.lummi.ai/assets/QmWmYYozQAtxLohY8Hy1yopo4ds25KokJfNdtqybXnR5cw?auto=format&w=200',
			title: 'Someone',
			tagline: 'Doctor',
			counts: { like: 64, comment: 12 }
		},
		{
			id: 'ammy',
			image:
				'https://assets.lummi.ai/assets/QmdybQRQqnqUKugP2e9hTaQi9GUciQkBADkrMVJ6GERsS2?auto=format&w=200',
			title: 'Ammy',
			tagline: 'Pilot',
			counts: { like: 211, comment: 33 }
		},
		{
			id: 'bhagwati',
			image:
				'https://assets.lummi.ai/assets/QmaEVTC9eFZtSLTJmMVNpd2t9ctw1BXPzQKV4rhja62Y5z?auto=format&w=1500',
			title: 'Bhagwati',
			tagline: 'Pharmacist',
			counts: { like: 87, comment: 9 }
		}
	];
</script>

<div class="demo">
	<CardStack items={people} depth={3} autoplay={true} autoplayInterval={4200}>
		{#snippet children(person)}
			<article class="person">
				<img class="person-img" src={person.image} alt={person.title} />
				<div class="person-body">
					<h3 class="person-title">{person.title}</h3>
					<p class="person-tag">{person.tagline}</p>
					<div class="person-meta">
						<span>♥ {person.counts.like}</span>
						<span>💬 {person.counts.comment}</span>
					</div>
				</div>
			</article>
		{/snippet}
	</CardStack>
	<p class="hint">Click / tap para avanzar · autoplay activo</p>
</div>

<style>
	.demo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
		max-width: 22rem;
		margin-inline: auto;
	}

	.person {
		border-radius: 1rem;
		overflow: hidden;
		background: color-mix(in srgb, var(--card, #fff) 96%, transparent);
		border: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 90%, transparent);
		box-shadow:
			0 12px 28px rgba(15, 23, 42, 0.08),
			0 2px 6px rgba(15, 23, 42, 0.04);
	}

	.person-img {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 5;
		object-fit: cover;
		background: #e2e8f0;
	}

	.person-body {
		padding: 0.85rem 1rem 1rem;
	}

	.person-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--head-ink, #012a50);
	}

	.person-tag {
		margin: 0.15rem 0 0.55rem;
		font-size: 0.8125rem;
		color: var(--slate, #5c6b7d);
	}

	.person-meta {
		display: flex;
		gap: 0.85rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--slate, #5c6b7d);
	}

	.hint {
		margin: 0;
		font-size: 0.75rem;
		color: var(--slate, #5c6b7d);
	}
</style>
