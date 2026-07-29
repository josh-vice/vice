import { describe, expect, test } from 'bun:test';

const ticketSource = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();

describe('US-002 revenue consent surface', () => {
	test('does not submit referral assignment from the first click', () => {
		expect(ticketSource).toContain('Review optional referral');
		expect(ticketSource).toContain('Confirm and request');
		expect(ticketSource).toContain('requestConfiguredReferral(provider, $walletAddress)');
		expect(ticketSource).toContain('onclick={() => (referralConfirmOpen = true)}');
		expect(ticketSource).toContain('disabled={referralBusy} onclick={requestReferral}');
		expect(ticketSource).not.toContain('onclick={requestReferral}>Request and verify');
	});

	test('discloses eligibility and verification behavior before wallet mutation', () => {
		expect(ticketSource).toContain('Existing referrers are never overwritten');
		expect(ticketSource).toContain('A wallet confirmation is required');
		expect(ticketSource).toContain('verified afterward');
	});

	test('requires an explicit builder opt-in before requesting builder approval', async () => {
		const stores = await Bun.file(new URL('../stores.ts', import.meta.url)).text();
		expect(ticketSource).toContain('builderOptIn');
		expect(ticketSource).toContain('approveBuilder: builderOptIn');
		expect(stores).toContain('enableTrading(options: { approveBuilder?: boolean } = {})');
	});
});
