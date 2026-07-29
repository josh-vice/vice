<script lang="ts">
	import BlofinCredentialSetup from '$lib/components/BlofinCredentialSetup.svelte';
	import BlofinPrivateVerification from '$lib/components/BlofinPrivateVerification.svelte';
</script>

<svelte:head>
	<title>BloFin credential review · Vice Terminal</title>
</svelte:head>

<main class="mx-auto min-h-screen max-w-xl bg-terminal-bg px-4 py-10">
	<div class="space-y-4">
		<BlofinCredentialSetup />
		<BlofinPrivateVerification />
	</div>
</main>
