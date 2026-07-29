<script lang="ts">
	import { onMount } from 'svelte';
	import { suiteContext } from '$lib/suite/context';

	let hubFrame: HTMLIFrameElement;

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

<svelte:head>
	<title>Vice Hub | Live market dashboard</title>
	<meta name="description" content="A local-first, customizable market dashboard with 58 preserved Vice widgets." />
</svelte:head>

<main data-testid="hub-shell" class="h-screen w-screen overflow-hidden bg-terminal-bg">
	<iframe bind:this={hubFrame} title="Vice Hub market dashboard" src="/legacy/hub/index.html" class="h-full w-full border-0" allow="fullscreen"></iframe>
</main>
