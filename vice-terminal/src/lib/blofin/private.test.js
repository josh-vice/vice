import { afterEach, describe, expect, test } from 'bun:test';
import balances from './fixtures/balances.json';
import fills from './fixtures/fills.json';
import orders from './fixtures/orders-pending.json';
import positions from './fixtures/positions.json';
import wsAccount from './fixtures/private-account.json';
import wsOrders from './fixtures/private-orders.json';
import wsPositions from './fixtures/private-positions.json';
import {
  blofinReconnectDelay,
  createRefreshCoalescer,
  startBlofinPrivate,
  validateBlofinPrivateEvent
} from './private.ts';

const NOW = 1_700_000_005_000;
const SECRET = 'private-secret-must-not-escape';
const ACCOUNT = {
  accountKey: 'blofin:demo:account-1',
  venue: 'blofin',
  credentialRef: 'credential-ref-redacted',
  accountMode: 'futures:demo'
};
const SESSION = { venue: 'blofin', environment: 'demo', account: ACCOUNT, generation: 1 };

class FakeTransport {
  readyState = 0;
  sent = [];
  closeCalls = [];
  onopen = null;
  onmessage = null;
  onerror = null;
  onclose = null;

  constructor(url) {
    this.url = url;
  }

  send(data) {
    this.sent.push(data);
  }

