import { get } from 'svelte/store';
import {
	selectedMarket,
	openOrders,
	positions,
	balances,
	walletAddress,
	marketRegistry,
	orderSide,
	orderSize,
	orderPrice,
	orderType,
	advancedConfig,
	selectMarket
} from '$lib/stores';
import type { CLICommand } from '$lib/types';
import { placeOrder, startAlgoOrder, cancelOrder, fetchOpenOrders, fetchPositions } from '$lib/hl/orders';
import { isAdvancedOrderCertified, unavailableOrderTypeMessage } from '$lib/execution/capabilities';
import { deleteCliPreference, expandCliInput, loadCliPreferences, setCliPreference } from './preferences';

const SUPPORTED_ALGOS = new Set(['twap', 'adaptive_twap', 'vwap', 'pov', 'break_even', 'maker', 'conditional_ladder', 'scale', 'chase', 'swarm', 'iceberg', 'ping_pong', 'oco', 'trailing_stop']);
export const CLI_ACTION_IDS = {
	execute: 'cli.execute',
	chain: 'cli.chain',
	repeat: 'cli.repeat',
	alias: 'cli.alias',
	variable: 'cli.variable'
} as const;

function resolveCliMarket(raw: string) {
	const identity = raw.trim().toLowerCase();
	return get(marketRegistry).find((market) =>
		[market.marketKey, market.apiCoin, market.symbol].some((value) => value.toLowerCase() === identity)
	);
}

function selectCliMarket(market: ReturnType<typeof resolveCliMarket>): void {
	if (market && get(selectedMarket)?.marketKey !== market.marketKey) selectMarket(market);
}

function parseSide(token: string): 'buy' | 'sell' | null {
	if (token === 'buy' || token === 'b') return 'buy';
	if (token === 'sell' || token === 's') return 'sell';
	return null;
}

function parseNumber(token: string): number | null {
	const n = parseFloat(token.replace(/,/g, ''));
	return Number.isFinite(n) ? n : null;
}

function cmd(input: string, output: string, type: CLICommand['type'] = 'info'): CLICommand {
	return { input, output, timestamp: Date.now(), type };
}

async function ensureAccount(): Promise<string | null> {
	const addr = get(walletAddress);
	if (!addr || addr.includes('...')) {
		return null;
	}
	return addr;
}

async function refreshCliAccountSnapshot(address: string): Promise<boolean> {
	const { refreshAccountSnapshot } = await import('$lib/hl/account');
	try {
		return await refreshAccountSnapshot(address);
	} catch {
		return false;
	}
}

async function handleBuySell(input: string, side: 'buy' | 'sell'): Promise<CLICommand> {
	// buy [size] [symbol] @ [price|market]
	const match = input.match(
		/^(?:buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)(?:\s+@\s+([\d.]+|market))?$/i
	);
	if (!match) {
		return cmd(input, 'Usage: buy|sell [size] [symbol] @ [price|market]', 'error');
	}

	const size = parseNumber(match[1]);
	const marketDescriptor = resolveCliMarket(match[2]);
	if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[2]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
	selectCliMarket(marketDescriptor);
	const symbol = marketDescriptor.marketKey;
	const priceToken = match[3]?.toLowerCase();
	if (!size || size <= 0) return cmd(input, 'Invalid size', 'error');

	orderSide.set(side);
	orderSize.set(size);

	const market = get(selectedMarket);
	const coin = marketDescriptor.symbol;

	if (!priceToken || priceToken === 'market') {
		const result = await placeOrder({
			marketKey: symbol,
			side,
			type: 'market',
			size,
			price: marketDescriptor.lastPrice
		});
		if (!result.ok) return cmd(input, result.error ?? 'Order failed', 'error');
		const refreshed = await fetchOpenOrders();
		if (!refreshed) return cmd(input, 'Order accepted but account reconciliation is unresolved', 'error');
		return cmd(input, `Market ${side} ${size} ${coin} submitted`, 'success');
	}

	const price = parseNumber(priceToken);
	if (!price) return cmd(input, 'Invalid price', 'error');
	orderPrice.set(price);

	const result = await placeOrder({ marketKey: symbol, side, type: 'limit', size, price });
	if (!result.ok) return cmd(input, result.error ?? 'Order failed', 'error');
	const refreshed = await fetchOpenOrders();
	if (!refreshed) return cmd(input, 'Order accepted but account reconciliation is unresolved', 'error');
	return cmd(input, `Limit ${side} ${size} ${coin} @ ${price}`, 'success');
}

