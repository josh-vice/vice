import type { MarketDescriptor, Order } from '$lib/types';
import type { ExecutionAck, NativeOrderIntent } from '$lib/execution/client';
import type { EventEnvelope, AccountRef } from './identity';
import type { AccountSnapshot, VenueAdapter, VenueEnvironment, VenueSessionRef } from './adapter';
import { BLOFIN_CAPABILITIES } from './capabilities';
import { normalizeBlofinAccountSnapshot, type BlofinAccountInput } from '$lib/blofin/account';
import { BLOFIN_ENVIRONMENTS, type BlofinEnvironment } from '$lib/blofin/environment';
import { loadBlofinMarkets, type BlofinFetcher, type BlofinMarket } from '$lib/blofin/markets';
import { startBlofinPublic, type BlofinPublicOptions, type BlofinWebSocketFactory } from '$lib/blofin/public';
import { startBlofinPrivate, type BlofinPrivateAuthenticator, type BlofinPrivateOptions, type BlofinPrivateTransport } from '$lib/blofin/private';
import { createBlofinExecution, type BlofinMutationRequest, type BlofinResponse, type BlofinReconcileResult } from '$lib/blofin/execution';
import { blofinRestRequest, type BlofinCredentialCallback, type BlofinRestResponse } from '$lib/blofin/rest';
import { createBlofinPrivateAuthenticator, createBlofinPrivateTransport } from '$lib/blofin/auth';

export const BLOFIN_BALANCE_PATH = '/api/v1/account/balance';
export const BLOFIN_POSITIONS_PATH = '/api/v1/account/positions?instType=SWAP';
export const BLOFIN_ORDERS_PENDING_PATH = '/api/v1/trade/orders-pending?instType=SWAP';
export const BLOFIN_FILLS_PATH = '/api/v1/trade/fills?instType=SWAP';
const BLOFIN_ORDERS_HISTORY_PATH = '/api/v1/trade/orders-history?instType=SWAP';

export interface BlofinAdapterRequest {
  environment: BlofinEnvironment;
  method: string;
  requestPath: string;
  body?: unknown;
  signal?: AbortSignal;
}

export type BlofinAdapterRequester = <T>(input: BlofinAdapterRequest) => Promise<BlofinRestResponse<T>>;
export type BlofinPrivateTransportFactory = (url: string) => BlofinPrivateTransport;

export interface BlofinAdapterOptions {
  fetcher?: BlofinFetcher;
  request?: BlofinAdapterRequester;
  credentials?: BlofinCredentialCallback;
  publicWebSocketFactory?: BlofinWebSocketFactory;
  privateTransportFactory?: BlofinPrivateTransportFactory;
  authenticator?: BlofinPrivateAuthenticator;
  now?: () => number;
  publicOptions?: Omit<BlofinPublicOptions, 'webSocketFactory' | 'now'>;
  privateOptions?: Omit<BlofinPrivateOptions, 'transportFactory' | 'authenticator' | 'fetchSnapshot' | 'now'>;
}

function blofinEnvironment(environment: VenueEnvironment): BlofinEnvironment {
  if (environment !== 'demo' && environment !== 'production') {
    throw new Error('BloFin adapter does not support the testnet environment');
  }
  return environment;
}

function decimalPlaces(value: string): number {
  const point = value.indexOf('.');
  return point < 0 ? 0 : value.length - point - 1;
}

function descriptorFromMarket(market: BlofinMarket, assetId: number): MarketDescriptor {
  return {
    marketKey: market.marketKey,
    apiCoin: market.apiCoin,
    assetId,
    kind: 'corePerp',
    dex: 'blofin',
    baseToken: market.baseToken,
    quoteToken: market.quoteToken,
    szDecimals: decimalPlaces(market.sizeIncrement),
    priceDecimals: decimalPlaces(market.priceIncrement),
    maxLeverage: market.maxLeverage,
    isDelisted: market.status !== 'live',
    symbol: market.symbol,
    name: market.name,
    type: 'perp',
    lastPrice: 0,
    change24h: 0,
    changePercent24h: 0,
    volume24h: 0,
    instrument: market.instrument,
    venueCategory: 'SWAP'
  };
}

