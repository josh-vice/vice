import { describe, expect, test } from 'bun:test';
import { runCliCommand, splitCliChain } from './executor';

describe('US-012 CLI chain parser', () => {
	test('keeps ordered non-empty steps and rejects an ambiguous empty step', () => {
		expect(splitCliChain('pos; balance; help')).toEqual(['pos', 'balance', 'help']);
		expect(splitCliChain('pos;;balance')).toBeNull();
		expect(splitCliChain(';')).toBeNull();
	});

	test('stops later steps after the first executor failure', async () => {
		const result = await runCliCommand('not-a-command; help');
		expect(result.type).toBe('error');
		expect(result.output).toContain('stopped at step 1');
		expect(result.output).not.toContain('Commands:');
	});

	test('expands a saved alias on a single command without expanding it at save time', async () => {
		const saved = await runCliCommand('set size=0.1; alias probe=buy $size BTC-USD-PERP @ market');
		expect(saved.type).toBe('success');
		const result = await runCliCommand('probe');
		expect(result.type).toBe('error');
		expect(result.output).toContain('Unknown market identity');
	});

	test('repeats a bounded command through the existing command path', async () => {
		const result = await runCliCommand('repeat 2 help');
		expect(result.type).toBe('info');
		expect(result.output).toContain('1/2 help: Commands:');
		expect(result.output).toContain('2/2 help: Commands:');
	});

	test('rejects invalid and nested repeat forms before dispatch', async () => {
		for (const input of ['repeat 0 help', 'repeat 11 help', 'repeat two help', 'repeat 2 repeat 2 help']) {
			const result = await runCliCommand(input);
			expect(result.type).toBe('error');
		}
	});

	test('does not reserve longer command names for repeat', async () => {
		const result = await runCliCommand('repeatable');
		expect(result.output).toContain('Unknown command: repeatable');
	});

	test('stops a repeated command at the first failed iteration', async () => {
		const result = await runCliCommand('repeat 3 not-a-command');
		expect(result.type).toBe('error');
		expect(result.output).toContain('stopped at iteration 1');
		expect(result.output).not.toContain('2/3');
	});
});
