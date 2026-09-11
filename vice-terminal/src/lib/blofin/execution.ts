import type { MarketDescriptor, Order } from '$lib/types';
import type { ExecutionAck, NativeOrderIntent } from '$lib/execution/client';
import { BLOFIN_CAPABILITIES } from '$lib/venue/capabilities';
import type { VenueSessionRef } from '$lib/venue/adapter';
import type { AccountRef } from '$lib/venue/identity';
import type { BlofinMarket } from './markets';

export const BLOFIN_ORDER_PATH = '/api/v1/trade/order';
export const BLOFIN_CANCEL_ORDER_PATH = '/api/v1/trade/cancel-order';
export const BLOFIN_AMEND_ORDER_PATH = '/api/v1/trade/amend-order';

export interface BlofinOrderPayload {
  instId: string;
  marginMode: 'isolated' | 'cross';
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market' | 'post_only' | 'ioc';
  price?: string;
  size: string;
  clientOrderId?: string;
}

export interface BlofinMutationRequest {
  environment: VenueSessionRef['environment'];
  method: 'POST';
  requestPath: string;
  body: Record<string, string>;
}

export interface BlofinResponse {
  code?: string | number;
  msg?: string;
  data?: unknown;
}

export interface BlofinReconcileInput {
  environment: VenueSessionRef['environment'];
  clientOrderId: string;
  instId: string;
  scopes: readonly ['pending', 'history', 'fills'];
}

export interface BlofinReconcileRecord {
  orderId?: string | number;
  clientOrderId?: string;
  state?: string;
  tradeId?: string | number;
}

export interface BlofinReconcileResult {
  pending: BlofinReconcileRecord[];
  history: BlofinReconcileRecord[];
  fills: BlofinReconcileRecord[];
}

export interface BlofinExecutionRequest {
  request: (input: BlofinMutationRequest) => Promise<BlofinResponse>;
  reconcile?: (input: BlofinReconcileInput) => Promise<BlofinReconcileResult>;
  nowMs?: () => number;
  makeCommandId?: () => string;
}

export interface BlofinSession extends VenueSessionRef {
  readonly sessionId?: string;
}

export interface BlofinOrderRef {
  readonly orderId: string;
  readonly clientOrderId?: string;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function positiveNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`BloFin ${field} must be a positive finite number`);
  }
  return value;
}

function decimal(value: number, field: string): string {
  positiveNumber(value, field);
  const text = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) throw new Error(`BloFin ${field} has invalid precision`);
  return text;
}

function canonicalMarket(market: BlofinMarket | MarketDescriptor): BlofinMarket | MarketDescriptor {
  const instrument = market.instrument;
  if (!instrument || instrument.venue !== 'blofin' || instrument.product !== 'linearPerp') {
    throw new Error('BloFin market identity is not canonical');
  }
  if (market.marketKey !== instrument.instrumentKey || market.apiCoin !== instrument.venueSymbol) {
    throw new Error('BloFin market identity is not canonical');
  }
  if ('status' in market && market.status !== 'live') throw new Error('BloFin market must be live');
  return market;
}

function assertSession(session: BlofinSession): AccountRef {
  if (!session || session.venue !== 'blofin') throw new Error('BloFin session venue identity is invalid');
  if (!session.account || session.account.venue !== 'blofin') throw new Error('BloFin session account venue identity is invalid');
  if (!Number.isSafeInteger(session.generation) || session.generation < 0) throw new Error('BloFin session generation is invalid');
  if (session.environment === 'production' && BLOFIN_CAPABILITIES.certification === 'reviewOnly') {
    throw new Error('BloFin production execution is not certified (reviewOnly)');
  }
  return session.account;
}

function extras(intent: NativeOrderIntent): Record<string, unknown> {
  return intent as unknown as Record<string, unknown>;
}