function marketFromDescriptor(descriptor: MarketDescriptor): BlofinMarket {
  const instrument = descriptor.instrument;
  if (!instrument || instrument.venue !== 'blofin' || instrument.product !== 'linearPerp') {
    throw new Error('BloFin adapter requires a canonical linear-perpetual market');
  }
  const increment = instrument.pricePrecision.kind === 'fixedIncrement'
    ? instrument.pricePrecision.increment
    : instrument.priceIncrement ?? `0.${'0'.repeat(Math.max(0, descriptor.priceDecimals - 1))}1`;
  return {
    marketKey: descriptor.marketKey,
    apiCoin: descriptor.apiCoin,
    kind: 'linearPerp',
    type: 'perp',
    instId: instrument.venueSymbol,
    baseToken: instrument.baseAsset,
    quoteToken: instrument.quoteAsset,
    settlementToken: instrument.settlementAsset,
    contractMultiplier: instrument.contractMultiplier,
    priceIncrement: increment,
    sizeIncrement: instrument.sizeIncrement,
    maxLeverage: descriptor.maxLeverage ?? 1,
    status: descriptor.isDelisted ? 'suspended' : 'live',
    symbol: descriptor.symbol,
    name: descriptor.name,
    instrument
  };
}

function rows<T>(response: BlofinRestResponse<T>): T {
  if (response.code !== '0' || !Array.isArray(response.data)) throw new Error('BloFin account response was not successful');
  return response.data;
}

function accountKey(session: VenueSessionRef): string {
  if (!session.account || session.account.venue !== 'blofin') throw new Error('BloFin adapter requires a BloFin account session');
  return session.account.accountKey;
}

