import type { Market, OrderBook, Position, Order, Fill, Balance, OptionChain, OptionContract, Trade, Subaccount, ChartCandle } from './types';

// Utility functions
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(randomBetween(min, max));

// Generate realistic BTC price movement
const generatePriceHistory = (basePrice: number, count: number): ChartCandle[] => {
	const candles: ChartCandle[] = [];
	let price = basePrice * 0.85;
	const now = Date.now();

	for (let i = count; i > 0; i--) {
		const change = (Math.random() - 0.48) * price * 0.02;
		const open = price;
		const close = price + change;
		const high = Math.max(open, close) + Math.random() * price * 0.005;
		const low = Math.min(open, close) - Math.random() * price * 0.005;

		candles.push({
			time: Math.floor((now - i * 3600000) / 1000),
			open,
			high,
			low,
			close,
			volume: randomBetween(100, 1000)
		});

		price = close;
	}

	return candles;
};

// Markets data
export const perpMarkets: Market[] = [
	{ symbol: 'BTC-USD-PERP', name: 'Bitcoin Perp', type: 'perp', lastPrice: 67234.50, change24h: 1245.30, changePercent24h: 1.89, volume24h: 2847532100, openInterest: 1234567800, fundingRate: 0.0034, markPrice: 67238.20, indexPrice: 67230.00 },
	{ symbol: 'ETH-USD-PERP', name: 'Ethereum Perp', type: 'perp', lastPrice: 3456.78, change24h: -45.22, changePercent24h: -1.29, volume24h: 1523478900, openInterest: 567890100, fundingRate: -0.0012, markPrice: 3455.90, indexPrice: 3457.10 },
	{ symbol: 'SOL-USD-PERP', name: 'Solana Perp', type: 'perp', lastPrice: 142.35, change24h: 8.45, changePercent24h: 6.31, volume24h: 456789000, openInterest: 123456700, fundingRate: 0.0089, markPrice: 142.40, indexPrice: 142.30 },
	{ symbol: 'ARB-USD-PERP', name: 'Arbitrum Perp', type: 'perp', lastPrice: 1.234, change24h: 0.056, changePercent24h: 4.75, volume24h: 78945600, openInterest: 34567800, fundingRate: 0.0045, markPrice: 1.235, indexPrice: 1.233 },
	{ symbol: 'DOGE-USD-PERP', name: 'Dogecoin Perp', type: 'perp', lastPrice: 0.1234, change24h: -0.0034, changePercent24h: -2.68, volume24h: 234567800, openInterest: 56789000, fundingRate: -0.0023, markPrice: 0.1233, indexPrice: 0.1235 },
	{ symbol: 'AVAX-USD-PERP', name: 'Avalanche Perp', type: 'perp', lastPrice: 34.56, change24h: 1.23, changePercent24h: 3.69, volume24h: 123456700, openInterest: 45678900, fundingRate: 0.0056, markPrice: 34.58, indexPrice: 34.54 },
	{ symbol: 'LINK-USD-PERP', name: 'Chainlink Perp', type: 'perp', lastPrice: 14.78, change24h: -0.34, changePercent24h: -2.25, volume24h: 89012300, openInterest: 23456700, fundingRate: -0.0018, markPrice: 14.77, indexPrice: 14.79 },
	{ symbol: 'OP-USD-PERP', name: 'Optimism Perp', type: 'perp', lastPrice: 2.345, change24h: 0.123, changePercent24h: 5.53, volume24h: 67890100, openInterest: 12345600, fundingRate: 0.0067, markPrice: 2.347, indexPrice: 2.343 },
];

export const spotMarkets: Market[] = [
	{ symbol: 'BTC-USDT', name: 'Bitcoin', type: 'spot', lastPrice: 67234.50, change24h: 1245.30, changePercent24h: 1.89, volume24h: 1847532100 },
	{ symbol: 'ETH-USDT', name: 'Ethereum', type: 'spot', lastPrice: 3456.78, change24h: -45.22, changePercent24h: -1.29, volume24h: 923478900 },
	{ symbol: 'SOL-USDT', name: 'Solana', type: 'spot', lastPrice: 142.35, change24h: 8.45, changePercent24h: 6.31, volume24h: 256789000 },
];

// Generate option strikes around current BTC price
const btcSpot = 67234.50;
const generateStrikes = (spot: number): number[] => {
	const strikes: number[] = [];
	const step = 1000;
	for (let i = -10; i <= 10; i++) {
		strikes.push(Math.round(spot / step) * step + i * step);
	}
	return strikes;
};

