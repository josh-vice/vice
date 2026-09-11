import { describe, expect, test } from 'bun:test';
import { registerBlofinVenue } from './bootstrap';
import { registeredVenues, resetVenueRegistryForTests } from './registry';

describe('venue bootstrap', () => {
  test('registers BloFin idempotently without a credential payload', () => {
    resetVenueRegistryForTests();
    const first = registerBlofinVenue();
    const second = registerBlofinVenue();
    expect(first).toBe(second);
    expect([...registeredVenues().keys()]).toEqual(['blofin']);
    resetVenueRegistryForTests();
  });
});
