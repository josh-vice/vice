<script lang="ts">
	import { onMount } from 'svelte';
	import { suiteContext } from '$lib/suite/context';

	let { section = 'dash' }: { section?: 'dash' | 'scanner' | 'gallery' } = $props();
	let hubFrame: HTMLIFrameElement;
	let legacyUrl = $derived(section === 'dash' ? '/legacy/hub/index.html' : `/legacy/hub/index.html#/${section}`);

	function postContext(context: unknown): void {
		hubFrame?.contentWindow?.postMessage({ type: 'vice-suite-context', version: 1, context }, window.location.origin);
	}

	onMount(() => {
		const unsubscribe = suiteContext.subscribe(postContext);
		const onMessage = (event: MessageEvent) => {
			if (event.origin === window.location.origin && event.data?.type === 'vice-suite-hub-ready' && event.data.version === 1) postContext($suiteContext);
		};
		window.addEventListener('message', onMessage);
		return () => {
			unsubscribe();
			window.removeEventListener('message', onMessage);
		};
	});
</script>

<main data-testid="hub-shell" data-hub-section={section} class="h-screen w-screen overflow-hidden bg-terminal-bg">
	<iframe bind:this={hubFrame} title="Vice Hub market dashboard" src={legacyUrl} class="h-full w-full border-0" allow="fullscreen"></iframe>
</main>