// Generate expiry dates
const generateExpiries = (): string[] => {
	const expiries: string[] = [];
	const now = new Date();

	// Weekly expiries
	for (let i = 1; i <= 4; i++) {
		const date = new Date(now);
		date.setDate(date.getDate() + i * 7);
		expiries.push(date.toISOString().split('T')[0]);
	}

	// Monthly expiries
	for (let i = 1; i <= 3; i++) {
		const date = new Date(now);
		date.setMonth(date.getMonth() + i);
		date.setDate(1);
		// Find last Friday
		while (date.getDay() !== 5) {
			date.setDate(date.getDate() + 1);
		}
		const lastFriday = new Date(date);
		lastFriday.setDate(lastFriday.getDate() + 21);
		while (lastFriday.getMonth() !== date.getMonth()) {
			lastFriday.setDate(lastFriday.getDate() - 7);
		}
		expiries.push(lastFriday.toISOString().split('T')[0]);
	}

	return expiries.sort();
};

const btcStrikes = generateStrikes(btcSpot);
const optionExpiries = generateExpiries();

// Generate option contracts
const generateOptionContracts = (underlying: string, spot: number, strikes: number[], expiries: string[]): OptionContract[] => {
	const contracts: OptionContract[] = [];

	for (const expiry of expiries) {
		const daysToExpiry = Math.max(1, Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
		const timeToExpiry = daysToExpiry / 365;

		for (const strike of strikes) {
			for (const optionType of ['call', 'put'] as const) {
				const moneyness = optionType === 'call' ? spot / strike : strike / spot;
				const isITM = optionType === 'call' ? spot > strike : spot < strike;
				const isATM = Math.abs(spot - strike) < 500;

				// Simplified Black-Scholes approximation for demo
				const baseIV = 0.55 + (Math.abs(1 - moneyness) * 0.3);
				const iv = baseIV + randomBetween(-0.05, 0.05);

				const intrinsicValue = Math.max(0, optionType === 'call' ? spot - strike : strike - spot);
				const timeValue = spot * iv * Math.sqrt(timeToExpiry) * 0.4;
				const theoreticalPrice = intrinsicValue + timeValue * (isATM ? 1 : 0.7);

				// Greeks calculation (simplified)
				const d1 = (Math.log(spot / strike) + (0.05 + iv * iv / 2) * timeToExpiry) / (iv * Math.sqrt(timeToExpiry));
				const nd1 = 0.5 * (1 + Math.tanh(d1 * 0.7));

				const delta = optionType === 'call' ? nd1 : nd1 - 1;
				const gamma = Math.exp(-d1 * d1 / 2) / (spot * iv * Math.sqrt(timeToExpiry * 2 * Math.PI)) * 100;
				const theta = -spot * iv * Math.exp(-d1 * d1 / 2) / (2 * Math.sqrt(timeToExpiry * 2 * Math.PI)) / 365;
				const vega = spot * Math.sqrt(timeToExpiry) * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI) / 100;

				const spread = theoreticalPrice * randomBetween(0.02, 0.05);

				contracts.push({
					symbol: `${underlying}-${expiry}-${strike}-${optionType.toUpperCase()[0]}`,
					underlying,
					strike,
					expiry,
					expiryTimestamp: new Date(expiry).getTime(),
					optionType,
					bid: Math.max(0.01, theoreticalPrice - spread / 2),
					ask: theoreticalPrice + spread / 2,
					last: theoreticalPrice + randomBetween(-spread / 4, spread / 4),
					iv: iv * 100,
					volume: randomInt(10, 500),
					openInterest: randomInt(100, 5000),
					delta: Math.round(delta * 1000) / 1000,
					gamma: Math.round(gamma * 10000) / 10000,
					theta: Math.round(theta * 100) / 100,
					vega: Math.round(vega * 100) / 100,
					isITM,
					isATM
				});
			}
		}
	}

	return contracts;
};

export const btcOptionChain: OptionChain = {
	underlying: 'BTC',
	spotPrice: btcSpot,
	expiries: optionExpiries,
	strikes: btcStrikes,
	contracts: generateOptionContracts('BTC', btcSpot, btcStrikes, optionExpiries)
};

// Generate order book
export const generateOrderBook = (midPrice: number, levels: number = 15): OrderBook => {
	const bids: { price: number; size: number; total: number; isUserOrder?: boolean }[] = [];
	const asks: { price: number; size: number; total: number; isUserOrder?: boolean }[] = [];

	let bidTotal = 0;
	let askTotal = 0;

	for (let i = 0; i < levels; i++) {
		const bidPrice = midPrice - (i + 1) * randomBetween(0.5, 2);
		const askPrice = midPrice + (i + 1) * randomBetween(0.5, 2);
		const bidSize = randomBetween(0.1, 5);
		const askSize = randomBetween(0.1, 5);

		bidTotal += bidSize;
		askTotal += askSize;

		bids.push({
			price: Math.round(bidPrice * 100) / 100,
			size: Math.round(bidSize * 10000) / 10000,
			total: Math.round(bidTotal * 10000) / 10000,
			isUserOrder: i === 3 // Highlight user order
		});

		asks.push({
			price: Math.round(askPrice * 100) / 100,
			size: Math.round(askSize * 10000) / 10000,
			total: Math.round(askTotal * 10000) / 10000
		});
	}

	const spread = asks[0].price - bids[0].price;
	const spreadPercent = (spread / midPrice) * 100;

	return { bids, asks, spread: Math.round(spread * 100) / 100, spreadPercent: Math.round(spreadPercent * 1000) / 1000 };
};

