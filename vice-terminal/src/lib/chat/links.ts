/**
 * Chat link detection for the local beta Pit.
 *
 * The Pit refuses plain peer messages, but command payloads still pass through
 * `ChatPolicy`, which rejects anything that carries a link. This module is the
 * link-detection boundary: it must catch http/https URLs, bare www domains,
 * bare domains with a real TLD, common shortened/chat services, and raw IP
 * addresses, while not flagging ordinary terminal text or abbreviations like
 * "e.g.".
 */

const URL_RE =
	/\bhttps?:\/\/[^\s<>"']+/gi;

const WWW_RE =
	/\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)*(?::\d+)?(?:[^\s<>"']*)?/gi;

// A curated set of shortened / chat / invite domains that are treated as links
// even though they are not full URLs or classic TLD domains.
const SHORT_SERVICES: Array<{ host: string; tld: string }> = [
	{ host: 't.me', tld: 'me' },
	{ host: 'discord.gg', tld: 'gg' },
	{ host: 'bit.ly', tld: 'ly' },
	{ host: 'goo.gl', tld: 'gl' },
	{ host: 'tinyurl.com', tld: 'com' },
	{ host: 'cutt.ly', tld: 'ly' },
	{ host: 'is.gd', tld: 'gd' }
];

const IP_RE =
	/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g;

const COMMON_TLDS = new Set([
	'com', 'org', 'net', 'io', 'xyz', 'me', 'gg', 'ly', 'gl', 'gd',
	'dev', 'app', 'ai', 'co', 'us', 'uk', 'ca', 'eu', 'info', 'biz',
	'tv', 'cc', 'link', 'pro', 'site', 'online', 'tech', 'store', 'media'
]);

function bareDomainRE(): RegExp {
	// A bare domain is a label chain ending in a known TLD, preceded by a word
	// boundary and not part of a longer word/email. Keep "e.g." from matching.
	const tld = [...COMMON_TLDS].sort((a, b) => b.length - a.length).join('|');
	return new RegExp(`\\b(?!\\d)(?:[a-z0-9-]+\\.)+(${tld})\\b`, 'ig');
}

/**
 * Extract the list of links found in `text` (for diagnostics). Empty when none.
 */
export function findLinks(text: string): string[] {
	const found = new Set<string>();
	for (const m of text.matchAll(URL_RE)) found.add(m[0]);
	for (const m of text.matchAll(WWW_RE)) found.add(m[0]);
	for (const m of text.matchAll(bareDomainRE())) found.add(m[0]);
	for (const m of text.matchAll(IP_RE)) found.add(m[0]);
	for (const { host } of SHORT_SERVICES) {
		if (new RegExp(`\\b${host.replace('.', '\\.')}`, 'i').test(text)) found.add(host);
	}
	return [...found];
}

/**
 * True if `text` contains any detectable link. Used by ChatPolicy to reject
 * link-carrying messages before anything is delivered.
 */
export function containsLink(text: string): boolean {
	return findLinks(text).length > 0;
}
