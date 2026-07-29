<script lang="ts">
	import { onMount } from 'svelte';
	import { marketSessions, sessionClock, type SessionClock } from '$lib/sessionClocks';
	import { nativeWidgetPorts } from '$lib/suite/widgets';

	const port = nativeWidgetPorts.vClocks;
	let now = new Date();
	$: clocks = marketSessions.map((session) => sessionClock(session, now));

	onMount(() => {
		const timer = window.setInterval(() => (now = new Date()), 1_000);
		return () => window.clearInterval(timer);
	});

	function status(clock: SessionClock): string {
		return clock.open ? 'Open' : 'Closed';
	}
</script>

<main data-testid="native-session-clocks-port" class="min-h-screen bg-terminal-bg px-4 py-5 text-terminal-text sm:px-6">
	<header class="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-terminal-border pb-4">
		<div>
			<p class="text-3xs font-semibold uppercase tracking-[0.2em] text-terminal-cyan">Native widget port · {port.story}</p>
			<h1 class="mt-1 text-xl font-semibold">{port.title}</h1>
		</div>
		<a href="/hub" class="rounded border border-terminal-border px-3 py-2 text-xs text-terminal-text-secondary hover:border-terminal-cyan hover:text-terminal-cyan">Open preserved Hub</a>
	</header>

	<section class="mx-auto grid max-w-6xl gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
		<div class="grid gap-3 sm:grid-cols-2">
			{#each clocks as clock (clock.id)}
				<article class="rounded border border-terminal-border bg-terminal-bg-panel p-5">
					<div class="flex items-start justify-between gap-3"><div><h2 class="text-base font-semibold">{clock.city}</h2><p class="mt-1 text-2xs text-terminal-text-muted">{clock.venue} · {clock.timeZone}</p></div><span class="rounded px-2 py-1 text-2xs font-semibold {clock.open ? 'bg-terminal-green/10 text-terminal-green' : 'bg-terminal-text-muted/10 text-terminal-text-muted'}">{status(clock)}</span></div>
					<p class="mt-8 font-mono text-3xl tabular-nums">{clock.time}</p>
					<p class="mt-2 text-sm text-terminal-text-secondary">{clock.weekday} · regular local exchange hours</p>
				</article>
			{/each}
		</div>
		<aside class="rounded border border-terminal-border bg-terminal-bg-panel p-4 text-sm leading-6 text-terminal-text-secondary">
			<h2 class="text-xs font-semibold uppercase tracking-[0.16em] text-terminal-text">Port contract</h2>
			<p class="mt-3">{port.provenance}. Each clock is derived locally from one injected browser time source and an explicit IANA time zone.</p>
			<p class="mt-3 text-terminal-yellow">Status reflects regular weekday hours only; it does not claim holiday, halt, or venue-status data. This surface has no market feed, signer, account, order, telemetry, or execution path.</p>
		</aside>
	</section>
</main>
