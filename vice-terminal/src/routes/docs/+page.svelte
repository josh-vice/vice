<script lang="ts">
	import { ArrowRight, Bot, CandlestickChart, Check, Gauge, LayoutDashboard, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-svelte';

	const modules = [
		{ icon: CandlestickChart, eyebrow: 'EXECUTION', title: 'Trade from every surface', text: 'Interactive charts, a precision ticket, DOM ladder, keyboard commands, and position controls feed one exact-identity execution path.', href: '/docs/order-entry', tags: ['Chart trading', 'DOM', 'CLI'] },
		{ icon: ShieldCheck, eyebrow: 'TRUST', title: 'Your wallet stays in control', text: 'Wallet-approved, device-local agents keep signing authority with the trader. Vice never becomes the custodian of a trading key.', href: '/docs/security-model', tags: ['Non-custodial', 'Local signing', 'Kill switch'] },
		{ icon: Bot, eyebrow: 'AUTOMATION', title: 'Strategies with a visible lifecycle', text: 'Venue-native orders and restart-aware local strategies state their real persistence. The planned self-hosted runner is not available.', href: '/docs/automation', tags: ['TWAP', 'Scale', 'Conditional'] },
		{ icon: Gauge, eyebrow: 'SPEED', title: 'Latency you can inspect', text: 'A shared data plane, native-performance rendering roadmap, and measurable release budgets turn “fast” into a standard Vice can prove.', href: '/docs/market-data', tags: ['Live feeds', 'Latency gates', 'Fail closed'] }
	];

	const capabilities = [
		['Order types', 'Market, limit, stop, stop-limit, bracket, maker routing, trailing stop, break-even, OCO, Scale, Chase, Swarm, Iceberg, TWAP, adaptive TWAP, VWAP, POV, Ping-Pong, and conditional ladders.', '/docs/advanced-orders'],
		['Market intelligence', 'Live book, trades, candles, funding, open interest, mark, index, alerts, sounds, grouping, analytics, and cross-venue context.', '/docs/market-data'],
		['Position command center', 'One-action close, reverse, flatten, cancel-all, close-all, risk sizing, fat-finger limits, and automatic protection.', '/docs/position-controls'],
		['Operator workspace', 'Curated layouts, panel controls, programmable hotkeys, keyboard navigation, privacy mode, and a chainable command line.', '/docs/layouts-hotkeys'],
		['Market coverage', 'Hyperliquid perps, spot, HIP-3, RWAs, and prediction outcomes first, followed by a certified multi-venue expansion path.', '/docs/hyperliquid']
	];
</script>

<main class="min-w-0 px-5 py-10 sm:px-9 lg:px-14 xl:px-20 xl:py-16">
	<div class="mx-auto max-w-[1080px]">
		<div class="inline-flex items-center gap-2 rounded border border-[#ff2e88]/30 bg-[#ff2e88]/[0.07] px-3 py-1 text-xs font-semibold text-[#ff6cae]"><Sparkles size={13} /> VICE TERMINAL · PRODUCT DOCS</div>
		<h1 class="mt-6 max-w-4xl text-4xl font-extrabold leading-[1.06] tracking-[-0.045em] text-white sm:text-6xl">The execution terminal built around <span class="brand-gradient">trader control.</span></h1>
		<p class="mt-6 max-w-3xl text-lg leading-8 text-[#a8a3bb]">Vice Terminal brings institutional-grade crypto workflows into one high-clarity workspace: fast to operate, non-custodial by design, and ambitious enough to become the command center for every serious trader.</p>
		<div class="mt-8 flex flex-wrap gap-3">
			<a href="/docs/interface-overview" class="inline-flex items-center gap-2 rounded bg-[#00d4d4] px-4 py-2.5 text-sm font-bold text-[#08070f] transition hover:shadow-[0_0_24px_rgba(0,212,212,.28)]">Explore the interface <ArrowRight size={16} /></a>
			<a href="/docs/launch-roadmap" class="inline-flex items-center gap-2 rounded border border-[#4b4566] px-4 py-2.5 text-sm font-semibold text-[#d7d8e3] transition hover:border-[#ff2e88] hover:text-[#ff6cae]">View launch roadmap</a>
		</div>

		<section class="mt-14 overflow-hidden rounded-md border border-[#272235] bg-[#0d0b18] shadow-[0_30px_90px_rgba(0,0,0,.3)]">
			<div class="border-b border-[#272235] px-5 py-4 sm:px-6">
				<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#00d4d4]"><LayoutDashboard size={15} /> Platform overview</div>
				<p class="mt-2 text-sm text-[#a9abba]">Scan markets, form a thesis, execute, and manage risk without changing contexts.</p>
			</div>
			<a href="/docs/interface-overview" class="group block p-3 sm:p-5">
				<img src="/docs/vice-workspace-overview.png" alt="Vice Terminal desktop workspace" class="w-full rounded border border-[#363049] transition group-hover:border-[#00d4d4]/40" />
				<div class="flex items-center justify-between px-1 pt-4 text-sm"><span class="text-[#9294a7]">Take a guided tour of the complete workspace.</span><span class="flex items-center gap-1 text-[#00d4d4]">Interface overview <ArrowRight size={14} /></span></div>
			</a>
		</section>

		<section class="mt-16 grid gap-4 md:grid-cols-2">
			{#each modules as module}
				{@const ModuleIcon = module.icon}
				<a href={module.href} class="group rounded-md border border-[#272235] bg-gradient-to-br from-[#14121f] to-[#0d0b18] p-6 transition hover:-translate-y-0.5 hover:border-[#00d4d4]/55 hover:shadow-[0_0_24px_rgba(0,212,212,.1)]">
					<ModuleIcon size={21} class="text-[#ff2e88]" />
					<p class="mt-7 text-[10px] font-bold tracking-[0.16em] text-[#77798e]">{module.eyebrow}</p>
					<h2 class="mt-2 flex items-center justify-between text-xl font-semibold tracking-tight text-white">{module.title}<ArrowRight size={16} class="opacity-0 transition group-hover:opacity-100" /></h2>
					<p class="mt-3 text-sm leading-6 text-[#adafbe]">{module.text}</p>
					<div class="mt-5 flex flex-wrap gap-2">{#each module.tags as tag}<span class="rounded-md border border-white/[0.08] bg-[#06070d] px-2 py-1 text-[11px] text-[#c9cad7]">{tag}</span>{/each}</div>
				</a>
			{/each}
		</section>

		<section class="mt-20 border-t border-white/[0.1] pt-14">
			<div class="grid gap-8 lg:grid-cols-[.65fr_1.35fr]">
				<div><p class="text-xs font-bold uppercase tracking-[0.16em] text-[#ff2e88]">Full capability set</p><h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white">Built for the whole trading day.</h2><p class="mt-4 leading-7 text-[#a8a3bb]">Every capability shares a consistent market identity, risk model, custody boundary, and execution standard.</p></div>
				<div class="space-y-1">
					{#each capabilities as capability, i}
						<a href={capability[2]} class="group block rounded border border-transparent p-5 transition hover:border-[#272235] hover:bg-[#14121f]">
							<div class="flex gap-4"><span class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded bg-[#ff2e88]/10 text-xs font-bold text-[#ff6cae]">0{i + 1}</span><div><h3 class="flex items-center gap-2 font-semibold text-white">{capability[0]}<ArrowRight size={13} class="opacity-0 transition group-hover:opacity-100" /></h3><p class="mt-1.5 text-sm leading-6 text-[#a8a3bb]">{capability[1]}</p></div></div>
						</a>
					{/each}
				</div>
			</div>
		</section>

		<section class="mt-20 rounded-md border border-[#a855f7]/25 bg-[radial-gradient(circle_at_0%_0%,rgba(168,85,247,.16),transparent_38%),linear-gradient(135deg,#14121f,#0d0b18)] p-7 sm:p-10">
			<div class="flex flex-col justify-between gap-8 md:flex-row"><div class="max-w-xl"><div class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#c084fc]"><LockKeyhole size={15} /> The Vice standard</div><h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white">Power without hidden trade-offs.</h2><p class="mt-4 leading-7 text-[#b9b4c7]">Custody, market identity, stale data, and uncertain order outcomes are product design—not implementation details.</p></div><div class="grid content-start gap-3 text-sm text-[#d8d4e1]"><span class="flex items-center gap-2"><Check size={16} class="text-[#00d4d4]" /> Browser-local signing authority</span><span class="flex items-center gap-2"><Check size={16} class="text-[#00d4d4]" /> Exact market and order identity</span><span class="flex items-center gap-2"><Check size={16} class="text-[#00d4d4]" /> Visible live and degraded states</span><span class="flex items-center gap-2"><Check size={16} class="text-[#00d4d4]" /> Reconciliation-first execution</span></div></div>
		</section>

		<footer class="mt-20 flex flex-col justify-between gap-5 border-t border-[#272235] py-10 sm:flex-row sm:items-center"><div class="flex items-center gap-3"><img src="/vice-mark.png" alt="" class="h-9 w-9 object-contain" /><div><p class="font-semibold text-white">The Vice Suite · <span class="text-[#ff2e88]">Vice Terminal</span></p><p class="text-sm text-[#777287]">The product guide for a modern trading operating system.</p></div></div></footer>
	</div>
</main>

<style>
	.brand-gradient {
		background: linear-gradient(90deg, #00d4d4, #a855f7, #ff2e88, #a855f7, #00d4d4);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		animation: brand-flow 8s linear infinite;
	}
	@keyframes brand-flow { to { background-position: -200% 50%; } }
	@media (prefers-reduced-motion: reduce) { .brand-gradient { animation: none; } }
</style>
