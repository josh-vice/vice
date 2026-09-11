<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();
	let code = $state('');
	let error = $state('');
	let revealPassword = $state(false);
	let bootLineCount = $state(0);
	let cinematicVideo: HTMLVideoElement;
	let synthwaveAudio: HTMLAudioElement;
	let audioEnabled = $state(false);
	let audioError = $state(false);
	let booting = $state(false);

	let reducedMotion = false;
	let bootTimers: number[] = [];
	let bootSynced = false;

	const bootLines = [
		{ label: 'VICE BIOS', detail: 'NEON KERNEL 20.26', tone: 'cyan' },
		{ label: 'CIPHER', detail: 'CLIENT SESSION CHANNEL READY', tone: 'green' },
		{ label: 'RELAY', detail: 'MARKET UPLINK STANDBY', tone: 'pink' },
		{ label: 'VAULT', detail: 'BROWSER CUSTODY LOCAL', tone: 'purple' },
		{ label: 'ACCESS', detail: 'SIGNAL PATH REQUIRED', tone: 'cyan' }
	] as const;

	function clearBootTimers(): void {
		bootTimers.forEach(window.clearTimeout);
		bootTimers = [];
	}

	function handleAudioPlay(): void {
		audioEnabled = true;
	}

	function handleAudioPause(): void {
		audioEnabled = false;
	}

	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion) {
			cinematicVideo?.pause();
			bootLineCount = bootLines.length;
		} else {
			bootTimers = bootLines.map((_, index) => window.setTimeout(() => {
				bootLineCount = index + 1;
			}, 220 + index * 260));
		}
		void startAudio();
		return () => {
			clearBootTimers();
			synthwaveAudio?.pause();
		};
	});

	async function startAudio(): Promise<void> {
		if (!synthwaveAudio) return;
		audioError = false;
		synthwaveAudio.volume = 0.20;
		try {
			await synthwaveAudio.play();
			if (!reducedMotion && !bootSynced && !booting) {
				clearBootTimers();
				bootLineCount = 0;
				bootSynced = true;
			}
			audioEnabled = true;
		} catch {
			audioError = true;
			audioEnabled = false;
		}
	}

	async function toggleAudio(): Promise<void> {
		if (!synthwaveAudio) return;
		if (audioEnabled) {
			synthwaveAudio.pause();
			return;
		}
		await startAudio();
	}

	function submit(event: SubmitEvent): void {
		event.preventDefault();
		// Password form is decorative — show a decoy error if user tries to submit.
		if (!code.trim()) return;
		error = 'ACCESS DENIED // FIND THE SIGNAL';
		code = '';
	}

	async function activateFlamingoSignal(): Promise<void> {
		if (booting) return;
		booting = true;
		error = '';
		// Restart the ASCII reel at the signal click so the boot sequence is visible.
		if (!reducedMotion && cinematicVideo) {
			try {
				cinematicVideo.currentTime = 0;
				await cinematicVideo.play();
			} catch {
				// The poster remains as a graceful fallback if video playback fails.
			}
		}
		// Start the ASCII boot sequence — video goes fullscreen, boot lines accelerate
		if (!reducedMotion) {
			clearBootTimers();
			bootLineCount = 0;
			bootTimers = bootLines.map((_, index) => window.setTimeout(() => {
				bootLineCount = index + 1;
			}, 300 + index * 400));
			// After all boot lines complete, navigate to terminal
			bootTimers.push(window.setTimeout(() => {
				void goto(data.target, { replaceState: true });
			}, 300 + bootLines.length * 400 + 800));
		} else {
			bootLineCount = bootLines.length;
			void goto(data.target, { replaceState: true });
		}
	}
</script>

<svelte:head>
	<title>Restricted access · Vice Terminal</title>
	<meta name="description" content="Restricted operator access for Vice Terminal." />
</svelte:head>