/** Convert the local primitive intent into BloFin's documented order body. */
export function normalizeBlofinOrderIntent(
  market: BlofinMarket | MarketDescriptor,
  intent: NativeOrderIntent & Record<string, unknown>
): BlofinOrderPayload {
  const canonical = canonicalMarket(market);
  if (intent.coin !== canonical.apiCoin) throw new Error('BloFin order market identity does not match canonical instrument');
  const extra = extras(intent);
  if (extra.positionSide !== undefined || extra.hedgeMode === true) throw new Error('BloFin hedge mode is unsupported');
  if (extra.reduceOnly === true) throw new Error('BloFin reduce-only execution is unsupported in this adapter');
  if (extra.triggerPrice !== undefined || extra.triggerKind !== undefined) throw new Error('BloFin trigger orders are unsupported in this adapter');

  const requestedType = typeof extra.orderType === 'string' ? extra.orderType : 'limit';
  const tif = extra.tif;
  const advanced = new Set(['twap', 'native_twap', 'adaptive_twap', 'vwap', 'pov', 'scale', 'chase', 'swarm', 'iceberg', 'bracket', 'oco', 'ping_pong', 'trailing_stop', 'break_even', 'maker', 'conditional_ladder']);
  if (advanced.has(requestedType) || !['limit', 'market'].includes(requestedType)) throw new Error(`BloFin order type ${requestedType} is unsupported`);
  if (tif !== undefined && tif !== 'Alo' && tif !== 'Ioc' && tif !== 'Gtc') throw new Error('BloFin time-in-force is unsupported');
  if (requestedType === 'market' && tif !== undefined && tif !== 'Gtc') throw new Error('BloFin market order cannot use post-only or IOC override');

  const side = intent.isBuy ? 'buy' : 'sell';
  const payload: BlofinOrderPayload = {
    instId: canonical.apiCoin,
    marginMode: extra.marginMode === 'cross' ? 'cross' : 'isolated',
    side,
    orderType: requestedType === 'market' ? 'market' : tif === 'Alo' ? 'post_only' : tif === 'Ioc' ? 'ioc' : 'limit',
    size: decimal(intent.size, 'size')
  };
  if (payload.orderType !== 'market') payload.price = decimal(intent.limitPrice, 'limit price');
  const clientOrderId = extra.clientOrderId ?? intent.commandId;
  if (clientOrderId !== undefined) {
    if (typeof clientOrderId !== 'string' || clientOrderId.length < 1 || clientOrderId.length > 32 || !/^[A-Za-z0-9_.-]+$/.test(clientOrderId)) {
      throw new Error('BloFin client order ID is invalid');
    }
    payload.clientOrderId = clientOrderId;
  }
  return payload;
}

function responseOrderIds(response: BlofinResponse): string[] {
  const data = Array.isArray(response.data) ? response.data : [response.data];
  return data.flatMap((item) => {
    const row = record(item);
    const id = row.orderId ?? row.ordId;
    return id === undefined || id === null ? [] : [String(id)];
  });
}

function semanticMessage(input: unknown): string {
  const raw = input instanceof Error ? input.message : String(input ?? 'BloFin mutation failed');
  const value = raw.toLowerCase();
  if (value.includes('margin') || value.includes('insufficient') || value.includes('not enough')) return 'Insufficient available margin for this order.';
  if (value.includes('price') || value.includes('tick')) return 'Price does not match BloFin venue precision or bounds.';
  if (value.includes('size') || value.includes('minimum') || value.includes('lot')) return 'Size does not match BloFin venue minimum or precision.';
  if (value.includes('post') || value.includes('cross')) return 'Post-only order would cross the BloFin book.';
  if (value.includes('rate') || value.includes('429')) return 'BloFin rate limit reached; retry after backoff.';
  if (value.includes('unauthorized') || value.includes('signature') || value.includes('access')) return 'BloFin authorization failed.';
  if (value.includes('timeout') || value.includes('network') || value.includes('fetch') || value.includes('socket')) return 'BloFin transport failed; the outcome must be reconciled before retrying.';
  return 'BloFin mutation was rejected.';
}

function ackBase(session: BlofinSession, commandId: string, idempotencyKey: string, timestampMs: number): ExecutionAck {
  const timestampUs = timestampMs * 1000;
  return {
    commandId,
    sessionId: session.sessionId ?? `blofin:${session.environment}:${session.account?.accountKey ?? 'unknown'}:${session.generation}`,
    sessionSequence: session.generation,
    idempotencyKey,
    accepted: false,
    venueOrderIds: [],
    gatewayReceiveUs: timestampUs,
    venueSendUs: timestampUs,
    completedUs: timestampUs
  };
}

