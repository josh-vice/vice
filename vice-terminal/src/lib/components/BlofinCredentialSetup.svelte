<script lang="ts">
	import { onMount } from 'svelte';
	import { submitBlofinCredentialForm, type BlofinCredentialSetupResult } from '$lib/blofin/setup';
	import { listBlofinCredentialFingerprints, removeBlofinCredentials, type BlofinEnvironment } from '$lib/blofin/vault';

	export let onSaved: ((result: Extract<BlofinCredentialSetupResult, { ok: true }>) => void) | undefined;

	let environment: BlofinEnvironment = 'demo';
	let apiKey = '';
	let secretKey = '';
	let passphrase = '';
	let unlockPhrase = '';
	let readPermission = true;
	let tradePermission = false;
	let saving = false;
	let result: BlofinCredentialSetupResult | null = null;
	let storedFingerprints: string[] = [];
	let removingFingerprint: string | null = null;
	let localNotice = '';

	function refreshStoredCredentials(): void {
		storedFingerprints = listBlofinCredentialFingerprints(environment);
	}

	function changeEnvironment(): void {
		result = null;
		localNotice = '';
		refreshStoredCredentials();
	}

	async function save(): Promise<void> {
		saving = true;
		result = await submitBlofinCredentialForm({ environment, apiKey, secretKey, passphrase, unlockPhrase, readPermission, tradePermission });
		saving = false;
		if (result.ok) {
			apiKey = '';
			secretKey = '';
			passphrase = '';
			unlockPhrase = '';
			onSaved?.(result);
			localNotice = '';
			refreshStoredCredentials();
		}
	}

	function removeLocalCredential(keyFingerprint: string): void {
		if (!confirm(`Remove the local encrypted BloFin credential ${keyFingerprint}? This does not revoke the key at BloFin.`)) return;
		removingFingerprint = keyFingerprint;
		try {
			removeBlofinCredentials(environment, keyFingerprint);
			localNotice = `Removed local ciphertext for ${keyFingerprint}. Revoke the venue key separately if it is no longer needed.`;
			refreshStoredCredentials();
		} catch (error) {
			localNotice = error instanceof Error ? error.message : 'BloFin credentials could not be removed locally';
		} finally {
			removingFingerprint = null;
		}
	}

	onMount(refreshStoredCredentials);
</script>

<section class="rounded border border-terminal-border bg-terminal-bg-panel p-4" aria-labelledby="blofin-credentials-title">
	<div class="mb-4">
		<h2 id="blofin-credentials-title" class="text-sm font-semibold text-terminal-text">BloFin local credentials</h2>
		<p class="mt-1 text-xs text-terminal-text-secondary">Stored as encrypted browser-local ciphertext. This setup does not enable BloFin trading or add BloFin to terminal navigation.</p>
	</div>

	<form data-action-id="ui.src.lib.components.blofincredentialsetup.form.h0102a3880f" class="space-y-3" onsubmit={(event) => { event.preventDefault(); void save(); }}>
		<label class="block text-xs text-terminal-text-secondary">Environment
			<select data-action-id="ui.src.lib.components.blofincredentialsetup.select.hb06d2fb30f" bind:value={environment} onchange={changeEnvironment} class="mt-1 w-full rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1.5 text-sm text-terminal-text">
				<option value="demo">Demo</option>
				<option value="live">Live — storage only</option>
			</select>
		</label>
		<label class="block text-xs text-terminal-text-secondary">API key
			<input data-action-id="ui.src.lib.components.blofincredentialsetup.input.h86572df4a2" bind:value={apiKey} autocomplete="off" required class="mt-1 w-full rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1.5 text-sm text-terminal-text" />
		</label>
		<label class="block text-xs text-terminal-text-secondary">Secret key
			<input data-action-id="ui.src.lib.components.blofincredentialsetup.input.h449c93a967" bind:value={secretKey} type="password" autocomplete="new-password" required class="mt-1 w-full rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1.5 text-sm text-terminal-text" />
		</label>
		<label class="block text-xs text-terminal-text-secondary">Passphrase
			<input data-action-id="ui.src.lib.components.blofincredentialsetup.input.h462e7afaee" bind:value={passphrase} type="password" autocomplete="new-password" required class="mt-1 w-full rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1.5 text-sm text-terminal-text" />
		</label>
		<label class="block text-xs text-terminal-text-secondary">Local unlock phrase
			<input data-action-id="ui.src.lib.components.blofincredentialsetup.input.h6e849e1309" bind:value={unlockPhrase} type="password" autocomplete="new-password" minlength="12" required class="mt-1 w-full rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1.5 text-sm text-terminal-text" />
		</label>
		<fieldset class="rounded border border-terminal-border p-2">
			<legend class="px-1 text-xs text-terminal-text-secondary">Declared venue permissions</legend>
			<label class="mt-1 flex items-center gap-2 text-xs text-terminal-text"><input data-action-id="ui.src.lib.components.blofincredentialsetup.input.hc9c4da866f" type="checkbox" bind:checked={readPermission} /> READ — required for verification</label>
			<label class="mt-2 flex items-center gap-2 text-xs text-terminal-text"><input data-action-id="ui.src.lib.components.blofincredentialsetup.input.h690d018834" type="checkbox" bind:checked={tradePermission} /> TRADE — retained locally for future certified use</label>
			<p class="mt-2 text-2xs text-terminal-red">TRANSFER and withdrawal permissions are prohibited.</p>
		</fieldset>
		<button data-action-id="ui.src.lib.components.blofincredentialsetup.button.hd202b88239" type="submit" disabled={saving} class="rounded bg-terminal-cyan px-3 py-1.5 text-xs font-semibold text-terminal-bg disabled:opacity-50">{saving ? 'Encrypting…' : 'Encrypt locally'}</button>
	</form>

	<section class="mt-4 border-t border-terminal-border pt-3" aria-labelledby="blofin-local-credentials-title">
		<h3 id="blofin-local-credentials-title" class="text-xs font-semibold text-terminal-text">Stored on this device</h3>
		<p class="mt-1 text-2xs text-terminal-text-secondary">Only key fingerprints are listed. Removing local ciphertext does not revoke the venue key.</p>
		{#if storedFingerprints.length > 0}
			<ul class="mt-2 space-y-2" aria-label="Stored BloFin credential fingerprints">
				{#each storedFingerprints as keyFingerprint}
					<li class="flex items-center justify-between gap-2 rounded border border-terminal-border px-2 py-1.5 text-2xs">
						<code class="min-w-0 truncate text-terminal-text-muted">{keyFingerprint}</code>
						<button data-action-id="ui.src.lib.components.blofincredentialsetup.button.ha0b31a0e92" type="button" disabled={removingFingerprint === keyFingerprint} class="rounded border border-terminal-red px-2 py-1 text-terminal-red disabled:opacity-50" onclick={() => removeLocalCredential(keyFingerprint)}>{removingFingerprint === keyFingerprint ? 'Removing…' : 'Remove local ciphertext'}</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-2xs text-terminal-text-muted">No encrypted BloFin credentials are stored for this environment.</p>
		{/if}
	</section>

	{#if result?.ok}
		<p data-testid="blofin-credential-success" class="mt-3 text-xs text-terminal-green">Stored locally. Key fingerprint: {result.keyFingerprint}. Permissions: {result.permissions.join(', ')}.</p>
	{:else if result}
		<p role="alert" class="mt-3 text-xs text-terminal-red">{result.error}</p>
	{/if}
	{#if localNotice}
		<p role="status" class="mt-3 text-xs text-terminal-text-secondary">{localNotice}</p>
	{/if}
</section>
