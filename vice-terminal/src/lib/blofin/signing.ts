import type { BlofinCredentials } from './vault';
import { assertBlofinSigningAllowed } from './guardrail';

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function hex(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function signBlofinRequest(
	secretKey: string,
	requestPath: string,
	method: string,
	timestamp: string,
	nonce: string,
	body = ''
): Promise<string> {
	if (!requestPath.startsWith('/') || !/^[A-Z]+$/.test(method) || !/^\d+$/.test(timestamp) || nonce.length === 0) {
		throw new Error('Invalid BloFin signing inputs');
	}
	const prehash = `${requestPath}${method}${timestamp}${nonce}${body}`;
	const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const digest = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(prehash)));
	return bytesToBase64(new TextEncoder().encode(hex(digest)));
}

/** Creates the private REST headers without logging or persisting secrets. */
export async function blofinAuthHeaders(
	credentials: BlofinCredentials,
	requestPath: string,
	method: string,
	body = '',
	now = Date.now(),
	nonce: string = crypto.randomUUID()
): Promise<Record<string, string>> {
	assertBlofinSigningAllowed(credentials, requestPath);
	const timestamp = String(now);
	return {
		'ACCESS-KEY': credentials.apiKey,
		'ACCESS-SIGN': await signBlofinRequest(credentials.secretKey, requestPath, method, timestamp, nonce, body),
		'ACCESS-TIMESTAMP': timestamp,
		'ACCESS-NONCE': nonce,
		'ACCESS-PASSPHRASE': credentials.passphrase,
		'Content-Type': 'application/json'
	};
}
