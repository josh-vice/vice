const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function validateGatewayExposure({ host, allowPublic = false, origin = '' }) {
	if (LOOPBACK_HOSTS.has(host)) return;
	if (!allowPublic) throw new Error(`Gateway bind ${host} is not loopback; set VICE_ALLOW_PUBLIC_GATEWAY=true only for a controlled deployment`);
	if (!/^https:\/\//i.test(origin)) throw new Error('Public gateway exposure requires VICE_GATEWAY_ORIGIN=https://...');
}
