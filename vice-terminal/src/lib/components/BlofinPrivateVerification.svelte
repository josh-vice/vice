<script lang="ts">
	import { onMount } from 'svelte';
	import { verifyBlofinPrivateCredentials, type BlofinPrivateVerificationResult } from '$lib/blofin/setup';
	import { listBlofinCredentialFingerprints, type BlofinEnvironment } from '$lib/blofin/vault';

	let environment: BlofinEnvironment = 'demo';
	let fingerprints: string[] = [];
	let keyFingerprint = '';
	let unlockPhrase = '';
	let verifying = false;
	let result: BlofinPrivateVerificationResult | null = null;

	function refresh(): void {
		fingerprints = listBlofinCredentialFingerprints(environment);
		keyFingerprint = fingerprints.includes(keyFingerprint) ? keyFingerprint : (fingerprints[0] ?? '');
	}

	function changeEnvironment(): void {
		result = null;
		unlockPhrase = '';
		refresh();
	}

	async function verify(): Promise<void> {
		if (!keyFingerprint || !unlockPhrase) return;
		verifying = true;
		result = await verifyBlofinPrivateCredentials({ environment, keyFingerprint, unlockPhrase });
		unlockPhrase = '';
		verifying = false;
	}

	onMount(refresh);
</script>

<section class="rounded border border-terminal-border bg-terminal-bg-panel p-4" aria-labelledby="blofin-private-verify-title">
	<h2 id="blofin-private-verify-title" class="text-sm font-semibold text-terminal-text">Read-only private verification</h2>
	<p class="mt-1 text-xs text-terminal-text-secondary">Unlock one device-local key only to check that BloFin returns one complete private snapshot. Vice does not retain account values, open a private socket, or send an order.</p>

	<form class="mt-4 space-y-3" onsubmit={(event) => { event.preventDefault(); void verify(); }}>
		<label class="block text-xs text-terminal-text-secondary">Environment
			<select bind:value={environment} onchange={changeEnvironment} class="mt-1 w-full rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1.5 text-sm text-terminal-text">
				<option value="demo">Demo</option>
				<option value="live">Live — read only</option>
			</select>
		</label>
		<label class="block text-xs text-terminal-text-secondary">Local key fingerprint
			<select bind:value={keyFingerprint} disabled={fingerprints.length === 0} class="mt-1 w-full rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1.5 font-mono text-sm text-terminal-text disabled:opacity-50">
				{#if fingerprints.length === 0}
					<option value="">No encrypted key stored for this environment</option>
				{:else}
					{#each fingerprints as fingerprint}<option value={fingerprint}>{fingerprint}</option>{/each}
				{/if}
			</select>
		</label>
		<label class="block text-xs text-terminal-text-secondary">Local unlock phrase
			<input bind:value={unlockPhrase} type="password" autocomplete="current-password" minlength="12" required class="mt-1 w-full rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1.5 text-sm text-terminal-text" />
		</label>
		<button type="submit" disabled={verifying || !keyFingerprint || !unlockPhrase} class="rounded border border-terminal-cyan px-3 py-1.5 text-xs font-semibold text-terminal-cyan disabled:opacity-50">{verifying ? 'Verifying…' : 'Verify read-only access'}</button>
	</form>

	{#if result?.ok}
		<p data-testid="blofin-private-verify-success" role="status" class="mt-3 text-xs text-terminal-green">Complete private snapshot verified at {new Date(result.verifiedAt).toLocaleString()}. {result.balanceCount} balance records, {result.positionCount} positions, and {result.openOrderCount} open orders were checked; no values were retained.</p>
	{:else if result}
		<p role="alert" class="mt-3 text-xs text-terminal-red">{result.error}</p>
	{/if}
</section>
