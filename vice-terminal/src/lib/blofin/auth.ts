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
