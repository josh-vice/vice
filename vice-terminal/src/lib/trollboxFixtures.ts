export type TrollboxLanguage = 'EN' | 'ZH' | 'RU';

export interface TrollboxXAccount {
	id: string;
	handle: string;
	name: string;
	avatar: string;
	avatarColor: string;
	category: 'news' | 'analyst' | 'onchain' | 'official';
	followed: boolean;
}

export interface TrollboxPositionBadge {
	symbol: string;
	side: 'Long' | 'Short';
	size: number;
	entry: number;
	pnl: number;
	pnlPct: number;
}

export interface TrollboxSeedMessage {
	type: 'chat' | 'liquidation' | 'system' | 'position';
	lang: TrollboxLanguage;
	user: string;
	handle: string | null;
	text: string;
	badge?: TrollboxPositionBadge;
}

export interface TrollboxPostTemplate {
	text: string;
	tags: string[];
	breaking?: boolean;
}

export const X_ACCOUNTS: TrollboxXAccount[] = [
	{ id: 'coindesk', handle: '@CoinDesk', name: 'CoinDesk', avatar: 'CD', avatarColor: '#1d9bf0', category: 'news', followed: true },
	{ id: 'theblock', handle: '@TheBlock__', name: 'The Block', avatar: 'TB', avatarColor: '#6366f1', category: 'news', followed: true },
	{ id: 'wublockchain', handle: '@WuBlockchain', name: 'Wu Blockchain', avatar: 'WB', avatarColor: '#f59e0b', category: 'news', followed: true },
	{ id: 'lookonchain', handle: '@lookonchain', name: 'Lookonchain', avatar: 'LC', avatarColor: '#22c55e', category: 'onchain', followed: true },
	{ id: 'spotonchain', handle: '@spotonchain', name: 'Spot On Chain', avatar: 'SC', avatarColor: '#06b6d4', category: 'onchain', followed: false },
	{ id: 'whalewatcher', handle: '@WhaleAlert', name: 'Whale Alert', avatar: 'WA', avatarColor: '#ef4444', category: 'onchain', followed: true },
	{ id: 'btcarchive', handle: '@DocumentingBTC', name: 'DocumentingBTC', avatar: 'DB', avatarColor: '#f97316', category: 'analyst', followed: false },
	{ id: 'michaelsaylor', handle: '@saylor', name: 'Michael Saylor', avatar: 'MS', avatarColor: '#3b82f6', category: 'official', followed: true },
	{ id: 'coinglass', handle: '@coinglass', name: 'Coinglass', avatar: 'CG', avatarColor: '#8b5cf6', category: 'onchain', followed: true },
	{ id: 'cryptoquant', handle: '@cryptoquant_com', name: 'CryptoQuant', avatar: 'CQ', avatarColor: '#10b981', category: 'analyst', followed: false }
];

export const POST_TEMPLATES: Record<string, TrollboxPostTemplate[]> = {
	coindesk: [
		{ text: "BlackRock's IBIT records $643M single-day inflow — largest since launch. Institutional demand accelerating into Q3.", tags: ['BTC', 'ETF'], breaking: true },
		{ text: 'SEC delays decision on spot Ethereum ETF options to November. Markets react with mild pullback.', tags: ['ETH', 'Regulation'] },
		{ text: 'MicroStrategy adds 11,931 BTC at average $65,883 per coin. Total holdings now 226,331 BTC.', tags: ['BTC', 'MSTR'] }
	],
	theblock: [
		{ text: 'Binance US volume down 78% YoY while offshore perp volume hits all-time highs. Decentralized perps eating CEX market share.', tags: ['DEX', 'Perps'] },
		{ text: 'Solana DEX volume flips Ethereum for 3rd consecutive week. $14.2B vs $11.8B in 7-day rolling window.', tags: ['SOL', 'DEX'] },
		{ text: 'Tether issues 1B USDT on Tron. Treasury replenishment or fresh capital entering crypto? Analysts divided.', tags: ['USDT', 'Stables'] }
	],
	wublockchain: [
		{ text: 'OKX whale desk reports coordinated long accumulation in BTC between $65k-$67k. Size: ~8,200 BTC.', tags: ['BTC', 'Whale'] },
		{ text: 'Major miner Foundry USA transferred 2,100 BTC to Coinbase Prime. Selling pressure may increase.', tags: ['BTC', 'Miners'] }
	],
	lookonchain: [
		{ text: 'A whale just withdrew 4,812 ETH ($16.9M) from Binance. Same wallet bought ETH at $1,890 in Jan 2023. Unrealized PnL: +$9.2M.', tags: ['ETH', 'Whale'] },
		{ text: 'Jump Trading moved 18,000 ETH to OKX in the last hour. Worth watching.', tags: ['ETH', 'Whale'], breaking: true },
		{ text: "Smart money address 0x3f2...9a1 opened 3,500 SOL long at $142. Same wallet 2x'd on previous SOL trades.", tags: ['SOL', 'Whale'] }
	],
	spotonchain: [
		{ text: 'Grayscale GBTC outflows slowing significantly — only $23M left last week vs $600M+ in Feb. Selling pressure nearly exhausted.', tags: ['BTC', 'ETF'] },
		{ text: 'On-chain data: BTC exchange reserves hit 5-year low of 2.3M BTC. Supply squeeze intensifying.', tags: ['BTC', 'Onchain'] }
	],
	whalewatcher: [
		{ text: '🚨 1,000 BTC ($67.2M) transferred from unknown wallet to Coinbase. #Bitcoin #Whale', tags: ['BTC'], breaking: true },
		{ text: '🚨 50,000,000 USDT transferred from Tether Treasury to Binance. #USDT', tags: ['USDT'] },
		{ text: '🚨 25,000 ETH ($87.5M) moved from Kraken to unknown wallet. #Ethereum', tags: ['ETH'] }
	],
	btcarchive: [
		{ text: 'Bitcoin has now been above its 2017 all-time high for 523 consecutive days. Every previous cycle ended in a new ATH.', tags: ['BTC'] },
		{ text: 'At current ETF inflow rates, the next 6 months will see more BTC absorbed by institutional vehicles than exists in all cold storage.', tags: ['BTC', 'ETF'] }
	],
	michaelsaylor: [
		{ text: 'Bitcoin is a swarm of cyber hornets serving the goddess of wisdom, feeding on the fire of truth.', tags: ['BTC'] },
		{ text: 'MicroStrategy has acquired an additional 11,931 Bitcoin. $MSTR.', tags: ['BTC', 'MSTR'], breaking: true }
	],
	coinglass: [
		{ text: 'BTC long/short ratio: 52.4% long / 47.6% short on Binance. Longs slightly dominant heading into weekly close.', tags: ['BTC', 'Data'] },
		{ text: 'Total crypto liquidations last 24h: $284M. Longs: $198M. Shorts: $86M. BTC accounts for 61% of longs liq.', tags: ['Liquidations'] },
		{ text: 'ETH funding rate flipped positive across all major exchanges. Perp premium suggests fresh long entries above $3,400.', tags: ['ETH', 'Funding'] }
	],
	cryptoquant: [
		{ text: 'BTC Spent Output Profit Ratio (SOPR) above 1.0 for 18 consecutive days. Historically precedes price consolidation.', tags: ['BTC', 'Onchain'] },
		{ text: 'Miner revenue hit $56M/day — highest since May 2021. Miner selling pressure remains low despite elevated prices.', tags: ['BTC', 'Miners'] }
	]
};

