import { afterEach, describe, expect, test } from 'bun:test';
import fixture from './fixtures/instruments.json';
import { normalizeBlofinInstruments } from './markets.ts';
import { startBlofinPublic } from './public.ts';

const market = normalizeBlofinInstruments(fixture)[0];
const session = { venue: 'blofin', environment: 'demo', account: null, generation: 1 };

class FakeSocket {
  readyState = 0;
  sent = [];
  closeCalls = [];
  onopen = null;
  onmessage = null;
  onerror = null;
  onclose = null;
  send(data) { this.sent.push(data); }
  close(code, reason) {
    this.closeCalls.push({ code, reason });
    this.readyState = 3;
  }
  open() { this.readyState = 1; this.onopen?.(); }
  message(data) { this.onmessage?.({ data }); }
  closeFromServer() { this.readyState = 3; this.onclose?.(); }
}

let sockets;
let timers;

function options() {
  sockets = [];
  timers = [];
  return {
    webSocketFactory: (url) => {
      const socket = new FakeSocket();
      socket.url = url;
      sockets.push(socket);
      return socket;
    },
    reconnectDelayMs: 0,
    now: () => 1700000000000,
    setTimer: (callback, delayMs) => {
      timers.push({ callback, delayMs });
      return timers[timers.length - 1];
    },
    clearTimer: (timer) => { timer.cleared = true; }
  };
}

afterEach(() => {
  sockets = [];
  timers = [];
});

describe('BloFin public WebSocket transport', () => {
  test('opens the allowlisted endpoint, subscribes once, replies to ping, and emits canonical books', async () => {
    const books = [];
    const errors = [];
    const cleanup = await startBlofinPublic(session, market, {
      onBook: (event) => books.push(event),
      onError: (message) => errors.push(message)
    }, options());
    const socket = sockets[0];
    expect(socket.url).toBe('wss://demo-trading-openapi.blofin.com/ws/public');

    socket.open();
    const subscribe = JSON.parse(socket.sent[0]);
    expect(subscribe).toEqual({
      op: 'subscribe',
      args: [
        { channel: 'books5', instId: 'BTC-USDT' },
        { channel: 'trades', instId: 'BTC-USDT' },
        { channel: 'tickers', instId: 'BTC-USDT' },
        { channel: 'candle1m', instId: 'BTC-USDT' }
      ]
    });
    socket.message('ping');
    expect(socket.sent[1]).toBe('pong');
    socket.message(JSON.stringify({
      arg: { channel: 'books5', instId: 'BTC-USDT' },
      data: [{ asks: [['1639.75', '392']], bids: [['1639.7', '6817']], ts: '1696670727520', seqId: '107600747', prevSeqId: '107600746' }]
    }));

    expect(errors).toEqual([]);
    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({
      venue: 'blofin',
      instrumentKey: 'blofin:linearPerp:BTC-USDT',
      connectionEpoch: 1,
      venueSequence: '107600747',
      receivedTimeUs: '1700000000000000'
    });
    cleanup();
    expect(socket.closeCalls[0].code).toBe(1000);
  });

  test('contains malformed frames and reports safe errors', async () => {
    const errors = [];
    const cleanup = await startBlofinPublic(session, market, { onError: (message) => errors.push(message) }, options());
    sockets[0].open();
    sockets[0].message('{not-json');
    sockets[0].message(JSON.stringify({ event: 'error', code: 'secret must not escape' }));
    expect(errors).toEqual(['BloFin public feed sent a malformed frame', 'BloFin public feed subscription error']);
    cleanup();
  });

  test('reconnects with a new epoch and stops reconnecting after cleanup', async () => {
    const books = [];
    const cleanup = await startBlofinPublic(session, market, { onBook: (event) => books.push(event) }, options());
    sockets[0].open();
    sockets[0].closeFromServer();
    expect(timers).toHaveLength(1);
    expect(timers[0].delayMs).toBe(0);
    timers[0].callback();
    expect(sockets).toHaveLength(2);
    sockets[1].open();
    sockets[1].message(JSON.stringify({
      arg: { channel: 'books5', instId: 'BTC-USDT' },
      data: [{ asks: [['1', '1']], bids: [['0.9', '1']], ts: '1696670727520', seqId: '2', prevSeqId: '1' }]
    }));
    expect(books[0].connectionEpoch).toBe(2);
    cleanup();
    sockets[1].onclose?.();
    expect(timers).toHaveLength(1);
  });

  test('rejects a Hyperliquid session or unsupported environment before opening a socket', async () => {
    await expect(startBlofinPublic({ ...session, venue: 'hyperliquid' }, market, {}, options())).rejects.toThrow('BloFin session');
    await expect(startBlofinPublic({ ...session, environment: 'testnet' }, market, {}, options())).rejects.toThrow('does not support environment');
    expect(sockets).toHaveLength(0);
  });
});
