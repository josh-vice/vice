import { describe, expect, test } from 'bun:test';

const ticketSource = await Bun.file(new URL('./OrderTicket.svelte', import.meta.url)).text();
const vaultSource = await Bun.file(new URL('../execution/agentVault.ts', import.meta.url)).text();
const storesSource = await Bun.file(new URL('../stores.ts', import.meta.url)).text();
const localExecutionSource = await Bun.file(new URL('../execution/localExecution.ts', import.meta.url)).text();

describe('OrderTicket secure-trading enablement surface', () => {
	test('renders an accessible, non-blanking enablement progress region', async () => {
		expect(ticketSource).toContain('data-testid="enablement-progress"');
		expect(ticketSource).toContain('role="status"');
		expect(ticketSource).toContain('aria-live="polite"');
		expect(ticketSource).toContain('aria-busy="true"');
		expect(ticketSource).toContain('data-testid="enablement-error"');
		expect(ticketSource).toContain('role="alert"');
		expect(ticketSource).not.toContain('data-testid="enablement-progress" data-testid="enablement-error"');
	});

	test('drives the enable button from the explicit state machine, not a bare spinner', async () => {
		expect(ticketSource).toContain('enablePhase.kind === \'step\'');
		expect(ticketSource).toContain('enablementProgressLabel(enablePhase.step)');
		expect(ticketSource).toContain('enablePhase.kind === \'error\'');
		expect(ticketSource).toContain('ENABLEMENT_ERROR_LABEL[enablePhase.error.kind]');
	});

	test('offers cancel while waiting for wallet approval and dismiss on any in-flight step', async () => {
		expect(ticketSource).toContain('enablementIsCancellable(enablePhase)');
		expect(ticketSource).toContain('onclick={dismissEnablement}>Cancel');
		expect(ticketSource).toContain('onclick={dismissEnablement}>Dismiss');
	});

	test('offers a safe retry with a bounded countdown for a rate-limited failure', async () => {
		expect(ticketSource).toContain('enablementIsRetryable(enablePhase)');
		expect(ticketSource).toContain('scheduleEnableRetry(phase.error.backoffMs)');
		expect(ticketSource).toContain('Retry in ${enableCountdown}s');
		expect(ticketSource).toContain('enableRetryAvailable');
	});
});

describe('enablement reporter threading (reload/recovery and duplicate prevention)', () => {
	test('threads the phase reporter from the ticket through stores into the certified boundary', async () => {
		expect(storesSource).toContain('onPhase?: EnablementReporter');
		expect(storesSource).toContain('localExecution.initialize(provider, address, options, report)');
		expect(localExecutionSource).toContain('unlockOrCreateAgent(provider, mainAddress, options, report)');
		expect(vaultSource).toContain('onPhase?: EnablementReporter');
	});

	test('reload/recovery decrypts an existing agent record instead of creating a new one', async () => {
		const unlockStart = vaultSource.indexOf('export async function unlockOrCreateAgent');
		const unlockBlock = vaultSource.slice(unlockStart);
		const recordBranchStart = unlockBlock.indexOf('if (record) {');
		const recordBranchEnd = unlockBlock.indexOf('} else {', recordBranchStart);
		expect(recordBranchStart).toBeGreaterThan(-1);
		const decryptPath = unlockBlock.slice(recordBranchStart, recordBranchEnd);
		expect(decryptPath).toContain('decryptPrivateKey(record, signature)');
		// The returning-device path must never re-request venue agent approval.
		expect(decryptPath).not.toContain('approveAgent');
	});

	test('agent approval happens only when creating a brand-new agent, so retry cannot duplicate it', async () => {
		const unlockStart = vaultSource.indexOf('export async function unlockOrCreateAgent');
		const elseStart = vaultSource.indexOf('} else {', unlockStart);
		const elseEnd = vaultSource.indexOf('writeRecord(record);', elseStart);
		const newAgentPath = vaultSource.slice(elseStart, elseEnd);
		expect(newAgentPath).toContain('approveAgent');
		// No approval can precede the record lookup, so a second unlock (retry or
		// reload) re-reads the persisted record and never re-mutates the venue.
		expect(vaultSource.indexOf('approveAgent')).toBeGreaterThan(vaultSource.indexOf('if (record) {'));
	});
});
