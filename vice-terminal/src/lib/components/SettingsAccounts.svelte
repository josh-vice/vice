<script lang="ts">
  import { onMount } from 'svelte';
  import {
    addAccount,
    createVault,
    deleteAccount,
    isVaultUnlocked,
    listSavedAccounts,
    lockVault,
    unlockVault
  } from '$lib/credentials/vault';
  import type { SavedVenueAccount } from '$lib/credentials/types';
  import type { VenueEnvironment } from '$lib/venue/adapter';

  let {
    onClose = () => {},
    onAccountSelected = async (_account: SavedVenueAccount) => {}
  }: {
    onClose?: () => void;
    onAccountSelected?: (account: SavedVenueAccount) => void | Promise<void>;
  } = $props();

  let unlocked = $state(false);
  let accounts = $state<SavedVenueAccount[]>([]);
  let rootPassphrase = $state('');
  let label = $state('');
  let environment = $state<VenueEnvironment>('demo');
  let apiKey = $state('');
  let secret = $state('');
  let passphrase = $state('');
  let error = $state('');
  let message = $state('');
  let busy = $state(false);

  function refresh(): void {
    unlocked = isVaultUnlocked();
    accounts = unlocked ? listSavedAccounts() : [];
  }

  function clearSecrets(): void {
    rootPassphrase = '';
    apiKey = '';
    secret = '';
    passphrase = '';
  }

  async function setupVault(): Promise<void> {
    error = '';
    message = '';
    busy = true;
    try {
      await createVault(rootPassphrase);
      clearSecrets();
      refresh();
      message = 'Encrypted browser vault created.';
    } catch {
      error = 'Vault setup failed. Use a non-empty passphrase and try again.';
    } finally {
      busy = false;
    }
  }

  async function unlock(): Promise<void> {
    error = '';
    message = '';
    busy = true;
    try {
      await unlockVault(rootPassphrase);
      clearSecrets();
      refresh();
      message = 'Vault unlocked for this browser session.';
    } catch {
      clearSecrets();
      refresh();
      error = 'Unable to unlock the encrypted vault.';
    } finally {
      busy = false;
    }
  }

  async function saveAccount(): Promise<void> {
    error = '';
    message = '';
    busy = true;
    try {
      await addAccount(
        { venue: 'blofin', label, environment, permissions: ['read', 'trade'] },
        { apiKey, secret, passphrase }
      );
      label = '';
      environment = 'demo';
      clearSecrets();
      refresh();
      message = 'BloFin account saved locally.';
    } catch {
      error = 'Account was not saved. Check the label and credential fields.';
      clearSecrets();
    } finally {
      busy = false;
    }
  }

  async function removeAccount(id: string): Promise<void> {
    error = '';
    message = '';
    busy = true;
    try {
      await deleteAccount(id);
      refresh();
      message = 'Saved account removed.';
    } catch {
      error = 'Saved account could not be removed.';
    } finally {
      busy = false;
    }
  }

  function lock(): void {
    lockVault();
    clearSecrets();
    refresh();
    message = 'Vault locked. Credentials are no longer available to the app.';
  }

  async function selectAccount(account: SavedVenueAccount): Promise<void> {
    error = '';
    message = '';
    busy = true;
    try {
      await onAccountSelected(account);
      message = `Active account: ${account.label}`;
    } catch {
      error = 'Unable to activate this account. Check the venue connection and try again.';
    } finally {
      busy = false;
    }
  }

  onMount(refresh);
</script>