async function handleAlgo(
	input: string,
	algo: 'twap' | 'adaptive_twap' | 'vwap' | 'pov' | 'break_even' | 'maker' | 'conditional_ladder' | 'scale' | 'chase' | 'swarm' | 'iceberg' | 'ping_pong' | 'oco' | 'trailing_stop'
): Promise<CLICommand> {
	// twap buy 10 BTC 30m
	// scale buy 5 BTC 65000-67000
	// chase sell 2 ETH
	if (algo === 'twap') {
		const match = input.match(/^twap\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)\s+(\d+)m?$/i);
		if (!match) return cmd(input, 'Usage: twap buy|sell [size] [symbol] [minutes]m', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
	const marketDescriptor = resolveCliMarket(match[3]);
	if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
	selectCliMarket(marketDescriptor);
	const symbol = marketDescriptor.marketKey;
		const minutes = parseNumber(match[4])!;

		advancedConfig.update((c) => ({ ...c, twapDuration: minutes }));
		orderSide.set(side);
		orderSize.set(size);
		orderType.set('twap');

		const result = await startAlgoOrder({
			marketKey: symbol,
			side,
			type: 'twap',
			size,
			algo: { type: 'twap', config: { twapDuration: minutes, twapIntervals: 10, twapRandomize: true } }
		});
		if (!result.ok) return cmd(input, result.error ?? 'TWAP failed', 'error');
		return cmd(input, `TWAP ${side} ${size} ${symbol} over ${minutes}m (job ${result.jobId})`, 'success');
	}

	if (algo === 'adaptive_twap' || algo === 'vwap') {
		const match = input.match(/^(?:adaptive-twap|adaptive|vwap)\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)\s+(\d+)m?(?:\s+(\d+))?$/i);
		if (!match) return cmd(input, `Usage: ${algo === 'vwap' ? 'vwap' : 'adaptive-twap'} buy|sell [size] [symbol] [minutes]m [intervals]`, 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
		const marketDescriptor = resolveCliMarket(match[3]);
		if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
		selectCliMarket(marketDescriptor);
		const minutes = parseNumber(match[4])!;
		const intervals = match[5] ? parseNumber(match[5])! : 10;
		const type = algo;
		const result = await startAlgoOrder({ marketKey: marketDescriptor.marketKey, side, type, size, algo: { type, config: { adaptiveDuration: minutes, adaptiveIntervals: intervals, adaptiveParticipation: 0.1, adaptiveOffsetTicks: 1 } } });
		if (!result.ok) return cmd(input, result.error ?? `${type} failed`, 'error');
		return cmd(input, `${type} ${side} ${size} ${marketDescriptor.marketKey} over ${minutes}m (job ${result.jobId})`, 'success');
	}

	if (algo === 'pov') {
		const match = input.match(/^pov\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)\s+(\d+)m?(?:\s+([\d.]+))?$/i);
		if (!match) return cmd(input, 'Usage: pov buy|sell [size] [symbol] [minutes]m [participation]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
		const marketDescriptor = resolveCliMarket(match[3]);
		if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
		selectCliMarket(marketDescriptor);
		const minutes = parseNumber(match[4])!;
		const participation = match[5] ? parseNumber(match[5])! : 0.1;
		const result = await startAlgoOrder({ marketKey: marketDescriptor.marketKey, side, type: 'pov', size, algo: { type: 'pov', config: { adaptiveDuration: minutes, povParticipation: participation, povWindowTrades: 20, adaptiveOffsetTicks: 1 } } });
		if (!result.ok) return cmd(input, result.error ?? 'POV failed', 'error');
		return cmd(input, `POV ${side} ${size} ${marketDescriptor.marketKey} at ${(participation * 100).toFixed(1)}% (job ${result.jobId})`, 'success');
	}

	if (algo === 'break_even') {
		const match = input.match(/^breakeven\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)\s+([\d.]+)\s+([\d.]+)$/i);
		if (!match) return cmd(input, 'Usage: breakeven buy|sell [size] [symbol] [entry] [trigger-distance]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
		const marketDescriptor = resolveCliMarket(match[3]);
		if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
		selectCliMarket(marketDescriptor);
		const entryPrice = parseNumber(match[4])!;
		const triggerDistance = parseNumber(match[5])!;
		const result = await startAlgoOrder({ marketKey: marketDescriptor.marketKey, side, type: 'break_even', size, price: entryPrice, algo: { type: 'break_even', config: { entryPrice, breakEvenTrigger: triggerDistance, breakEvenOffset: 0 } } });
		if (!result.ok) return cmd(input, result.error ?? 'Break-even failed', 'error');
		return cmd(input, `Break-even ${side} ${size} ${marketDescriptor.marketKey} trigger ${triggerDistance} (job ${result.jobId})`, 'success');
	}

	if (algo === 'maker') {
		const match = input.match(/^maker\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)(?:\s+([\d.]+))?$/i);
		if (!match) return cmd(input, 'Usage: maker buy|sell [size] [symbol] [offset-ticks]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
		const marketDescriptor = resolveCliMarket(match[3]);
		if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
		selectCliMarket(marketDescriptor);
		const result = await startAlgoOrder({ marketKey: marketDescriptor.marketKey, side, type: 'maker', size, algo: { type: 'maker', config: { makerOffsetTicks: match[4] ? parseNumber(match[4]) : 0 } } });
		if (!result.ok) return cmd(input, result.error ?? 'Maker routing failed', 'error');
		return cmd(input, `Maker ${side} ${size} ${marketDescriptor.marketKey}`, 'success');
	}

	if (algo === 'conditional_ladder') {
		const match = input.match(/^conditional[-_]?ladder\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)\s+([\d.]+)\s+([\d.]+)-([\d.]+)(?:\s+(\d+))?$/i);
		if (!match) return cmd(input, 'Usage: conditional-ladder buy|sell [size] [symbol] [trigger] [start]-[end] [levels]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
		const marketDescriptor = resolveCliMarket(match[3]);
		if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
		selectCliMarket(marketDescriptor);
		const triggerPrice = parseNumber(match[4])!;
		const startPrice = parseNumber(match[5])!;
		const endPrice = parseNumber(match[6])!;
		const levels = match[7] ? Number(match[7]) : 5;
		const result = await startAlgoOrder({ marketKey: marketDescriptor.marketKey, side, type: 'conditional_ladder', size, algo: { type: 'conditional_ladder', config: { conditionalTriggerPrice: triggerPrice, scaleStartPrice: startPrice, scaleEndPrice: endPrice, scaleLevels: levels, scaleSkew: 1 } } });
		if (!result.ok) return cmd(input, result.error ?? 'Conditional ladder failed', 'error');
		return cmd(input, `Conditional ladder ${side} ${size} ${marketDescriptor.marketKey} trigger ${triggerPrice} (job ${result.jobId})`, 'success');
	}

	if (algo === 'scale') {
		const match = input.match(/^scale\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)\s+([\d.]+)-([\d.]+)$/i);
		if (!match) return cmd(input, 'Usage: scale buy|sell [size] [symbol] [start]-[end]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
	const marketDescriptor = resolveCliMarket(match[3]);
	if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
	selectCliMarket(marketDescriptor);
	const symbol = marketDescriptor.marketKey;
		const start = parseNumber(match[4])!;
		const end = parseNumber(match[5])!;

		advancedConfig.update((c) => ({ ...c, scaleStartPrice: start, scaleEndPrice: end, scaleLevels: 5 }));
		orderSide.set(side);
		orderSize.set(size);
		orderType.set('scale');

		const result = await startAlgoOrder({
			marketKey: symbol,
			side,
			type: 'scale',
			size,
			price: start,
			algo: { type: 'scale', config: { scaleStartPrice: start, scaleEndPrice: end, scaleLevels: 5, scaleSkew: 1 } }
		});
		if (!result.ok) return cmd(input, result.error ?? 'Scale failed', 'error');
		return cmd(input, `Scale ${side} ${size} ${symbol} ${start}-${end} (job ${result.jobId})`, 'success');
	}

	// chase
	if (algo === 'chase') {
		const match = input.match(/^chase\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)$/i);
		if (!match) return cmd(input, 'Usage: chase buy|sell [size] [symbol]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
	const marketDescriptor = resolveCliMarket(match[3]);
	if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
	selectCliMarket(marketDescriptor);
	const symbol = marketDescriptor.marketKey;

		orderSide.set(side);
		orderSize.set(size);
		orderType.set('chase');

		const result = await startAlgoOrder({
			marketKey: symbol,
			side,
			type: 'chase',
			size,
			algo: { type: 'chase', config: { chaseOffset: 1, chaseMaxChases: 20 } }
		});
		if (!result.ok) return cmd(input, result.error ?? 'Chase failed', 'error');
		return cmd(input, `Chase ${side} ${size} ${symbol} started (job ${result.jobId})`, 'success');
	}

	if (algo === 'swarm') {
		const match = input.match(/^swarm\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)(?:\s+([\d.]+)%?)?$/i);
		if (!match) return cmd(input, 'Usage: swarm buy|sell [size] [symbol] [spread%]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
	const marketDescriptor = resolveCliMarket(match[3]);
	if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
	selectCliMarket(marketDescriptor);
		const symbol = marketDescriptor.marketKey;
		const spread = match[4] ? parseNumber(match[4])! : 0.5;

		orderSide.set(side);
		orderSize.set(size);
		orderType.set('swarm');

		const result = await startAlgoOrder({
			marketKey: symbol,
			side,
			type: 'swarm',
			size,
			algo: { type: 'swarm', config: { swarmOrders: 8, swarmSpread: spread } }
		});
		if (!result.ok) return cmd(input, result.error ?? 'Swarm failed', 'error');
		return cmd(input, `Swarm ${side} ${size} ${symbol} @ ${spread}% spread (job ${result.jobId})`, 'success');
	}

	if (algo === 'iceberg') {
		const match = input.match(/^iceberg\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)\s+@\s+([\d.]+)(?:\s+([\d.]+))?$/i);
		if (!match) return cmd(input, 'Usage: iceberg buy|sell [total] [symbol] @ [price] [display]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
	const marketDescriptor = resolveCliMarket(match[3]);
	if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
	selectCliMarket(marketDescriptor);
		const symbol = marketDescriptor.marketKey;
		const price = parseNumber(match[4])!;
		const display = match[5] ? parseNumber(match[5])! : Math.max(size / 10, 0.01);

		orderSide.set(side);
		orderSize.set(size);
		orderPrice.set(price);
		orderType.set('iceberg');

		const result = await startAlgoOrder({
			marketKey: symbol,
			side,
			type: 'iceberg',
			size,
			price,
			algo: { type: 'iceberg', config: { icebergDisplaySize: display, icebergWaitForFill: true, icebergFillPollMs: 500 } }
		});
		if (!result.ok) return cmd(input, result.error ?? 'Iceberg failed', 'error');
		return cmd(input, `Iceberg ${side} ${size} ${symbol} @ ${price} (display ${display}, job ${result.jobId})`, 'success');
	}

	if (algo === 'oco') {
		const match = input.match(/^oco\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)\s+([\d.]+)\s+([\d.]+)$/i);
		if (!match) return cmd(input, 'Usage: oco buy|sell [size] [symbol] [take-profit] [stop-loss]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
	const marketDescriptor = resolveCliMarket(match[3]);
	if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
	selectCliMarket(marketDescriptor);
		const takeProfit = parseNumber(match[4])!;
		const stopLoss = parseNumber(match[5])!;
		const result = await startAlgoOrder({
			marketKey: marketDescriptor.marketKey,
			side,
			type: 'oco',
			size,
			takeProfit,
			stopLoss,
			algo: { type: 'oco', config: { takeProfit, stopLoss } }
		});
		if (!result.ok) return cmd(input, result.error ?? 'OCO failed', 'error');
		return cmd(input, `OCO ${side} ${size} ${marketDescriptor.marketKey} TP ${takeProfit} SL ${stopLoss} (job ${result.jobId})`, 'success');
	}

	if (algo === 'trailing_stop') {
		const match = input.match(/^trail(?:ing)?\s+(buy|sell|b|s)\s+([\d.]+)\s+([a-z0-9:@/_-]+)\s+([\d.]+)$/i);
		if (!match) return cmd(input, 'Usage: trail buy|sell [size] [symbol] [offset]', 'error');
		const side = parseSide(match[1])!;
		const size = parseNumber(match[2])!;
		const marketDescriptor = resolveCliMarket(match[3]);
		if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[3]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
		const offset = parseNumber(match[4])!;
		const result = await startAlgoOrder({
			marketKey: marketDescriptor.marketKey,
			side,
			type: 'trailing_stop',
			size,
			trailOffset: offset,
			algo: { type: 'trailing_stop', config: { trailOffset: offset } }
		});
		if (!result.ok) return cmd(input, result.error ?? 'Trailing stop failed', 'error');
		return cmd(input, `Trailing stop ${side} ${size} ${marketDescriptor.marketKey} offset ${offset} (job ${result.jobId})`, 'success');
	}

	if (algo !== 'ping_pong') {
		return cmd(input, `Unknown algo: ${algo}`, 'error');
	}

	const match = input.match(/^ping[_-]?pong\s+([\d.]+)\s+([a-z0-9:@/_-]+)(?:\s+([\d.]+)%?)?$/i);
	if (!match) return cmd(input, 'Usage: pingpong [size] [symbol] [range%]', 'error');
	const size = parseNumber(match[1])!;
	const marketDescriptor = resolveCliMarket(match[2]);
	if (!marketDescriptor) return cmd(input, `Unknown market identity: ${match[2]}. Use the exact market symbol or API coin shown in Markets.`, 'error');
	selectCliMarket(marketDescriptor);
	const symbol = marketDescriptor.marketKey;
	const range = match[3] ? parseNumber(match[3])! : 1;

	orderSize.set(size);
	orderType.set('ping_pong');

	const result = await startAlgoOrder({
			marketKey: symbol,
		side: 'buy',
		type: 'ping_pong',
		size,
		algo: { type: 'ping_pong', config: { pingPongRange: range, pingPongCycles: 5 } }
	});
	if (!result.ok) return cmd(input, result.error ?? 'Ping pong failed', 'error');
	return cmd(input, `Ping pong ${size} ${symbol} ±${range}% (job ${result.jobId})`, 'success');
}

