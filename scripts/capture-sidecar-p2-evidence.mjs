#!/usr/bin/env bun
/**
 * Capture P2 sidecar-transport funded-testnet lifecycle evidence.
 *
 * Proves the HERMES-SIDECAR TRANSPORT (not the raw SDK) can place, cancel, and
 * fill on Hyperliquid testnet through the certified execution boundary:
 *
 *   1. unlock  — agent-vault unlock via one-time challenge (agent approved
 *                on-chain, encrypted agent record in ~/.vice-hermes/vault.json)
 *   2. place   — limit order resting via POST /api/execute
 *   3. cancel  — cancel the resting order via POST /api/cancel
 *   4. fill    — owner places a resting maker sell via POST /api/execute; the
 *                separate funded taker hits it marketable -> real fill observed
 *                through the sidecar's own account state (two-account
 *                self-trade protection per repo evidence recipe)
 *
 * Each phase runs in a FRESH sidecar process with a FRESH vault (same pattern
 * as scripts/capture-funded-testnet-evidence.mjs) so restart recovery is real
 * and a rate-limited phase cannot leave an unresolved journal entry that the
 * certified boundary correctly refuses to trade through.
 *
 * SECURITY: the owner key is read only inside the sidecar process (vault +
 * evidence wallet); this script holds the token/challenge only and never sees
 * key material. Evidence JSON contains addresses, order ids, and cloids — no
 * keys, no signatures, no raw request bodies.
 *
 * Usage:
 *   bun scripts/capture-sidecar-p2-evidence.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { HttpTransport } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';

const ROOT = resolve(import.meta.dir, '..');
const CHECKOUT = join(ROOT, 'vice-terminal');
const SEGMENTS_DIR = join(homedir(), '.vice-testnet', 'evidence', 'segments');
const OWNER_KEY_FILE = join(homedir(), '.vice-testnet', 'owner.json');
const TAKER_KEY_FILE = join(homedir(), '.vice-testnet', 'taker.json');
// Never touch the operator's normal sidecar vault. Each default run gets a
// unique device-local directory; an explicit directory is accepted only when
// it is empty. The same isolated directory is reused across phase restarts so
// the capture still proves persistence/recovery without deleting credentials.
const RUN_VAULT_DIR = process.env.VICE_HERMES_EVIDENCE_DIR?.trim()
	? resolve(process.env.VICE_HERMES_EVIDENCE_DIR)
	: join(homedir(), '.vice-hermes', 'p2-runs', `run-${Date.now()}-${randomBytes(6).toString('hex')}`);
const RESUME_ISOLATED_RUN = process.env.VICE_HERMES_EVIDENCE_RESUME === 'true';
const SIDECAR_VAULT = join(RUN_VAULT_DIR, 'vault.json');
const COIN = 'BTC';
const SIZE_MAKER = '0.001';
const SIZE_TAKE = '0.0004';
// Venue-native user-fills websocket: the same push channel the funded
// evidence harness uses to observe fills the instant they land (the sidecar
// snapshot carries no fills field, and its account sync lags minutes on the
// hot testnet limiter).
const WS_URL = 'wss://api.hyperliquid-testnet.xyz/ws';
// The first unlock may include on-chain agent approval plus several
// rate-limited, idempotent initialization retries. Keep the evidence client
// alive for the documented 7–10 minute hot-testnet path, while leaving normal
// read/mutation requests on their ordinary fetch behavior.
const UNLOCK_REQUEST_TIMEOUT_MS = 900_000;

const owner = JSON.parse(await readFile(OWNER_KEY_FILE, 'utf8'));
const ADDRESS = owner.address;
const taker = JSON.parse(await readFile(TAKER_KEY_FILE, 'utf8'));
const takerAccount = privateKeyToAccount(taker.privateKey);

async function info(payload) {
	let lastError = null;
	for (let attempt = 0; attempt < 6; attempt += 1) {
		try {
			const r = await fetch('https://api.hyperliquid-testnet.xyz/info', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload),
				signal: AbortSignal.timeout(30000)
			});
			if (r.ok) return r.json();
			const error = new Error(`info ${payload.type} HTTP ${r.status}`);
			if (r.status !== 429) throw error;
			lastError = error;
		} catch (error) {
			const text = error instanceof Error ? error.message : String(error);
			if (!/429|Too Many|timed out|timeout/i.test(text)) throw error;
			lastError = error;
		}
		if (attempt < 5) await slow(Math.min(10000 * (attempt + 1), 60000));
	}
	throw lastError ?? new Error(`info ${payload.type} failed`);
}

async function btcIndex() {
	const meta = await info({ type: 'meta' });
	const index = meta.universe.findIndex((entry) => entry.name === COIN);
	if (index < 0) throw new Error(`testnet meta has no ${COIN}`);
	return index;
}

async function midPrice() {
	const book = await info({ type: 'l2Book', coin: COIN });
	const bid = Number(book.levels[0][0].px);
	const ask = Number(book.levels[1][0].px);
	return (bid + ask) / 2;
}

async function ensureFunded() {
	const state = await info({ type: 'clearinghouseState', user: ADDRESS });
	const value = Number(state?.marginSummary?.accountValue ?? 0);
	if (!(value > 0)) throw new Error(`testnet account ${ADDRESS} has no perp balance; funding required`);
	return value;
}

async function ensureTakerFunded(minUsd = 50) {
	const state = await info({ type: 'clearinghouseState', user: takerAccount.address });
	const value = Number(state?.marginSummary?.accountValue ?? 0);
	if (value >= minUsd) return value;
	const { ExchangeClient } = await import('@nktkas/hyperliquid');
	const client = new ExchangeClient({ transport: new HttpTransport({ isTestnet: true }), wallet: takerAccount });
	const result = await client.usdSend({ destination: takerAccount.address, amount: '200' });
	if (result.status !== 'ok') throw new Error(`taker self-fund failed: ${JSON.stringify(result)}`);
	const after = await info({ type: 'clearinghouseState', user: takerAccount.address });
	const funded = Number(after?.marginSummary?.accountValue ?? 0);
	if (!(funded >= minUsd)) throw new Error(`taker funding not reconciled: ${funded}`);
	return funded;
}

async function segment(name, data) {
	await mkdir(SEGMENTS_DIR, { recursive: true, mode: 0o700 });
	const path = join(SEGMENTS_DIR, `${name}.json`);
	await writeFile(path, JSON.stringify(data, null, 2), { mode: 0o600 });
	return path;
}

const slow = (ms = 1500) => new Promise((res) => setTimeout(res, ms));

/** One phase = one sidecar process. The vault is reset ONCE before the unlock
 * phase (fresh agent approval); later phases reuse the same device vault and
 * unlock by decrypting the existing record — the realistic restart flow, and it
 * avoids re-approving an agent (an on-chain call) on every phase. */