function clientIdFor(intent: NativeOrderIntent & Record<string, unknown>, fallback: string): string {
  const value = intent.clientOrderId ?? intent.commandId;
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function reconciliationIds(result: BlofinReconcileResult | null | undefined, clientOrderId: string): string[] {
  if (!result) return [];
  const ids = [...result.pending, ...result.history, ...result.fills]
    .filter((row) => row && row.clientOrderId === clientOrderId)
    .map((row) => row.orderId)
    .filter((id): id is string | number => id !== undefined && id !== null)
    .map(String);
  return [...new Set(ids)];
}

class BlofinExecutionClient {
  constructor(private readonly options: BlofinExecutionRequest) {}

  async place(session: BlofinSession, market: BlofinMarket | MarketDescriptor, intent: NativeOrderIntent & Record<string, unknown>): Promise<ExecutionAck> {
    assertSession(session);
    const payload = normalizeBlofinOrderIntent(market, intent);
    const fallbackCommandId = this.options.makeCommandId?.() ?? globalThis.crypto?.randomUUID?.() ?? `blofin-${Date.now()}`;
    const clientOrderId = clientIdFor(intent, fallbackCommandId);
    const commandId = typeof intent.commandId === 'string' && intent.commandId.length > 0 ? intent.commandId : clientOrderId;
    const receivedMs = this.options.nowMs?.() ?? Date.now();
    const ack = ackBase(session, commandId, clientOrderId, receivedMs);
    const request: BlofinMutationRequest = {
      environment: session.environment,
      method: 'POST',
      requestPath: BLOFIN_ORDER_PATH,
      body: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)]))
    };
    try {
      const response = await this.options.request(request);
      if (String(response.code) !== '0') return { ...ack, uncertain: false, reconciled: false, error: semanticMessage(response.msg) };
      return { ...ack, accepted: true, uncertain: false, venueOrderIds: responseOrderIds(response) };
    } catch (error) {
      if (!this.options.reconcile) return { ...ack, uncertain: true, error: semanticMessage(error) };
      let result: BlofinReconcileResult | null = null;
      try {
        result = await this.options.reconcile({ environment: session.environment, clientOrderId, instId: payload.instId, scopes: ['pending', 'history', 'fills'] });
      } catch {
        return { ...ack, uncertain: true, reconciled: false, error: 'BloFin mutation outcome is uncertain and reconciliation failed.' };
      }
      const ids = reconciliationIds(result, clientOrderId);
      if (ids.length > 0) return { ...ack, accepted: true, uncertain: false, reconciled: true, venueOrderIds: ids };
      return { ...ack, uncertain: true, reconciled: false, error: 'BloFin mutation outcome is uncertain; reconcile before retrying.' };
    }
  }

  async cancel(session: BlofinSession, market: BlofinMarket | MarketDescriptor, order: string | BlofinOrderRef): Promise<ExecutionAck> {
    assertSession(session);
    const canonical = canonicalMarket(market);
    const ref: BlofinOrderRef = typeof order === 'string' ? { orderId: order } : order;
    if (!ref.orderId || typeof ref.orderId !== 'string') throw new Error('BloFin cancel requires a venue order ID');
    const commandId = ref.clientOrderId ?? ref.orderId;
    const ack = ackBase(session, commandId, commandId, this.options.nowMs?.() ?? Date.now());
    const body: Record<string, string> = { instId: canonical.apiCoin, orderId: ref.orderId };
    if (ref.clientOrderId) body.clientOrderId = ref.clientOrderId;
    try {
      const response = await this.options.request({ environment: session.environment, method: 'POST', requestPath: BLOFIN_CANCEL_ORDER_PATH, body });
      if (String(response.code) !== '0') return { ...ack, uncertain: false, reconciled: false, error: semanticMessage(response.msg) };
      return { ...ack, accepted: true, uncertain: false, venueOrderIds: [ref.orderId] };
    } catch (error) {
      return { ...ack, uncertain: true, reconciled: false, venueOrderIds: [ref.orderId], error: semanticMessage(error) };
    }
  }

  async amend(session: BlofinSession, market: BlofinMarket | MarketDescriptor, order: BlofinOrderRef | Order | string, price: number): Promise<ExecutionAck> {
    assertSession(session);
    const canonical = canonicalMarket(market);
    const ref: BlofinOrderRef = typeof order === 'string'
      ? { orderId: order }
      : 'orderId' in order
        ? { orderId: order.orderId, clientOrderId: order.clientOrderId }
        : { orderId: order.id, clientOrderId: order.clientOrderId };
    if (!ref.orderId || typeof ref.orderId !== 'string') throw new Error('BloFin amend requires a venue order ID');
    const commandId = ref.clientOrderId ?? ref.orderId;
    const ack = ackBase(session, commandId, commandId, this.options.nowMs?.() ?? Date.now());
    const body: Record<string, string> = { instId: canonical.apiCoin, orderId: ref.orderId };
    if (ref.clientOrderId) body.clientOrderId = ref.clientOrderId;
    body.newPrice = decimal(price, 'amend price');
    try {
      const response = await this.options.request({ environment: session.environment, method: 'POST', requestPath: BLOFIN_AMEND_ORDER_PATH, body });
      if (String(response.code) !== '0') return { ...ack, uncertain: false, reconciled: false, error: semanticMessage(response.msg) };
      return { ...ack, accepted: true, uncertain: false, venueOrderIds: responseOrderIds(response).length > 0 ? responseOrderIds(response) : [ref.orderId] };
    } catch (error) {
      return { ...ack, uncertain: true, reconciled: false, venueOrderIds: [ref.orderId], error: semanticMessage(error) };
    }
  }
}

export type BlofinExecution = BlofinExecutionClient;

export function createBlofinExecution(options: BlofinExecutionRequest): BlofinExecution {
  return new BlofinExecutionClient(options);
}