<div class="fixed inset-0 z-50 flex items-start justify-end bg-black/60 p-3" role="presentation">
  <button class="absolute inset-0" aria-label="Close account settings" onclick={onClose}></button>
  <div class="relative z-10 max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded border border-terminal-border bg-terminal-bg-panel p-4 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="venue-settings-title">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 id="venue-settings-title" class="text-sm font-semibold text-terminal-text">Settings · Accounts</h2>
        <p class="mt-1 text-3xs leading-relaxed text-terminal-text-muted">API credentials stay encrypted in this browser. They are never sent to the server or placed in URLs.</p>
      </div>
      <button class="rounded px-2 py-1 text-terminal-text-muted hover:text-terminal-text" aria-label="Close account settings" onclick={onClose}>×</button>
    </div>

    {#if !unlocked}
      <div class="rounded border border-terminal-border bg-terminal-bg-secondary p-3">
        <h3 class="text-xs font-medium text-terminal-text">{accounts.length === 0 ? 'Create encrypted vault' : 'Unlock encrypted vault'}</h3>
        <p class="mt-1 text-3xs text-terminal-text-muted">The passphrase unlocks this browser session only. It is not recoverable by the app.</p>
        <label class="mt-3 block text-3xs text-terminal-text-secondary" for="vault-passphrase">Vault passphrase</label>
        <input id="vault-passphrase" class="mt-1 w-full rounded border border-terminal-border bg-terminal-bg px-2 py-1.5 text-xs text-terminal-text" type="password" autocomplete="new-password" bind:value={rootPassphrase} />
        <button class="mt-3 rounded bg-terminal-cyan px-3 py-1.5 text-3xs font-semibold text-terminal-bg disabled:opacity-50" disabled={busy || rootPassphrase.length === 0} onclick={accounts.length === 0 ? setupVault : unlock}>{accounts.length === 0 ? 'Create vault' : 'Unlock vault'}</button>
      </div>
    {:else}
      <div class="mb-4 flex items-center justify-between rounded border border-terminal-green/30 bg-terminal-green/5 px-3 py-2">
        <span class="text-3xs text-terminal-green">Vault unlocked · browser-local</span>
        <button class="rounded border border-terminal-border px-2 py-1 text-3xs text-terminal-text-secondary hover:text-terminal-text" disabled={busy} onclick={lock}>Lock</button>
      </div>

      <div class="space-y-3">
        <div>
          <h3 class="text-xs font-medium text-terminal-text">Add BloFin account</h3>
          <p class="mt-1 text-3xs text-terminal-text-muted">This integration requests READ + TRADE only. Transfer and withdrawal permissions are not supported.</p>
        </div>
        <label class="block text-3xs text-terminal-text-secondary" for="blofin-account-label">Label</label>
        <input id="blofin-account-label" class="w-full rounded border border-terminal-border bg-terminal-bg px-2 py-1.5 text-xs text-terminal-text" maxlength="40" placeholder="BloFin demo" bind:value={label} />
        <label class="block text-3xs text-terminal-text-secondary" for="blofin-environment">Environment</label>
        <select id="blofin-environment" class="w-full rounded border border-terminal-border bg-terminal-bg px-2 py-1.5 text-xs text-terminal-text" bind:value={environment}>
          <option value="demo">Demo trading</option>
          <option value="production">Production · locked until certified</option>
        </select>
        <label class="block text-3xs text-terminal-text-secondary" for="blofin-api-key">API key</label>
        <input id="blofin-api-key" class="w-full rounded border border-terminal-border bg-terminal-bg px-2 py-1.5 text-xs text-terminal-text" type="password" autocomplete="off" bind:value={apiKey} />
        <label class="block text-3xs text-terminal-text-secondary" for="blofin-secret">Secret</label>
        <input id="blofin-secret" class="w-full rounded border border-terminal-border bg-terminal-bg px-2 py-1.5 text-xs text-terminal-text" type="password" autocomplete="off" bind:value={secret} />
        <label class="block text-3xs text-terminal-text-secondary" for="blofin-passphrase">Passphrase</label>
        <input id="blofin-passphrase" class="w-full rounded border border-terminal-border bg-terminal-bg px-2 py-1.5 text-xs text-terminal-text" type="password" autocomplete="off" bind:value={passphrase} />
        <button class="w-full rounded bg-terminal-cyan px-3 py-2 text-3xs font-semibold text-terminal-bg disabled:opacity-50" disabled={busy || label.trim().length === 0 || apiKey.length === 0 || secret.length === 0 || passphrase.length === 0} onclick={saveAccount}>Save encrypted account</button>
      </div>

      <div class="mt-5 border-t border-terminal-border pt-4">
        <h3 class="text-xs font-medium text-terminal-text">Saved accounts</h3>
        {#if accounts.length === 0}
          <p class="mt-2 text-3xs text-terminal-text-muted">No accounts saved. Credentials are never displayed after save.</p>
        {:else}
          <div class="mt-2 space-y-2">
            {#each accounts as account (account.id)}
              <div class="flex items-center justify-between gap-3 rounded border border-terminal-border bg-terminal-bg-secondary px-3 py-2">
                <div class="min-w-0">
                  <div class="truncate text-xs text-terminal-text">{account.label}</div>
                  <div class="text-3xs uppercase text-terminal-text-muted">{account.venue} · {account.environment} · READ + TRADE</div>
                </div>
                <div class="flex shrink-0 items-center gap-1">
                  <button class="rounded border border-terminal-cyan/40 px-2 py-1 text-3xs text-terminal-cyan hover:bg-terminal-cyan/10" disabled={busy} onclick={() => selectAccount(account)}>Use</button>
                  <button class="rounded border border-terminal-red/40 px-2 py-1 text-3xs text-terminal-red hover:bg-terminal-red/10" disabled={busy} onclick={() => removeAccount(account.id)}>Remove</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if message}<p class="mt-4 text-3xs text-terminal-green" role="status">{message}</p>{/if}
    {#if error}<p class="mt-4 text-3xs text-terminal-red" role="alert">{error}</p>{/if}
  </div>
</div>