async function handleCancel(input: string): Promise<CLICommand> {
	if (!input.match(/^cancel(\s+all)?$/i)) return cmd(input, 'Usage: cancel all', 'error');
	let orders = get(openOrders);
	if (orders.length === 0) {
		const refreshed = await fetchOpenOrders();
		if (!refreshed) return cmd(input, 'Account reconciliation is unresolved; cancel is paused', 'error');
		orders = get(openOrders);
	}
	if (orders.length === 0) return cmd(input, 'No open orders', 'info');
	let cancelled = 0;
	for (const order of orders) {
		const result = await cancelOrder(order.id, order.apiCoin ?? order.marketKey ?? '');
		if (result.ok) cancelled++;
	}
	const refreshed = await fetchOpenOrders();
	if (!refreshed) return cmd(input, 'Cancel accepted but account reconciliation is unresolved', 'error');
	return cmd(input, `Cancelled ${cancelled}/${orders.length} orders`, cancelled > 0 ? 'success' : 'error');
}

async function handlePositions(input: string): Promise<CLICommand> {
	const addr = await ensureAccount();
	if (addr) {
		const refreshed = await fetchPositions();
		if (!refreshed) return cmd(input, 'Account reconciliation is unresolved; positions are unavailable', 'error');
		const cliRefreshed = await refreshCliAccountSnapshot(addr);
		if (!cliRefreshed) return cmd(input, 'Account reconciliation is unresolved; positions are unavailable', 'error');
	}
	const pos = get(positions);
	if (pos.length === 0) return cmd(input, 'No open positions', 'info');
	const lines = pos.map(
		(p) =>
			`${p.market}: ${p.side === 'long' ? '+' : '-'}${p.size} @ ${p.entryPrice.toFixed(2)} (uPnL ${p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toFixed(2)})`
	);
	return cmd(input, lines.join(' | '), 'info');
}

