import { describe, expect, test } from 'bun:test';
import { bindBrowserLifecycle } from './browserLifecycle';

class FakeTarget {
	private listeners = new Map<string, Set<() => void>>();
	visibilityState = 'hidden';

	addEventListener(type: string, listener: () => void): void {
		const listeners = this.listeners.get(type) ?? new Set<() => void>();
		listeners.add(listener);
		this.listeners.set(type, listeners);
	}

	removeEventListener(type: string, listener: () => void): void {
		this.listeners.get(type)?.delete(listener);
	}

	emit(type: string): void {
		for (const listener of this.listeners.get(type) ?? []) listener();
	}
}

describe('browser lifecycle stream recovery', () => {
	test('resumes on online and visible edges, marks offline, and unbinds cleanly', () => {
		const browserWindow = new FakeTarget();
		const browserDocument = new FakeTarget();
		const events: string[] = [];
		const unbind = bindBrowserLifecycle({
			windowTarget: browserWindow,
			documentTarget: browserDocument,
			onResume: (reason) => events.push(`resume:${reason}`),
			onOffline: () => events.push('offline'),
			onHidden: () => events.push('hidden')
		});

		browserWindow.emit('online');
		browserWindow.emit('offline');
		browserDocument.visibilityState = 'visible';
		browserDocument.emit('visibilitychange');
		browserDocument.visibilityState = 'hidden';
		browserDocument.emit('visibilitychange');
		expect(events).toEqual(['resume:online', 'offline', 'resume:visible', 'hidden']);

		unbind();
		browserWindow.emit('online');
		browserWindow.emit('offline');
		browserDocument.visibilityState = 'visible';
		browserDocument.emit('visibilitychange');
		expect(events).toHaveLength(4);
	});
});