export const SEED_MESSAGES: TrollboxSeedMessage[] = [
	{ type: 'system', lang: 'EN', user: 'System', handle: null, text: 'Welcome to Vice Terminal trollbox. Play nice.' },
	{ type: 'chat', lang: 'EN', user: 'hodlgang', handle: 'H0DL', text: 'BTC looking strong here, HTF structure intact' },
	{ type: 'chat', lang: 'ZH', user: 'liang_88', handle: null, text: '比特币突破了关键阻力位，做多！' },
	{ type: 'liquidation', lang: 'EN', user: '__bot__', handle: null, text: 'LIQUIDATED | Long | ETH-PERP | $284,500 @ 3,521.40' },
	{ type: 'chat', lang: 'EN', user: 'scalper_x', handle: 'SCLP', text: 'that liq just swept the imbalance, nice entry zone now' },
	{ type: 'chat', lang: 'RU', user: 'cryptomir', handle: null, text: 'Рынок нестабилен, будьте осторожны с плечом' },
	{ type: 'position', lang: 'EN', user: 'whale_01', handle: 'WHALE', text: '', badge: { symbol: 'BTC-PERP', side: 'Long', size: 5.25, entry: 64800, pnl: 12540, pnlPct: 3.67 } },
	{ type: 'chat', lang: 'EN', user: 'degenmax', handle: 'DGEN', text: 'gm bears stay poor 🫡' },
	{ type: 'chat', lang: 'EN', user: 'anon_7734', handle: null, text: 'funding going negative, smart money loading shorts' },
	{ type: 'liquidation', lang: 'EN', user: '__bot__', handle: null, text: 'LIQUIDATED | Short | BTC-PERP | $1,204,000 @ 67,340.00' },
	{ type: 'chat', lang: 'EN', user: 'algo_pete', handle: 'ALGO', text: 'second big short liq in an hour. squeeze incoming?' }
];

export const BOT_CHATTER: Omit<TrollboxSeedMessage, 'type'>[] = [
	{ lang: 'EN', user: 'moon_bro', handle: 'MOON', text: 'never selling, simple as' },
	{ lang: 'EN', user: 'bearfud', handle: null, text: 'this rally is a dead cat, mark my words' },
	{ lang: 'ZH', user: 'wei_trade', handle: null, text: '目前成交量不足，可能是假突破' },
	{ lang: 'EN', user: 'scalper_x', handle: 'SCLP', text: 'stop hunt complete, bulls back in control' },
	{ lang: 'EN', user: 'anon_7734', handle: null, text: 'funding normalizing, feels like accumulation' },
	{ lang: 'RU', user: 'cryptomir', handle: null, text: 'покупаю просадки, долгосрок' },
	{ lang: 'EN', user: 'hodlgang', handle: 'H0DL', text: 'weekly close looking clean' },
	{ lang: 'EN', user: 'degenmax', handle: 'DGEN', text: '10x or zero, its that simple' },
	{ lang: 'EN', user: 'algo_pete', handle: 'ALGO', text: 'OI spiking again, vol about to rip' },
	{ lang: 'EN', user: 'whale_01', handle: 'WHALE', text: 'adding to my long here quietly' }
];

export const LIQ_TEMPLATES = [
	(sym: string, side: string, usd: string, px: string) => `LIQUIDATED | ${side} | ${sym} | $${usd} @ ${px}`
];
