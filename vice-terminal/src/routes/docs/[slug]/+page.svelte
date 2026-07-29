<script lang="ts">
	import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, Link as LinkIcon } from 'lucide-svelte';
	import { docGroups } from '$lib/docs/content';

	let { data } = $props();
	const topic = $derived(data.topic);
	const ordered = docGroups.flatMap((group) => group.items).filter((item) => item[0] !== 'overview');
	const index = $derived(ordered.findIndex((item) => item[0] === topic.slug));
	const previous = $derived(index > 0 ? ordered[index - 1] : undefined);
	const next = $derived(index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined);
</script>

<svelte:head>
	<title>{topic.title} | Vice Terminal Docs</title>
	<meta name="description" content={topic.description} />
</svelte:head>

<main class="min-w-0 px-5 py-10 sm:px-9 lg:px-12 xl:px-16 xl:py-14">
	<div class="mx-auto grid max-w-[1120px] gap-12 xl:grid-cols-[minmax(0,760px)_190px]">
		<article class="min-w-0">
			<nav class="flex items-center gap-1.5 text-xs text-[#77798e]" aria-label="Breadcrumb">
				<a href="/docs" class="hover:text-white">Docs</a><ChevronRight size={12} /><span>{topic.group}</span><ChevronRight size={12} /><span class="text-[#b9bac8]">{topic.label}</span>
			</nav>
			<p class="mt-9 text-[11px] font-bold uppercase tracking-[0.17em] text-[#ff2e88]">{topic.kicker}</p>
			<h1 class="mt-3 text-4xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl">{topic.title}</h1>
			<p class="mt-5 max-w-3xl text-lg leading-8 text-[#aaacbc]">{topic.description}</p>
			<div class="mt-8 flex items-start gap-3 rounded border border-[#a855f7]/25 bg-[#a855f7]/[0.07] p-4 text-sm leading-6 text-[#c8c2d5]">
				<CircleAlert size={17} class="mt-0.5 shrink-0 text-[#c084fc]" />
				<p>This page documents the complete Vice product specification and intended production behavior.</p>
			</div>

			{#if topic.visual}
				<figure class="mt-10 overflow-hidden rounded-md border border-[#272235] bg-[#0d0b18] p-3">
					<div class="flex items-center justify-between px-1 pb-3 text-[10px] font-bold uppercase tracking-[0.15em]">
						<span class="text-[#00d4d4]">Feature walkthrough</span>
						<span class="text-[#696b7f]">{topic.label}</span>
					</div>
					<a href={topic.visual.src} target="_blank" rel="noreferrer" aria-label="Open {topic.label} screenshot at full size">
						<img src={topic.visual.src} alt={topic.visual.alt} class="mx-auto block max-h-[560px] max-w-full rounded border border-[#363049] transition hover:border-[#00d4d4]/55" />
					</a>
					<figcaption class="px-2 pb-1 pt-4 text-sm leading-6 text-[#8b85a3]">{topic.visual.caption} <span class="text-[#676a7d]">Select the image to view it at full size.</span></figcaption>
				</figure>
			{/if}

			<div class="mt-12 divide-y divide-white/[0.09] border-y border-white/[0.09]">
				{#each topic.sections as section}
					<section id={section.id} class="scroll-mt-24 py-10">
						<a href="#{section.id}" class="group flex items-center gap-2">
							<h2 class="text-2xl font-semibold tracking-[-0.025em] text-white">{section.title}</h2>
							<LinkIcon size={14} class="text-[#626478] opacity-0 transition group-hover:opacity-100" />
						</a>
						{#each section.body as paragraph}<p class="mt-4 text-[15px] leading-7 text-[#b0b2c0]">{paragraph}</p>{/each}
						{#if section.points}
							<ul class="mt-5 grid gap-2 sm:grid-cols-2">
								{#each section.points as point}<li class="flex items-center gap-2 rounded border border-[#272235] bg-[#14121f] px-3 py-2.5 text-sm text-[#c5c1d0]"><Check size={14} class="shrink-0 text-[#00d4d4]" />{point}</li>{/each}
							</ul>
						{/if}
						{#if section.steps}
							<ol class="mt-6 space-y-3">
								{#each section.steps as step, i}<li class="flex gap-3 rounded border border-[#272235] bg-[#0d0b18] p-3.5 text-sm text-[#c5c1d0]"><span class="grid h-6 w-6 shrink-0 place-items-center rounded bg-[#00d4d4]/10 font-mono text-[11px] text-[#00d4d4]">{i + 1}</span><span class="pt-0.5">{step}</span></li>{/each}
							</ol>
						{/if}
					</section>
				{/each}
			</div>

			<nav class="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Previous and next documentation pages">
				{#if previous}<a href="/docs/{previous[0]}" class="group rounded border border-[#272235] bg-[#0d0b18] p-4 transition hover:border-[#00d4d4]/40"><span class="flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-[#8b85a3]"><ArrowLeft size={13} /> Previous</span><span class="mt-2 block font-semibold text-white">{previous[1]}</span></a>{:else}<span></span>{/if}
				{#if next}<a href="/docs/{next[0]}" class="group rounded border border-[#272235] bg-[#0d0b18] p-4 text-right transition hover:border-[#ff2e88]/40"><span class="flex items-center justify-end gap-1 text-[11px] uppercase tracking-[0.12em] text-[#8b85a3]">Next <ArrowRight size={13} /></span><span class="mt-2 block font-semibold text-white">{next[1]}</span></a>{/if}
			</nav>
		</article>

		<aside class="hidden xl:block">
			<div class="sticky top-24 border-l border-white/[0.09] pl-5">
				<p class="text-[10px] font-bold uppercase tracking-[0.15em] text-[#696b7f]">On this page</p>
				<nav class="mt-3 space-y-1">{#each topic.sections as section}<a href="#{section.id}" class="block py-1 text-xs leading-5 text-[#8b85a3] transition hover:text-[#00d4d4]">{section.title}</a>{/each}</nav>
			</div>
		</aside>
	</div>
</main>
