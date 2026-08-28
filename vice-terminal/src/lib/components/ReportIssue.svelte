<script lang="ts">
	/**
	 * Privacy-safe local support bundle flow. Screenshots remain separate
	 * user-owned artifacts and are never embedded in the JSON bundle.
	 */
	import { downloadSupportBundle, supportBundleFilename } from '$lib/diagnostics/download';
	import { X, Download, Camera, ShieldCheck } from 'lucide-svelte';
	import { onMount } from 'svelte';
	let { onClose }: { onClose: () => void } = $props();
	let description = $state('');
	let screenshotDataUrl: string | null = $state(null);
	let capturing = $state(false);
	let captureError = $state<string | null>(null);
	let downloading = $state(false);
	let bundleSummary: { filename: string; bytes: number } | null = $state(null);
	const supportUrl = import.meta.env.PUBLIC_BETA_SUPPORT_URL?.trim() || null;
	let dialogElement: HTMLDivElement;
	let previousFocus: HTMLElement | null = null;

	onMount(() => {
		previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		dialogElement?.focus();
		const handleTab = (event: KeyboardEvent) => {
			if (event.key !== 'Tab' || !dialogElement) return;
			const focusable = [...dialogElement.querySelectorAll<HTMLElement>('button, textarea, input, select, [tabindex]:not([tabindex="-1"])')]
				.filter((element) => !element.hasAttribute('disabled'));
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		dialogElement?.addEventListener('keydown', handleTab);
		return () => {
			dialogElement?.removeEventListener('keydown', handleTab);
			previousFocus?.focus();
		};
	});

	async function captureScreenshot() {
		capturing = true;
		captureError = null;
		try {
			const { default: html2canvas } = await import('html2canvas');
			const canvas = await html2canvas(document.body, { backgroundColor: '#08070f', useCORS: true, logging: false });
			screenshotDataUrl = canvas.toDataURL('image/png');
		} catch (err) {
			captureError = err instanceof Error ? err.message : 'Screenshot capture failed';
			screenshotDataUrl = null;
		} finally {
			capturing = false;
		}
	}

	async function exportBundle() {
		downloading = true;
		try {
			const bundle = downloadSupportBundle(undefined, description);
			const text = JSON.stringify(bundle);
			bundleSummary = { filename: supportBundleFilename(), bytes: text.length };
		} finally {
			downloading = false;
		}
	}
</script>

<div data-action-id="ui.src.lib.components.reportissue.div.h5fab364641"
	bind:this={dialogElement}
	class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
	role="dialog"
	aria-modal="true"
	aria-label="Report an issue"
	tabindex="-1"
	data-testid="report-issue-dialog"
	onclick={(e) => {
		if (e.target === e.currentTarget) onClose();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') onClose();
	}}
>
	<div class="w-full max-w-lg rounded-lg border border-terminal-border bg-terminal-bg-panel shadow-2xl">
		<div class="flex items-center justify-between border-b border-terminal-border px-4 py-3">
			<h2 class="font-mono text-sm font-semibold text-terminal-text">Report an issue</h2>
			<button data-action-id="ui.src.lib.components.reportissue.button.hc09825a96a"
				type="button"
				class="terminal-btn !px-2 !py-1 !text-2xs"
				data-testid="report-issue-close"
				onclick={onClose}
				aria-label="Close"
			>
				<X size={14} />
			</button>
		</div>

		<div class="space-y-3 px-4 py-4">
			<p class="font-mono text-2xs leading-relaxed text-terminal-text-secondary">
				Help support diagnose the issue. Nothing here is uploaded automatically —
				you download a privacy-safe support bundle and attach it to your ticket.
			</p>
			{#if supportUrl}
				<a data-action-id="diagnostics.support" href={supportUrl} target="_blank" rel="noopener noreferrer" class="font-mono text-2xs text-terminal-cyan underline">Open beta support</a>
			{/if}

			<div class="flex items-start gap-2 rounded border border-terminal-green/40 bg-terminal-green/5 px-3 py-2">
				<ShieldCheck size={14} class="mt-0.5 shrink-0 text-terminal-green" />
				<p class="font-mono text-2xs leading-relaxed text-terminal-text-secondary">
					The bundle never includes wallet addresses, keys, signatures, tokens, or
					order payloads. Your description and screenshot are yours to review before sending.
				</p>
			</div>

			<label class="block">
				<span class="mb-1 block font-mono text-2xs text-terminal-text-secondary">What happened? (optional)</span>
				<textarea data-action-id="ui.src.lib.components.reportissue.textarea.h1e8a4f9266"
					data-testid="report-issue-description"
					bind:value={description}
					rows={3}
					maxlength={1000}
					placeholder="Describe the issue — what you did and what you expected…"
					class="w-full resize-none rounded border border-terminal-border bg-terminal-bg px-3 py-2 font-mono text-xs text-terminal-text outline-none placeholder:text-terminal-text-muted focus:border-terminal-cyan"
				></textarea>
			</label>

			<div class="flex items-center gap-2">
				<button data-action-id="ui.src.lib.components.reportissue.button.h79cb8be8bc"
					type="button"
					data-testid="report-issue-screenshot"
					class="terminal-btn"
					disabled={capturing}
					onclick={captureScreenshot}
				>
					<Camera size={14} class="mr-1.5 inline" />
					{capturing ? 'Capturing…' : screenshotDataUrl ? 'Re-capture screenshot' : 'Capture screenshot'}
				</button>
				{#if captureError}
					<span class="font-mono text-2xs text-terminal-red">{captureError}</span>
				{/if}
			</div>

			{#if screenshotDataUrl}
				<div class="overflow-hidden rounded border border-terminal-border">
					<img
						data-testid="report-issue-screenshot-preview"
						src={screenshotDataUrl}
						alt="Screenshot preview"
						class="max-h-40 w-full object-cover"
					/>
				</div>
				<p class="font-mono text-2xs text-terminal-text-muted">
					Review this image before sharing — it may show your own account state.
				</p>
			{/if}

			<div class="flex flex-col gap-1.5">
				<button data-action-id="ui.src.lib.components.reportissue.button.ha103d39caa"
					type="button"
					data-testid="report-issue-download"
					class="terminal-btn terminal-btn-primary"
					disabled={downloading}
					onclick={exportBundle}
				>
					<Download size={14} class="mr-1.5 inline" />
					{downloading ? 'Preparing…' : 'Download support bundle'}
				</button>
				{#if bundleSummary}
					<p class="font-mono text-2xs text-terminal-green" data-testid="report-issue-bundle-summary">
						Saved {bundleSummary.filename} ({bundleSummary.bytes} bytes). Attach it to your ticket.
					</p>
				{/if}
				<p class="font-mono text-2xs text-terminal-text-muted">
					The bundle is a human-readable JSON file with your app version, network,
					feed health history, and diagnostics. No account data is exported.
				</p>
			</div>
		</div>
	</div>
</div>
