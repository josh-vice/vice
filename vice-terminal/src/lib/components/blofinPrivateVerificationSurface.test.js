import { describe, expect, test } from 'bun:test';

const source = await Bun.file(new URL('./BlofinPrivateVerification.svelte', import.meta.url)).text();

describe('BloFin read-only private verification surface', () => {
	test('allows one explicit local verification without exposing a trading or private-stream control', () => {
		for (const token of ['verifyBlofinPrivateCredentials', 'Verify read-only access', 'Vice does not retain account values, open a private socket, or send an order.', 'No encrypted key stored for this environment', 'no values were retained']) expect(source).toContain(token);
		for (const forbidden of ['BlofinPrivateFeed', 'placeOrder', 'localExecution', 'fetchBlofinPrivateSnapshot']) expect(source).not.toContain(forbidden);
	});
});