// Recent trades
export const generateRecentTrades = (basePrice: number, count: number = 20): Trade[] => {
	const trades: Trade[] = [];
	const now = Date.now();

	for (let i = 0; i < count; i++) {
		trades.push({
			id: `trade-${i}`,
			price: basePrice + randomBetween(-50, 50),
			size: randomBetween(0.001, 2),
			side: Math.random() > 0.5 ? 'buy' : 'sell',
			timestamp: now - i * randomInt(1000, 5000)
		});
	}

	return trades;
};

// Positions
export const mockPositions: Position[] = [
	{
		id: 'pos-1',
		market: 'BTC-USD-PERP',
		side: 'long',
		size: 0.5,
		entryPrice: 65234.50,
		markPrice: 67234.50,
		liquidationPrice: 52187.60,
		unrealizedPnl: 1000.00,
		realizedPnl: 234.56,
		leverage: 10,
		margin: 3261.73
	},
	{
		id: 'pos-2',
		market: 'ETH-USD-PERP',
		side: 'short',
		size: 2.5,
		entryPrice: 3500.00,
		markPrice: 3456.78,
		liquidationPrice: 4375.00,
		unrealizedPnl: 108.05,
		realizedPnl: -45.23,
		leverage: 5,
		margin: 1728.39
	},
	{
		id: 'pos-3',
		market: 'BTC-28JUN24-70000-C',
		side: 'long',
		size: 5,
		entryPrice: 1234.56,
		markPrice: 1456.78,
		unrealizedPnl: 1111.10,
		realizedPnl: 0,
		delta: 0.45,
		gamma: 0.0012,
		theta: -45.67,
		vega: 123.45
	}
];

// Open orders
export const mockOrders: Order[] = [
	{
		id: 'ord-1',
		market: 'BTC-USD-PERP',
		side: 'buy',
		type: 'limit',
		price: 66500.00,
		size: 0.25,
		filled: 0,
		remaining: 0.25,
		status: 'open',
		reduceOnly: false,
		postOnly: true,
		timestamp: Date.now() - 3600000
	},
	{
		id: 'ord-2',
		market: 'BTC-USD-PERP',
		side: 'sell',
		type: 'stop_limit',
		price: 70000.00,
		triggerPrice: 69500.00,
		size: 0.5,
		filled: 0,
		remaining: 0.5,
		status: 'open',
		reduceOnly: true,
		postOnly: false,
		timestamp: Date.now() - 7200000
	},
	{
		id: 'ord-3',
		market: 'ETH-USD-PERP',
		side: 'buy',
		type: 'limit',
		price: 3400.00,
		size: 1.0,
		filled: 0.3,
		remaining: 0.7,
		status: 'partial',
		reduceOnly: false,
		postOnly: false,
		timestamp: Date.now() - 1800000
	}
];

// Fills
export const mockFills: Fill[] = [
	{ id: 'fill-1', orderId: 'ord-3', market: 'ETH-USD-PERP', side: 'buy', price: 3401.23, size: 0.3, fee: 0.68, timestamp: Date.now() - 1800000 },
	{ id: 'fill-2', orderId: 'ord-4', market: 'BTC-USD-PERP', side: 'buy', price: 65234.50, size: 0.5, fee: 6.52, timestamp: Date.now() - 86400000 },
	{ id: 'fill-3', orderId: 'ord-5', market: 'SOL-USD-PERP', side: 'sell', price: 138.90, size: 10, fee: 0.28, timestamp: Date.now() - 172800000 },
];

// Balances
export const mockBalances: Balance[] = [
	{ asset: 'USDT', total: 125678.90, available: 98765.43, inOrders: 26913.47, unrealizedPnl: 1108.05, equity: 126786.95 },
	{ asset: 'BTC', total: 1.234567, available: 0.734567, inOrders: 0.5, unrealizedPnl: 0.0149, equity: 1.249467 },
	{ asset: 'ETH', total: 15.678901, available: 13.178901, inOrders: 2.5, unrealizedPnl: 0.0313, equity: 15.710201 },
];

