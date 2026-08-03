<script lang="ts">
	import { nativeWidgetPorts } from '$lib/suite/widgets';

	const port = nativeWidgetPorts.vSuite;
	const firstPartyLinks = [
		{ href: '/trade', title: 'Trade', detail: 'Open the single local-signing execution surface.', accent: 'text-terminal-cyan' },
		{ href: '/hub', title: 'Hub', detail: 'Open the preserved dashboard while native ports are certified.', accent: 'text-pink-400' },
		{ href: '/scanner', title: 'Scanner', detail: 'Research the current market through the Suite context.', accent: 'text-violet-300' },
		{ href: '/gallery', title: 'Gallery', detail: 'Browse every available widget before adding it to a layout.', accent: 'text-terminal-yellow' }
	] as const;
	const communityLinks = [
		{ href: 'https://vicesuite.com/pricebots', title: 'Vice Tickers', detail: 'Live Discord sidebar price tickers.' },
		{ href: 'https://vicesuite.com/chartbot', title: 'Vice Charts', detail: 'The Vice chart bot for Discord.' },
		{ href: 'https://liqtheory.com/', title: 'Vice Academy', detail: 'Free trading education from Liquidity Theory.' },
		{ href: 'https://discord.gg/LiquidityTheory', title: 'Community Discord', detail: 'Join the Vice and Liquidity Theory community.' }
	] as const;
</script>

<main data-testid="native-suite-links-port" class="min-h-screen bg-terminal-bg px-4 py-5 text-terminal-text sm:px-6">
	<header class="mx-auto flex max-w-5xl items-center justify-between gap-4 border-b border-terminal-border pb-4">
		<div><p class="text-3xs font-semibold uppercase tracking-[0.2em] text-terminal-cyan">Native widget port · {port.story}</p><h1 class="mt-1 text-xl font-semibold">{port.title}</h1></div>
		<a href="/hub" class="rounded border border-terminal-border px-3 py-2 text-xs text-terminal-text-secondary hover:border-terminal-cyan hover:text-terminal-cyan">Open preserved Hub</a>
	</header>

	<section class="mx-auto max-w-5xl py-5">
		<h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-terminal-text-secondary">Vice Suite</h2>
		<div class="mt-3 grid gap-3 sm:grid-cols-2">
			{#each firstPartyLinks as link (link.href)}
				<a href={link.href} class="rounded border border-terminal-border bg-terminal-bg-panel p-4 transition hover:border-terminal-cyan/60 hover:bg-terminal-bg-hover"><p class="text-sm font-semibold {link.accent}">{link.title}</p><p class="mt-1 text-sm leading-6 text-terminal-text-secondary">{link.detail}</p></a>
			{/each}
		</div>

		<h2 class="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-terminal-text-secondary">Community tools</h2>
		<div class="mt-3 grid gap-3 sm:grid-cols-2">
			{#each communityLinks as link (link.href)}
				<a href={link.href} target="_blank" rel="noopener noreferrer" class="rounded border border-terminal-border bg-terminal-bg-panel p-4 transition hover:border-terminal-pink/60 hover:bg-terminal-bg-hover"><p class="text-sm font-semibold text-terminal-pink">{link.title}</p><p class="mt-1 text-sm leading-6 text-terminal-text-secondary">{link.detail}</p></a>
			{/each}
		</div>
		<p class="mt-4 text-xs leading-5 text-terminal-text-muted">{port.provenance}. This navigation-only port preserves the legacy Suite destinations and creates no market feed, account, signer, order, telemetry, or execution path.</p>
	</section>
</main>
