<script lang="ts">
	import { onMount } from 'svelte';
	import { Music2, Volume2, VolumeX } from 'lucide-svelte';

	let cinematicVideo: HTMLVideoElement | undefined;
	let synthwaveAudio: HTMLAudioElement | undefined;
	let audioEnabled = $state(false);
	let audioError = $state(false);
	let videoUnavailable = $state(false);
	let reducedMotion = $state(false);
	let audioAttempt = 0;

	const glyphs = ['+', '◇', '╱', '01', '·', '⌁', '▧', '≋', '◌', '//', '✦', '::'] as const;

	function handleAudioPlay(): void {
		audioEnabled = true;
		audioError = false;
	}

	function handleAudioPause(): void {
		audioEnabled = false;
	}

	function handleAudioError(): void {
		audioError = true;
		audioEnabled = false;
	}

	function handleVideoError(): void {
		videoUnavailable = true;
	}

	async function startAudio(): Promise<void> {
		const audio = synthwaveAudio;
		if (!audio) return;
		const attempt = ++audioAttempt;
		audioError = false;
		audio.volume = 0.12;
		try {
			await audio.play();
			if (attempt === audioAttempt) audioEnabled = true;
		} catch {
			if (attempt === audioAttempt) {
				audioError = true;
				audioEnabled = false;
			}
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

	function resumeVideo(): void {
		if (reducedMotion || document.hidden || videoUnavailable || !cinematicVideo) return;
		void cinematicVideo.play().catch(() => {
			videoUnavailable = true;
		});
	}

	onMount(() => {
		reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reducedMotion) cinematicVideo?.pause();
		else resumeVideo();
		void startAudio();

		const handleVisibility = () => {
			if (document.hidden) cinematicVideo?.pause();
			else resumeVideo();
		};
		document.addEventListener('visibilitychange', handleVisibility);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibility);
			audioAttempt += 1;
			cinematicVideo?.pause();
			synthwaveAudio?.pause();
		};
	});
</script>