// Subaccounts
export const mockSubaccounts: Subaccount[] = [
	{ id: 'main', name: 'Main Account', avatar: '🎯', equity: 126786.95, marginUsed: 4990.12, marginFree: 121796.83, leverage: 2.5 },
	{ id: 'perps', name: 'Perps Only', avatar: '📈', equity: 45678.90, marginUsed: 12345.67, marginFree: 33333.23, leverage: 5.0 },
	{ id: 'options', name: 'Options Book', avatar: '🎰', equity: 78901.23, marginUsed: 5678.90, marginFree: 73222.33, leverage: 1.5 },
	{ id: 'degen', name: 'Degen Mode', avatar: '🔥', equity: 12345.67, marginUsed: 10000.00, marginFree: 2345.67, leverage: 20.0 },
];

// Chart data
export const btcChartData = generatePriceHistory(btcSpot, 500);

// Portfolio Greeks
export const mockPortfolioGreeks = {
	delta: 0.75,
	gamma: 0.0034,
	theta: -89.45,
	vega: 234.56,
	netDelta: 12500.00,
	netGamma: 228.90,
	netTheta: -89.45,
	netVega: 234.56
};

// Price formatter
export const formatPrice = (price: number, decimals: number = 2): string => {
	if (price >= 1000) {
		return price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
	}
	return price.toFixed(decimals);
};

// Size formatter
export const formatSize = (size: number): string => {
	if (size >= 1000000) return `${(size / 1000000).toFixed(2)}M`;
	if (size >= 1000) return `${(size / 1000).toFixed(2)}K`;
	return size.toFixed(4);
};

// Percentage formatter
export const formatPercent = (value: number): string => {
	const sign = value >= 0 ? '+' : '';
	return `${sign}${value.toFixed(2)}%`;
};

// Volume formatter
export const formatVolume = (volume: number): string => {
	if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
	if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
	if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
	return `$${volume.toFixed(2)}`;
};

// Time formatter
export const formatTime = (timestamp: number): string => {
	return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
};

// Date formatter
export const formatDate = (dateStr: string): string => {
	const date = new Date(dateStr);
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
	rank: number;
	username: string;
	accountNum: string;
	// live open-position stats
	openPnl: number;       // absolute USD
	openRoi: number;       // % ROI on open positions
	openPositions: number; // # of open positions
	openMarket: string;    // biggest open market
	// historical
	roi7d: number;
	roi30d: number;
	roiAll: number;
	pnl7d: number;
	pnl30d: number;
	pnlAll: number;
	volume30d: number;
	winRate: number;       // 0-100
	trades: number;
	badge?: 'whale' | 'algo' | 'degen' | 'pro';
}

const USERNAMES = [
	'CryptoWhale', 'NightRider', 'SatoshiGhost', 'AlgoKing', 'PerpPrince',
	'MoonMath', 'ChainSurfer', 'BitBaron', 'EthElite', 'SolSerpent',
	'DeltaForce', 'LiqHunter', 'GammaCrush', 'ThetaGang', 'VegaViper',
	'FundingFarm', 'OrdinalOrc', 'RektRecovery', 'NakedShort', 'VolArb',
	'BlockchainBob', 'CryptoCarla', 'DefiDave', 'HashHunter', 'KeyHolder',
];
const MARKETS = ['BTC-PERP', 'ETH-PERP', 'SOL-PERP', 'ARB-PERP', 'DOGE-PERP', 'AVAX-PERP'];
const BADGES: Array<LeaderboardEntry['badge']> = ['whale', 'algo', 'degen', 'pro', undefined, undefined, undefined];

function seededRand(seed: number) {
	let s = seed;
	return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

export function generateLeaderboard(): LeaderboardEntry[] {
	return USERNAMES.map((username, i) => {
		const r = seededRand(i * 137 + 42);
		const openRoi   = (r() * 180 - 20);                        // -20% to +160%
		const openPnl   = openRoi * (r() * 80000 + 5000) / 100;
		const roi7d     = (r() * 120 - 15);
		const roi30d    = roi7d  * (0.8 + r() * 0.8);
		const roiAll    = roi30d * (1.2 + r() * 3);
		const pnl7d     = roi7d  * (r() * 100000 + 10000) / 100;
		const pnl30d    = roi30d * (r() * 100000 + 10000) / 100;
		const pnlAll    = roiAll * (r() * 200000 + 20000) / 100;
		return {
			rank: i + 1,
			username,
			accountNum: `#${String(10000 + i * 317).padStart(5, '0')}`,
			openPnl,
			openRoi,
			openPositions: Math.floor(r() * 6) + 1,
			openMarket: MARKETS[Math.floor(r() * MARKETS.length)],
			roi7d, roi30d, roiAll,
			pnl7d, pnl30d, pnlAll,
			volume30d: r() * 50000000 + 500000,
			winRate: r() * 40 + 45,   // 45-85%
			trades: Math.floor(r() * 2000) + 50,
			badge: BADGES[Math.floor(r() * BADGES.length)],
		};
	});
}

export const leaderboardData = generateLeaderboard();