<main class="login-shell min-h-screen overflow-x-hidden overflow-y-auto bg-[#05040b] font-mono text-terminal-text" class:booting>
	<div class="ascii-cinematic-wrap" aria-hidden="true">
		<video
			bind:this={cinematicVideo}
			class="ascii-cinematic"
			class:ascii-fullscreen={booting}
			autoplay
			muted
			loop
			playsinline
			preload="metadata"
			poster="/vice-flamingo-ascii-landscape-poster.webp"
		>
			<source media="(max-width: 540px)" src="/vice-flamingo-ascii-portrait-loop.webm" type="video/webm" />
			<source media="(max-width: 540px)" src="/vice-flamingo-ascii-portrait-loop.mp4" type="video/mp4" />
			<source src="/vice-flamingo-ascii-landscape-loop.webm" type="video/webm" />
			<source src="/vice-flamingo-ascii-landscape-loop.mp4" type="video/mp4" />
			<img src="/vice-flamingo-ascii-landscape-poster.webp" alt="" />
		</video>
	</div>
	<audio bind:this={synthwaveAudio} class="audio-engine" aria-hidden="true" autoplay loop preload="metadata" onplay={handleAudioPlay} onpause={handleAudioPause}>
		<source src="/vice-login-kissan4-arcade-rush.mp3" type="audio/mpeg" />
	</audio>
	<div class="neon-grid" aria-hidden="true"></div>
	<div class="scanlines" aria-hidden="true"></div>
	<div class="horizon-glow" aria-hidden="true"></div>

	<section class="relative z-10 mx-auto grid min-h-screen w-full max-w-[1180px] content-start items-center gap-5 px-5 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:content-center lg:gap-10 lg:px-10 lg:py-8" class:hidden={booting}>
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
				Encrypted market interface. Browser-local custody. Operator uplink required beyond this point.
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
			<div class="frame-cap flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[10px] uppercase tracking-[0.2em]">
				<span class="text-terminal-cyan">Vice://auth_gateway</span>
				<div class="flex items-center gap-3">
					<button
						type="button"
						class="audio-toggle"
						class:audio-on={audioEnabled}
						class:audio-error={audioError}
						onclick={toggleAudio}
						aria-pressed={audioEnabled}
						aria-label={audioEnabled ? 'Mute synthwave login music' : audioError ? 'Retry synthwave login music' : 'Play synthwave login music'}
					>
						<span class="audio-bars" aria-hidden="true"><span></span><span></span><span></span></span>
						{audioError ? 'Audio // Retry' : audioEnabled ? 'Audio // On' : 'Audio // Off'}
					</button>
					<span class="flex items-center gap-2 text-terminal-green"><span class="mini-pulse"></span> Link live</span>
				</div>
			</div>

			<div class="auth-body p-5 sm:p-7">
				<button
					type="button"
					class="flamingo-mark"
					onclick={activateFlamingoSignal}
					aria-label="Activate Flamingo Signal — enter the terminal"
				>
					<img src="/flamingo.png" alt="" />
					<span>VICE // FLAMINGO SIGNAL</span>
				</button>

				<div class="mb-7 border-l-2 border-terminal-red pl-3">
					<p class="text-[10px] uppercase tracking-[0.25em] text-terminal-red">Identity challenge</p>
					<p class="mt-2 text-xs leading-5 text-[#b4b4c8]">Operator credential channel online. Awaiting the correct uplink.</p>
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
							disabled={booting}
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
						{#if booting}
							<span class="text-terminal-green">SIGNAL ACCEPTED // OPENING ASCII UPLINK</span>
						{:else if error}
							<span class="error-glitch text-terminal-red" role="alert">{error}</span>
						{:else}
							<span class="text-[#9696ad]">CREDENTIAL DISPLAY READY // 30 DAY CLEARANCE</span>
						{/if}
					</div>

					<button data-action-id="ui.src.routes.login.page.button.hb26a4e43a4"
						type="submit"
						class="auth-button mt-6 min-h-[46px] w-full px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em]"
						disabled={booting || !code.trim()}
						aria-busy={booting}
					>
						<span>{booting ? 'Signal accepted' : code.trim() ? 'Enter the grid' : 'Awaiting access key'}</span>
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

	<!-- Boot overlay: appears when the flamingo signal is activated -->
	{#if booting}
		<section class="boot-overlay" aria-label="Terminal boot sequence" role="status" aria-live="polite">
			<div class="boot-overlay-inner">
				<pre class="vice-ascii boot-overlay-ascii">
 _    _  _____  _____  _____
| |  | ||_   _|/ ____||  ___|
| |  | |  | | | |     | |__
 \ \/ /   | | | |     |  __|
  \  /   _| |_| |____ | |___
   \/   |_____|\_____||_____|
				</pre>
				<div class="boot-overlay-status">
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
				<p class="boot-overlay-hint">INITIALIZING OPERATOR ENVIRONMENT…</p>
			</div>
		</section>
	{/if}
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
	.login-shell::before {
		content: '';
		position: fixed;
		z-index: -2;
		inset: -18%;
		pointer-events: none;
		background:
			radial-gradient(circle at 20% 34%, rgba(79, 214, 247, 0.16), transparent 23%),
			radial-gradient(circle at 76% 62%, rgba(255, 61, 154, 0.17), transparent 25%);
		filter: blur(26px);
		mix-blend-mode: screen;
		opacity: 0.42;
		animation: miami-ambient 8s ease-in-out infinite;
	}
	.login-shell::after {
		content: '';
		position: fixed;
		z-index: 21;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(ellipse at center, transparent 44%, rgba(2, 2, 8, 0.26) 100%),
			repeating-linear-gradient(90deg, transparent 0, transparent 49.7%, rgba(79, 214, 247, 0.025) 50%, transparent 50.3%);
		mix-blend-mode: multiply;
		opacity: 0.7;
		animation: crt-flicker 7.1s steps(1, end) infinite;
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
		transition: opacity 0.6s ease, filter 0.6s ease;
	}
	.ascii-cinematic.ascii-fullscreen {
		opacity: 0.7;
		filter: saturate(1.3) contrast(1.15) brightness(1.05);
	}
	.ascii-cinematic-wrap::before {
		content: '';
		position: absolute;
		inset: -10%;
		pointer-events: none;
		background:
			repeating-linear-gradient(0deg, transparent 0, transparent 5px, rgba(255, 61, 154, 0.035) 6px),
			repeating-linear-gradient(90deg, transparent 0, transparent 13px, rgba(79, 214, 247, 0.022) 14px);
		mix-blend-mode: screen;
		opacity: 0.5;
		animation: tape-jitter 6.4s steps(2, end) infinite;
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
		animation: grid-drive 7s linear infinite, grid-flicker 4.6s steps(1, end) infinite;
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
		animation: horizon-sweep 5.4s ease-in-out infinite;
	}

	.scanlines {
		position: fixed;
		z-index: 20;
		pointer-events: none;
		inset: 0;
		opacity: 0.14;
		background: repeating-linear-gradient(to bottom, transparent 0, transparent 3px, rgba(255, 255, 255, 0.045) 4px);
		background-size: auto 8px;
		animation: scanline-drift 9s linear infinite;
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
		animation: wordmark-glow 4.8s ease-in-out infinite;
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

	.glitch-title { position: relative; text-shadow: 2px 0 #ff3d9a, -2px 0 #4fd6f7; animation: title-neon 3.6s ease-in-out infinite; }
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
	.boot-row.visible { opacity: 1; transform: translateX(0); animation: boot-lock 420ms ease-out both; }
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
		animation: frame-enter 720ms 140ms cubic-bezier(.16, 1, .3, 1) both, frame-breathe 6.2s 900ms ease-in-out infinite;
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
	.auth-frame::before { top: -1px; left: 18px; animation: corner-flash 3.8s steps(1, end) infinite; }
	.auth-frame::after { right: 18px; bottom: -1px; background: #4fd6f7; box-shadow: 0 0 12px #4fd6f7; animation: corner-flash 3.8s 1.6s steps(1, end) infinite; }
	.audio-engine {
		position: fixed;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}
	.audio-toggle {
		display: inline-flex;
		min-height: 30px;
		align-items: center;
		gap: 6px;
		border: 1px solid transparent;
		padding: 0 4px;
		color: #8c8ca3;
		font: inherit;
		letter-spacing: 0.12em;
		transition: color 160ms ease, border-color 160ms ease, text-shadow 160ms ease;
	}
	.audio-toggle:hover, .audio-toggle:focus-visible {
		border-color: rgba(79, 214, 247, 0.45);
		color: #fff;
		outline: none;
	}
	.audio-toggle.audio-on {
		border-color: rgba(46, 230, 194, 0.38);
		color: #2ee6c2;
		text-shadow: 0 0 10px rgba(46, 230, 194, 0.65);
		animation: audio-link-glow 2.8s ease-in-out infinite;
	}
	.audio-toggle.audio-error { color: #ff3d9a; }
	.audio-bars {
		display: inline-flex;
		height: 12px;
		align-items: flex-end;
		gap: 2px;
		width: 12px;
	}
	.audio-bars span {
		display: block;
		width: 2px;
		height: 4px;
		background: currentColor;
		box-shadow: 0 0 5px currentColor;
		transform-origin: bottom;
	}
	.audio-toggle.audio-on .audio-bars span { animation: audio-meter 650ms ease-in-out infinite alternate; }
	.audio-toggle.audio-on .audio-bars span:nth-child(2) { animation-delay: -280ms; }
	.audio-toggle.audio-on .audio-bars span:nth-child(3) { animation-delay: -460ms; }
	.frame-cap { position: relative; border-bottom: 1px solid #24203d; background: linear-gradient(90deg, rgba(79, 214, 247, 0.08), rgba(255, 61, 154, 0.06), rgba(79, 214, 247, 0.08)); background-size: 200% 100%; animation: cap-sweep 4.8s ease-in-out infinite; }
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
		animation: flamingo-flicker 4.6s steps(1, end) infinite;
		cursor: pointer;
		transition: filter 0.2s ease, transform 0.2s ease;
		border: none;
		background: none;
		width: 100%;
	}
	.flamingo-mark:hover {
		filter: brightness(1.3) drop-shadow(0 0 14px rgba(255, 61, 154, 0.9));
		transform: scale(1.03);
	}
	.flamingo-mark:focus-visible {
		outline: 2px solid #2ee6c2;
		outline-offset: 4px;
	}
	.flamingo-mark img {
		width: 72px;
		height: 72px;
		object-fit: contain;
		mix-blend-mode: screen;
		filter: drop-shadow(0 0 10px rgba(255, 61, 154, 0.7));
		animation: flamingo-float 3.4s ease-in-out infinite, flamingo-neon 2.8s ease-in-out infinite;
	}
	.password-line {
		position: relative;
		overflow: hidden;
		border-bottom: 1px solid rgba(79, 214, 247, 0.42);
		box-shadow: 0 10px 20px -16px rgba(79, 214, 247, 0.9);
	}
	.password-line::after {
		content: '';
		position: absolute;
		z-index: 1;
		left: 0;
		top: 0;
		width: 34%;
		height: 1px;
		background: linear-gradient(90deg, transparent, #2ee6c2, transparent);
		box-shadow: 0 0 8px #2ee6c2;
		pointer-events: none;
		animation: terminal-scan 3.9s ease-in-out infinite;
	}
	.password-line input { min-height: 44px; }
	.password-line:focus-within { border-color: #2ee6c2; box-shadow: 0 10px 24px -15px rgba(46, 230, 194, 1); }
	.prompt-chevron { color: #ff3d9a; font-size: 23px; text-shadow: 0 0 9px #ff3d9a; }
	.cursor-block { width: 7px; height: 14px; background: #2ee6c2; box-shadow: 0 0 8px #2ee6c2; animation: cursor-blink 900ms steps(1) infinite; }
	.auth-button {
		position: relative;
		overflow: hidden;
		isolation: isolate;
		border: 1px solid #ff3d9a;
		color: #fff;
		background: linear-gradient(100deg, rgba(255, 61, 154, 0.18), rgba(155, 87, 255, 0.14), rgba(79, 214, 247, 0.14), rgba(255, 61, 154, 0.18));
		background-size: 220% 100%;
		clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
		box-shadow: inset 0 0 18px rgba(255, 61, 154, 0.08), 0 0 14px rgba(255, 61, 154, 0.12);
		animation: button-breathe 4.2s ease-in-out infinite;
		transition: border-color 160ms ease, box-shadow 160ms ease, transform 100ms ease;
	}
	.auth-button::before {
		content: '';
		position: absolute;
		z-index: 0;
		inset: 0;
		background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.24) 49%, transparent 63%);
		transform: translateX(-130%);
		pointer-events: none;
		animation: button-sheen 4.6s ease-in-out infinite;
	}
	.auth-button > span { position: relative; z-index: 1; }
	.auth-button:hover:not(:disabled), .auth-button:focus-visible:not(:disabled) { border-color: #4fd6f7; box-shadow: 0 0 22px rgba(79, 214, 247, 0.22); outline: none; }
	.auth-button:active:not(:disabled) { transform: translateY(1px); }
	.auth-button:disabled { cursor: not-allowed; opacity: 0.68; }
	.error-glitch { animation: error-jolt 180ms steps(2) 2; }
	.booting .auth-frame { border-color: #2ee6c2; box-shadow: 0 0 48px rgba(46, 230, 194, 0.2); }

	/* Boot overlay */
	.boot-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(5, 4, 11, 0.68);
		animation: boot-overlay-enter 400ms ease both;
	}
	.boot-overlay-inner {
		text-align: center;
		max-width: 640px;
		padding: 2rem;
	}
	.boot-overlay-ascii {
		font-size: clamp(14px, 3vw, 28px);
		margin-bottom: 2rem;
		animation: boot-overlay-ascii-glow 2s ease-in-out infinite;
	}
	.boot-overlay-status {
		margin-bottom: 2rem;
	}
	.boot-overlay-status .boot-row {
		justify-content: center;
		max-width: 480px;
		margin: 0 auto;
	}
	.boot-overlay-hint {
		font-size: 10px;
		letter-spacing: 0.2em;
		color: #8c8ca3;
		text-transform: uppercase;
		animation: boot-overlay-hint-pulse 1.4s ease-in-out infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.ascii-cinematic { display: none; }
		.login-shell::before { animation: none; }
		.login-shell::after { animation: none; }
		.neon-grid { animation: none; }
		.horizon-glow { animation: none; }
		.scanlines { animation: none; }
		.vice-ascii { animation: none; }
		.signal-dot, .mini-pulse { animation: none; }
		.glitch-title { animation: none; }
		.flamingo-mark { animation: none; }
		.flamingo-mark img { animation: none; }
		.auth-frame { animation: none; }
		.auth-button::before { animation: none; }
		.audio-toggle.audio-on .audio-bars span { animation: none; }
		.password-line::after { animation: none; }
		.boot-overlay { animation: none; }
		.boot-overlay-ascii { animation: none; }
		.boot-overlay-hint { animation: none; }
	}
	@media (max-width: 540px) {
		.ascii-cinematic { opacity: 0.22; }
		.vice-ascii { font-size: 8px; letter-spacing: 0; }
		.flamingo-mark { display: flex; height: 84px; }
		.flamingo-mark img { width: 56px; height: 56px; }
		.auth-body { min-height: 0; }
	}
	@media (max-width: 540px) and (prefers-reduced-motion: reduce) {
		.login-shell::before { background: none; }
		.login-shell::after { background: none; }
		.neon-grid { display: none; }
		.horizon-glow { display: none; }
		.scanlines { display: none; }
		.ascii-cinematic-wrap::before { display: none; }
		.ascii-cinematic-wrap::after { display: none; }
		.auth-frame::before, .auth-frame::after { display: none; }
		.frame-cap { animation: none; background: none; }
		.frame-footer { display: none; }
		.password-line::after { display: none; }
		.login-shell::before { background-image: url('/vice-flamingo-ascii-portrait-poster.webp'); background-size: cover; background-position: center; }
	}

	@keyframes miami-ambient {
		0%, 100% { transform: translate3d(-1%, 0, 0) scale(1); opacity: 0.34; }
		50% { transform: translate3d(2%, -1%, 0) scale(1.04); opacity: 0.58; }
	}
	@keyframes crt-flicker {
		0%, 89%, 100% { opacity: 0.7; }
		90% { opacity: 0.5; }
		91% { opacity: 0.82; }
		92% { opacity: 0.62; }
	}
	@keyframes tape-jitter {
		0%, 100% { transform: translate(0, 0); opacity: 0.42; }
		48% { transform: translate(0, 0); opacity: 0.5; }
		49% { transform: translate(1px, -1px); opacity: 0.64; }
		50% { transform: translate(-1px, 1px); opacity: 0.34; }
		51% { transform: translate(0, 0); opacity: 0.5; }
	}
	@keyframes grid-flicker {
		0%, 100% { opacity: 0.82; }
		48% { opacity: 0.72; }
		49% { opacity: 0.92; }
		50% { opacity: 0.6; }
		51% { opacity: 0.8; }
	}
	@keyframes horizon-sweep {
		0%, 100% { transform: scaleX(0.78); opacity: 0.62; box-shadow: 0 0 28px 5px rgba(155, 87, 255, 0.2); }
		50% { transform: scaleX(1.08); opacity: 1; box-shadow: 0 0 48px 9px rgba(155, 87, 255, 0.4); }
	}
	@keyframes scanline-drift {
		from { background-position: 0 0; }
		to { background-position: 0 8px; }
	}
	@keyframes wordmark-glow {
		0%, 100% { filter: drop-shadow(0 0 14px rgba(79, 214, 247, 0.12)); }
		50% { filter: drop-shadow(0 0 30px rgba(79, 214, 247, 0.36)); }
	}
	@keyframes title-neon {
		0%, 100% { text-shadow: 2px 0 #ff3d9a, -2px 0 #4fd6f7, 0 0 18px rgba(255, 61, 154, 0.18); }
		50% { text-shadow: 2px 0 #ff3d9a, -2px 0 #4fd6f7, 0 0 36px rgba(79, 214, 247, 0.28); }
	}
	@keyframes boot-lock { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
	@keyframes frame-breathe {
		0%, 100% { box-shadow: 0 0 0 1px rgba(255, 61, 154, 0.08), 0 24px 80px rgba(0, 0, 0, 0.55), 0 0 44px rgba(79, 214, 247, 0.08); }
		50% { box-shadow: 0 0 0 1px rgba(255, 61, 154, 0.12), 0 24px 80px rgba(0, 0, 0, 0.55), 0 0 64px rgba(79, 214, 247, 0.14); }
	}
	@keyframes corner-flash {
		0%, 100% { opacity: 1; }
		48% { opacity: 1; }
		49% { opacity: 0.2; }
		50% { opacity: 0.9; }
		51% { opacity: 1; }
	}
	@keyframes cap-sweep {
		0%, 100% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
	}
	@keyframes flamingo-flicker {
		0%, 100% { opacity: 1; }
		42% { opacity: 1; }
		43% { opacity: 0.6; }
		44% { opacity: 1; }
		78% { opacity: 1; }
		79% { opacity: 0.5; }
		80% { opacity: 1; }
	}
	@keyframes flamingo-neon {
		0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 61, 154, 0.7)); }
		50% { filter: drop-shadow(0 0 22px rgba(255, 61, 154, 0.95)); }
	}
	@keyframes terminal-scan {
		0%, 100% { left: 0; }
		50% { left: 66%; }
	}
	@keyframes button-breathe {
		0%, 100% { box-shadow: inset 0 0 18px rgba(255, 61, 154, 0.08), 0 0 14px rgba(255, 61, 154, 0.12); }
		50% { box-shadow: inset 0 0 24px rgba(255, 61, 154, 0.14), 0 0 24px rgba(255, 61, 154, 0.2); }
	}
	@keyframes button-sheen {
		0%, 100% { transform: translateX(-130%); }
		50% { transform: translateX(130%); }
	}
	@keyframes audio-link-glow {
		0%, 100% { text-shadow: 0 0 8px rgba(46, 230, 194, 0.5); }
		50% { text-shadow: 0 0 16px rgba(46, 230, 194, 0.85); }
	}
	@keyframes grid-drive { from { background-position: 0 0; } to { background-position: 0 38px; } }
	@keyframes stage-enter { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
	@keyframes frame-enter { from { opacity: 0; transform: translateX(18px) scale(.985); } to { opacity: 1; transform: translateX(0) scale(1); } }
	@keyframes signal-pulse { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
	@keyframes audio-meter { from { transform: scaleY(.65); } to { transform: scaleY(1.9); } }
	@keyframes cursor-blink { 0%, 48% { opacity: 1; } 49%, 100% { opacity: 0; } }
	@keyframes flamingo-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
	@keyframes error-jolt { 0% { transform: translateX(0); } 40% { transform: translateX(3px); } 70% { transform: translateX(-3px); } 100% { transform: translateX(0); } }
	@keyframes title-glitch { 0%, 92%, 100% { opacity: 0; clip-path: inset(0); } 93% { opacity: .65; clip-path: inset(10% 0 58% 0); } 95% { opacity: .35; clip-path: inset(62% 0 10% 0); } 97% { opacity: 0; } }
	@keyframes boot-overlay-enter {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes boot-overlay-ascii-glow {
		0%, 100% { filter: drop-shadow(0 0 14px rgba(79, 214, 247, 0.3)); }
		50% { filter: drop-shadow(0 0 36px rgba(79, 214, 247, 0.6)); }
	}
	@keyframes boot-overlay-hint-pulse {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}
</style>
