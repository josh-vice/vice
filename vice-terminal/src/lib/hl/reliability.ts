/** Reliability limits shared by the SDK transports and local recovery loops. */
export const HL_WS_RELIABILITY_LIMITS = {
	sdkReconnect: {
		baseDelayMs: 500,
		maxDelayMs: 30_000
	},
	marketReconnect: {
		baseDelayMs: 250,
		maxDelayMs: 5_000
	},
	publicFrame: {
		maxBytes: 512 * 1024
	}
} as const;

/** Delay used by @nktkas/rews for its attempt-indexed reconnect loop. */
export function getSdkReconnectionDelayMs(attempt: number): number {
	const safeAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
	return Math.min(
		HL_WS_RELIABILITY_LIMITS.sdkReconnect.baseDelayMs * 2 ** safeAttempt,
		HL_WS_RELIABILITY_LIMITS.sdkReconnect.maxDelayMs
	);
}

/** Delay used when a feed must be rebuilt after a stale or failed stream. */
export function getMarketReconnectDelayMs(attempt: number): number {
	const safeAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
	return Math.min(
		HL_WS_RELIABILITY_LIMITS.marketReconnect.baseDelayMs * 2 ** safeAttempt,
		HL_WS_RELIABILITY_LIMITS.marketReconnect.maxDelayMs
	);
}

/** Count UTF-8 bytes without allocating a second copy of a WebSocket frame. */
export function utf8ByteLength(value: string): number {
	let bytes = 0;
	for (const character of value) {
		const codePoint = character.codePointAt(0) ?? 0;
		if (codePoint <= 0x7f) bytes += 1;
		else if (codePoint <= 0x7ff) bytes += 2;
		else if (codePoint <= 0xffff) bytes += 3;
		else bytes += 4;
	}
	return bytes;
}

export function isPublicPlaneFrameWithinLimit(
	value: string,
	maxBytes = HL_WS_RELIABILITY_LIMITS.publicFrame.maxBytes
): boolean {
	return utf8ByteLength(value) <= maxBytes;
}
