/**
 * Local support-bundle download.
 *
 * The ONLY way a bundle leaves this device is via this explicit user action —
 * a manual download the user attaches to a support ticket. There is no
 * automatic upload path. The file name embeds a schema-validated, bounded
 * label so a user can find it later.
 */
import { buildSupportBundle, stringifyBundle, type SupportBundle, type BuildMeta } from './bundle';
import { SUPPORT_BUNDLE_SCHEMA } from './schema';

/** Deterministic, human-greppable download file name. */
export function supportBundleFilename(): string {
	const stamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
	return `vice-support-schema${SUPPORT_BUNDLE_SCHEMA}-${stamp}.json`;
}

/**
 * Build + download a support bundle. Returns the bundle object so callers can
 * show a preview/confirm it was assembled. `browserInfo` is gathered from the
 * real browser when available. No network requests are made.
 */
export function downloadSupportBundle(meta?: BuildMeta, operatorNote?: string): SupportBundle {
	const browserInfo =
		typeof navigator !== 'undefined'
			? {
					userAgent: navigator.userAgent,
					platform: navigator.platform,
					language: navigator.language,
					screen: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : undefined,
					viewport:
						typeof window !== 'undefined' && window.visualViewport
							? `${Math.round(window.visualViewport.width)}x${Math.round(window.visualViewport.height)}`
							: undefined,
					online: typeof navigator !== 'undefined' ? navigator.onLine : undefined
				}
			: undefined;

	const bundle = buildSupportBundle(meta, browserInfo, operatorNote);
	if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
		return bundle;
	}

	const text = stringifyBundle(bundle);
	const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = supportBundleFilename();
	anchor.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
	return bundle;
}
