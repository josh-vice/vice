<svelte:head>
	<title>Vice Suite | Research, learn, and trade</title>
	<meta name="description" content="Vice Suite brings market intelligence, education, and non-custodial trading into one fast workspace." />
</svelte:head>

<main data-testid="suite-shell" class="min-h-screen bg-[#08070d] px-5 py-6 text-white sm:px-8 lg:px-12">
	<nav class="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-white/10 pb-5">
		<a href="/" class="flex items-center gap-3 font-semibold tracking-tight"><img src="/flamingo.png" alt="Vice Suite" class="h-8 w-8 rounded-lg ring-1 ring-pink-400/40" />Vice <span class="text-pink-400">Suite</span></a>
		<div class="hidden items-center gap-4 text-sm text-[#aaa5ba] md:flex"><a href="/hub" class="hover:text-white">Hub</a><a href="/scanner" class="hover:text-white">Scanner</a><a href="/gallery" class="hover:text-white">Gallery</a><a href="/docs" class="hover:text-white">Academy</a></div>
		<a href="/trade" class="rounded-md bg-[#16e9d0] px-4 py-2 text-sm font-semibold text-[#08070d] transition hover:bg-[#8dfff4]">Open Trade</a>
	</nav>

	<section class="mx-auto grid max-w-6xl gap-10 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
		<div>
			<p class="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#16e9d0]">The Vice Suite</p>
			<h1 class="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-7xl">Research with context. Trade with control.</h1>
			<p class="mt-6 max-w-2xl text-lg leading-8 text-[#aaa5ba]">A single market context connects the suite. Trading stays local, non-custodial, and separate from every research surface.</p>
			<div class="mt-8 flex flex-wrap gap-3"><a href="/trade" class="rounded-md bg-[#16e9d0] px-5 py-3 font-semibold text-[#08070d]">Trade now</a><a href="/docs" class="rounded-md border border-white/15 px-5 py-3 font-semibold text-white hover:border-white/40">Read the product guide</a></div>
		</div>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
			<a href="/trade" class="rounded-xl border border-[#16e9d0]/25 bg-[#0e0c16] p-5 transition hover:border-[#16e9d0]/70"><p class="text-sm font-semibold text-[#16e9d0]">Trade</p><p class="mt-2 text-sm leading-6 text-[#aaa5ba]">Exact venue identity, shared data plane, and one local execution path.</p></a>
			<a href="/docs" class="rounded-xl border border-white/10 bg-[#0e0c16] p-5 transition hover:border-white/30"><p class="text-sm font-semibold text-pink-400">Academy & guides</p><p class="mt-2 text-sm leading-6 text-[#aaa5ba]">Learn how every order, automation, and workspace control behaves before you use it.</p></a>
			<a href="/hub" class="rounded-xl border border-white/10 bg-[#0e0c16] p-5 transition hover:border-violet-300/60"><p class="text-sm font-semibold text-violet-300">Hub, Scanner & Gallery</p><p class="mt-2 text-sm leading-6 text-[#aaa5ba]">The local-first 58-widget dashboard, scanner, and gallery now run through the Suite shell while their native Svelte ports are certified.</p></a>
		</div>
	</section>
</main>
