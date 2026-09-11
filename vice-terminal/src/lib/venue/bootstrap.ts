import { createBlofinAdapter, type BlofinAdapterOptions } from './blofinAdapter';
import { registerVenue, registeredVenues, venueAdapter } from './registry';
import type { VenueAdapter } from './adapter';

/** Register BloFin once; repeated calls reuse the existing guarded adapter. */
export function registerBlofinVenue(options: BlofinAdapterOptions = {}): VenueAdapter {
  const existing = registeredVenues().get('blofin');
  if (existing) return existing;
  registerVenue(createBlofinAdapter(options));
  return venueAdapter('blofin');
}

/** Alias used by application startup code. */
export const ensureBlofinVenue = registerBlofinVenue;
