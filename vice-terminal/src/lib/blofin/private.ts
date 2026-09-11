import type { AccountSnapshot, VenueSessionRef } from '$lib/venue/adapter';
import { normalizeBlofinAccountSnapshot, type BlofinAccountInput } from './account';
import { BLOFIN_ENVIRONMENTS } from './environment';

export const BLOFIN_PRIVATE_CHANNELS = ['orders', 'positions', 'account'] as const;
export type BlofinPrivateChannel = (typeof BLOFIN_PRIVATE_CHANNELS)[number];

export interface BlofinPrivateEvent {
  channel: BlofinPrivateChannel;
  arg: { channel: BlofinPrivateChannel };
  data: unknown[];
}

export interface BlofinPrivateTransport {
  readyState?: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface BlofinPrivateAuthenticator {
  authenticate(transport: BlofinPrivateTransport): void | Promise<void>;
}

export interface BlofinPrivateState {
  status: 'stale' | 'fresh' | 'error';
  stale: boolean;
  snapshot: AccountSnapshot | null;
}

export interface BlofinPrivateTimer {
  callback: () => void;
  delayMs: number;
  cleared?: boolean;
}

type TimerHandle = ReturnType<typeof setTimeout> | BlofinPrivateTimer;

export interface BlofinPrivateOptions {
  transportFactory: (url: string) => BlofinPrivateTransport;
  authenticator: BlofinPrivateAuthenticator;
  fetchSnapshot: (signal?: AbortSignal) => Promise<AccountSnapshot | BlofinAccountInput>;
  onSnapshot?: (snapshot: AccountSnapshot) => void;
  onStateChange?: (state: BlofinPrivateState) => void;
  onError?: (message: string) => void;
  now?: () => number;
  random?: () => number;
  baseReconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  reconnectJitterRatio?: number;
  maxReconnectAttempts?: number;
  setTimer?: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimer?: (timer: TimerHandle) => void;
}

const defaultSetTimer = (callback: () => void, delayMs: number): TimerHandle => setTimeout(callback, delayMs);
const defaultClearTimer = (timer: TimerHandle): void => clearTimeout(timer as ReturnType<typeof setTimeout>);

function plainObject(input: unknown): Record<string, unknown> | null {
  return typeof input === 'object' && input !== null && !Array.isArray(input) ? input as Record<string, unknown> : null;
}

function parseFrame(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

export function validateBlofinPrivateEvent(input: unknown): BlofinPrivateEvent | null {
  const record = plainObject(parseFrame(input));
  if (!record) return null;
  const arg = plainObject(record.arg);
  if (!arg || typeof arg.channel !== 'string' || !(BLOFIN_PRIVATE_CHANNELS as readonly string[]).includes(arg.channel)) return null;
  if (!Array.isArray(record.data)) return null;
  const channel = arg.channel as BlofinPrivateChannel;
  return { channel, arg: { channel }, data: record.data };
}

export function blofinReconnectDelay(
  attempt: number,
  input: { baseMs: number; capMs: number; jitterRatio?: number; random?: () => number }
): number {
  const safeAttempt = Number.isSafeInteger(attempt) && attempt > 0 ? attempt : 1;
  const baseMs = Number.isFinite(input.baseMs) && input.baseMs >= 0 ? input.baseMs : 0;
  const capMs = Number.isFinite(input.capMs) && input.capMs >= 0 ? input.capMs : baseMs;
  const jitterRatio = Number.isFinite(input.jitterRatio) && input.jitterRatio! >= 0 ? input.jitterRatio! : 0;
  const random = Math.min(1, Math.max(0, input.random?.() ?? Math.random()));
  const exponential = Math.min(capMs, baseMs * (2 ** (safeAttempt - 1)));
  return Math.min(capMs, Math.round(exponential * (1 + random * jitterRatio)));
}

export interface BlofinRefreshCoalescer {
  request(): Promise<void>;
  stop(): void;
}

export function createRefreshCoalescer(refresh: () => Promise<void>): BlofinRefreshCoalescer {
  let active: Promise<void> | null = null;
  let queued = false;
  let stopped = false;
  const waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

  const run = async (): Promise<void> => {
    let failure: unknown;
    do {
      queued = false;
      try {
        await refresh();
        failure = undefined;
      } catch (error) {
        failure = error;
      }
    } while (queued && !stopped);
    const settled = waiters.splice(0);
    active = null;
    for (const waiter of settled) {
      if (failure === undefined) waiter.resolve();
      else waiter.reject(failure);
    }
    if (failure !== undefined) throw failure;
  };

  return {
    request(): Promise<void> {
      if (stopped) return Promise.resolve();
      if (active) {
        queued = true;
        return new Promise<void>((resolve, reject) => waiters.push({ resolve, reject }));
      }
      active = run();
      return active;
    },
    stop(): void {
      stopped = true;
      queued = false;
      const settled = waiters.splice(0);
      for (const waiter of settled) waiter.resolve();
    }
  };
}

function safeError(onError: ((message: string) => void) | undefined, message: string): void {
  onError?.(message);
}

function subscribeMessage(): string {
  return JSON.stringify({
    op: 'subscribe',
    args: BLOFIN_PRIVATE_CHANNELS.map((channel) => ({ channel }))
  });
}

function unsubscribeMessage(): string {
  return JSON.stringify({
    op: 'unsubscribe',
    args: BLOFIN_PRIVATE_CHANNELS.map((channel) => ({ channel }))
  });
}

export async function startBlofinPrivate(
  session: VenueSessionRef,
  options: BlofinPrivateOptions
): Promise<() => void> {
  if (session.venue !== 'blofin' || !session.account || session.account.venue !== 'blofin') {
    throw new Error('BloFin private feed requires a BloFin account session');
  }
  const environment = session.environment === 'demo' || session.environment === 'production'
    ? session.environment
    : null;
  if (!environment) throw new Error('BloFin private feed does not support the testnet environment');
  if (typeof options.transportFactory !== 'function' || typeof options.authenticator?.authenticate !== 'function') {
    throw new Error('BloFin private feed transport and authenticator are required');
  }
  if (typeof options.fetchSnapshot !== 'function') throw new Error('BloFin private snapshot callback is required');

  const now = options.now ?? (() => Date.now());
  const setTimer = options.setTimer ?? defaultSetTimer;
  const clearTimer = options.clearTimer ?? defaultClearTimer;
  const controller = new AbortController();
  let socket: BlofinPrivateTransport | null = null;
  let timer: TimerHandle | null = null;
  let reconnectAttempt = 0;
  let stopped = false;
  let authenticatedSocket: BlofinPrivateTransport | null = null;
  let state: BlofinPrivateState = { status: 'stale', stale: true, snapshot: null };

  const publishState = (next: BlofinPrivateState): void => {
    state = next;
    options.onStateChange?.({ ...next });
  };

  const refresh = async (): Promise<void> => {
    if (stopped || controller.signal.aborted) return;
    publishState({ status: 'stale', stale: true, snapshot: state.snapshot });
    try {
      const raw = await options.fetchSnapshot(controller.signal);
      if (stopped || controller.signal.aborted) return;
      const snapshot = plainObject(raw)?.account
        ? raw as AccountSnapshot
        : normalizeBlofinAccountSnapshot(raw as BlofinAccountInput, session.account!, now());
      if (snapshot.account.accountKey !== session.account!.accountKey || snapshot.account.venue !== 'blofin') {
        throw new Error('identity');
      }
      publishState({ status: 'fresh', stale: false, snapshot });
      options.onSnapshot?.(snapshot);
    } catch {
      if (stopped || controller.signal.aborted) return;
      publishState({ status: 'error', stale: true, snapshot: state.snapshot });
      safeError(options.onError, 'BloFin private snapshot refresh failed');
    }
  };

  const coalescer = createRefreshCoalescer(refresh);

  const detach = (target: BlofinPrivateTransport | null): void => {
    if (!target) return;
    target.onopen = null;
    target.onmessage = null;
    target.onerror = null;
    target.onclose = null;
  };

  const scheduleReconnect = (): void => {
    if (stopped || timer || reconnectAttempt >= (options.maxReconnectAttempts ?? 8)) return;
    reconnectAttempt += 1;
    const delay = blofinReconnectDelay(reconnectAttempt, {
      baseMs: options.baseReconnectDelayMs ?? 250,
      capMs: options.maxReconnectDelayMs ?? 10_000,
      jitterRatio: options.reconnectJitterRatio ?? 0.2,
      random: options.random
    });
    timer = setTimer(() => {
      timer = null;
      connect();
    }, delay);
  };

  const connect = (): void => {
    if (stopped) return;
    let next: BlofinPrivateTransport;
    try {
      next = options.transportFactory(BLOFIN_ENVIRONMENTS[environment].privateWs);
    } catch {
      safeError(options.onError, 'BloFin private feed connection failed');
      scheduleReconnect();
      return;
    }
    socket = next;
    next.onopen = () => {
      if (stopped || socket !== next) return;
      try {
        void Promise.resolve(options.authenticator.authenticate(next)).then(() => {
          if (stopped || socket !== next) return;
          authenticatedSocket = next;
          next.send(subscribeMessage());
          reconnectAttempt = 0;
        }).catch(() => {
          safeError(options.onError, 'BloFin private feed authentication failed');
        });
      } catch {
        safeError(options.onError, 'BloFin private feed authentication failed');
      }
    };
    next.onmessage = (event) => {
      if (stopped || socket !== next) return;
      const frame = parseFrame(event?.data);
      const record = plainObject(frame);
      if (record?.event === 'error') {
        safeError(options.onError, 'BloFin private feed server error');
        return;
      }
      const validated = validateBlofinPrivateEvent(frame);
      if (!validated) {
        safeError(options.onError, 'BloFin private feed sent a malformed frame');
        return;
      }
      void coalescer.request().catch(() => undefined);
    };
    next.onerror = () => safeError(options.onError, 'BloFin private feed transport error');
    next.onclose = () => {
      if (stopped || socket !== next) return;
      authenticatedSocket = null;
      publishState({ status: 'stale', stale: true, snapshot: state.snapshot });
      scheduleReconnect();
    };
  };

  publishState(state);
  connect();

  return () => {
    if (stopped) return;
    stopped = true;
    controller.abort();
    coalescer.stop();
    if (timer) {
      clearTimer(timer);
      timer = null;
    }
    if (authenticatedSocket === socket && socket) {
      try { socket.send(unsubscribeMessage()); } catch { /* cleanup remains best-effort */ }
    }
    const target = socket;
    detach(target);
    authenticatedSocket = null;
    socket = null;
    try { target?.close(1000, 'Vice private feed stopped'); } catch { /* cleanup remains best-effort */ }
  };
}
