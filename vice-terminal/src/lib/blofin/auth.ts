/** Sign a BloFin REST request with the exchange's hex-then-Base64 format. */
export async function signBlofinRest(
	secret: string,
	requestPath: string,
	method: string,
	timestamp: string,
	nonce: string,
	body = ''
): Promise<string> {
	try {
		const prehash = `${requestPath}${method.toUpperCase()}${timestamp}${nonce}${body}`;
		const key = await globalThis.crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const raw = new Uint8Array(
			await globalThis.crypto.subtle.sign(
			'HMAC',
			key,
			new TextEncoder().encode(prehash)
			)
		);
		const hex = Array.from(raw, (byte) => byte.toString(16).padStart(2, '0')).join('');
		return btoa(hex);
	} catch {
		// Never relay Web Crypto errors because some runtimes include input details.
		throw new Error('BloFin REST signing failed');
	}
}


import type { CredentialInput } from '$lib/credentials/types';
import type { BlofinPrivateAuthenticator, BlofinPrivateTransport } from './private';

export type BlofinCredentialAccess = <T>(callback: (credentials: CredentialInput) => T | PromiseLike<T>) => Promise<T>;

export interface BlofinPrivateAuthenticatorOptions {
  now?: () => number;
  nonce?: (timestamp: string) => string;
}

/** Build the documented BloFin private login without retaining credential material. */
export function createBlofinPrivateAuthenticator(
  withCredentials: BlofinCredentialAccess,
  options: BlofinPrivateAuthenticatorOptions = {}
): BlofinPrivateAuthenticator {
  const now = options.now ?? (() => Date.now());
  const nonce = options.nonce ?? ((timestamp: string) => {
    const cryptoApi = globalThis.crypto as Crypto & { randomUUID?: () => string };
    return typeof cryptoApi?.randomUUID === 'function' ? cryptoApi.randomUUID() : timestamp;
  });
  return {
    async authenticate(transport) {
      try {
        await withCredentials(async ({ apiKey, secret, passphrase }) => {
          const timestamp = String(Math.trunc(now()));
          const requestNonce = nonce(timestamp);
          const sign = await signBlofinRest(secret, '/users/self/verify', 'GET', timestamp, requestNonce);
          transport.send(JSON.stringify({
            op: 'login',
            args: [{ apiKey, passphrase, timestamp, sign, nonce: requestNonce }]
          }));
        });
      } catch {
        throw new Error('BloFin private authentication failed');
      }
    }
  };
}

/** Browser-native transport boundary; no credential-bearing headers are added. */
export function createBlofinPrivateTransport(url: string): BlofinPrivateTransport {
  if (typeof WebSocket === 'undefined') throw new Error('BloFin private WebSocket is unavailable in this runtime');
  return new WebSocket(url) as unknown as BlofinPrivateTransport;
}
