<script lang="ts">
	import { onMount } from 'svelte';
	import { candleCountdown, candleFrames, utcClock } from '$lib/candleCountdown';
	import { nativeWidgetPorts } from '$lib/suite/widgets';

	const port = nativeWidgetPorts.vCountdown;
	let now = Date.now();
	$: frames = candleFrames.map((frame) => candleCountdown(frame, now));
	$: utc = utcClock(now);
	$: local = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).format(now);

	onMount(() => {
		const timer = window.setInterval(() => (now = Date.now()), 1_000);
		return () => window.clearInterval(timer);
	});
</script>

<main data-testid="native-candle-countdown-port" class="min-h-screen bg-terminal-bg px-4 py-5 text-terminal-text sm:px-6">
	<header class="mx-auto flex max-w-4xl items-center justify-between gap-4 border-b border-terminal-border pb-4">
		<div><p class="text-3xs font-semibold uppercase tracking-[0.2em] text-terminal-cyan">Native widget port · {port.story}</p><h1 class="mt-1 text-xl font-semibold">{port.title}</h1></div>
		<a data-action-id="ui.src.lib.components.nativecandlecountdownport.a.hd95ae679c6" href="/hub" class="rounded border border-terminal-border px-3 py-2 text-xs text-terminal-text-secondary hover:border-terminal-cyan hover:text-terminal-cyan">Open preserved Hub</a>
	</header>

	<section class="mx-auto max-w-4xl py-5">
		<div class="rounded border border-terminal-border bg-terminal-bg-panel p-5">
			<div class="grid gap-2 border-b border-terminal-border pb-5 sm:grid-cols-2"><div><p class="text-2xs uppercase tracking-wide text-terminal-text-muted">UTC</p><p class="mt-1 font-mono text-2xl tabular-nums">{utc} <span class="text-sm text-terminal-text-muted">UTC</span></p></div><div><p class="text-2xs uppercase tracking-wide text-terminal-text-muted">Your local time</p><p class="mt-1 font-mono text-2xl tabular-nums">{local}</p></div></div>
			<div class="mt-5 space-y-4">
				{#each frames as frame (frame.label)}
					<div><div class="flex items-baseline justify-between gap-4"><h2 class="text-sm font-semibold">{frame.label} candle</h2><span class="font-mono text-lg tabular-nums text-terminal-cyan">{frame.labelledRemaining}</span></div><div class="mt-2 h-1.5 overflow-hidden rounded bg-terminal-bg-hover"><div class="h-full origin-left bg-terminal-cyan" style:transform={`scaleX(${frame.progress})`}></div></div></div>
				{/each}
			</div>
		</div>
		<p class="mt-4 rounded border border-terminal-border bg-terminal-bg-panel p-4 text-sm leading-6 text-terminal-text-secondary"><span class="font-semibold text-terminal-text">Port contract.</span> {port.provenance}. Frames are UTC-aligned, including Monday 00:00 UTC for weekly candles. This is a local clock only: no candle, market, signer, account, order, telemetry, or execution path is created.</p>
	</section>
</main>
