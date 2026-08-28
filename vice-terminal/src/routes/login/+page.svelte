<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();
	let code = $state('');
	let error = $state('');
	let submitting = $state(false);

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		error = '';
		submitting = true;
		try {
			const response = await fetch('/api/beta/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ code })
			});
			if (!response.ok) {
				error = 'That beta code is not valid. Ask the host for an invite.';
				return;
			}
			await goto(data.target, { replaceState: true });
		} catch {
			error = 'The access service is unavailable. Try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Beta access · Vice Suite</title>
	<meta name="description" content="Private beta access for Vice Suite." />
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-terminal-bg px-5 py-10 text-terminal-text sm:px-8">
	<section class="w-full max-w-sm rounded-xl border border-terminal-border bg-terminal-bg-panel p-7 shadow-panel sm:p-8" aria-labelledby="login-title">
		<div class="flex items-center gap-3">
			<img src="/flamingo.png" alt="Vice Suite" class="h-9 w-9 rounded-lg ring-1 ring-terminal-red/40" />
			<div>
				<h1 id="login-title" class="text-lg font-semibold tracking-tight">Vice <span class="text-terminal-red">Suite</span></h1>
				<p class="text-[10px] font-medium uppercase tracking-[0.22em] text-terminal-text-muted">Private beta</p>
			</div>
		</div>

		<div class="mt-7 border-l-2 border-terminal-green pl-3">
			<p class="text-sm font-medium text-terminal-text">You’re on the list.</p>
			<p class="mt-1 text-xs leading-5 text-terminal-text-secondary">Enter your invite code to access the research and trading workspace.</p>
		</div>

		<form data-action-id="ui.src.routes.login.page.form.h7b380cd50c" class="mt-7 space-y-4" onsubmit={submit}>
			<label class="block text-xs font-medium text-terminal-text-secondary" for="beta-code">
				Beta code
				<input data-action-id="ui.src.routes.login.page.input.ha876aa6cb8"
					id="beta-code"
					class="terminal-input mt-1.5 w-full"
					bind:value={code}
					type="password"
					placeholder="Enter invite code"
					name="code"
					autocomplete="one-time-code"
					aria-invalid={error ? 'true' : 'false'}
				/>
			</label>

			{#if error}
				<p class="text-xs text-terminal-red" role="alert">{error}</p>
			{/if}

			<button data-action-id="ui.src.routes.login.page.button.hb26a4e43a4" type="submit" class="terminal-btn-primary w-full justify-center" disabled={submitting} aria-busy={submitting}>
				{#if submitting}Entering…{:else}Enter beta{/if}
			</button>
		</form>

		<p class="mt-6 text-center text-[11px] leading-5 text-terminal-text-muted">Access is invite-only while we certify the terminal.</p>
	</section>
</main>
