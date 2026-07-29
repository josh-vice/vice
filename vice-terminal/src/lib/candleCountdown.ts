export type CandleFrame = {
	label: '1H' | '4H' | '1D' | '1W';
	ms: number;
	offset: number;
};

export type CandleCountdown = CandleFrame & {
	remainingMs: number;
	progress: number;
	labelledRemaining: string;
};

const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Weekly candles close Monday 00:00 UTC; Unix epoch itself started Thursday. */
export const candleFrames: readonly CandleFrame[] = [
	{ label: '1H', ms: HOUR, offset: 0 },
	{ label: '4H', ms: 4 * HOUR, offset: 0 },
	{ label: '1D', ms: DAY, offset: 0 },
	{ label: '1W', ms: 7 * DAY, offset: 4 * DAY }
];

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

export function formatCountdown(remainingMs: number): string {
	const totalSeconds = Math.max(0, Math.floor(remainingMs / 1_000));
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;
	return days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function candleCountdown(frame: CandleFrame, now: number): CandleCountdown {
	const elapsed = ((now - frame.offset) % frame.ms + frame.ms) % frame.ms;
	const remainingMs = frame.ms - elapsed;
	return { ...frame, remainingMs, progress: elapsed / frame.ms, labelledRemaining: formatCountdown(remainingMs) };
}

export function utcClock(now: number): string {
	const date = new Date(now);
	return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