async function handleBalance(input: string): Promise<CLICommand> {
	const addr = await ensureAccount();
	if (addr) {
		try {
			await refreshCliAccountSnapshot(addr);
		} catch {
			/* ignore */
		}
	}

	const bals = get(balances);
	if (bals.length === 0) return cmd(input, 'Connect a wallet to load balances', 'error');

	const lines = bals
		.filter((b) => b.total > 0)
		.map((b) => `${b.asset}: ${b.available.toFixed(4)} avail / ${b.total.toFixed(4)} total`);
	return cmd(input, lines.join(' | '), 'info');
}

export function splitCliChain(input: string): string[] | null {
	const steps = input.split(';').map((step) => step.trim());
	return steps.length > 0 && steps.every(Boolean) ? steps : null;
}

const MAX_REPEAT_COUNT = 10;

function parseRepeat(input: string): { count: number; command: string } | { error: string } | null {
	if (!/^repeat(?:\s|$)/i.test(input)) return null;
	const match = input.match(/^repeat\s+(\S+)\s+(.+)$/i);
	if (!match) return { error: 'Usage: repeat <1-10> <command>' };
	if (!/^\d+$/.test(match[1])) return { error: 'Repeat count must be a whole number from 1 to 10' };
	const count = Number(match[1]);
	if (count < 1 || count > MAX_REPEAT_COUNT) return { error: `Repeat count must be between 1 and ${MAX_REPEAT_COUNT}` };
	const command = match[2].trim();
	if (command.toLowerCase().startsWith('repeat')) return { error: 'Nested repeat commands are not allowed' };
	return { count, command };
}

