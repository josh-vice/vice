import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

export const BETA_COOKIE_NAME = 'vice_beta_session';
export const BETA_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

type InviteRecord = {
	id: string;
	code: string;
};

export type BetaIdentity = {
	id: string;
};

function configuredInvites(): InviteRecord[] {
	const raw = process.env.VICE_BETA_ACCESS_CODES?.trim() || process.env.VICE_BETA_ACCESS_CODE?.trim() || '';
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed)) {
			return parsed
				.map((entry: unknown, index: number) => {
					if (!entry || typeof entry !== 'object') return null;
					const value = entry as { id?: unknown; code?: unknown };
					if (typeof value.code !== 'string' || value.code.trim() === '') return null;
					return { id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : `tester-${index + 1}`, code: value.code.trim() };
				})
				.filter((entry): entry is InviteRecord => entry !== null);
		}
		if (parsed && typeof parsed === 'object') {
			return Object.entries(parsed as Record<string, unknown>)
				.filter(([, code]) => typeof code === 'string' && code.trim() !== '')
				.map(([id, code]) => ({ id: id.trim(), code: (code as string).trim() }))
				.filter((entry: InviteRecord) => entry.id !== '');
		}
	} catch {
		// Also accept a simple newline/comma-separated list for small deployments.
	}

	return raw
		.split(/[\n,]/)
		.map((entry: string) => entry.trim())
		.filter(Boolean)
		.map((entry: string, index: number) => {
			const separator = entry.indexOf('=');
			if (separator > 0) return { id: entry.slice(0, separator).trim(), code: entry.slice(separator + 1).trim() };
			return { id: `tester-${index + 1}`, code: entry };
		})
		.filter((entry: InviteRecord) => entry.id !== '' && entry.code !== '');
}

function sessionSecret(): string {
	return process.env.VICE_BETA_SESSION_SECRET?.trim() || '';
}

export function betaGateEnabled(): boolean {
	return configuredInvites().length > 0;
}

function digest(value: string): Buffer {
	return createHmac('sha256', sessionSecret()).update(value).digest();
}

function equalSecret(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}

function encodedIdentity(id: string): string {
	return Buffer.from(id, 'utf8').toString('base64url');
}

function decodedIdentity(value: string): string | null {
	try {
		const id = Buffer.from(value, 'base64url').toString('utf8');
		return id.trim() ? id : null;
	} catch {
		return null;
	}
}

function sessionSignature(id: string, expiresAt: number): string {
	return digest(`v1.${encodedIdentity(id)}.${expiresAt}`).toString('base64url');
}

export function verifyInviteCode(candidate: string): BetaIdentity | null {
	const code = candidate.trim();
	if (!code || !sessionSecret()) return null;
	const invite = configuredInvites().find((entry) => equalSecret(entry.code, code));
	return invite ? { id: invite.id } : null;
}

export function createSessionToken(identity: BetaIdentity, now = Date.now()): string {
	if (!sessionSecret()) throw new Error('VICE_BETA_SESSION_SECRET is required when beta access is enabled');
	const expiresAt = Math.floor(now / 1000) + BETA_SESSION_MAX_AGE;
	const payload = `v1.${encodedIdentity(identity.id)}.${expiresAt}`;
	return `${payload}.${sessionSignature(identity.id, expiresAt)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): BetaIdentity | null {
	if (!token || !sessionSecret()) return null;
	const parts = token.split('.');
	if (parts.length !== 4 || parts[0] !== 'v1') return null;
	const id = decodedIdentity(parts[1]);
	const expiresAt = Number(parts[2]);
	if (!id || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return null;
	const expected = sessionSignature(id, expiresAt);
	if (!equalSecret(expected, parts[3])) return null;
	return { id };
}

export function betaIdentity(cookies: Cookies): BetaIdentity | null {
	return verifySessionToken(cookies.get(BETA_COOKIE_NAME));
}

export function setBetaSession(cookies: Cookies, identity: BetaIdentity, secure: boolean): void {
	cookies.set(BETA_COOKIE_NAME, createSessionToken(identity), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: BETA_SESSION_MAX_AGE
	});
}

export function clearBetaSession(cookies: Cookies): void {
	cookies.delete(BETA_COOKIE_NAME, { path: '/' });
}

export function safeReturnTarget(url: URL): string {
	const ref = url.searchParams.get('ref');
	if (!ref) return '/';
	try {
		const candidate = new URL(ref, url.origin);
		if (candidate.origin !== url.origin || candidate.pathname === '/login') return '/';
		return `${candidate.pathname}${candidate.search}${candidate.hash}`;
	} catch {
		return '/';
	}
}

export function betaLoginRedirect(url: URL): string {
	return `/login?ref=${encodeURIComponent(url.origin + url.pathname + url.search)}`;
}
