export type BrowserLifecycleReason = 'online' | 'visible';

type BrowserEventTarget = {
	addEventListener(type: string, listener: () => void): void;
	removeEventListener(type: string, listener: () => void): void;
};

type BrowserDocument = BrowserEventTarget & { visibilityState?: string };

export type BrowserLifecycleOptions = {
	onResume: (reason: BrowserLifecycleReason) => void;
	onOffline?: () => void;
	onHidden?: () => void;
	windowTarget?: BrowserEventTarget | null;
	documentTarget?: BrowserDocument | null;
};

/** Whether the browser has not explicitly reported itself offline. */
export function isBrowserOnline(): boolean {
	return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/**
 * Bind the browser lifecycle signals that matter to live venue streams.
 *
 * Visibility changes do not tear down the stream: the resume edge rebuilds it
 * after a backgrounded tab, while offline suppresses retries until the online
 * edge arrives. Targets are injectable so the lifecycle is testable without a
 * browser and safe to import during SSR.
 */
export function bindBrowserLifecycle(options: BrowserLifecycleOptions): () => void {
	const browserWindow = options.windowTarget ?? (typeof window === 'undefined' ? null : (window as unknown as BrowserEventTarget));
	const browserDocument = options.documentTarget ?? (typeof document === 'undefined' ? null : (document as unknown as BrowserDocument));
	const bindings: Array<{ target: BrowserEventTarget; type: string; listener: () => void }> = [];

	const bind = (target: BrowserEventTarget | null, type: string, listener: () => void): void => {
		if (!target) return;
		target.addEventListener(type, listener);
		bindings.push({ target, type, listener });
	};

	bind(browserWindow, 'online', () => options.onResume('online'));
	bind(browserWindow, 'offline', () => options.onOffline?.());
	bind(browserDocument, 'visibilitychange', () => {
		if (browserDocument?.visibilityState === 'visible') options.onResume('visible');
		else options.onHidden?.();
	});

	return () => {
		for (const { target, type, listener } of bindings) target.removeEventListener(type, listener);
	};
}