async function runSingleCliCommand(input: string, alreadyExpanded = false): Promise<CLICommand> {
	const trimmed = input.trim();
	if (!trimmed) return cmd(input, '', 'info');

	const lower = trimmed.toLowerCase();
	const assignment = trimmed.match(/^(alias|set)\s+([a-z][a-z0-9_-]*)\s*=\s*(.+)$/i);
	if (assignment) {
		const kind = assignment[1].toLowerCase() === 'alias' ? 'aliases' : 'variables';
		const error = setCliPreference(kind, assignment[2], assignment[3]);
		return cmd(input, error ?? `${kind === 'aliases' ? 'Alias' : 'Variable'} ${assignment[2]} saved`, error ? 'error' : 'success');
	}
	const removal = trimmed.match(/^(unalias|unset)\s+([a-z][a-z0-9_-]*)$/i);
	if (removal) {
		const kind = removal[1].toLowerCase() === 'unalias' ? 'aliases' : 'variables';
		return cmd(input, deleteCliPreference(kind, removal[2]) ? `${removal[2]} removed` : `${removal[2]} is not defined`, 'info');
	}
	if (lower === 'aliases' || lower === 'vars') {
		const values = lower === 'aliases' ? loadCliPreferences().aliases : loadCliPreferences().variables;
		return cmd(input, Object.keys(values).length ? Object.entries(values).map(([key, value]) => `${key}=${value}`).join(' | ') : `No ${lower} defined`, 'info');
	}
	if (!alreadyExpanded) {
		const expanded = expandCliInput(trimmed);
		if ('error' in expanded) return cmd(input, expanded.error, 'error');
		if (expanded.value !== trimmed) return runSingleCliCommand(expanded.value, true);
	}

	const repeat = parseRepeat(trimmed);
	if (repeat) {
		if ('error' in repeat) return cmd(input, repeat.error, 'error');
		const results: CLICommand[] = [];
		for (let iteration = 1; iteration <= repeat.count; iteration += 1) {
			const result = await runSingleCliCommand(repeat.command);
			results.push(result);
			if (result.type === 'error') {
				return cmd(input, `${results.map((item, index) => `${index + 1}/${repeat.count} ${item.input}: ${item.output}`).join(' | ')}; stopped at iteration ${iteration}`, 'error');
			}
		}
		return cmd(input, results.map((item, index) => `${index + 1}/${repeat.count} ${item.input}: ${item.output}`).join(' | '), results.some((item) => item.type === 'success') ? 'success' : 'info');
	}

	if (lower === 'help' || lower === '?') {
		const advancedHelp = isAdvancedOrderCertified('twap') ? ' | twap | scale' : '';
		return cmd(
			input,
			`Commands: buy|sell [size] [symbol] @ [price|market]${advancedHelp} | cancel all | pos | balance | repeat <1-10> <command>`,
			'info'
		);
	}

	if (lower.startsWith('buy ') || lower.startsWith('b ')) return handleBuySell(trimmed, 'buy');
	if (lower.startsWith('sell ') || lower.startsWith('s ')) return handleBuySell(trimmed, 'sell');
	if (lower.startsWith('twap ')) return isAdvancedOrderCertified('twap') ? handleAlgo(trimmed, 'twap') : cmd(input, unavailableOrderTypeMessage('twap'), 'error');
	if (lower.startsWith('adaptive-twap ') || lower.startsWith('adaptive ')) return isAdvancedOrderCertified('adaptive_twap') ? handleAlgo(trimmed, 'adaptive_twap') : cmd(input, unavailableOrderTypeMessage('adaptive_twap'), 'error');
	if (lower.startsWith('vwap ')) return isAdvancedOrderCertified('vwap') ? handleAlgo(trimmed, 'vwap') : cmd(input, unavailableOrderTypeMessage('vwap'), 'error');
	if (lower.startsWith('pov ')) return isAdvancedOrderCertified('pov') ? handleAlgo(trimmed, 'pov') : cmd(input, unavailableOrderTypeMessage('pov'), 'error');
	if (lower.startsWith('breakeven ')) return isAdvancedOrderCertified('break_even') ? handleAlgo(trimmed, 'break_even') : cmd(input, unavailableOrderTypeMessage('break_even'), 'error');
	if (lower.startsWith('maker ')) return isAdvancedOrderCertified('maker') ? handleAlgo(trimmed, 'maker') : cmd(input, unavailableOrderTypeMessage('maker'), 'error');
	if (lower.startsWith('conditional-ladder ') || lower.startsWith('conditional_ladder ')) return isAdvancedOrderCertified('conditional_ladder') ? handleAlgo(trimmed, 'conditional_ladder') : cmd(input, unavailableOrderTypeMessage('conditional_ladder'), 'error');
	if (lower.startsWith('scale ')) return isAdvancedOrderCertified('scale') ? handleAlgo(trimmed, 'scale') : cmd(input, unavailableOrderTypeMessage('scale'), 'error');
	if (lower.startsWith('chase ')) return isAdvancedOrderCertified('chase') ? handleAlgo(trimmed, 'chase') : cmd(input, unavailableOrderTypeMessage('chase'), 'error');
	if (lower.startsWith('swarm ')) return isAdvancedOrderCertified('swarm') ? handleAlgo(trimmed, 'swarm') : cmd(input, unavailableOrderTypeMessage('swarm'), 'error');
	if (lower.startsWith('iceberg ')) return isAdvancedOrderCertified('iceberg') ? handleAlgo(trimmed, 'iceberg') : cmd(input, unavailableOrderTypeMessage('iceberg'), 'error');
	if (lower.startsWith('pingpong ') || lower.startsWith('ping-pong ')) return isAdvancedOrderCertified('ping_pong') ? handleAlgo(trimmed, 'ping_pong') : cmd(input, unavailableOrderTypeMessage('ping_pong'), 'error');
	if (lower.startsWith('oco ')) return isAdvancedOrderCertified('oco') ? handleAlgo(trimmed, 'oco') : cmd(input, unavailableOrderTypeMessage('oco'), 'error');
	if (lower.startsWith('trail ') || lower.startsWith('trailing ')) return isAdvancedOrderCertified('trailing_stop') ? handleAlgo(trimmed, 'trailing_stop') : cmd(input, unavailableOrderTypeMessage('trailing_stop'), 'error');
	if (lower.startsWith('cancel')) return handleCancel(trimmed);
	if (lower === 'pos' || lower === 'positions') return handlePositions(trimmed);
	if (lower === 'bal' || lower === 'balance') return handleBalance(trimmed);

	const first = lower.split(/\s+/)[0];
	if (SUPPORTED_ALGOS.has(first) && isAdvancedOrderCertified(first as Parameters<typeof isAdvancedOrderCertified>[0])) {
		return cmd(input, `${first} is supported — use full syntax (e.g. twap buy 1 BTC 30m). Type help.`, 'error');
	}

	return cmd(input, `Unknown command: ${first}. Type help.`, 'error');
}

export async function runCliCommand(input: string): Promise<CLICommand> {
	const steps = splitCliChain(input);
	if (!steps) return cmd(input, 'A command chain cannot contain an empty step', 'error');
	if (steps.length === 1) return runSingleCliCommand(steps[0]);
	const results: CLICommand[] = [];
	for (const step of steps) {
		const result = await runSingleCliCommand(step);
		results.push(result);
		if (result.type === 'error') {
			return cmd(input, `${results.map((item) => `${item.input}: ${item.output}`).join(' | ')}; stopped at step ${results.length}`, 'error');
		}
	}
	return cmd(input, results.map((item) => `${item.input}: ${item.output}`).join(' | '), results.some((item) => item.type === 'success') ? 'success' : 'info');
}