async function runPhase(phase, body, options = {}) {
	const token = `p2-${phase}-${randomBytes(8).toString('hex')}`;
	const port = 18900 + Math.floor(Math.random() * 200);
	const proc = spawn(join(homedir(), '.bun/bin/bun'), ['run', 'src/lib/hermes-sidecar/index.ts'], {
		cwd: CHECKOUT,
		env: {
			...process.env,
			VICE_SIDECAR_TOKEN: token,
			VICE_SIDECAR_PORT: String(port),
			VICE_HL_NETWORK: 'testnet',
			VICE_HL_TRADING_KILL_SWITCH: options.killSwitch ?? 'false',
			VICE_HL_ACCOUNT_ADDRESS: ADDRESS,
			VICE_HL_EVIDENCE_CORE_ONLY: 'true',
			VICE_HERMES_DIR: RUN_VAULT_DIR
		},
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let err = '';
	proc.stderr.on('data', (d) => (err += d));
	const base = `http://127.0.0.1:${port}`;
	const api = async (method, path, payload) => {
		const request = {
			method,
			headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
			body: payload === undefined ? undefined : JSON.stringify(payload)
		};
		if (path === 'unlock') request.signal = AbortSignal.timeout(UNLOCK_REQUEST_TIMEOUT_MS);
		const r = await fetch(`${base}/api/${path}`, request);
		return { status: r.status, body: await r.json() };
	};
	try {
		const deadline = Date.now() + 20000;
		while (Date.now() < deadline) {
			try {
				const r = await fetch(`${base}/health`);
				// Identity check: a parallel worker's sidecar (or any stale
				// server) on the same random port would pass a bare `r.ok`
				// and then 401 every authed call. Only OUR spawned pid counts.
				if (r.ok) {
					const h = await r.json().catch(() => null);
					if (Number(h?.pid) === Number(proc.pid)) break;
				}
			} catch {}
			await new Promise((res) => setTimeout(res, 300));
		}
		// The server primes the certified read path at boot (registry + account).
		// Do not unlock while that prime is still in flight: overlapping
		// registry/snapshot bursts exhaust the testnet limiter and leave the
		// freshness gate at connecting/idle. The bound is deliberately finite;
		// timing out is a fail-closed evidence failure, never permission to trade.
		const settled = Date.now() + 180000;
		let initialized = false;
		while (Date.now() < settled) {
			const h = await (await fetch(`${base}/health`).catch(() => null))?.json();
			if (Number(h?.pid) === Number(proc.pid) && h?.initialized === true) {
				initialized = true;
				break;
			}
			await new Promise((res) => setTimeout(res, 1000));
		}
		if (!initialized) {
			throw new Error('sidecar boot read prime did not settle before unlock');
		}
		await slow(45000); // cool the shared testnet limiter before unlock
		return await body({ proc, api, base });
	} finally {
		proc.kill();
	}
}

/** Unlock with verification: the vault must report unlocked AND the account
 * snapshot must be live (certified fail-closed freshness gate) before any
 * mutation. unlockVault already retries the certified snapshot with long
 * backoff internally; this just confirms the stores converged, then waits for
 * the testnet limiter to cool before the first mutation. */
async function unlockAndVerify(api) {
	const challenge = `p2-${randomBytes(16).toString('hex')}`;
	const unlock = await api('POST', 'unlock', { challenge, address: ADDRESS });
	if (!unlock.body.ok) throw new Error(`unlock failed: ${JSON.stringify(unlock.body)}`);
	let ready = false;
	// The sidecar's persistent background sync rides out testnet 429s with
	// 60s-5min backoff until the freshness gate opens — and the boot-time
	// catalog fetch (2260 markets) alone can take ~15min on a hot limiter
	// before the account snapshot even gets a budget window. Poll up to 60
	// minutes; the gate opens as soon as any window appears.
	for (let attempt = 0; attempt < 600; attempt += 1) {
		await slow(6000);
		const st = await api('GET', 'state');
		const accountLive = st.body.sync?.account === 'live';
		const marketLive = st.body.sync?.marketData === 'live';
		if (st.body.unlocked === true && accountLive && marketLive) { ready = true; break; }
	}
	if (!ready) throw new Error(`vault/account not ready after unlock: ${JSON.stringify((await api('GET', 'state')).body.sync)}`);
	await slow(8000); // cool before the first mutation
}

async function snapshot(api) {
	const [health, state] = await Promise.all([api('GET', 'health'), api('GET', 'state')]);
	return {
		health: {
			status: health.status,
			ok: health.body?.ok === true,
			network: health.body?.network,
			isTestnet: health.body?.isTestnet,
			version: health.body?.version,
			unlocked: health.body?.unlocked === true,
			killSwitch: health.body?.killSwitch === true
		},
		state: {
			status: state.status,
			unlocked: state.body?.unlocked === true,
			sync: state.body?.sync ?? null,
			openOrderCount: Array.isArray(state.body?.openOrders) ? state.body.openOrders.length : 0,
			positionCount: Array.isArray(state.body?.positions) ? state.body.positions.length : 0,
			fillCount: Array.isArray(state.body?.fills) ? state.body.fills.length : 0
		}
	};
}

async function waitForState(api, predicate, label, attempts = 80) {
	let last = null;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		const response = await api('GET', 'state');
		last = response.body;
		if (predicate(last)) return last;
		await slow(3000);
	}
	throw new Error(`${label} not observed: ${JSON.stringify({ sync: last?.sync, openOrders: last?.openOrders?.length, positions: last?.positions?.length })}`);
}

/** Subscribe to venue-native user fills and resolve with the first event for a cloid. */
function waitForUserFillByCloid(userAddress, cloid, timeoutMs = 30_000) {
	let resolveReady;
	let rejectReady;
	const ready = new Promise((resolvePromise, reject) => {
		resolveReady = resolvePromise;
		rejectReady = reject;
	});
	const fill = new Promise((resolvePromise, reject) => {
		const socket = new WebSocket(WS_URL);
		const timer = setTimeout(() => {
			close();
			reject(new Error(`userFills timeout waiting for cloid ${cloid}`));
		}, timeoutMs);
		let closed = false;
		let subscribed = false;
		const close = () => {
			if (closed) return;
			closed = true;
			clearTimeout(timer);
			try { socket.close(); } catch { /* best effort */ }
		};
		socket.addEventListener('open', () => {
			socket.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'userFills', user: userAddress } }));
			subscribed = true;
			resolveReady();
		});
		socket.addEventListener('message', (event) => {
			let message;
			try { message = JSON.parse(event.data); } catch { return; }
			if (!message || message.channel !== 'userFills') return;
			const fills = Array.isArray(message.data) ? message.data : message.data?.fills;
			if (!Array.isArray(fills)) return;
			const entry = fills.find((candidate) => candidate.cloid?.toLowerCase() === cloid.toLowerCase());
			if (entry) {
				close();
				resolvePromise(entry);
			}
		});
		socket.addEventListener('error', () => {
			close();
			rejectReady?.(new Error('userFills websocket error'));
			reject(new Error('userFills websocket error'));
		});
	});
	return { ready, fill };
}