export function createBlofinAdapter(options: BlofinAdapterOptions = {}): VenueAdapter {
  const now = options.now ?? (() => Date.now());
  const privateTransportFactory = options.privateTransportFactory ?? createBlofinPrivateTransport;
  const defaultAuthenticator = options.authenticator ?? (options.credentials ? createBlofinPrivateAuthenticator(options.credentials, { now }) : undefined);
  const marketsByKey = new Map<string, BlofinMarket>();
  const snapshots = new Map<string, AccountSnapshot>();

  const request: BlofinAdapterRequester = options.request ?? (async <T>(input: BlofinAdapterRequest) => {
    if (!options.credentials) throw new Error('BloFin credentials are unavailable');
    return blofinRestRequest<T>({
      environment: input.environment,
      method: input.method,
      requestPath: input.requestPath,
      body: input.body,
      signal: input.signal,
      credentials: options.credentials
    });
  });

  const readSnapshot = async (session: VenueSessionRef, signal?: AbortSignal): Promise<AccountSnapshot> => {
    const environment = blofinEnvironment(session.environment);
    const account: AccountRef = session.account && session.account.venue === 'blofin' ? session.account : (() => { throw new Error('BloFin account identity is invalid'); })();
    const [balance, position, pendingOrders, fills] = await Promise.all([
      request<{ [key: string]: unknown }[]>({ environment, method: 'GET', requestPath: BLOFIN_BALANCE_PATH, signal }),
      request<{ [key: string]: unknown }[]>({ environment, method: 'GET', requestPath: BLOFIN_POSITIONS_PATH, signal }),
      request<{ [key: string]: unknown }[]>({ environment, method: 'GET', requestPath: BLOFIN_ORDERS_PENDING_PATH, signal }),
      request<{ [key: string]: unknown }[]>({ environment, method: 'GET', requestPath: BLOFIN_FILLS_PATH, signal })
    ]);
    const receivedAtMs = now();
    const snapshot = normalizeBlofinAccountSnapshot({
      balances: balance as unknown as BlofinAccountInput['balances'],
      positions: position as unknown as BlofinAccountInput['positions'],
      orders: pendingOrders as unknown as BlofinAccountInput['orders'],
      fills: fills as unknown as BlofinAccountInput['fills'],
      receivedAtMs
    }, account, receivedAtMs);
    snapshots.set(account.accountKey, snapshot);
    return snapshot;
  };

  const execution = createBlofinExecution({
    request: async (input: BlofinMutationRequest): Promise<BlofinResponse> => request({
      environment: blofinEnvironment(input.environment),
      method: input.method,
      requestPath: input.requestPath,
      body: input.body
    }),
    reconcile: async ({ instId, environment }): Promise<BlofinReconcileResult> => {
      const sessionEnvironment = blofinEnvironment(environment);
      const [pending, history, fills] = await Promise.all([
        request<{ [key: string]: unknown }[]>({ environment: sessionEnvironment, method: 'GET', requestPath: `${BLOFIN_ORDERS_PENDING_PATH}&instId=${encodeURIComponent(instId)}` }),
        request<{ [key: string]: unknown }[]>({ environment: sessionEnvironment, method: 'GET', requestPath: `${BLOFIN_ORDERS_HISTORY_PATH}&instId=${encodeURIComponent(instId)}` }),
        request<{ [key: string]: unknown }[]>({ environment: sessionEnvironment, method: 'GET', requestPath: `${BLOFIN_FILLS_PATH}&instId=${encodeURIComponent(instId)}` })
      ]);
      return { pending: rows(pending) as never, history: rows(history) as never, fills: rows(fills) as never };
    }
  });

  return {
    id: 'blofin',
    capabilities: BLOFIN_CAPABILITIES,
    async loadMarkets(environment, signal) {
      blofinEnvironment(environment);
      const markets = await loadBlofinMarkets({ fetcher: options.fetcher, signal });
      markets.forEach((market) => marketsByKey.set(market.marketKey, market));
      return markets.map((market, index) => descriptorFromMarket(market, index));
    },
    async startPublic(session, market, emit): Promise<() => void> {
      const raw = marketsByKey.get(market.marketKey) ?? marketFromDescriptor(market);
      const publicOptions = options.publicOptions ?? {};
      return startBlofinPublic(session, raw, {
        onBook: emit,
        onTrade: emit,
        onTicker: emit,
        onCandle: emit,
        onError: () => undefined
      }, {
        ...publicOptions,
        webSocketFactory: options.publicWebSocketFactory,
        now
      });
    },
    async readAccount(session, signal) {
      return readSnapshot(session, signal);
    },
    async startPrivate(session, refresh): Promise<() => void> {
      const environment = blofinEnvironment(session.environment);
      const transportFactory = privateTransportFactory;
      const authenticator = defaultAuthenticator;
      if (!transportFactory || !authenticator) throw new Error('BloFin private transport is not configured');
      const key = accountKey(session);
      const privateOptions = options.privateOptions ?? {};
      return startBlofinPrivate(session, {
        ...privateOptions,
        transportFactory,
        authenticator,
        now,
        fetchSnapshot: async (signal) => {
          await refresh();
          const cached = snapshots.get(key);
          return cached ?? readSnapshot(session, signal);
        },
        onSnapshot: () => undefined
      });
    },
    place(session, market, intent): Promise<ExecutionAck> {
      return execution.place(session, marketFromDescriptor(market), intent as NativeOrderIntent & Record<string, unknown>);
    },
    cancel(session, market, orderId): Promise<ExecutionAck> {
      return execution.cancel(session, marketFromDescriptor(market), orderId);
    },
    amend(session, market, order: Order, price: number): Promise<ExecutionAck> {
      return execution.amend(session, marketFromDescriptor(market), order, price);
    }
  };
}
