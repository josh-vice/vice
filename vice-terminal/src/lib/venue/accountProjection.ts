import type { Balance, Fill, Order, Position } from '$lib/types';
import type { AccountSnapshot } from './adapter';
import { assertAccountRef, type AccountRef } from './identity';

export interface VisibleAccountProjection {
  orders: Order[];
  positions: Position[];
  fills: Fill[];
  balances: Balance[];
}

export interface AccountProjectionSnapshot {
  readonly accountKey: string;
  readonly snapshot: AccountSnapshot;
}

function emptyVisible(): VisibleAccountProjection {
  return { orders: [], positions: [], fills: [], balances: [] };
}

function cloneVisible(snapshot: AccountSnapshot | undefined): VisibleAccountProjection {
  if (!snapshot) return emptyVisible();
  return {
    orders: snapshot.orders.map((row) => ({ ...row })),
    positions: snapshot.positions.map((row) => ({ ...row })),
    fills: snapshot.fills.map((row) => ({ ...row })),
    balances: snapshot.balances.map((row) => ({ ...row }))
  };
}

/**
 * Account state is keyed by the complete venue account identity.  The UI may
 * expose only one projection at a time, but a late response from another
 * account can never append into that projection.
 */
export class VenueAccountProjection {
  private readonly snapshotsByAccount = new Map<string, AccountSnapshot>();
  private activeAccountKey: string | null = null;

  commit(snapshot: AccountSnapshot): boolean {
    assertAccountRef(snapshot.account);
    if (!Number.isSafeInteger(snapshot.receivedAtMs) || snapshot.receivedAtMs < 0) {
      throw new Error('Account projection snapshot timestamp is invalid');
    }
    const key = snapshot.account.accountKey;
    const previous = this.snapshotsByAccount.get(key);
    if (previous && snapshot.receivedAtMs <= previous.receivedAtMs) return false;
    this.snapshotsByAccount.set(key, {
      ...snapshot,
      orders: [...snapshot.orders],
      positions: [...snapshot.positions],
      fills: [...snapshot.fills],
      balances: [...snapshot.balances]
    });
    return true;
  }

  setActive(account: AccountRef | string | null): void {
    if (account === null) {
      this.activeAccountKey = null;
      return;
    }
    const accountKey = typeof account === 'string' ? account : (assertAccountRef(account), account.accountKey);
    if (!this.snapshotsByAccount.has(accountKey)) throw new Error(`Account projection ${accountKey} is not available`);
    this.activeAccountKey = accountKey;
  }

  clear(accountKey?: string): void {
    if (accountKey === undefined) {
      this.snapshotsByAccount.clear();
      this.activeAccountKey = null;
      return;
    }
    this.snapshotsByAccount.delete(accountKey);
    if (this.activeAccountKey === accountKey) this.activeAccountKey = null;
  }

  visible(): VisibleAccountProjection {
    return cloneVisible(this.activeSnapshot());
  }

  active(): AccountSnapshot | null {
    const snapshot = this.activeSnapshot();
    return snapshot ? {
      ...snapshot,
      orders: [...snapshot.orders],
      positions: [...snapshot.positions],
      fills: [...snapshot.fills],
      balances: [...snapshot.balances]
    } : null;
  }

  get activeKey(): string | null {
    return this.activeAccountKey;
  }

  keys(): string[] {
    return [...this.snapshotsByAccount.keys()];
  }

  snapshots(): AccountProjectionSnapshot[] {
    return [...this.snapshotsByAccount].map(([accountKey, snapshot]) => ({
      accountKey,
      snapshot: {
        ...snapshot,
        orders: [...snapshot.orders],
        positions: [...snapshot.positions],
        fills: [...snapshot.fills],
        balances: [...snapshot.balances]
      }
    }));
  }

  private activeSnapshot(): AccountSnapshot | undefined {
    return this.activeAccountKey ? this.snapshotsByAccount.get(this.activeAccountKey) : undefined;
  }
}

export function createVenueAccountProjection(): VenueAccountProjection {
  return new VenueAccountProjection();
}
