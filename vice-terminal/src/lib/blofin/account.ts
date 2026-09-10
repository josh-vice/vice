import type { Balance, Fill, Order, Position } from '$lib/types';
import type { AccountSnapshot } from '$lib/venue/adapter';
import type { AccountRef } from '$lib/venue/identity';

export const BLOFIN_ACCOUNT_MAX_AGE_MS = 60_000;

export interface BlofinEnvelope<T> {
  code: string;
  msg: string;
  data: T;
}

export interface BlofinBalanceRecord {
  currency: string;
  balance: string;
  available: string;
  frozen: string;
  equity?: string;
  unrealizedPnl?: string;
}

export interface BlofinPositionRecord {
  instId: string;
  positionId: string;
  positionSide: string;
  positions: string;
  averageOpenPrice: string;
  markPrice: string;
  liquidationPrice?: string;
  unrealizedPnl: string;
  realizedPnl?: string;
  leverage?: string;
  margin?: string;
}

export interface BlofinOrderRecord {
  orderId: string;
  clientOrderId?: string;
  instId: string;
  side: string;
  orderType: string;
  price?: string;
  size: string;
  filledSize?: string;
  state: string;
  reduceOnly?: boolean | string;
  postOnly?: boolean | string;
  createTime?: string;
}

export interface BlofinFillRecord {
  tradeId: string;
  orderId: string;
  instId: string;
  side: string;
  price: string;
  size: string;
  fee?: string;
  ts: string;
}

export interface BlofinAccountInput {
  balances: BlofinEnvelope<BlofinBalanceRecord[]>;
  positions: BlofinEnvelope<BlofinPositionRecord[]>;
  orders: BlofinEnvelope<BlofinOrderRecord[]>;
  fills: BlofinEnvelope<BlofinFillRecord[]>;
  receivedAtMs: number;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`BloFin ${label} record is malformed`);
  return value as Record<string, unknown>;
}

function numeric(value: unknown, field: string, allowZero = true): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (!allowZero && value <= 0)) throw new Error(`BloFin ${field} is invalid`);
    return value;
  }
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`BloFin ${field} is invalid`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (!allowZero && parsed <= 0)) throw new Error(`BloFin ${field} is invalid`);
  return parsed;
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`BloFin ${field} is invalid`);
  return value.trim();
}

function booleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
}

function envelopeData<T>(value: unknown, label: string): T[] {
  const body = record(value, label);
  if (body.code !== '0') throw new Error(`BloFin ${label} response was not successful`);
  if (!Array.isArray(body.data)) throw new Error(`BloFin ${label} data must be an array`);
  return body.data as T[];
}

function side(value: unknown, field: string): 'buy' | 'sell' {
  const normalized = text(value, field).toLowerCase();
  if (normalized !== 'buy' && normalized !== 'sell') throw new Error(`BloFin ${field} is invalid`);
  return normalized;
}

function marketKey(instId: string): string {
  if (!/^[A-Z0-9]+-[A-Z0-9]+$/.test(instId)) throw new Error('BloFin instId is invalid');
  return `blofin:linearPerp:${instId}`;
}

function scopedId(account: AccountRef, kind: string, rawId: string): string {
  return `blofin:${account.accountKey}:${kind}:${rawId}`;
}

function orderStatus(value: unknown): Order['status'] {
  const normalized = text(value, 'order state').toLowerCase();
  if (normalized === 'live' || normalized === 'open') return 'open';
  if (normalized === 'partially_filled' || normalized === 'partial-filled' || normalized === 'partially-filled') return 'partial';
  if (normalized === 'filled') return 'filled';
  if (normalized === 'canceled' || normalized === 'cancelled') return 'cancelled';
  throw new Error('BloFin order state is unsupported');
}

function orderType(value: unknown): Order['type'] {
  const normalized = text(value, 'order type').toLowerCase();
  if (normalized === 'market') return 'market';
  if (normalized === 'limit' || normalized === 'post_only' || normalized === 'ioc' || normalized === 'fok') return 'limit';
  throw new Error('BloFin order type is unsupported');
}

function assertAccount(account: AccountRef): void {
  if (account.venue !== 'blofin' || !account.accountKey || !account.credentialRef) throw new Error('BloFin account identity is invalid');
}

function normalizeBalances(rows: BlofinBalanceRecord[]): Balance[] {
  return rows.map((raw) => {
    const row = record(raw, 'balance');
    const asset = text(row.currency, 'balance currency');
    const total = numeric(row.balance, 'balance total');
    const available = numeric(row.available, 'balance available');
    const inOrders = numeric(row.frozen, 'balance frozen');
    const unrealizedPnl = numeric(row.unrealizedPnl ?? '0', 'balance unrealized PnL');
    const equity = numeric(row.equity ?? row.balance, 'balance equity');
    return { asset, total, available, inOrders, unrealizedPnl, equity };
  });
}

