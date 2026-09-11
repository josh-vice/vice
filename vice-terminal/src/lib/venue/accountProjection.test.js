import { describe, expect, test } from 'bun:test';
import { createVenueAccountProjection } from './accountProjection';

const accountA = {
  accountKey: 'blofin:demo:alpha', venue: 'blofin', credentialRef: 'cred-a', accountMode: 'futures:demo'
};
const accountB = {
  accountKey: 'hyperliquid:testnet:wallet', venue: 'hyperliquid', credentialRef: 'wallet', accountMode: 'wallet:testnet'
};

function snapshot(account, value) {
  return {
    account, orders: [{ id: `${value}-order` }], positions: [], fills: [],
    balances: [{ asset: 'USDT', total: value, available: value, inOrders: 0, unrealizedPnl: 0, equity: value }],
    receivedAtMs: 1700000000000 + value
  };
}

describe('venue account projection', () => {
  test('keeps snapshots keyed by account and exposes only the active account', () => {
    const projection = createVenueAccountProjection();
    projection.commit(snapshot(accountA, 1));
    projection.commit(snapshot(accountB, 2));
    expect(projection.keys()).toEqual([accountA.accountKey, accountB.accountKey]);
    expect(projection.visible()).toEqual({ orders: [], positions: [], fills: [], balances: [] });

    projection.setActive(accountA.accountKey);
    expect(projection.visible()).toMatchObject({ orders: [{ id: '1-order' }], balances: [{ total: 1 }] });
    projection.setActive(accountB.accountKey);
    expect(projection.visible()).toMatchObject({ orders: [{ id: '2-order' }], balances: [{ total: 2 }] });
  });

  test('rejects mismatched active account and clears old state atomically', () => {
    const projection = createVenueAccountProjection();
    projection.commit(snapshot(accountA, 1));
    projection.setActive(accountA.accountKey);
    expect(() => projection.setActive('blofin:demo:missing')).toThrow('not available');
    projection.clear();
    expect(projection.visible()).toEqual({ orders: [], positions: [], fills: [], balances: [] });
    expect(projection.keys()).toEqual([]);
  });

  test('returns defensive arrays and rejects duplicate or stale commits', () => {
    const projection = createVenueAccountProjection();
    projection.commit(snapshot(accountA, 3));
    expect(projection.commit(snapshot(accountA, 2))).toBe(false);
    expect(projection.commit(snapshot(accountA, 3))).toBe(false);
    projection.setActive(accountA.accountKey);
    const visible = projection.visible();
    visible.orders.push({ id: 'mutated' });
    expect(projection.visible().orders).toHaveLength(1);
  });
});
