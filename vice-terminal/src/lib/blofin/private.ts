import { BLOFIN_DEMO_REST_URL, BLOFIN_REST_URL } from './public';
import { blofinAuthHeaders } from './signing';
import { assertBlofinSignedPathAllowed } from './guardrail';
import { blofinAccountRef, blofinKeyFingerprint, type BlofinCredentials, type BlofinEnvironment } from './vault';
import type { AccountRef } from '$lib/venue/identity';

const DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export interface BlofinBalanceSnapshot {
	currency: string;
	balance: string;
	available: string;
	frozen: string;
}

export interface BlofinPositionSnapshot {
	positionId: string;
	instId: string;
	positionSide: 'long' | 'short' | 'net';
	positions: string;
	availablePositions: string;
	averagePrice: string;
	markPrice: string;
	liquidationPrice: string;
	unrealizedPnl: string;
	leverage: string;
	updateTime: string;
}

export interface BlofinOpenOrderSnapshot {
	orderId: string;
	clientOrderId?: string;
	instId: string;
	side: 'buy' | 'sell';
	orderType: string;
	price: string;
	size: string;
	filledSize: string;
	reduceOnly: boolean;
	state: 'live' | 'partially_filled';
	updateTime: string;
}

export interface BlofinPrivateSnapshot {
	venue: 'blofin';
	environment: BlofinEnvironment;
	account: AccountRef;
	balances: BlofinBalanceSnapshot[];
	positions: BlofinPositionSnapshot[];
	openOrders: BlofinOpenOrderSnapshot[];
	fetchedAt: number;
}

type Envelope<T> = { code?: string; msg?: string; data?: T };
type Row = Record<string, unknown>;

function text(row: Row, field: string): string {
	const value = row[field];
	if (typeof value !== 'string' || value.length === 0) throw new Error(`BloFin private response is missing ${field}`);
	return value;
}

function decimal(row: Row, field: string): string {
	const value = text(row, field);
	if (!DECIMAL.test(value)) throw new Error(`BloFin private response has invalid ${field}`);
	return value;
}

function bool(row: Row, field: string): boolean {
	const value = row[field];
	if (value === true || value === 'true') return true;
	if (value === false || value === 'false') return false;
	throw new Error(`BloFin private response has invalid ${field}`);
}

async function get<T>(
	root: string,
	path: string,
	credentials: BlofinCredentials,
	fetcher: typeof fetch,
	now: number,
	nonce: string
): Promise<T> {
	assertBlofinSignedPathAllowed(path);
	const response = await fetcher(`${root}${path}`, { headers: await blofinAuthHeaders(credentials, path, 'GET', '', now, nonce) });
	if (!response.ok) throw new Error(`BloFin private API returned HTTP ${response.status}`);
	const envelope = await response.json() as Envelope<T>;
	if (envelope.code !== '0' || !envelope.data) throw new Error(`BloFin private API rejected the request: ${envelope.msg ?? envelope.code ?? 'unknown error'}`);
	return envelope.data;
}

/**
 * Read all account surfaces together. This does not retry or return a partial
 * projection: callers must keep the prior account stale until all three reads
 * validate, then replace it as one snapshot.
 */
export async function fetchBlofinPrivateSnapshot(
	credentials: BlofinCredentials,
	environment: BlofinEnvironment,
	options: { fetcher?: typeof fetch; now?: number; nonceFactory?: () => string; keyFingerprint?: string } = {}
): Promise<BlofinPrivateSnapshot> {
	const fetcher = options.fetcher ?? fetch;
	const now = options.now ?? Date.now();
	const nonceFactory = options.nonceFactory ?? (() => crypto.randomUUID());
	const account = blofinAccountRef(environment, options.keyFingerprint ?? await blofinKeyFingerprint(credentials.apiKey));
	const root = environment === 'demo' ? BLOFIN_DEMO_REST_URL : BLOFIN_REST_URL;
	const [balances, positions, orders] = await Promise.all([
		get<Row[]>(root, '/api/v1/asset/balances?accountType=futures', credentials, fetcher, now, nonceFactory()),
		get<Row[]>(root, '/api/v1/account/positions', credentials, fetcher, now, nonceFactory()),
		get<Row[]>(root, '/api/v1/trade/orders-pending', credentials, fetcher, now, nonceFactory())
	]);
	return {
		venue: 'blofin',
		environment,
		account,
		fetchedAt: now,
		balances: balances.map((row) => ({ currency: text(row, 'currency'), balance: decimal(row, 'balance'), available: decimal(row, 'available'), frozen: decimal(row, 'frozen') })),
		positions: positions.map((row) => {
			const positionSide = text(row, 'positionSide');
			if (positionSide !== 'long' && positionSide !== 'short' && positionSide !== 'net') throw new Error('BloFin private response has invalid positionSide');
			return { positionId: text(row, 'positionId'), instId: text(row, 'instId'), positionSide, positions: decimal(row, 'positions'), availablePositions: decimal(row, 'availablePositions'), averagePrice: decimal(row, 'averagePrice'), markPrice: decimal(row, 'markPrice'), liquidationPrice: decimal(row, 'liquidationPrice'), unrealizedPnl: decimal(row, 'unrealizedPnl'), leverage: decimal(row, 'leverage'), updateTime: decimal(row, 'updateTime') };
		}),
		openOrders: orders.map((row) => {
			const side = text(row, 'side');
			const state = text(row, 'state');
			if (side !== 'buy' && side !== 'sell') throw new Error('BloFin private response has invalid side');
			if (state !== 'live' && state !== 'partially_filled') throw new Error('BloFin private response has invalid order state');
			const clientOrderId = row.clientOrderId;
			if (clientOrderId !== undefined && typeof clientOrderId !== 'string') throw new Error('BloFin private response has invalid clientOrderId');
			return { orderId: text(row, 'orderId'), ...(clientOrderId ? { clientOrderId } : {}), instId: text(row, 'instId'), side, orderType: text(row, 'orderType'), price: decimal(row, 'price'), size: decimal(row, 'size'), filledSize: decimal(row, 'filledSize'), reduceOnly: bool(row, 'reduceOnly'), state, updateTime: decimal(row, 'updateTime') };
		})
	};
}