function normalizePositions(rows: BlofinPositionRecord[], account: AccountRef): Position[] {
  return rows.map((raw) => {
    const row = record(raw, 'position');
    const positionSide = text(row.positionSide, 'position side').toLowerCase();
    if (positionSide !== 'net') throw new Error('BloFin hedge or multi-position records are unsupported');
    const instId = text(row.instId, 'position instId');
    const id = text(row.positionId, 'position ID');
    const rawSize = numeric(row.positions, 'position size');
    if (rawSize === 0) throw new Error('BloFin zero-size position is not a position');
    return {
      id: scopedId(account, 'position', id),
      market: instId,
      apiCoin: instId,
      marketKey: marketKey(instId),
      side: rawSize >= 0 ? 'long' : 'short',
      size: Math.abs(rawSize),
      entryPrice: numeric(row.averageOpenPrice, 'position entry price', false),
      markPrice: numeric(row.markPrice, 'position mark price', false),
      liquidationPrice: row.liquidationPrice === undefined ? undefined : numeric(row.liquidationPrice, 'position liquidation price', false),
      unrealizedPnl: numeric(row.unrealizedPnl, 'position unrealized PnL'),
      realizedPnl: numeric(row.realizedPnl ?? '0', 'position realized PnL'),
      leverage: row.leverage === undefined ? undefined : numeric(row.leverage, 'position leverage', false),
      margin: row.margin === undefined ? undefined : numeric(row.margin, 'position margin')
    };
  });
}

function normalizeOrders(rows: BlofinOrderRecord[], account: AccountRef, receivedAtMs: number): Order[] {
  return rows.map((raw) => {
    const row = record(raw, 'order');
    const rawId = text(row.orderId, 'order ID');
    const instId = text(row.instId, 'order instId');
    const size = numeric(row.size, 'order size', false);
    const filled = numeric(row.filledSize ?? '0', 'order filled size');
    if (filled > size) throw new Error('BloFin order filled size exceeds order size');
    return {
      id: scopedId(account, 'order', rawId),
      clientOrderId: row.clientOrderId === undefined ? undefined : text(row.clientOrderId, 'client order ID'),
      market: instId,
      apiCoin: instId,
      marketKey: marketKey(instId),
      side: side(row.side, 'order side'),
      type: orderType(row.orderType),
      price: row.price === undefined ? undefined : numeric(row.price, 'order price', false),
      size,
      filled,
      remaining: size - filled,
      status: orderStatus(row.state),
      reduceOnly: booleanValue(row.reduceOnly),
      postOnly: booleanValue(row.postOnly),
      timestamp: row.createTime === undefined ? receivedAtMs : numeric(row.createTime, 'order create time', false),
      pending: true
    };
  });
}

function normalizeFills(rows: BlofinFillRecord[], account: AccountRef): Fill[] {
  return rows.map((raw) => {
    const row = record(raw, 'fill');
    const tradeId = text(row.tradeId, 'trade ID');
    const orderId = text(row.orderId, 'fill order ID');
    const instId = text(row.instId, 'fill instId');
    return {
      id: scopedId(account, 'fill', tradeId),
      orderId: scopedId(account, 'order', orderId),
      market: instId,
      apiCoin: instId,
      marketKey: marketKey(instId),
      side: side(row.side, 'fill side'),
      price: numeric(row.price, 'fill price', false),
      size: numeric(row.size, 'fill size', false),
      fee: numeric(row.fee ?? '0', 'fill fee'),
      timestamp: numeric(row.ts, 'fill timestamp', false)
    };
  });
}

export function normalizeBlofinAccountSnapshot(input: BlofinAccountInput, account: AccountRef, nowMs = Date.now()): AccountSnapshot {
  assertAccount(account);
  if (!Number.isSafeInteger(input.receivedAtMs) || !Number.isSafeInteger(nowMs) || input.receivedAtMs > nowMs + 5_000 || nowMs - input.receivedAtMs > BLOFIN_ACCOUNT_MAX_AGE_MS) {
    throw new Error('BloFin account snapshot is stale');
  }
  const balances = normalizeBalances(envelopeData<BlofinBalanceRecord>(input.balances, 'balances'));
  const positions = normalizePositions(envelopeData<BlofinPositionRecord>(input.positions, 'positions'), account);
  const orders = normalizeOrders(envelopeData<BlofinOrderRecord>(input.orders, 'orders'), account, input.receivedAtMs);
  const fills = normalizeFills(envelopeData<BlofinFillRecord>(input.fills, 'fills'), account);
  return { account, orders, positions, fills, balances, receivedAtMs: input.receivedAtMs };
}
