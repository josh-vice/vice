import { get, writable, type Writable } from 'svelte/store';
import { fills, localAlgoJobs } from './stores';
import { priceAlertNotice } from './priceAlerts';
import { hyperliquidNetwork } from './hl/network';

const STORAGE_KEY = `vice.sound-preferences.v1:${hyperliquidNetwork.network}`;

export const soundMuted: Writable<boolean> = writable(true);

let loaded = false;
let audioContext: AudioContext | null = null;

function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

export function loadSoundPreference(): boolean {
	if (loaded) return get(soundMuted);
	loaded = true;
	if (!canUseStorage()) return true;
	try {
		const muted = localStorage.getItem(STORAGE_KEY) !== 'false';
		soundMuted.set(muted);
		return muted;
	} catch {
		return true;
	}
}

function persist(muted: boolean): void {
	if (!canUseStorage()) return;
	try { localStorage.setItem(STORAGE_KEY, String(muted)); } catch { /* local preference only */ }
}

/** Must be called from a user gesture before automatic notifications can play. */
export async function setSoundMuted(muted: boolean): Promise<void> {
	loaded = true;
	soundMuted.set(muted);
	persist(muted);
	if (muted || typeof AudioContext === 'undefined') return;
	try {
		audioContext ??= new AudioContext();
		await audioContext.resume();
	} catch {
		// Browser audio permission is optional. Visual state remains authoritative.
	}
}

function playTone(frequency: number): void {
	if (get(soundMuted) || !audioContext || audioContext.state !== 'running') return;
	try {
		const oscillator = audioContext.createOscillator();
		const gain = audioContext.createGain();
		gain.gain.setValueAtTime(0.035, audioContext.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
		oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
		oscillator.connect(gain).connect(audioContext.destination);
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.12);
	} catch {
		// Notifications must never disrupt public feeds or trading controls.
	}
}

/** Starts one local monitor. It does not transmit account, order, or alert data. */
export function startSoundNotifications(): () => void {
	loadSoundPreference();
	let lastAlertFiredAt = 0;
	let knownFillIds: Set<string> | null = null;
	let knownAlgoStates: Map<string, string> | null = null;
	const stops = [
		priceAlertNotice.subscribe((notice) => {
			if (!notice || notice.firedAt <= lastAlertFiredAt) return;
			lastAlertFiredAt = notice.firedAt;
			playTone(880);
		}),
		fills.subscribe((next) => {
			const ids = new Set(next.map((fill) => fill.id));
			if (knownFillIds && [...ids].some((id) => !knownFillIds!.has(id))) playTone(660);
			knownFillIds = ids;
		}),
		localAlgoJobs.subscribe((next) => {
			const states = new Map(next.map((job) => [job.id, job.status]));
			if (knownAlgoStates && next.some((job) => knownAlgoStates!.get(job.id) !== job.status && ['finished', 'failed', 'emergencyStopped'].includes(job.status))) {
				playTone(440);
			}
			knownAlgoStates = states;
		})
	];
	return () => stops.forEach((stop) => stop());
}