  close(code, reason) {
    this.closeCalls.push({ code, reason });
    this.readyState = 3;
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  message(data) {
    this.onmessage?.({ data });
  }

  closeFromServer() {
    this.readyState = 3;
    this.onclose?.();
  }
}

let sockets = [];
let timers = [];

function snapshotInput(receivedAtMs = NOW) {
  return { balances, positions, orders, fills, receivedAtMs };
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function testOptions(overrides = {}) {
  sockets = [];
  timers = [];
  const errors = overrides.errors ?? [];
  const authenticate = overrides.authenticate ?? ((transport) => {
    transport.send(JSON.stringify({ op: 'login', args: [{ apiKey: SECRET, passphrase: 'redacted', sign: SECRET }] }));
  });
  return {
    transportFactory: (url) => {
      const transport = new FakeTransport(url);
      sockets.push(transport);
      return transport;
    },
    authenticator: { authenticate },
    fetchSnapshot: overrides.fetchSnapshot ?? (() => Promise.resolve(snapshotInput())),
    onError: (message) => errors.push(message),
    now: () => NOW,
    random: () => 0,
    baseReconnectDelayMs: 100,
    maxReconnectDelayMs: 250,
    reconnectJitterRatio: 0.5,
    maxReconnectAttempts: 3,
    setTimer: (callback, delayMs) => {
      const timer = { callback, delayMs, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer: (timer) => {
      timer.cleared = true;
    },
    ...overrides
  };
}

afterEach(() => {
  sockets = [];
  timers = [];
});

describe('BloFin private feed helpers', () => {
  test('validates only the supported private channels and caps jittered backoff', () => {
    expect(validateBlofinPrivateEvent(wsOrders)).toMatchObject({ channel: 'orders' });
    expect(validateBlofinPrivateEvent(wsPositions)).toMatchObject({ channel: 'positions' });
    expect(validateBlofinPrivateEvent(wsAccount)).toMatchObject({ channel: 'account' });
    expect(validateBlofinPrivateEvent('{not-json')).toBeNull();
    expect(validateBlofinPrivateEvent({ arg: { channel: 'orders' }, data: 'not-an-array' })).toBeNull();
    expect(validateBlofinPrivateEvent({ arg: { channel: 'unknown' }, data: [] })).toBeNull();

    expect(blofinReconnectDelay(1, { baseMs: 100, capMs: 250, jitterRatio: 0.5, random: () => 0 })).toBe(100);
    expect(blofinReconnectDelay(1, { baseMs: 100, capMs: 250, jitterRatio: 0.5, random: () => 1 })).toBe(150);
    expect(blofinReconnectDelay(4, { baseMs: 100, capMs: 250, jitterRatio: 0.5, random: () => 1 })).toBe(250);
  });

  test('serializes refreshes while coalescing concurrent triggers', async () => {
    const gates = [];
    let calls = 0;
    const coalesced = createRefreshCoalescer(() => {
      calls += 1;
      const gate = {};
      gate.promise = new Promise((resolve) => { gate.resolve = resolve; });
      gates.push(gate);
      return gate.promise;
    });

    const first = coalesced.request();
    const second = coalesced.request();
    const third = coalesced.request();
    expect(calls).toBe(1);
    gates[0].resolve();
    await settle();
    expect(calls).toBe(2);
    gates[1].resolve();
    await Promise.all([first, second, third]);
    expect(calls).toBe(2);
    coalesced.stop();
  });
});

describe('BloFin private feed reconciliation', () => {
  test('contains malformed frames without starting a refresh or leaking error text', async () => {
    const errors = [];
    const snapshots = [];
    const cleanup = await startBlofinPrivate(SESSION, testOptions({
      errors,
      fetchSnapshot: async () => {
        snapshots.push(true);
        return snapshotInput();
      }
    }));
    const socket = sockets[0];
    socket.open();
    socket.message('{not-json');
    socket.message(JSON.stringify({ arg: { channel: 'orders' }, data: 'not-an-array' }));
    socket.message(JSON.stringify({ event: 'error', msg: SECRET, headers: 'ACCESS-KEY' }));
    await settle();

    expect(snapshots).toHaveLength(0);
    expect(errors).toEqual([
      'BloFin private feed sent a malformed frame',
      'BloFin private feed sent a malformed frame',
      'BloFin private feed server error'
    ]);
    expect(errors.join(' ')).not.toContain(SECRET);
    expect(errors.join(' ')).not.toContain('ACCESS-KEY');
    cleanup();
  });

  test('turns every private event into one serialized, coalesced REST snapshot refresh', async () => {
    const requests = [];
    const snapshots = [];
    const cleanup = await startBlofinPrivate(SESSION, testOptions({
      fetchSnapshot: () => {
        const gate = {};
        gate.promise = new Promise((resolve) => { gate.resolve = resolve; });
        requests.push(gate);
        return gate.promise;
      },
      onSnapshot: (snapshot) => snapshots.push(snapshot)
    }));
    const socket = sockets[0];
    socket.open();
    await settle();

    socket.message(JSON.stringify(wsOrders));
    socket.message(JSON.stringify(wsPositions));
    socket.message(JSON.stringify(wsAccount));
    expect(requests).toHaveLength(1);
    expect(snapshots).toHaveLength(0);

    requests[0].resolve(snapshotInput());
    await settle();
    expect(requests).toHaveLength(2);
    expect(snapshots).toHaveLength(1);

    requests[1].resolve(snapshotInput());
    await settle();
    expect(snapshots).toHaveLength(2);
    cleanup();
  });

  test('stays stale until a normalized snapshot succeeds', async () => {
    const states = [];
    let resolveSnapshot;
    const cleanup = await startBlofinPrivate(SESSION, testOptions({
      fetchSnapshot: () => new Promise((resolve) => { resolveSnapshot = resolve; }),
      onStateChange: (state) => states.push(state)
    }));
    const socket = sockets[0];
    expect(states[0]).toMatchObject({ status: 'stale', stale: true, snapshot: null });
    socket.open();
    socket.message(JSON.stringify(wsAccount));
    await settle();
    expect(states.at(-1)).toMatchObject({ status: 'stale', stale: true });

    resolveSnapshot(snapshotInput());
    await settle();
    expect(states.at(-1)).toMatchObject({ status: 'fresh', stale: false });
    expect(states.at(-1).snapshot.account).toEqual(ACCOUNT);
    cleanup();
  });

  test('reconnects with capped jitter and resubscribes after authentication', async () => {
    let authCalls = 0;
    const cleanup = await startBlofinPrivate(SESSION, testOptions({
      authenticator: {
        authenticate: (transport) => {
          authCalls += 1;
          transport.send(JSON.stringify({ op: 'login', args: [{ apiKey: SECRET }] }));
        }
      }
    }));
    sockets[0].open();
    await settle();
    const firstSubscribe = JSON.parse(sockets[0].sent.at(-1));
    expect(firstSubscribe).toEqual({
      op: 'subscribe',
      args: [{ channel: 'orders' }, { channel: 'positions' }, { channel: 'account' }]
    });

    sockets[0].closeFromServer();
    expect(timers).toHaveLength(1);
    expect(timers[0].delayMs).toBe(100);
    timers[0].callback();
    expect(sockets).toHaveLength(2);
    sockets[1].open();
    await settle();
    expect(authCalls).toBe(2);
    expect(JSON.parse(sockets[1].sent.at(-1))).toEqual(firstSubscribe);
    cleanup();
  });

  test('unsubscribes, detaches handlers, aborts refresh work, and never reconnects after cleanup', async () => {
    const cleanup = await startBlofinPrivate(SESSION, testOptions());
    const socket = sockets[0];
    socket.open();
    await settle();
    cleanup();

    expect(JSON.parse(socket.sent.at(-1))).toEqual({
      op: 'unsubscribe',
      args: [{ channel: 'orders' }, { channel: 'positions' }, { channel: 'account' }]
    });
    expect(socket.closeCalls[0]).toEqual({ code: 1000, reason: 'Vice private feed stopped' });
    expect(socket.onopen).toBeNull();
    expect(socket.onmessage).toBeNull();
    expect(socket.onerror).toBeNull();
    expect(socket.onclose).toBeNull();
    socket.closeFromServer();
    expect(timers).toHaveLength(0);
  });

  test('redacts authenticator and transport failures from observable errors', async () => {
    const errors = [];
    const cleanup = await startBlofinPrivate(SESSION, testOptions({
      errors,
      authenticate: () => {
        throw new Error(`headers ${SECRET} ACCESS-KEY`);
      }
    }));
    sockets[0].open();
    await settle();

    expect(errors).toEqual(['BloFin private feed authentication failed']);
    expect(errors.join(' ')).not.toContain(SECRET);
    expect(errors.join(' ')).not.toContain('ACCESS-KEY');
    cleanup();
  });
});