<div class="terminal-atmosphere" data-testid="terminal-atmosphere" aria-hidden="true">
	<video
		bind:this={cinematicVideo}
		class="terminal-ascii-video"
		muted
		autoplay
		loop
		playsinline
		preload="metadata"
		poster="/vice-flamingo-ascii-landscape-poster.webp"
		onerror={handleVideoError}
	>
		<source src="/vice-flamingo-ascii-landscape-loop.webm" type="video/webm" />
		<source src="/vice-flamingo-ascii-landscape-loop.mp4" type="video/mp4" />
	</video>
	<div class="terminal-atmosphere-vignette"></div>
	<div class="terminal-atmosphere-scanlines"></div>
	<div class="terminal-atmosphere-grid"></div>
	<div class="terminal-atmosphere-horizon"></div>
	<div class="terminal-glyph-field">
		{#each glyphs as glyph, index}
			<span class={`terminal-glyph glyph-${index}`}>{glyph}</span>
		{/each}
	</div>
</div>

<div class="terminal-music" data-testid="terminal-music">
	<audio
		bind:this={synthwaveAudio}
		loop
		autoplay
		preload="auto"
		onplay={handleAudioPlay}
		onpause={handleAudioPause}
		onerror={handleAudioError}
	>
		<source src="/vice-login-kissan4-arcade-rush.mp3" type="audio/mpeg" />
	</audio>
	<button
		type="button"
		data-testid="terminal-music-toggle"
		class="terminal-music-toggle"
		onclick={() => void toggleAudio()}
		aria-pressed={audioEnabled}
		aria-label={audioEnabled ? 'Mute terminal music' : 'Play terminal music'}
		title={audioEnabled ? 'Mute terminal music' : audioError ? 'Retry terminal music' : 'Play terminal music'}
	>
		{#if audioEnabled}
			<Volume2 class="h-3.5 w-3.5" />
		{:else if audioError}
			<Music2 class="h-3.5 w-3.5" />
		{:else}
			<VolumeX class="h-3.5 w-3.5" />
		{/if}
		<span>{audioEnabled ? 'MUSIC // ON' : audioError ? 'MUSIC // RETRY' : 'MUSIC // OFF'}</span>
	</button>
</div>

<style>
	.terminal-atmosphere {
		position: fixed;
		inset: 0;
		z-index: 20;
		overflow: hidden;
		pointer-events: none;
		background:
			radial-gradient(circle at 50% 112%, rgba(255, 61, 154, 0.1), transparent 42%),
			radial-gradient(circle at 12% 18%, rgba(79, 214, 247, 0.06), transparent 30%),
			transparent;
	}

	.terminal-ascii-video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.105;
		filter: saturate(0.75) contrast(1.12) brightness(0.68);
		mix-blend-mode: screen;
	}

	.terminal-atmosphere-vignette,
	.terminal-atmosphere-scanlines,
	.terminal-atmosphere-grid,
	.terminal-atmosphere-horizon,
	.terminal-glyph-field {
		position: absolute;
		inset: 0;
	}

	.terminal-atmosphere-vignette {
		background:
			linear-gradient(90deg, rgba(8, 9, 20, 0.12), transparent 18%, transparent 82%, rgba(8, 9, 20, 0.14)),
			linear-gradient(0deg, rgba(8, 9, 20, 0.16), transparent 30%, rgba(8, 9, 20, 0.06));
	}

	.terminal-atmosphere-scanlines {
		opacity: 0.09;
		background: repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(138, 102, 255, 0.16) 4px, transparent 5px);
		animation: terminal-scan-drift 15s linear infinite;
	}

	.terminal-atmosphere-grid {
		inset: 49% -12% -38%;
		transform: perspective(360px) rotateX(58deg);
		transform-origin: center bottom;
		opacity: 0.17;
		background-image:
			linear-gradient(rgba(79, 214, 247, 0.28) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 61, 154, 0.22) 1px, transparent 1px);
		background-size: 72px 36px;
		mask-image: linear-gradient(to bottom, transparent 0, black 34%, black 76%, transparent 100%);
		animation: terminal-grid-drive 20s linear infinite;
	}

	.terminal-atmosphere-horizon {
		inset: auto -10% 42% -10%;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(79, 214, 247, 0.18) 28%, rgba(255, 61, 154, 0.28) 50%, rgba(79, 214, 247, 0.18) 72%, transparent);
		box-shadow: 0 0 18px rgba(255, 61, 154, 0.22);
		animation: terminal-horizon-breathe 8s ease-in-out infinite;
	}

	.terminal-glyph-field {
		font-family: var(--font-terminal-mono, monospace);
		font-size: 10px;
		letter-spacing: 0.12em;
		color: rgba(79, 214, 247, 0.7);
		text-shadow: 0 0 7px rgba(79, 214, 247, 0.45);
	}

	.terminal-glyph {
		position: absolute;
		opacity: 0.15;
		animation: terminal-glyph-float 13s ease-in-out infinite;
		user-select: none;
	}

	.glyph-0 { left: 7%; top: 22%; animation-delay: -2s; color: rgba(255, 61, 154, 0.72); }
	.glyph-1 { left: 19%; top: 66%; animation-delay: -8s; }
	.glyph-2 { left: 31%; top: 17%; animation-delay: -5s; color: rgba(255, 61, 154, 0.62); }
	.glyph-3 { left: 43%; top: 76%; animation-delay: -11s; }
	.glyph-4 { left: 54%; top: 29%; animation-delay: -4s; color: rgba(255, 61, 154, 0.58); }
	.glyph-5 { left: 63%; top: 63%; animation-delay: -9s; }
	.glyph-6 { left: 73%; top: 16%; animation-delay: -7s; color: rgba(255, 61, 154, 0.64); }
	.glyph-7 { left: 82%; top: 72%; animation-delay: -1s; }
	.glyph-8 { left: 91%; top: 35%; animation-delay: -10s; color: rgba(255, 61, 154, 0.62); }
	.glyph-9 { left: 14%; top: 43%; animation-delay: -6s; }
	.glyph-10 { left: 67%; top: 47%; animation-delay: -3s; color: rgba(255, 61, 154, 0.64); }
	.glyph-11 { left: 87%; top: 84%; animation-delay: -12s; }

	.terminal-music {
		position: fixed;
		right: 10px;
		bottom: 10px;
		z-index: 45;
		pointer-events: none;
	}

	.terminal-music-toggle {
		pointer-events: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border: 1px solid rgba(79, 214, 247, 0.3);
		border-radius: 4px;
		padding: 0.3rem 0.45rem;
		background: rgba(8, 9, 20, 0.78);
		color: rgba(188, 197, 221, 0.78);
		font-family: var(--font-terminal-mono, monospace);
		font-size: 9px;
		letter-spacing: 0.08em;
		box-shadow: 0 0 10px rgba(79, 214, 247, 0.08);
		backdrop-filter: blur(8px);
		transition: border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
	}

	.terminal-music-toggle:hover,
	.terminal-music-toggle:focus-visible {
		border-color: rgba(79, 214, 247, 0.72);
		color: #d8f8ff;
		box-shadow: 0 0 13px rgba(79, 214, 247, 0.2), inset 0 0 10px rgba(255, 61, 154, 0.06);
	}

	.terminal-music-toggle:active {
		transform: translateY(1px);
	}

	:global(.terminal-shell) {
		cursor: crosshair;
	}

	:global(.terminal-shell button:not(:disabled)),
	:global(.terminal-shell a),
	:global(.terminal-shell select) {
		cursor: pointer;
	}

	:global(.terminal-shell button:not(:disabled):focus-visible),
	:global(.terminal-shell a:focus-visible),
	:global(.terminal-shell select:focus-visible),
	:global(.terminal-shell input:focus-visible) {
		outline: 1px solid rgba(79, 214, 247, 0.82);
		outline-offset: 2px;
		box-shadow: 0 0 0 2px rgba(79, 214, 247, 0.12), 0 0 12px rgba(79, 214, 247, 0.2);
	}

	@keyframes terminal-scan-drift {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(5px); }
	}

	@keyframes terminal-grid-drive {
		from { background-position: 0 0, 0 0; }
		to { background-position: 0 36px, 36px 0; }
	}

	@keyframes terminal-horizon-breathe {
		0%, 100% { opacity: 0.45; transform: scaleX(0.82); }
		50% { opacity: 0.9; transform: scaleX(1); }
	}

	@keyframes terminal-glyph-float {
		0%, 100% { opacity: 0.05; transform: translate3d(0, 0, 0); }
		45% { opacity: 0.14; transform: translate3d(2px, -4px, 0); }
		70% { opacity: 0.08; transform: translate3d(-1px, 2px, 0); }
	}

	@media (max-width: 1023px) {
		.terminal-music {
			top: 94px;
			right: 8px;
			bottom: auto;
		}
		.terminal-ascii-video {
			opacity: 0.045;
		}
		.terminal-atmosphere-grid {
			opacity: 0.08;
		}

		.terminal-music-toggle {
			width: 28px;
			height: 28px;
			justify-content: center;
			padding: 0;
		}

		.terminal-music-toggle span {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.terminal-atmosphere-scanlines,
		.terminal-atmosphere-grid,
		.terminal-atmosphere-horizon,
		.terminal-glyph {
			animation: none;
		}
		.terminal-atmosphere-grid {
			transform: perspective(360px) rotateX(58deg);
		}
	}
</style>
