/**
 * Chat slash commands — BitMEX-style, but backed by the terminal's LIVE state.
 *
 * /position [symbol]  → share your real open position (size/entry/pnl)
 * /pnl [symbol]       → share unrealized pnl for a position
 * /orders [symbol]    → share your real open orders
 * /bal                → share account equity / margin available
 * /mute <name>        → hide a user locally
 * /unmute <name>      → show a muted user again
 * /help               → list commands
 *
 * All data is read from the live Svelte stores — never fabricated.
 */

import { get } from 'svelte/store';
import { positions, openOrders, activeSubaccount } from '$lib/stores';
import type { ChatBadge } from '$lib/chat/types';

export type ChatCommandResult =
	| { type: 'chat'; text: string }
	| { type: 'position'; badge: ChatBadge }
	| { type: 'system'; text: string };

export interface ChatCommandContext {
	/** Sender's display name (already resolved). */
	displayName: string;
	/** Optional per-session mute set (persisted by the panel). */
	isMuted: (name: string) => boolean;
}

function resolveMarketSymbol(raw: string | undefined): string | undefined {
	if (!raw) return undefined;
	const symbol = raw.trim().toUpperCase();
	// Accept bare coin ("BTC") or full perp ("BTC-USD-PERP") / api coin.
	return symbol;
}

function symbolOf(market: string, apiCoin?: string, marketKey?: string): string {
	return (marketKey ?? apiCoin ?? market ?? 'POSITION').toUpperCase();
}

function findPosition(symbol?: string) {
	const rows = get(positions);
	if (!rows.length) return undefined;
	const wanted = resolveMarketSymbol(symbol);
	if (!wanted) return rows[0];
	return rows.find((p) => {
		const name = symbolOf(p.market, p.apiCoin, p.marketKey);
		return name.includes(wanted) || wanted.includes(name.split('-')[0]);
	});
}

function findOrders(symbol?: string) {
	const rows = get(openOrders);
	if (!rows.length) return [];
	const wanted = resolveMarketSymbol(symbol);
	if (!wanted) return rows;
	return rows.filter((o) => {
		const name = symbolOf(o.market, o.apiCoin, o.marketKey);
		return name.includes(wanted) || wanted.includes(name.split('-')[0]);
	});
}

export function runChatCommand(
	raw: string,
	ctx: ChatCommandContext
): ChatCommandResult | null {
	const parts = raw.trim().split(/\s+/);
	const cmd = parts[0].toLowerCase();
	const arg = parts[1];

	switch (cmd) {
		case '/help':
		case '/?': {
			return {
				type: 'system',
				text: '/position [sym] · /pnl [sym] · /orders [sym] · /bal · /mute <name> · /unmute <name> · /help'
			};
		}
		case '/bal':
		case '/balance': {
			const account = get(activeSubaccount);
			const equity = account?.equity ?? 0;
			const free = account?.marginFree ?? 0;
			return { type: 'chat', text: `Equity $${fmtUsd(equity)} · Available $${fmtUsd(free)}` };
		}
		case '/position':
		case '/pos': {
			const pos = findPosition(arg);
			if (!pos) return { type: 'system', text: arg ? `No open ${arg.toUpperCase()} position.` : 'No open positions.' };
			const side = pos.side === 'short' ? 'Short' : 'Long';
			const size = Math.abs(pos.size);
			const entry = pos.entryPrice ?? 0;
			const pnl = pos.unrealizedPnl ?? 0;
			const pnlPct = entry && size ? (pnl / (entry * size)) * 100 : 0;
			return {
				type: 'position',
				badge: {
					symbol: symbolOf(pos.market, pos.apiCoin, pos.marketKey),
					side,
					size,
					entry,
					pnl,
					pnlPct
				}
			};
		}
		case '/pnl': {
			const pos = findPosition(arg);
			if (!pos) return { type: 'system', text: arg ? `No open ${arg.toUpperCase()} position to report pnl.` : 'No open positions to report pnl.' };
			const pnl = pos.unrealizedPnl ?? 0;
			const side = pos.side === 'short' ? 'Short' : 'Long';
			const symbol = symbolOf(pos.market, pos.apiCoin, pos.marketKey);
			return { type: 'chat', text: `${symbol} ${side} unrealized ${pnl >= 0 ? '+' : ''}$${fmtUsd(pnl)}` };
		}
		case '/orders': {
			const rows = get(openOrders);
			if (!rows.length) return { type: 'system', text: 'No open orders.' };
			const filtered = findOrders(arg);
			if (!filtered.length) return { type: 'system', text: `No open orders for ${arg?.toUpperCase()}.` };
			const summary = filtered.map((o) => {
				const side = o.side === 'sell' ? 'SELL' : 'BUY';
				const price = o.price ?? 0;
				return `${side} ${o.size} @ ${price ? fmtUsd(price) : 'mkt'}`;
			}).join(' · ');
			return { type: 'chat', text: `${filtered.length} open order${filtered.length > 1 ? 's' : ''}: ${summary}` };
		}
		case '/mute': {
			if (!arg) return { type: 'system', text: 'Usage: /mute <name>' };
			const name = arg.replace(/^@/, '');
			if (ctx.displayName === name) return { type: 'system', text: "You can't mute yourself." };
			if (ctx.isMuted(name)) return { type: 'system', text: `${name} is already muted.` };
			return { type: 'system', text: `/mute ${name} — muted locally.` };
		}
		case '/unmute': {
			if (!arg) return { type: 'system', text: 'Usage: /unmute <name>' };
			const name = arg.replace(/^@/, '');
			if (!ctx.isMuted(name)) return { type: 'system', text: `${name} is not muted.` };
			return { type: 'system', text: `/unmute ${name} — unmuted.` };
		}
		default:
			return null;
	}
}

export function isChatCommand(raw: string): boolean {
	return raw.trim().startsWith('/');
}

function fmtUsd(value: number): string {
	if (!Number.isFinite(value)) return '0';
	return value.toLocaleString('en-US', { maximumFractionDigits: value >= 100 ? 0 : 2 });
}
