/**
 * hermes-sidecar — server.ts
 *
 * Loopback HTTP server for the Hermes desktop plugin. Bearer-token auth on
 * every /api route. The certified execution boundary is mounted behind these
 * routes: every handler in execution.ts delegates to src/lib modules; the
 * sidecar only adds transport (plan §2.2 invariant: no second execution path).
 *
 * Routes:
 *   GET  /health        liveness + config facts (no auth)
 *   GET  /api/state     snapshot of certified stores (auth)
 *   POST /api/refresh   re-run certified refresh functions (auth)
 *   POST /api/unlock    one-time-challenge unlock of the agent vault (auth)
 *   POST /api/lock      lock the agent vault (auth)
 *   POST /api/execute   market/limit/stop/bracket order via certified boundary
 *   POST /api/cancel    cancel one open order
 *   POST /api/modify    reprice one open order (certified modify boundary)
 *   POST /api/cancel-all  cancel-all plan over the open-order set
 *   POST /api/flatten   market-close all positions in scope
 *   POST /api/reverse   close + reopen a position (certified two-leg plan)
 *   POST /api/algo      501 — P3 advanced orders, intentionally fail-closed
 */
import { loadConfig, type SidecarConfig } from './config';
import { initializeMarketRegistry, refreshState, snapshot } from './state';
import {
	unlockVault,
	lockVault,
	isUnlocked,
	executeOrder,
	cancelOrder,
	modifyOrder,
	cancelAll,
	flatten,
	closePosition,
	reverse
} from './execution';

export interface SidecarServer {
	server: { port: number; stop: () => void };
	config: SidecarConfig;
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...extra }
	});
}

function unauthorized(): Response {
	return json({ error: 'unauthorized' }, 401, {
		'access-control-allow-headers': 'authorization, content-type'
	});
}

function tokenOk(config: SidecarConfig, request: Request): boolean {
	const header = request.headers.get('authorization') ?? '';
	const expected = `Bearer ${config.token}`;
	if (header.length !== expected.length) return false;
	let diff = 0;
	for (let i = 0; i < header.length; i += 1) {
		diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
	}
	return diff === 0;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
	try {
		return (await request.json()) as Record<string, unknown>;
	} catch {
		return {};
	}
}

