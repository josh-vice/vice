import { describe, expect, test } from 'bun:test';
import { TokenBucketRateLimiter } from './rateLimit';
import { findLinks, containsLink } from './links';
import { ChatPolicy, isShouting } from './policy';
import { runChatCommand, isChatCommand } from './commands';

describe('TokenBucketRateLimiter', () => {
	test('allows a burst up to capacity', () => {
		const limiter = new TokenBucketRateLimiter(3, 1, () => 0);
		expect(limiter.take('a').ok).toBe(true);
		expect(limiter.take('a').ok).toBe(true);
		expect(limiter.take('a').ok).toBe(true);
		expect(limiter.take('a').ok).toBe(false);
	});

	test('refills over time', () => {
		let now = 0;
		const limiter = new TokenBucketRateLimiter(1, 1, () => now);
		expect(limiter.take('a').ok).toBe(true);
		expect(limiter.take('a').ok).toBe(false);
		now += 1100; // one second later, one token refilled
		expect(limiter.take('a').ok).toBe(true);
	});

	test('senders are independent', () => {
		const limiter = new TokenBucketRateLimiter(1, 1, () => 0);
		expect(limiter.take('a').ok).toBe(true);
		expect(limiter.take('b').ok).toBe(true);
	});
});

describe('link detection', () => {
	test('detects http/https urls', () => {
		expect(containsLink('check https://evil.example/x')).toBe(true);
		expect(containsLink('go to http://phish.com now')).toBe(true);
	});
	test('detects www bare domains', () => {
		expect(containsLink('visit www.pump-me.io')).toBe(true);
	});
	test('detects bare domains with TLDs', () => {
		expect(containsLink('join our group at pumpanddump.xyz')).toBe(true);
		expect(containsLink('no links here')).toBe(false);
		expect(containsLink('see e.g. how it works')).toBe(false);
	});
	test('detects shortened services', () => {
		expect(containsLink('t.me/vice')).toBe(true);
		expect(containsLink('discord.gg/invite')).toBe(true);
		expect(containsLink('bit.ly/xyz')).toBe(true);
	});
	test('detects IP addresses', () => {
		expect(containsLink('host 192.168.0.1:8080')).toBe(true);
	});
	test('does not flag normal text', () => {
		expect(containsLink('gm bears stay poor')).toBe(false);
		expect(containsLink('funding going negative')).toBe(false);
	});
});

describe('ChatPolicy', () => {
	test('blocks links', () => {
		const policy = new ChatPolicy({ bannedPatterns: [] });
		const result = policy.check('send money to https://scam.io', 'u');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('link-blocked');
	});
	test('blocks shouting', () => {
		const policy = new ChatPolicy({ bannedPatterns: [] });
		const result = policy.check('EVERYONE LOOK AT THIS MARKET', 'u');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('shouting');
	});
	test('allows normal messages', () => {
		const policy = new ChatPolicy({ bannedPatterns: [] });
		expect(policy.check('gm everyone', 'u').ok).toBe(true);
	});
	test('enforces rate limit', () => {
		const policy = new ChatPolicy({ bannedPatterns: [] });
		for (let i = 0; i < 5; i++) policy.check('hello', 'u');
		const result = policy.check('one too many', 'u');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('rate-limited');
	});
});

describe('isShouting', () => {
	test('flags majority-uppercase long text', () => {
		expect(isShouting('HELLO WORLD')).toBe(true);
		expect(isShouting('Hello World')).toBe(false);
		expect(isShouting('OK')).toBe(false); // too short
	});
});

describe('slash commands (live stores)', () => {
	test('isChatCommand detects slash', () => {
		expect(isChatCommand('/pnl BTC')).toBe(true);
		expect(isChatCommand('normal text')).toBe(false);
	});

	test('unknown command returns null', () => {
		const result = runChatCommand('/bogus', { displayName: 'You', isMuted: () => false });
		expect(result).toBeNull();
	});

	test('/bal returns a chat message from live subaccount store', async () => {
		// The store is a writable Svelte store; give it a fixture account value.
		const { activeSubaccount } = await import('$lib/stores');
		activeSubaccount.set({ id: '1', name: 'Default', avatar: 'D', equity: 1000, marginUsed: 100, marginFree: 900, leverage: 1 });
		const result = runChatCommand('/bal', { displayName: 'You', isMuted: () => false });
		expect(result?.type).toBe('chat');
		if (result?.type === 'chat') expect(result.text).toContain('$1,000');
	});

	test('/position returns a live position badge when a position exists', async () => {
		const { positions } = await import('$lib/stores');
		positions.set([{
			id: 'p1', market: 'BTC-USD-PERP', apiCoin: 'BTC', marketKey: 'BTC-USD-PERP',
			side: 'long', size: 0.5, entryPrice: 65000, markPrice: 67000,
			unrealizedPnl: 1000, realizedPnl: 0
		}]);
		const result = runChatCommand('/position BTC', { displayName: 'You', isMuted: () => false });
		expect(result?.type).toBe('position');
		if (result?.type === 'position') {
			expect(result.badge.symbol).toContain('BTC');
			expect(result.badge.side).toBe('Long');
			expect(result.badge.size).toBe(0.5);
			expect(result.badge.pnl).toBe(1000);
		}
	});
});
