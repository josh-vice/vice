<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();
	let code = $state('');
	let error = $state('');
	let submitting = $state(false);
	let granted = $state(false);
	let revealPassword = $state(false);
	let bootLineCount = $state(0);
	let cinematicVideo: HTMLVideoElement;

	const bootLines = [
		{ label: 'VICE BIOS', detail: 'NEON KERNEL 20.26', tone: 'cyan' },
		{ label: 'CIPHER', detail: 'SIGNED SESSION CHANNEL READY', tone: 'green' },
		{ label: 'RELAY', detail: 'MARKET UPLINK STANDBY', tone: 'pink' },
		{ label: 'VAULT', detail: 'BROWSER CUSTODY LOCAL', tone: 'purple' },
		{ label: 'ACCESS', detail: 'AWAITING OPERATOR', tone: 'cyan' }
	] as const;

	onMount(() => {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion) {
			cinematicVideo?.pause();
			bootLineCount = bootLines.length;
			return;
		}
		const timers = bootLines.map((_, index) => window.setTimeout(() => {
			bootLineCount = index + 1;
		}, 220 + index * 260));
		return () => timers.forEach(window.clearTimeout);
	});

	async function submit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!code.trim() || submitting) return;
		error = '';
		submitting = true;
		try {
			const response = await fetch('/api/beta/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ code })
			});
			if (!response.ok) {
				error = response.status === 429
					? 'TOO MANY ATTEMPTS // CHANNEL TEMPORARILY LOCKED'
					: response.status === 503
						? 'AUTH NODE OFFLINE // CONTACT SYSTEM OPERATOR'
						: 'ACCESS DENIED // CREDENTIAL REJECTED';
				code = '';
				return;
			}
			granted = true;
			await new Promise((resolve) => window.setTimeout(resolve, 650));
			await goto(data.target, { replaceState: true });
		} catch {
			error = 'UPLINK FAILURE // RETRY CONNECTION';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Restricted access · Vice Terminal</title>
	<meta name="description" content="Restricted operator access for Vice Terminal." />
</svelte:head>

<main class="login-shell min-h-screen overflow-x-hidden overflow-y-auto bg-[#05040b] font-mono text-terminal-text" class:access-granted={granted}>
	<div class="ascii-cinematic-wrap" aria-hidden="true">
		<video
			bind:this={cinematicVideo}
			class="ascii-cinematic"
			autoplay
			muted
			loop
			playsinline
			preload="metadata"
			poster="/vice-flamingo-ascii-landscape-poster.webp"
		>
			<source media="(max-width: 540px)" src="/vice-flamingo-ascii-portrait.webm" type="video/webm" />
			<source media="(max-width: 540px)" src="/vice-flamingo-ascii-portrait.mp4" type="video/mp4" />
			<source src="/vice-flamingo-ascii-landscape.webm" type="video/webm" />
			<source src="/vice-flamingo-ascii-landscape.mp4" type="video/mp4" />
			<img src="/vice-flamingo-ascii-landscape-poster.webp" alt="" />
		</video>
	</div>
	<div class="neon-grid" aria-hidden="true"></div>
	<div class="scanlines" aria-hidden="true"></div>
	<div class="horizon-glow" aria-hidden="true"></div>

	<section class="relative z-10 mx-auto grid min-h-screen w-full max-w-[1180px] content-start items-center gap-5 px-5 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:content-center lg:gap-10 lg:px-10 lg:py-8">
		<div class="brand-stage" aria-labelledby="login-title">
			<div class="mb-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-terminal-cyan/80">
				<span class="signal-dot"></span>
				Vice relay // node 305
			</div>

			<pre class="vice-ascii" aria-label="Vice Terminal">
 _    _  _____  _____  _____
| |  | ||_   _|/ ____||  ___|
| |  | |  | | | |     | |__
 \ \/ /   | | | |     |  __|
  \  /   _| |_| |____ | |___
   \/   |_____|\_____||_____|
			</pre>

			<div class="mt-2 flex items-end gap-3">
				<h1 id="login-title" class="glitch-title text-xl font-semibold uppercase tracking-[0.34em] text-white sm:text-2xl" data-text="TERMINAL">Terminal</h1>
				<span class="mb-1 text-[10px] tracking-[0.2em] text-terminal-red">// RESTRICTED</span>
			</div>

			<p class="mt-5 max-w-xl text-xs leading-6 text-[#b4b4c8]">
				Encrypted market interface. Browser-local custody. Operator authorization required beyond this point.
			</p>

			<div class="boot-log mt-8 max-w-xl" aria-label="System initialization status">
				{#each bootLines as line, index}
					<div class="boot-row" class:visible={index < bootLineCount}>
						<span class="boot-index">0{index + 1}</span>
						<span class="boot-label">{line.label}</span>
						<span class="boot-dots" aria-hidden="true"></span>
						<span class="boot-detail tone-{line.tone}">{line.detail}</span>
						<span class="boot-ok">{index === bootLines.length - 1 ? '::' : 'OK'}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="auth-frame w-full max-w-lg justify-self-center lg:justify-self-end">
			<div class="frame-cap flex items-center justify-between px-4 py-3 text-[10px] uppercase tracking-[0.2em]">
				<span class="text-terminal-cyan">Vice://auth_gateway</span>
				<span class="flex items-center gap-2 text-terminal-green"><span class="mini-pulse"></span> Link live</span>
			</div>

			<div class="auth-body p-5 sm:p-7">
				<div class="flamingo-mark" aria-hidden="true">
					<img src="/flamingo.png" alt="" />
					<span>VICE // FLAMINGO SIGNAL</span>
				</div>

				<div class="mb-7 border-l-2 border-terminal-red pl-3">
					<p class="text-[10px] uppercase tracking-[0.25em] text-terminal-red">Identity challenge</p>
					<p class="mt-2 text-xs leading-5 text-[#b4b4c8]">Enter the operator password to initialize a signed browser session.</p>
				</div>

				<form data-action-id="ui.src.routes.login.page.form.h7b380cd50c" onsubmit={submit}>
					<label class="block text-[10px] uppercase tracking-[0.2em] text-terminal-cyan" for="beta-code">
						<span class="text-terminal-red">root@vice</span><span class="text-terminal-text-muted">:</span><span class="text-terminal-purple">~</span><span class="text-terminal-text">$ authorize --key</span>
					</label>
					<div class="password-line mt-3 flex min-h-[48px] items-center gap-3 px-2">
						<span class="prompt-chevron" aria-hidden="true">›</span>
						<input data-action-id="ui.src.routes.login.page.input.ha876aa6cb8"
							id="beta-code"
							class="min-h-11 min-w-0 flex-1 bg-transparent py-3.5 text-sm tracking-[0.14em] text-white caret-[#2ee6c2] outline-none placeholder:text-[#8c8ca3]"
							bind:value={code}
							type={revealPassword ? 'text' : 'password'}
							placeholder="ENTER ACCESS KEY"
							name="code"
							autocomplete="current-password"
							maxlength="128"
							required
							disabled={granted}
							aria-invalid={error ? 'true' : 'false'}
							aria-describedby="access-status"
						/>
						<button
							type="button"
							class="min-h-11 min-w-11 text-[9px] uppercase tracking-[0.12em] text-terminal-cyan hover:text-white focus-visible:outline focus-visible:outline-1 focus-visible:outline-terminal-cyan"
							onclick={() => { revealPassword = !revealPassword; }}
							aria-label={revealPassword ? 'Hide password' : 'Show password'}
						>
							{revealPassword ? 'Hide' : 'Show'}
						</button>
						<span class="cursor-block" aria-hidden="true"></span>
					</div>

					<div id="access-status" class="mt-4 min-h-5 text-[10px] uppercase tracking-[0.14em]" aria-live="polite">
						{#if granted}
							<span class="text-terminal-green">ACCESS GRANTED // OPENING TERMINAL</span>
						{:else if error}
							<span class="error-glitch text-terminal-red" role="alert">{error}</span>
						{:else}
							<span class="text-[#9696ad]">SIGNED SESSION READY // 30 DAY CLEARANCE</span>
						{/if}
					</div>

					<button data-action-id="ui.src.routes.login.page.button.hb26a4e43a4"
						type="submit"
						class="auth-button mt-6 min-h-[46px] w-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em]"
						disabled={submitting || granted || !code.trim()}
						aria-busy={submitting}
					>
						<span>{granted ? 'Clearance accepted' : submitting ? 'Verifying credential…' : code.trim() ? 'Enter the grid' : 'Awaiting access key'}</span>
					</button>
				</form>
			</div>

			<div class="frame-footer grid grid-cols-3 border-t border-[#24203d] px-4 py-3 text-[9px] uppercase tracking-[0.13em] text-[#a3a3b8]">
				<span>TLS // Required</span>
				<span class="text-center">Miami // 305</span>
				<span class="text-right">Build // Vice</span>
			</div>
		</div>
	</section>
</main>

<style>
	.login-shell {
		position: relative;
		isolation: isolate;
		background:
			radial-gradient(circle at 18% 30%, rgba(155, 87, 255, 0.12), transparent 32%),
			radial-gradient(circle at 83% 68%, rgba(255, 61, 154, 0.1), transparent 28%),
			linear-gradient(145deg, #05040b 0%, #090716 48%, #04030a 100%);
	}

	.ascii-cinematic-wrap {
		position: fixed;
		z-index: -3;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		background: #05040b;
	}
	.ascii-cinematic,
	.ascii-cinematic img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}
	.ascii-cinematic {
		opacity: 0.3;
		filter: saturate(1.15) contrast(1.08);
		mix-blend-mode: screen;
	}
	.ascii-cinematic-wrap::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, rgba(5, 4, 11, 0.08), rgba(5, 4, 11, 0.48) 58%, rgba(5, 4, 11, 0.8)),
			linear-gradient(0deg, rgba(5, 4, 11, 0.62), transparent 42%, rgba(5, 4, 11, 0.2));
	}

	.neon-grid {
		position: fixed;
		z-index: -2;
		left: -25%;
		right: -25%;
		bottom: -38vh;
		height: 78vh;
		transform: perspective(420px) rotateX(62deg);
		transform-origin: center top;
		background-image:
			linear-gradient(rgba(79, 214, 247, 0.21) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 61, 154, 0.18) 1px, transparent 1px);
		background-size: 48px 38px;
		mask-image: linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%);
		animation: grid-drive 7s linear infinite;
	}

	.horizon-glow {
		position: fixed;
		z-index: -1;
		left: 5%;
		right: 5%;
		bottom: 29vh;
		height: 1px;
		background: linear-gradient(90deg, transparent, #ff3d9a, #4fd6f7, transparent);
		box-shadow: 0 0 34px 7px rgba(155, 87, 255, 0.28);
	}

	.scanlines {
		position: fixed;
		z-index: 20;
		pointer-events: none;
		inset: 0;
		opacity: 0.14;
		background: repeating-linear-gradient(to bottom, transparent 0, transparent 3px, rgba(255, 255, 255, 0.045) 4px);
		mix-blend-mode: overlay;
	}

	.brand-stage { animation: stage-enter 700ms cubic-bezier(.16, 1, .3, 1) both; }
	.vice-ascii {
		margin: 0;
		font-size: clamp(9px, 1.55vw, 18px);
		line-height: 1.05;
		letter-spacing: 0.08em;
		color: #4fd6f7;
		text-shadow: 0 0 8px rgba(79, 214, 247, 0.75), 3px 0 0 rgba(255, 61, 154, 0.32);
		filter: drop-shadow(0 0 20px rgba(79, 214, 247, 0.18));
	}

	.signal-dot, .mini-pulse {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: #2ee6c2;
		box-shadow: 0 0 9px #2ee6c2;
		animation: signal-pulse 1.4s ease-in-out infinite;
	}
	.mini-pulse { width: 5px; height: 5px; }

	.glitch-title { position: relative; text-shadow: 2px 0 #ff3d9a, -2px 0 #4fd6f7; }
	.glitch-title::before, .glitch-title::after {
		content: attr(data-text);
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0;
	}
	.glitch-title::before { color: #ff3d9a; transform: translateX(2px); animation: title-glitch 4.7s infinite; }
	.glitch-title::after { color: #4fd6f7; transform: translateX(-2px); animation: title-glitch 4.7s 80ms infinite reverse; }

	.boot-log {
		border-top: 1px solid rgba(79, 214, 247, 0.2);
		background: linear-gradient(90deg, rgba(5, 4, 11, 0.82), rgba(5, 4, 11, 0.42), transparent);
	}
	.boot-row {
		display: grid;
		grid-template-columns: 24px 62px minmax(12px, 1fr) auto 18px;
		align-items: center;
		gap: 9px;
		min-height: 27px;
		border-bottom: 1px solid rgba(79, 214, 247, 0.09);
		font-size: 10px;
		letter-spacing: 0.07em;
		opacity: 0;
		transform: translateX(-8px);
		transition: opacity 200ms ease, transform 200ms ease;
	}
	.boot-row.visible { opacity: 1; transform: translateX(0); }
	.boot-index { color: #56566e; }
	.boot-label { color: #e8e8f2; }
	.boot-dots { min-width: 12px; border-top: 1px dotted rgba(150, 150, 173, 0.28); }
	.boot-detail { white-space: nowrap; }
	.boot-ok { color: #2ee6c2; text-align: right; }
	.tone-cyan { color: #4fd6f7; }
	.tone-green { color: #2ee6c2; }
	.tone-pink { color: #ff3d9a; }
	.tone-purple { color: #9b57ff; }

	.auth-frame {
		position: relative;
		background: rgba(8, 7, 18, 0.95);
		border: 1px solid rgba(79, 214, 247, 0.32);
		clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px);
		box-shadow: 0 0 0 1px rgba(255, 61, 154, 0.08), 0 24px 80px rgba(0, 0, 0, 0.55), 0 0 44px rgba(79, 214, 247, 0.08);
		animation: frame-enter 720ms 140ms cubic-bezier(.16, 1, .3, 1) both;
	}
	.auth-frame::before, .auth-frame::after {
		content: '';
		position: absolute;
		z-index: 2;
		width: 44px;
		height: 2px;
		background: #ff3d9a;
		box-shadow: 0 0 12px #ff3d9a;
	}
	.auth-frame::before { top: -1px; left: 18px; }
	.auth-frame::after { right: 18px; bottom: -1px; background: #4fd6f7; box-shadow: 0 0 12px #4fd6f7; }
	.frame-cap { border-bottom: 1px solid #24203d; background: linear-gradient(90deg, rgba(79, 214, 247, 0.08), rgba(255, 61, 154, 0.06)); }
	.auth-body { min-height: 390px; }
	.flamingo-mark {
		display: flex;
		height: 112px;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: #ff3d9a;
		font-size: 8px;
		letter-spacing: 0.16em;
		text-shadow: 0 0 10px rgba(255, 61, 154, 0.75);
		animation: flamingo-float 3.4s ease-in-out infinite;
	}
	.flamingo-mark img {
		width: 72px;
		height: 72px;
		object-fit: contain;
		mix-blend-mode: screen;
		filter: drop-shadow(0 0 10px rgba(255, 61, 154, 0.7));
	}
	.password-line { border-bottom: 1px solid rgba(79, 214, 247, 0.42); box-shadow: 0 10px 20px -16px rgba(79, 214, 247, 0.9); }
	.password-line input { min-height: 44px; }
	.password-line:focus-within { border-color: #2ee6c2; box-shadow: 0 10px 24px -15px rgba(46, 230, 194, 1); }
	.prompt-chevron { color: #ff3d9a; font-size: 23px; text-shadow: 0 0 9px #ff3d9a; }
	.cursor-block { width: 7px; height: 14px; background: #2ee6c2; box-shadow: 0 0 8px #2ee6c2; animation: cursor-blink 900ms steps(1) infinite; }
	.auth-button {
		position: relative;
		border: 1px solid #ff3d9a;
		color: #fff;
		background: linear-gradient(100deg, rgba(255, 61, 154, 0.18), rgba(155, 87, 255, 0.14), rgba(79, 214, 247, 0.14));
		clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
		box-shadow: inset 0 0 18px rgba(255, 61, 154, 0.08), 0 0 14px rgba(255, 61, 154, 0.12);
		transition: border-color 160ms ease, box-shadow 160ms ease, transform 100ms ease;
	}
	.auth-button:hover:not(:disabled), .auth-button:focus-visible:not(:disabled) { border-color: #4fd6f7; box-shadow: 0 0 22px rgba(79, 214, 247, 0.22); outline: none; }
	.auth-button:active:not(:disabled) { transform: translateY(1px); }
	.auth-button:disabled { cursor: not-allowed; opacity: 0.68; }
	.error-glitch { animation: error-jolt 180ms steps(2) 2; }
	.access-granted .auth-frame { border-color: #2ee6c2; box-shadow: 0 0 48px rgba(46, 230, 194, 0.2); }

	@keyframes grid-drive { from { background-position: 0 0; } to { background-position: 0 38px; } }
	@keyframes stage-enter { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
	@keyframes frame-enter { from { opacity: 0; transform: translateX(18px) scale(.985); } to { opacity: 1; transform: translateX(0) scale(1); } }
	@keyframes signal-pulse { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
	@keyframes cursor-blink { 0%, 48% { opacity: 1; } 49%, 100% { opacity: 0; } }
	@keyframes flamingo-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
	@keyframes error-jolt { 0% { transform: translateX(0); } 40% { transform: translateX(3px); } 70% { transform: translateX(-3px); } 100% { transform: translateX(0); } }
	@keyframes title-glitch { 0%, 92%, 100% { opacity: 0; clip-path: inset(0); } 93% { opacity: .65; clip-path: inset(10% 0 58% 0); } 95% { opacity: .35; clip-path: inset(62% 0 10% 0); } 97% { opacity: 0; } }

	@media (max-width: 1023px) {
		.brand-stage { padding-top: 2rem; }
		.boot-log { display: none; }
		.auth-frame { justify-self: center; }
	}
	@media (max-width: 540px) {
		.ascii-cinematic { opacity: 0.22; }
		.vice-ascii { font-size: 8px; letter-spacing: 0; }
		.flamingo-mark { display: none; }
		.auth-body { min-height: 0; }
		.brand-stage { padding-top: 0; }
	}
	@media (prefers-reduced-motion: reduce) {
		.ascii-cinematic { display: none; }
		.login-shell::before {
			content: '';
			position: fixed;
			z-index: -3;
			inset: 0;
			background: url('/vice-flamingo-ascii-landscape-poster.webp') center / cover no-repeat;
			opacity: 0.2;
		}
		*, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; }
	}
	@media (max-width: 540px) and (prefers-reduced-motion: reduce) {
		.login-shell::before { background-image: url('/vice-flamingo-ascii-portrait-poster.webp'); }
	}
</style>