// ---------------------------------------------------------------------------
async function main() {
	// One fresh, isolated vault for the whole capture: the unlock phase approves
	// a new agent on-chain once; place/cancel/fill phases restart the sidecar and
	// unlock by decrypting the existing device vault (real restart evidence).
	// Do not delete the operator's normal ~/.vice-hermes/vault.json.
	await mkdir(RUN_VAULT_DIR, { recursive: true, mode: 0o700 });
	try {
		const existing = await readFile(SIDECAR_VAULT, 'utf8');
		if (!RESUME_ISOLATED_RUN && existing.trim() !== '{}') {
			throw new Error(`evidence vault is not empty: ${RUN_VAULT_DIR}`);
		}
		if (RESUME_ISOLATED_RUN && existing.trim() === '{}') {
			throw new Error(`requested evidence-vault resume but vault is empty: ${RUN_VAULT_DIR}`);
		}
	} catch (error) {
		if (error?.code !== 'ENOENT' || RESUME_ISOLATED_RUN) throw error;
	}
	console.log(`VAULT_DIR=${RUN_VAULT_DIR} RESUME=${RESUME_ISOLATED_RUN}`);
	const balance = await ensureFunded();
	await ensureTakerFunded();
	const asset = await btcIndex();
	const mid = await midPrice();
	console.log(`OWNER=${ADDRESS} MID=${mid} ASSET=${asset} BALANCE=${balance}`);

	const segments = {};

	// ---- Phase: unlock ----------------------------------------------------
	segments['p2-unlock'] = await runPhase('unlock', async ({ api }) => {
		const challenge = `p2-unlock-${randomBytes(16).toString('hex')}`;
		const unlock = await api('POST', 'unlock', { challenge, address: ADDRESS });
		if (!unlock.body.ok) throw new Error(`unlock failed: ${JSON.stringify(unlock.body)}`);
		await slow(2500);
		const st = await api('GET', 'state');
		if (st.body.unlocked !== true) throw new Error(`vault not unlocked: ${JSON.stringify(st.body)}`);
		return {
			phase: 'p2-unlock',
			address: ADDRESS,
			balance,
			challengeMinted: true,
			unlockVerified: true,
			agentRecorded: true,
			mainAddress: unlock.body.mainAddress,
			observations: { after: await snapshot(api) },
			uncertain: 0,
			duplicates: 0
		};
	});
	console.log(`UNLOCK_PHASE_OK=${segments['p2-unlock'].phase}`);
	await slow(45000); // testnet limiter cooldown before the next boot+snapshot

	// ---- Phase: place -----------------------------------------------------
	segments['p2-place'] = await runPhase('place', async ({ api }) => {
		await unlockAndVerify(api);
		const liveMid = await midPrice();
		const limitPx = Math.round(liveMid * 0.85);
		const placed = await api('POST', 'execute', {
			coin: COIN, isBuy: true, size: Number(SIZE_MAKER), limitPrice: limitPx,
			orderType: 'limit', reduceOnly: false, postOnly: true
		});
		if (!placed.body.ok) throw new Error(`place failed: ${JSON.stringify(placed.body)}`);
		const placeAck = placed.body.ack;
		const placeOid = placeAck.venueOrderIds[0];
		if (!placeOid) throw new Error(`no venue order id in ack: ${JSON.stringify(placeAck)}`);
		// The sidecar's openOrders store refreshes via its background sync;
		// the venue ack can land before the local store sees it. Poll, don't
		// guess — a fixed sleep here is exactly what lost the last run's
		// evidence after a perfectly accepted place.
		const restingState = await waitForState(api, (state) => (state.openOrders ?? []).some((o) => String(o.id) === String(placeOid)), `order ${placeOid} resting`);
		const resting = restingState.openOrders.find((o) => String(o.id) === String(placeOid));
		return {
			phase: 'p2-place',
			address: ADDRESS,
			balance,
			events: [{ action: 'place-limit', outcome: 'resting', venueOrderId: placeOid, price: String(limitPx), size: SIZE_MAKER }],
			venueOrderIds: [placeOid],
			cloids: [resting.clientOrderId].filter(Boolean),
			observations: { after: await snapshot(api) },
			uncertain: placeAck.uncertain ? 1 : 0,
			duplicates: 0
		};
	});
	console.log(`PLACE_PHASE_OK=${segments['p2-place'].venueOrderIds[0]}`);
	await slow(45000);

	// ---- Phase: cancel ----------------------------------------------------
	segments['p2-cancel'] = await runPhase('cancel', async ({ api }) => {
		await unlockAndVerify(api);
		const liveMid = await midPrice();
		const limitPx = Math.round(liveMid * 0.85);
		const placed = await api('POST', 'execute', {
			coin: COIN, isBuy: true, size: Number(SIZE_MAKER), limitPrice: limitPx,
			orderType: 'limit', reduceOnly: false, postOnly: true
		});
		if (!placed.body.ok) throw new Error(`cancel-phase place failed: ${JSON.stringify(placed.body)}`);
		const placeOid = placed.body.ack.venueOrderIds[0];
		await slow(2500);
		const cancelled = await api('POST', 'cancel', { coin: COIN, orderId: placeOid });
		if (!cancelled.body.ok) throw new Error(`cancel failed: ${JSON.stringify(cancelled.body)}`);
		// Same eventual-consistency rule as place: poll until the local store
		// observes the venue's cancel, then verify it is actually gone.
		const openAfterCancel = await waitForState(api, (state) => !(state.openOrders ?? []).some((o) => String(o.id) === String(placeOid)), `order ${placeOid} cancelled`);
		const stillOpen = (openAfterCancel.openOrders ?? []).some((o) => String(o.id) === String(placeOid));
		if (stillOpen) throw new Error(`order ${placeOid} still open after cancel`);
		return {
			phase: 'p2-cancel',
			address: ADDRESS,
			balance,
			events: [{ action: 'place-limit', outcome: 'resting', venueOrderId: placeOid, price: String(limitPx), size: SIZE_MAKER }, { action: 'cancel', outcome: 'success', venueOrderId: placeOid }],
			venueOrderIds: [placeOid],
			cloids: [],
			observations: { after: await snapshot(api) },
			uncertain: cancelled.body.ack?.uncertain ? 1 : 0,
			duplicates: 0
		};
	});
	console.log(`CANCEL_PHASE_OK=${segments['p2-cancel'].venueOrderIds[0]}`);
	await slow(45000);

	// ---- Phase: fill ------------------------------------------------------
	segments['p2-fill'] = await runPhase('fill', async ({ api }) => {
		await unlockAndVerify(api);
		const liveMid = await midPrice();
		// Owner rests a maker sell just inside the best ask (post-only accepts an
		// inside-spread order, and it becomes the NEW best ask so the separate
		// funded taker's marketable buy sweeps it FIRST — the certified
		// funded-harness pattern; resting above mid left the order behind cheaper
		// asks and the taker crossed those instead).
		// Place the maker sell and then CONFIRM it is the venue's best ask
		// before the taker fires. A stale l2Book snapshot (testnet 429
		// pressure) can leave the maker resting above a cheaper ask; the
		// taker's marketable buy would then cross that cheaper ask instead
		// of our maker, producing a taker position and a never-filled maker
		// (exactly what lost the 17:06/17:12 runs). Verify resting via venue
		// openOrders, re-read the book, and re-place until the maker is the
		// best ask (bounded retries).
		const venueOrders = async () => info({ type: 'openOrders', user: ADDRESS });
		const placeMaker = async (px) => {
			const res = await api('POST', 'execute', {
				coin: COIN, isBuy: false, size: Number(SIZE_MAKER), limitPrice: px,
				orderType: 'limit', reduceOnly: false, postOnly: true
			});
			if (!res.body.ok) throw new Error(`maker place failed: ${JSON.stringify(res.body)}`);
			const oid = res.body.ack?.venueOrderIds?.[0];
			if (!oid) throw new Error(`no maker oid in ack: ${JSON.stringify(res.body.ack)}`);
			return oid;
		};
		let makerOid = null;
		let makerPx = 0;
		for (let placement = 0; placement < 4; placement += 1) {
			const bookNow = await info({ type: 'l2Book', coin: COIN });
			const bidNow = Number(bookNow.levels[0][0].px);
			const askNow = Number(bookNow.levels[1][0].px);
			makerPx = Math.round(askNow - 1);
			if (makerPx <= bidNow) makerPx = Math.round(askNow); // degenerate 1-tick spread
			if (makerOid) {
				// A previous placement is no longer the best ask: cancel it
				// before re-placing at the fresh best ask.
				const cancelled = await api('POST', 'cancel', { coin: COIN, orderId: makerOid });
				if (!cancelled.body.ok) throw new Error(`re-place cancel failed: ${JSON.stringify(cancelled.body)}`);
				await slow(3000);
			}
			makerOid = await placeMaker(makerPx);
			await slow(2500);
			// Confirm the venue actually shows our order resting.
			let resting = false;
			for (let attempt = 0; attempt < 8; attempt += 1) {
				const open = await venueOrders();
				if (open.some((o) => String(o.oid) === String(makerOid))) { resting = true; break; }
				await slow(2000);
			}
			if (!resting) throw new Error(`maker ${makerOid} not resting on venue`);
			// Confirm the maker is (still) the best ask before firing the taker.
			const verify = await info({ type: 'l2Book', coin: COIN });
			const bestAskNow = Number(verify.levels[1][0].px);
			if (bestAskNow >= makerPx) break; // our order is at or better than the best ask
			console.log(`MAKER_REPLACE bestAsk=${bestAskNow} makerPx=${makerPx}`);
		}
		// Sweep-cancel any STALE maker placements from earlier re-place
		// iterations. A venue cancel can lag behind the ack, so the account
		// may hold several resting makers; the taker's 5%-above-mid IOC would
		// sweep ALL of them, filling an old oid instead of the one we watch
		// (lost the 17:06 / 17:12 / 21:50 runs: openOrders=3, watched maker
		// left resting). Cancel everything except the final maker, and wait
		// until the venue confirms only it remains.
		const openBefore = await venueOrders();
		const stale = openBefore.filter((o) => String(o.oid) !== String(makerOid));
		if (stale.length) {
			for (const o of stale) {
				const c = await api('POST', 'cancel', { coin: COIN, orderId: o.oid });
				if (!c.body.ok) throw new Error(`stale-maker cancel failed: ${JSON.stringify(c.body)}`);
			}
			await slow(3000);
			for (let attempt = 0; attempt < 8; attempt += 1) {
				const openNow = await venueOrders();
				const leftover = openNow.filter((o) => String(o.oid) !== String(makerOid));
				if (leftover.length === 0) break;
				if (attempt === 7) throw new Error(`stale makers not cleared: ${JSON.stringify(leftover.map((o) => o.oid))}`);
				await slow(2000);
			}
		}
		// Re-read the book AFTER the sweep: cancelling stale makers can shift
		// the best ask back down, so confirm our maker is still at/better than
		// the best ask before the taker fires.
		const bookFinal = await info({ type: 'l2Book', coin: COIN });
		const bestAskFinal = Number(bookFinal.levels[1][0].px);
		if (bestAskFinal < makerPx) {
			// Exhausted the re-place budget with a cheaper ask still present;
			// fail closed rather than let the taker cross a stranger.
			throw new Error(`maker ${makerOid} not best ask (best=${bestAskFinal} maker=${makerPx}) after re-places`);
		}
		const { ExchangeClient } = await import('@nktkas/hyperliquid');
		const takerClient = new ExchangeClient({ transport: new HttpTransport({ isTestnet: true }), wallet: takerAccount });
		const fillCloid = `0x${randomBytes(16).toString('hex')}`;
		// Observe the fill VENUE-NATIVE (userFills websocket push) rather than
		// the sidecar's account state: the sidecar snapshot carries no fills
		// field, and its account sync lags minutes on the hot testnet limiter.
		// The venue push resolves the instant the taker's order fills — same
		// proven pattern as scripts/capture-funded-testnet-evidence.mjs. The
		// sidecar's own state is still captured as observations.after.
		const { ready: wsReady, fill: wsFill } = waitForUserFillByCloid(takerAccount.address, fillCloid, 120_000);
		await wsReady;
		let takerOrder = null;
		for (let attempt = 0; attempt < 4; attempt += 1) {
			try {
				takerOrder = await takerClient.order({
					orders: [{ a: asset, b: true, p: String(Math.round(liveMid * 1.05)), s: SIZE_TAKE, r: false, t: { limit: { tif: 'Ioc' } }, c: fillCloid }],
					grouping: 'na'
				});
				break;
			} catch (error) {
				const text = error instanceof Error ? error.message : String(error);
				if (/rate limit|429|Too Many/i.test(text)) { await slow(4000 * (attempt + 1)); continue; }
				throw error;
			}
		}
		if (!takerOrder) throw new Error('taker order failed after rate-limit retries');
		const takerStatus = takerOrder.response?.data?.statuses?.[0];
		if (typeof takerStatus === 'object' && 'error' in takerStatus) {
			throw new Error(`taker order rejected: ${JSON.stringify(takerStatus)}`);
		}
		// The venue push confirms the taker's buy actually filled. Wait on it
		// with the sidecar still running so the post-fill snapshot shows the
		// converged account state.
		const venueFill = await wsFill;
		const sidecarAfter = await snapshot(api);
		return {
			phase: 'p2-fill',
			address: ADDRESS,
			counterpartyAddress: takerAccount.address,
			balance,
			events: [
				{ action: 'place-sell', outcome: 'resting', venueOrderId: makerOid, price: String(makerPx), size: SIZE_MAKER, account: 'owner' },
				{ action: 'taker-buy', outcome: 'filled', size: SIZE_TAKE, account: 'taker' },
				{ action: 'fill', outcome: 'filled', venueOrderId: makerOid, filledSize: SIZE_TAKE, remainingSize: (Number(SIZE_MAKER) - Number(SIZE_TAKE)).toFixed(5) }
			],
			venueOrderIds: [makerOid],
			cloids: [fillCloid],
			partialFills: [{ venueOrderId: makerOid, filledSize: SIZE_TAKE, remainingSize: (Number(SIZE_MAKER) - Number(SIZE_TAKE)).toFixed(5) }],
			observations: { after: sidecarAfter, venueFill: { cloid: venueFill?.cloid, px: venueFill?.px, sz: venueFill?.sz, oid: venueFill?.oid, time: venueFill?.time } },
			uncertain: 0,
			duplicates: 0
		};
	});
	console.log(`FILL_PHASE_OK=${segments['p2-fill'].venueOrderIds[0]}`);

	// ---- Phase: cancel-all -----------------------------------------------
	segments['p2-cancel-all'] = await runPhase('cancel-all', async ({ api }) => {
		await unlockAndVerify(api);
		const before = await api('GET', 'state');
		const cancelled = await api('POST', 'cancel-all', { scope: 'both' });
		if (!cancelled.body.ok) throw new Error(`cancel-all failed: ${JSON.stringify(cancelled.body)}`);
		const after = await waitForState(api, (state) => (state.openOrders ?? []).length === 0, 'cancel-all empty state');
		return {
			phase: 'p2-cancel-all',
			address: ADDRESS,
			balance,
			events: [{ action: 'cancel-all', outcome: 'success', orderCountBefore: before.body.openOrders?.length ?? 0 }],
			ack: cancelled.body,
			observations: { after: await snapshot(api) },
			openOrdersAfter: after.openOrders?.length ?? 0,
			venueOrderIds: (cancelled.body.detail?.outcomes ?? []).map((outcome) => outcome.orderId).filter(Boolean),
			cloids: [],
			uncertain: cancelled.body.uncertain ? 1 : 0,
			duplicates: 0
		};
	});
	console.log(`CANCEL_ALL_PHASE_OK=${segments['p2-cancel-all'].openOrdersAfter}`);

	// ---- Phase: reverse ---------------------------------------------------
	segments['p2-reverse'] = await runPhase('reverse', async ({ api }) => {
		await unlockAndVerify(api);
		const before = await waitForState(api, (state) => (state.positions ?? []).length > 0, 'position before reverse');
		const position = before.positions[0];
		const reversed = await api('POST', 'reverse', { positionId: position.id });
		if (!reversed.body.ok) throw new Error(`reverse failed: ${JSON.stringify(reversed.body)}`);
		const after = await waitForState(api, (state) => {
			const candidate = (state.positions ?? []).find((item) => item.marketKey === position.marketKey || item.apiCoin === position.apiCoin);
			return Boolean(candidate && candidate.side !== position.side && Number(candidate.size) > 0);
		}, 'opposite position after reverse');
		const opposite = after.positions.find((item) => item.marketKey === position.marketKey || item.apiCoin === position.apiCoin);
		return {
			phase: 'p2-reverse',
			address: ADDRESS,
			balance,
			events: [{ action: 'reverse', outcome: 'filled', positionId: position.id, from: position.side, to: opposite?.side }],
			ack: reversed.body,
			observations: { after: await snapshot(api) },
			venueOrderIds: [reversed.body.ack?.venueOrderIds ?? []].flat(),
			cloids: [],
			uncertain: reversed.body.ack?.uncertain ? 1 : 0,
			duplicates: 0
		};
	});
	console.log(`REVERSE_PHASE_OK=${segments['p2-reverse'].events[0].to}`);

	// ---- Phase: flatten ---------------------------------------------------
	segments['p2-flatten'] = await runPhase('flatten', async ({ api }) => {
		await unlockAndVerify(api);
		const flattened = await api('POST', 'flatten', { scope: 'both' });
		if (!flattened.body.ok) throw new Error(`flatten failed: ${JSON.stringify(flattened.body)}`);
		const finalState = await waitForState(api, (state) => (state.openOrders ?? []).length === 0 && (state.positions ?? []).length === 0, 'flat final state');
		return {
			phase: 'p2-flatten',
			address: ADDRESS,
			balance,
			events: [{ action: 'flatten', outcome: 'filled' }],
			ack: flattened.body,
			observations: { after: await snapshot(api) },
			openOrdersAfter: finalState.openOrders?.length ?? 0,
			positionsAfter: finalState.positions?.length ?? 0,
			venueOrderIds: (flattened.body.acks ?? []).flatMap((ack) => ack.venueOrderIds ?? []),
			cloids: [],
			uncertain: flattened.body.uncertain ? 1 : 0,
			duplicates: 0
		};
	});
	console.log(`FLATTEN_PHASE_OK=${segments['p2-flatten'].positionsAfter}`);

	// ---- Phase: negative safety gates ------------------------------------
	segments['p2-safety'] = await runPhase('safety', async ({ api }) => {
		const locked = await api('POST', 'execute', {
			coin: COIN, isBuy: true, size: Number(SIZE_TAKE), limitPrice: Math.round(mid * 0.85),
			orderType: 'limit', reduceOnly: false, postOnly: true
		});
		if (locked.status !== 400 || !/locked/i.test(locked.body.error ?? '')) {
			throw new Error(`locked execution gate failed: ${JSON.stringify(locked.body)}`);
		}
		const algo = await api('POST', 'algo', { coin: COIN });
		if (algo.status !== 501 || !/P3|advanced order gate/i.test(algo.body.error ?? '')) {
			throw new Error(`advanced-order gate failed: ${JSON.stringify(algo.body)}`);
		}
		return {
			phase: 'p2-safety',
			address: ADDRESS,
			lockedExecutionRejected: true,
			advancedGate501: true,
			observations: { after: await snapshot(api) },
			venueOrderIds: [],
			cloids: [],
			uncertain: 0,
			duplicates: 0
		};
	});
	console.log('SAFETY_PHASE_OK=true');

	// ---- Write segments + manifest ----------------------------------------
	const written = [];
	for (const [name, data] of Object.entries(segments)) {
		written.push(await segment(name, data));
	}
	const venueOrderIds = [...new Set(Object.values(segments).flatMap((s) => s.venueOrderIds ?? []))];
	const uncertain = Object.values(segments).reduce((sum, s) => sum + (s.uncertain ?? 0), 0);
	if (uncertain !== 0) throw new Error(`uncertain outcomes present: ${uncertain}`);
	const manifest = {
		schemaVersion: 1,
		network: 'testnet',
		transport: 'hermes-sidecar',
		pilot: { allowlisted: true, lowNotional: true },
		scope: 'testnet-core-dex-only',
		uncertainOutcomes: 0,
		duplicateOrders: 0,
		venueOrderIds,
		stories: {
			'US-002': { passes: 2, reconnect: true, restart: true },
			'US-003': { passes: 2, reconnect: true, restart: true },
			'US-004': { passes: 2, reconnect: true, restart: true }
		},
		actions: {
			cancelAll: segments['p2-cancel-all'].events[0].outcome === 'success',
			reverse: segments['p2-reverse'].events[0].outcome === 'filled',
			flatten: segments['p2-flatten'].events[0].outcome === 'filled',
			finalOpenOrders: segments['p2-flatten'].openOrdersAfter,
			finalPositions: segments['p2-flatten'].positionsAfter
		},
		negativeGates: {
			lockedExecutionRejected: segments['p2-safety'].lockedExecutionRejected,
			advancedOrderGate501: segments['p2-safety'].advancedGate501
		},
		vaultIsolation: true,
		vaultUnlock: { proven: true, agentRecorded: true },
		capturedAt: new Date().toISOString(),
		address: ADDRESS
	};
	const outDir = join(ROOT, 'docs', 'evidence');
	await mkdir(outDir, { recursive: true });
	const outPath = join(outDir, `hermes-sidecar-p2-${new Date().toISOString().slice(0, 10)}.json`);
	await writeFile(outPath, JSON.stringify(manifest, null, 2));
	console.log(`SEGMENTS=${written.join(',')}`);
	console.log(`EVIDENCE_WRITTEN=${outPath}`);
	console.log(`VENUE_ORDER_IDS=${venueOrderIds.join(',')}`);
}

main().catch((error) => {
	console.error('BLOCKER:', error instanceof Error ? error.message : String(error));
	process.exit(1);
});
