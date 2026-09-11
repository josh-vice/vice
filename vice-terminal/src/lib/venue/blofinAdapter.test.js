import { describe, expect, test } from 'bun:test';
import fixture from '$lib/blofin/fixtures/instruments.json';
import balances from '$lib/blofin/fixtures/balances.json';
import positions from '$lib/blofin/fixtures/positions.json';
import orders from '$lib/blofin/fixtures/orders-pending.json';
import fills from '$lib/blofin/fixtures/fills.json';
import { normalizeBlofinInstruments } from '$lib/blofin/markets';
import { BLOFIN_BALANCE_PATH, BLOFIN_FILLS_PATH, BLOFIN_ORDERS_PENDING_PATH, BLOFIN_POSITIONS_PATH, createBlofinAdapter } from './blofinAdapter';

const rawMarket = normalizeBlofinInstruments(fixture)[0];
const account = { accountKey: 'blofin:demo:adapter-account', venue: 'blofin', credentialRef: 'credential-ref', accountMode: 'futures:demo' };
const session = { venue: 'blofin', environment: 'demo', account, generation: 4 };

function response(path) {
  const data = path === BLOFIN_BALANCE_PATH ? balances.data : path === BLOFIN_POSITIONS_PATH ? positions.data : path === BLOFIN_ORDERS_PENDING_PATH ? orders.data : fills.data;
  return { code: '0', msg: 'success', data };
}

describe('BloFin venue adapter', () => {
  test('converts the public catalog to canonical descriptors', async () => {
    const adapter = createBlofinAdapter({ fetcher: async () => new Response(JSON.stringify(fixture), { status: 200 }) });
    const markets = await adapter.loadMarkets('demo', new AbortController().signal);
    expect(markets[0]).toMatchObject({ marketKey: 'blofin:linearPerp:BTC-USDT', apiCoin: 'BTC-USDT', kind: 'corePerp', type: 'perp' });
    expect(markets[0].instrument).toMatchObject({ venue: 'blofin', product: 'linearPerp', venueSymbol: 'BTC-USDT' });
  });

  test('hydrates all private reads into one account snapshot', async () => {
    const paths = [];
    const adapter = createBlofinAdapter({ request: async (input) => { paths.push(input.requestPath); return response(input.requestPath); }, now: () => 1700000005000 });
    const snapshot = await adapter.readAccount(session, new AbortController().signal);
    expect(paths.sort()).toEqual([BLOFIN_BALANCE_PATH, BLOFIN_FILLS_PATH, BLOFIN_ORDERS_PENDING_PATH, BLOFIN_POSITIONS_PATH].sort());
    expect(snapshot.account).toEqual(account);
    expect(snapshot.positions[0].apiCoin).toBe('BTC-USDT');
    expect(snapshot.orders[0].id).toContain(account.accountKey);
  });

  test('delegates basic mutation and rejects production review-only execution', async () => {
    const requests = [];
    const adapter = createBlofinAdapter({ request: async (input) => { requests.push(input); return { code: '0', msg: 'success', data: [{ orderId: 'venue-order-1' }] }; } });
    const ack = await adapter.place(session, rawMarket, { coin: 'BTC-USDT', isBuy: true, size: 0.1, limitPrice: 35000, commandId: 'cmd-1', clientOrderId: 'client-1' });
    expect(ack.accepted).toBe(true);
    expect(requests[0].requestPath).toBe('/api/v1/trade/order');
    expect(requests[0].body.clientOrderId).toBe('client-1');
    await expect(adapter.place({ ...session, environment: 'production' }, rawMarket, { coin: 'BTC-USDT', isBuy: true, size: 0.1, limitPrice: 35000 })).rejects.toThrow('not certified');
  });
});
