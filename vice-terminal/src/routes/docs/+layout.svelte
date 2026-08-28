<script lang="ts">
	import { page } from '$app/state';
	import { BookOpen, ChevronDown, ChevronRight, Menu, Search, X } from 'lucide-svelte';
	import { docGroups, topics } from '$lib/docs/content';

	let { children } = $props();
	let search = $state('');
	let menuOpen = $state(false);
	const query = $derived(search.trim().toLowerCase());
	const results = $derived(query
		? Object.values(topics)
				.filter((topic) => `${topic.title} ${topic.description} ${topic.group}`.toLowerCase().includes(query))
				.slice(0, 7)
		: []
	);
</script>

<svelte:head>
	<title>Vice Terminal Documentation</title>
	<meta name="description" content="Official product documentation for Vice Terminal: setup, trading, automation, market intelligence, workspace controls, and venue coverage." />
</svelte:head>

<div class="docs-root min-h-screen bg-[#08070f] text-[#f6f5fb]">
	<header class="sticky top-0 z-40 border-b border-[#272235] bg-[#08070f]/90 backdrop-blur-xl">
		<div class="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
			<a data-action-id="ui.src.routes.docs.layout.a.h8456cb0d50" href="/docs" class="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-tight">
				<span class="brand-mark grid h-8 w-8 place-items-center rounded">
					<img src="/vice-mark.png" alt="Vice Terminal flamingo" class="h-7 w-7 object-contain" />
				</span>
				<span><strong class="text-[#ff2e88]">Vice</strong> Terminal <span class="text-[#777287]">/ DOCS</span></span>
			</a>
			<span class="hidden h-5 w-px bg-white/[0.1] sm:block"></span>
			<span class="hidden text-xs text-[#77798e] sm:block">Product documentation</span>
			<div class="relative ml-auto hidden w-full max-w-[390px] lg:block">
				<Search size={15} class="pointer-events-none absolute left-3 top-2.5 text-[#77798e]" />
				<input data-action-id="ui.src.routes.docs.layout.input.he7cb46d3ea" bind:value={search} class="h-9 w-full rounded border border-[#272235] bg-[#0d0b18] pl-9 pr-14 text-sm outline-none transition placeholder:text-[#777287] focus:border-[#00d4d4]/60 focus:bg-[#14121f]" placeholder="Search documentation…" aria-label="Search documentation" />
				<span class="absolute right-2 top-2 rounded border border-white/[0.08] px-1.5 py-0.5 text-[9px] text-[#707287]">⌘ K</span>
				{#if results.length}
					<div class="absolute left-0 right-0 top-11 overflow-hidden rounded-xl border border-white/[0.1] bg-[#11121e] p-2 shadow-2xl">
						{#each results as result}
							<a data-action-id="ui.src.routes.docs.layout.a.hbb42657098" href="/docs/{result.slug}" class="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-white/[0.06]" onclick={() => search = ''}>
								<span><span class="block text-sm text-white">{result.label}</span><span class="mt-0.5 block text-[11px] text-[#77798e]">{result.group}</span></span>
								<ChevronRight size={14} class="text-[#626478]" />
							</a>
						{/each}
					</div>
				{/if}
			</div>
			<a data-action-id="ui.src.routes.docs.layout.a.h4d217db4fc" href="/" class="hidden items-center gap-2 rounded border border-[#363049] px-3 py-2 text-xs font-medium text-[#d2d3df] transition hover:border-[#00d4d4] hover:text-[#00d4d4] hover:shadow-[0_0_18px_rgba(0,212,212,.18)] sm:flex">Open terminal <ChevronRight size={14} /></a>
			<button data-action-id="ui.src.routes.docs.layout.button.hf5d8e45e8f" class="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.1] lg:hidden" onclick={() => menuOpen = !menuOpen} aria-label="Toggle documentation navigation">
				{#if menuOpen}<X size={18} />{:else}<Menu size={18} />{/if}
			</button>
		</div>
	</header>

	<div class="mx-auto grid max-w-[1600px] lg:grid-cols-[292px_minmax(0,1fr)]">
		<aside class:hidden={!menuOpen} class="docs-sidebar fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto border-r border-[#272235] bg-[#08070f] px-5 py-7 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:px-6">
			<div class="mb-6 lg:hidden">
				<label class="relative block">
					<Search size={15} class="pointer-events-none absolute left-3 top-2.5 text-[#77798e]" />
					<input data-action-id="ui.src.routes.docs.layout.input.hef01932c3e" bind:value={search} class="h-9 w-full rounded-lg border border-white/[0.1] bg-white/[0.045] pl-9 pr-3 text-sm outline-none" placeholder="Search documentation…" />
				</label>
				{#if results.length}
					<div class="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1">
						{#each results as result}<a data-action-id="ui.src.routes.docs.layout.a.he5c7bf556a" href="/docs/{result.slug}" class="block rounded px-3 py-2 text-sm hover:bg-white/[0.05]" onclick={() => { search = ''; menuOpen = false; }}>{result.label}</a>{/each}
					</div>
				{/if}
			</div>
			<nav aria-label="Documentation navigation">
				{#each docGroups as group}
					<details class="docs-group mb-4" open={group.items.some((item) => page.url.pathname === (item[0] === 'overview' ? '/docs' : `/docs/${item[0]}`)) || ['Welcome', 'Setup'].includes(group.label)}>
						<summary data-action-id="ui.src.routes.docs.layout.summary.hb4291a173c" class="mb-1.5 flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#74768b] hover:bg-white/[0.03] hover:text-[#a6a8b8]">
							<ChevronDown size={12} class="group-chevron transition-transform" />{group.label}
						</summary>
						<div>
							{#each group.items as item}
								{@const href = item[0] === 'overview' ? '/docs' : `/docs/${item[0]}`}
								<a data-action-id="docs.navigation.topic" {href} onclick={() => menuOpen = false} class:active={page.url.pathname === href} class:pl-6={item[2]} class="docs-link flex items-center justify-between rounded px-2.5 py-1.5 text-[13px] leading-5 text-[#a8a3bb] transition hover:bg-[#14121f] hover:text-white">
									{item[1]}<ChevronRight size={12} class="shrink-0 opacity-0" />
								</a>
							{/each}
						</div>
					</details>
				{/each}
			</nav>
			<div class="mt-8 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
				<BookOpen size={16} class="text-[#00d4d4]" />
				<p class="mt-3 text-xs font-semibold text-white">Vice product specification</p>
				<p class="mt-1.5 text-[11px] leading-5 text-[#77798e]">Complete capability documentation for the pitch showcase and delivery roadmap.</p>
			</div>
		</aside>
		{@render children()}
	</div>
</div>

<style>
	.docs-root {
		font-family: 'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace;
		background-image:
			radial-gradient(900px 480px at 82% -10%, rgba(0,212,212,.11), transparent 60%),
			radial-gradient(820px 540px at 8% 4%, rgba(255,46,136,.08), transparent 58%),
			radial-gradient(760px 560px at 50% 120%, rgba(168,85,247,.08), transparent 60%),
			linear-gradient(rgba(168,120,220,.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(168,120,220,.03) 1px, transparent 1px);
		background-size: auto, auto, auto, 44px 44px, 44px 44px;
	}
	.docs-sidebar { background-color: rgba(8,7,15,.94); }
	.docs-link.active { color: #ff2e88; background: rgba(255,46,136,.075); box-shadow: inset 2px 0 #ff2e88; }
	.docs-link.active :global(svg) { opacity: 1; }
	.docs-group:not([open]) :global(.group-chevron) { transform: rotate(-90deg); }
	.docs-group summary::-webkit-details-marker { display: none; }
	.brand-mark { background: linear-gradient(155deg, rgba(255,108,174,.12), rgba(255,46,136,.05)); box-shadow: 0 0 16px rgba(255,46,136,.18); }
</style>