export async function startServer(): Promise<SidecarServer> {
	const config = loadConfig();
	const started = Date.now();

	const server = Bun.serve({
		port: config.port,
		// Certified refresh (registry + account snapshot) exceeds Bun's 10s
		// default. Bun caps idleTimeout at 255 — long enough for a single
		// refresh request; the unlock path no longer blocks on the multi-
		// minute snapshot grind (it fires the refresh async), so 255 never
		// gets exercised by a live request.
		idleTimeout: 255,
		async fetch(request) {
			const url = new URL(request.url);
			const path = url.pathname;

			if (request.method === 'OPTIONS') {
				return new Response(null, {
					headers: {
						'access-control-allow-origin': '*',
						'access-control-allow-methods': 'GET, POST, OPTIONS',
						'access-control-allow-headers': 'authorization, content-type'
					}
				});
			}

			if (path === '/health') {
				return json({
					ok: true,
					pid: process.pid,
					version: config.version,
					network: config.network,
					isTestnet: config.isTestnet,
					mainnetAckOk: config.network === 'testnet' || Boolean(
						(globalThis as { __viceEnv?: Record<string, string | undefined> }).__viceEnv?.VITE_HL_MAINNET_ACK
					),
					account: config.account,
					killSwitch: config.killSwitch,
					unlocked: isUnlocked(),
					initialized: snapshot().initialized,
					uptimeMs: Date.now() - started
				});
			}

			if (!path.startsWith('/api/')) {
				return json({ error: 'not found' }, 404);
			}
			if (!tokenOk(config, request)) return unauthorized();

			switch (path) {
				case '/api/state': {
					const { get } = await import('svelte/store');
					const { fatFingerLimits } = await import('../stores');
					return json({
						...snapshot(),
						network: config.network,
						isTestnet: config.isTestnet,
						// True only when the certified MAINNET_ACK was present at boot
						// (loadConfig fail-closes otherwise). UI uses this for the
						// mainnet submit gate — never invent a second ACK string.
						mainnetAckOk: config.network === 'testnet' || Boolean(
							(globalThis as { __viceEnv?: Record<string, string | undefined> }).__viceEnv?.VITE_HL_MAINNET_ACK
						),
						killSwitch: config.killSwitch,
						unlocked: isUnlocked(),
						fatFingerLimits: get(fatFingerLimits)
					});
				}
				case '/api/refresh': {
					try {
						await refreshState();
						const { get } = await import('svelte/store');
						const { fatFingerLimits } = await import('../stores');
						return json({
							ok: true,
							...snapshot(),
							network: config.network,
							isTestnet: config.isTestnet,
							mainnetAckOk: config.network === 'testnet' || Boolean(
								(globalThis as { __viceEnv?: Record<string, string | undefined> }).__viceEnv?.VITE_HL_MAINNET_ACK
							),
							killSwitch: config.killSwitch,
							unlocked: isUnlocked(),
							fatFingerLimits: get(fatFingerLimits)
						});
					} catch (error) {
						return json(
							{ ok: false, error: error instanceof Error ? error.message : String(error) },
							502
						);
					}
				}
				case '/api/unlock': {
					const body = await readBody(request);
					const result = await unlockVault(
						typeof body.challenge === 'string' ? body.challenge : '',
						typeof body.address === 'string' ? body.address : ''
					);
					return json(result, result.ok ? 200 : 403);
				}
				case '/api/lock': {
					const result = lockVault();
					return json(result);
				}
				case '/api/execute': {
					const body = await readBody(request);
					const result = await executeOrder({
						coin: typeof body.coin === 'string' ? body.coin : '',
						isBuy: body.isBuy === true,
						size: typeof body.size === 'number' ? body.size : Number(body.size ?? NaN),
						limitPrice: typeof body.limitPrice === 'number' ? body.limitPrice : Number(body.limitPrice ?? NaN),
						reduceOnly: body.reduceOnly === true,
						postOnly: body.postOnly === true,
						ioc: body.ioc === true,
						orderType: typeof body.orderType === 'string' ? body.orderType : undefined,
						triggerPrice: typeof body.triggerPrice === 'number' ? body.triggerPrice : Number(body.triggerPrice ?? NaN),
						triggerKind: body.triggerKind === 'stop' || body.triggerKind === 'takeProfit' ? body.triggerKind : undefined,
						takeProfit: typeof body.takeProfit === 'number' ? body.takeProfit : Number(body.takeProfit ?? NaN),
						stopLoss: typeof body.stopLoss === 'number' ? body.stopLoss : Number(body.stopLoss ?? NaN),
						commandId: typeof body.commandId === 'string' ? body.commandId : undefined
					});
					return json(result, result.ok ? 200 : 400);
				}
				case '/api/cancel': {
					const body = await readBody(request);
					const result = await cancelOrder(
						typeof body.coin === 'string' ? body.coin : '',
						typeof body.orderId === 'string' ? body.orderId : String(body.orderId ?? '')
					);
					return json(result, result.ok ? 200 : 400);
				}
				case '/api/modify': {
					const body = await readBody(request);
					const result = await modifyOrder(
						typeof body.coin === 'string' ? body.coin : '',
						typeof body.orderId === 'string' ? body.orderId : String(body.orderId ?? ''),
						typeof body.newPrice === 'number' ? body.newPrice : Number(body.newPrice ?? NaN)
					);
					return json(result, result.ok ? 200 : 400);
				}
				case '/api/cancel-all': {
					const body = await readBody(request);
					const scope = body.scope === 'buy' || body.scope === 'sell' ? body.scope : 'both';
					const result = await cancelAll(scope);
					return json(result, result.ok ? 200 : 400);
				}
				case '/api/flatten': {
					const body = await readBody(request);
					const scope = body.scope === 'long' || body.scope === 'short' ? body.scope : 'both';
					const result = await flatten(scope);
					return json(result, result.ok ? 200 : 400);
				}
				case '/api/close': {
					const body = await readBody(request);
					const result = await closePosition(typeof body.positionId === 'string' ? body.positionId : '');
					return json(result, result.ok ? 200 : 400);
				}
				case '/api/reverse': {
					const body = await readBody(request);
					const result = await reverse(typeof body.positionId === 'string' ? body.positionId : '');
					return json(result, result.ok ? 200 : 400);
				}
				case '/api/algo':
					return json(
						{
							error: 'advanced order gate not open (P3)',
							action: 'algo',
							detail: 'hermes-sidecar exposes Tier A/B/C advanced orders only after funded-testnet lifecycle evidence through this transport.'
						},
						501
					);
				default:
					return json({ error: `unknown route: ${path}` }, 404);
			}
		}
	});

	// Boot only the canonical market registry. Account refresh starts after the
	// proof-of-possession unlock; starting both loops here and on unlock causes
	// duplicate testnet snapshot bursts and leaves the freshness gate degraded.
	initializeMarketRegistry().catch((error) => {
		console.error('[hermes-sidecar] initial market registry prime failed:', error);
	});
	const boundPort = server.port ?? config.port;

	console.log(
		`[hermes-sidecar] v${config.version} listening on 127.0.0.1:${boundPort} ` +
			`network=${config.network} account=${config.account ?? 'none'} killSwitch=${config.killSwitch}`
	);

	return {
		server: { port: boundPort, stop: () => server.stop(true) },
		config
	};
}
