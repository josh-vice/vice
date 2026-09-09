import type { VenueAdapter, VenueSessionRef } from './adapter';
import type { VenueId } from './identity';

const adapters = new Map<VenueId, VenueAdapter>();

function assertSessionIdentity(adapter: VenueAdapter, session: VenueSessionRef): void {
	if (session.venue !== adapter.id) {
		throw new Error(`Venue session venue ${session.venue} does not match adapter ${adapter.id}`);
	}
	if (session.account !== null && session.account.venue !== adapter.id) {
		throw new Error(`Venue session account venue ${session.account.venue} does not match adapter ${adapter.id}`);
	}
	if (!Number.isSafeInteger(session.generation) || session.generation < 0) {
		throw new Error('Venue session generation must be a non-negative safe integer');
	}
}

function assertProductionExecutionAllowed(adapter: VenueAdapter, session: VenueSessionRef): void {
	if (session.environment !== 'production') return;
	if (adapter.capabilities.certification === 'fundedCertified' || adapter.capabilities.certification === 'productionExposed') return;
	throw new Error(`Venue ${adapter.id} production execution is not certified (${adapter.capabilities.certification})`);
}

function registeredAdapter(adapter: VenueAdapter): VenueAdapter {
	return {
		...adapter,
		async loadMarkets(environment, signal) {
			return adapter.loadMarkets(environment, signal);
		},
		async startPublic(session, market, emit) {
			assertSessionIdentity(adapter, session);
			return adapter.startPublic(session, market, emit);
		},
		async readAccount(session, signal) {
			assertSessionIdentity(adapter, session);
			return adapter.readAccount(session, signal);
		},
		async startPrivate(session, refresh) {
			assertSessionIdentity(adapter, session);
			return adapter.startPrivate(session, refresh);
		},
		async place(session, market, intent) {
			assertSessionIdentity(adapter, session);
			assertProductionExecutionAllowed(adapter, session);
			return adapter.place(session, market, intent);
		},
		async cancel(session, market, orderId) {
			assertSessionIdentity(adapter, session);
			assertProductionExecutionAllowed(adapter, session);
			return adapter.cancel(session, market, orderId);
		},
		async amend(session, market, order, price) {
			assertSessionIdentity(adapter, session);
			assertProductionExecutionAllowed(adapter, session);
			return adapter.amend(session, market, order, price);
		}
	};
}

export function registerVenue(adapter: VenueAdapter): void {
	if (adapters.has(adapter.id)) throw new Error(`Venue ${adapter.id} is already registered`);
	if (adapter.capabilities.venue !== adapter.id) {
		throw new Error(`Venue adapter ${adapter.id} does not match its capabilities venue ${adapter.capabilities.venue}`);
	}
	adapters.set(adapter.id, registeredAdapter(adapter));
}

export function venueAdapter(id: VenueId): VenueAdapter {
	const adapter = adapters.get(id);
	if (!adapter) throw new Error(`No venue adapter registered for ${id}`);
	return adapter;
}

export function registeredVenues(): ReadonlyMap<VenueId, VenueAdapter> {
	return new Map(adapters);
}

/** Test-only registry isolation; production code should register adapters once. */
export function resetVenueRegistryForTests(): void {
	adapters.clear();
}
