/**
 * Chat message policy — the "no spam, no links, no shouting" gate.
 *
 * Applies BitMEX-style trollbox rules on top of the rate limiter:
 *  - rate limited (token bucket per sender)
 *  - links / shortened URLs / referral links are rejected outright
 *  - ALL-CAPS shouting (unnecessarily obnoxious formatting) is rejected
 *  - banned patterns (slurs, competitor shilling, phishing lures) are rejected
 *  - length capped
 */

import { containsLink } from './links';
import { TokenBucketRateLimiter } from './rateLimit';

export interface MessagePolicyOptions {
	maxLength?: number;
	bannedPatterns?: RegExp[];
}

export const DEFAULT_BANNED_PATTERNS = [
	// Competitor / off-platform shilling (BitMEX bans off-platform links and ads)
	/\bbinance\b/i, /\bbybit\b/i, /\bokx\b/i, /\bdydx\b/i,
	/\bkucoin\b/i, /\bkraken\b/i, /\bcoinbase\b/i,
	/\bgate\.io\b/i,
	// Slurs
	/\bn[i1][g9][g9][e3]r\b/i, /\bf[a@]gg?[o0]t\b/i,
	// Phishing lures
	/\bclaim\s*(your|the)?\s*(airdrop|reward|token)\b/i,
	/\b(airdrop|reward|token)\s*(claim|distribut)\w*\b/i,
	/\bdeposit\s+(to|into)\s+\d/i,
	/\bverify\s*(your)?\s*(wallet|account)\b/i,
	/\bsend\s+(?:me\s+)?\d.*(?:btc|eth|usdt)\b/i
];

export type MessagePolicyResult =
	| { ok: true }
	| { ok: false; reason: 'rate-limited'; retryAfterMs: number }
	| { ok: false; reason: 'link-blocked' | 'shouting' | 'banned' | 'too-long' };

export class ChatPolicy {
	private limiter: TokenBucketRateLimiter;
	private banned: RegExp[];
	readonly maxLength: number;

	constructor(options: MessagePolicyOptions = {}) {
		this.limiter = new TokenBucketRateLimiter(5, 1 / 2);
		this.banned = options.bannedPatterns ?? DEFAULT_BANNED_PATTERNS;
		this.maxLength = options.maxLength ?? 280;
	}

	/** Enforce every rule for one message. */
	check(text: string, senderKey: string): MessagePolicyResult {
		if (text.length > this.maxLength) return { ok: false, reason: 'too-long' };
		if (containsLink(text)) return { ok: false, reason: 'link-blocked' };
		if (this.banned.some((pattern) => pattern.test(text))) return { ok: false, reason: 'banned' };
		if (isShouting(text)) return { ok: false, reason: 'shouting' };
		const limited = this.limiter.take(senderKey);
		if (!limited.ok) return { ok: false, reason: 'rate-limited', retryAfterMs: limited.retryAfterMs };
		return { ok: true };
	}

	/** Release a token after a rejected (banned/link) message so the user isn't doubly punished. */
	refund(key: string): void {
		this.limiter.clear(key);
	}

	reset(): void {
		this.limiter.clearAll();
	}
}

/** ALL-CAPS shouting: majority uppercase over a meaningful length. */
export function isShouting(text: string): boolean {
	const letters = [...text].filter((c) => /[a-z]/i.test(c));
	if (letters.length < 5) return false;
	const upper = letters.filter((c) => c === c.toUpperCase()).length;
	return upper / letters.length > 0.7;
}
