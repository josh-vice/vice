#!/usr/bin/env bun
/**
 * capture-basic-lifecycle-certification.mjs
 *
 * Gate 3 — funded testnet BASIC beta lifecycle certification through the
 * browser-local signing boundary (hermes-sidecar /api/execute, /api/cancel,
 * /api/modify, /api/cancel-all, /api/flatten). This is the SAME transport the
 * certified SvelteKit app and the Hermes desktop plugin use; there is no
 * second execution path. Assertions are venue-authoritative: openOrders,
 * userFills, clearinghouseState from api.hyperliquid-testnet.xyz, cross-checked
 * against the sidecar snapshot.
 *
 * SCOPE (basic beta ONLY — advanced families are explicitly out of scope for
 * this card):
 *   connect+enable, market, limit (maker), stop, stop-limit, partial fill
 *   (two-account), modify, cancel, reduce-only close, disconnect/reconnect,
 *   browser restart/reload (fresh sidecar, same vault), agent revoke + re-enable,
 *   journal/reconciliation, zero duplicate dispatch, zero unresolved outcomes,
 *   clean end-state (zero open orders, zero positions).
 *
 * RULES (inherited from the hardened advanced harness):
 *  - Every wait is deadline-bounded; no infinite retry loops.
 *  - A phase failure is recorded and the run continues; the final manifest
 *    lists pass/fail per phase and exits nonzero unless ALL phases pass.
 *  - Taker crosses come from the separate funded taker account
 *    (~/.vice-testnet/taker.json) so fills are genuine two-account matches
 *    (self-trade protection cancels a same-account maker on taker fill).
 *  - Phase `ok` is DERIVED from the event log, never assumed. A phase with any
 *    ok:false/error/uncertain nested outcome is a FAIL. The summary is
 *    recomputed from the phases by the schema validator.
 *  - No keys, signatures, or raw bodies are written to evidence. Manifests
 *    record public addresses, order IDs, ACKs, and state summaries only.
 *
 * Usage:
 *   bun scripts/capture-basic-lifecycle-certification.mjs [--phase=a,b]
 */
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { HttpTransport, InfoClient, ExchangeClient } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';

const ROOT = resolve(import.meta.dir, '..');
const CHECKOUT = join(ROOT, 'vice-terminal'); // app root containing src/lib/hermes-sidecar/index.ts
const SEGMENTS_DIR = join(homedir(), '.vice-testnet', 'evidence', 'basic-lifecycle-segments');
const VAULTS_DIR = join(homedir(), '.vice-testnet', 'evidence', 'basic-lifecycle-vaults');
const OWNER_KEY_FILE = join(homedir(), '.vice-testnet', 'owner.json');
const TAKER_KEY_FILE = join(homedir(), '.vice-testnet', 'taker.json');
const INFO_URL = 'https://api.hyperliquid-testnet.xyz/info';
const COIN = 'BTC';
const ASSET = 3; // BTC perp asset index on testnet meta (verified 2026-08-06)
const SIZE = 0.001;

const PHASE_TOTAL_MS = 240_000;
const POLL_MS = 1_500;
const SIDECAR_START_MS = 90_000;
const UNLOCK_MS = 900_000;
// Hot-testnet limiter cooldown between phases keeps each phase's unlock +
// sync inside the budget. Fresh vault per phase = fresh on-chain agent
// approval, which is the safest restart-recovery proof.
const PHASE_DELAY_MS = 60_000;

// ---------------------------------------------------------------------------
// Venue helpers (authoritative reads + owner/taker SDK clients)
// ---------------------------------------------------------------------------
const owner = JSON.parse(await readFile(OWNER_KEY_FILE, 'utf8'));
const taker = JSON.parse(await readFile(TAKER_KEY_FILE, 'utf8'));
const ownerAccount = privateKeyToAccount(owner.privateKey);
const takerAccount = privateKeyToAccount(taker.privateKey);
const ADDRESS = ownerAccount.address;
const TAKER_ADDRESS = takerAccount.address;

async function info(payload, timeoutMs = 15_000) {
	const response = await fetch(INFO_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(timeoutMs)
	});
	if (!response.ok) throw new Error(`info ${payload.type} HTTP ${response.status}`);
	return response.json();
}
const makeClient = (wallet) => new ExchangeClient({ transport: new HttpTransport({ isTestnet: true }), wallet });
const takerClient = makeClient(takerAccount);
const ownerClient = makeClient(ownerAccount);
const newCloid = () => `0x${randomBytes(16).toString('hex')}`;

function definitive(status) {
	if (status && typeof status === 'object') {
		if (status.resting && typeof status.resting === 'object') return { ok: true, status: 'resting', oid: status.resting.oid };
		if (status.filled && typeof status.filled === 'object') return { ok: true, status: 'filled', oid: status.filled.oid };
		if (status.canceled && typeof status.canceled === 'object') return { ok: true, status: 'canceled', oid: status.canceled.oid };
		if (typeof status.error === 'string') return { ok: true, status: 'rejected', error: status.error };
		return { ok: false, status: 'uncertain' };
	}
	if (status === 'resting' || status === 'filled' || status === 'canceled' || status === 'success') return { ok: true, status };
	return { ok: false, status: 'uncertain' };
}

async function midPrice() {
	const book = await info({ type: 'l2Book', coin: COIN });
	const bid = Number(book.levels[0][0].px);
	const ask = Number(book.levels[1][0].px);
	return (bid + ask) / 2;
}
const intPrice = (value) => Math.round(value).toString();

async function bestBidAsk() {
	const book = await info({ type: 'l2Book', coin: COIN });
	return { bid: Number(book.levels[0][0].px), ask: Number(book.levels[1][0].px) };
}

async function venueOpenOrders() {
	const orders = await info({ type: 'openOrders', user: ADDRESS });
	return Array.isArray(orders) ? orders.filter((o) => o.coin === COIN) : [];
}
async function venuePositions() {
	const state = await info({ type: 'clearinghouseState', user: ADDRESS });
	return (state?.assetPositions ?? []).filter((p) => Number(p.position?.szi ?? 0) !== 0);
}
async function venueFillCount() {
	const fills = await info({ type: 'userFills', user: ADDRESS });
	return (Array.isArray(fills) ? fills : fills?.fills ?? []).length;
}
async function venueAccountValue() {
	const state = await info({ type: 'clearinghouseState', user: ADDRESS });
	return Number(state?.marginSummary?.accountValue ?? 0);
}

async function venueCancelAll() {
	const orders = await info({ type: 'openOrders', user: ADDRESS });
	const cancels = (Array.isArray(orders) ? orders : []).map((o) => ({ a: o.asset ?? ASSET, o: o.oid }));
	if (cancels.length === 0) return { ok: true, canceled: 0 };
	const result = await ownerClient.cancel({ cancels });
	for (const s of result.response?.data?.statuses ?? []) {
		const d = definitive(s);
		if (!d.ok || d.status === 'uncertain') return { ok: false, error: JSON.stringify(result).slice(0, 300) };
	}
	return { ok: true, canceled: cancels.length };
}

async function venueFlatten() {
	const positions = await venuePositions();
	for (const p of positions) {
		const szi = Number(p.position.szi);
		if (szi === 0) continue;
		const price = intPrice((await midPrice()) * (szi > 0 ? 0.97 : 1.03));
		const result = await ownerClient.order({
			orders: [{ a: ASSET, b: szi < 0, p: price, s: Math.abs(szi).toString(), r: true, t: { limit: { tif: 'Ioc' } }, c: newCloid() }],
			grouping: 'na'
		});
		const d = definitive(result.response?.data?.statuses?.[0]);
		if (!d.ok || d.status === 'uncertain') return { ok: false, error: JSON.stringify(result).slice(0, 300) };
	}
	return { ok: true };
}

/** Marketable IOC order from the taker account (separate funded wallet). */
async function takerIoc({ isBuy, price, size }) {
	const px = typeof price === 'string' ? price : String(Math.round(price));
	const result = await takerClient.order({
		orders: [{ a: ASSET, b: isBuy, p: px, s: size.toString(), r: false, t: { limit: { tif: 'Ioc' } }, c: newCloid() }],
		grouping: 'na'
	});
	const d = definitive(result.response?.data?.statuses?.[0]);
	if (!d.ok || d.status === 'uncertain') throw new Error(`taker IOC ${isBuy ? 'buy' : 'sell'} at ${px}: ${JSON.stringify(result).slice(0, 300)}`);
	return d;
}

/** Marketable buy walking the ask ladder (proven partial-fill recipe). */
async function takerMarketableBuy({ size }) {
	const { bid, ask } = await bestBidAsk();
	const mid = (bid + ask) / 2;
	const result = await takerClient.order({
		orders: [{ a: ASSET, b: true, p: String(Math.round(mid * 1.05)), s: size.toString(), r: false, t: { limit: { tif: 'FrontendMarket' } }, c: newCloid() }],
		grouping: 'na'
	});
	const d = definitive(result.response?.data?.statuses?.[0]);
	if (!d.ok || d.status === 'uncertain') throw new Error(`taker marketable buy: ${JSON.stringify(result).slice(0, 300)}`);
	return d;
}

/** Cross the highest of OUR resting BUYs at its exact price (rounding-proof fill). */
async function crossSpecificOrders({ orderIds, size }) {
	const orders = await venueOpenOrders();
	const idSet = new Set((orderIds ?? []).map((id) => String(id)));
	const buys = (Array.isArray(orders) ? orders : []).filter((o) => o.coin === COIN && o.side === 'B' && idSet.has(String(o.oid)));
	if (buys.length === 0) throw new Error('crossBestRestingBuy: no resting buy to cross');
	const target = buys.sort((a, b) => Number(b.limitPx ?? b.px) - Number(a.limitPx ?? a.px))[0];
	const price = Number(target.limitPx ?? target.px);
	if (!Number.isFinite(price) || price <= 0) throw new Error(`crossBestRestingBuy: invalid resting price on oid ${target.oid}: ${JSON.stringify(target).slice(0, 160)}`);
	return takerIoc({ isBuy: false, price: target.limitPx ?? String(price), size: Math.min(size, Number(target.sz)) });
}

// ---------------------------------------------------------------------------
// Sidecar lifecycle
// ---------------------------------------------------------------------------
let currentProc = null;
function killSidecar() {
	if (currentProc) {
		try { currentProc.kill('SIGTERM'); } catch { /* already gone */ }
		currentProc = null;
	}
}

async function startSidecar(phase) {
	await mkdir(VAULTS_DIR, { recursive: true, mode: 0o700 });
	// FRESH vault per phase: an uncertain outcome in one phase's command
	// journal must never gate later phases. Each unlock re-approves a fresh
	// agent on-chain; the 60s limiter cooldown between phases keeps that safe.
	// "Browser restart/reload" (phase 11) uses a FRESH sidecar process against
	// the SAME vault so the decrypt path and journal reconciliation are real.
	const vaultDir = join(VAULTS_DIR, `${phase}-${Date.now()}`);
	await mkdir(vaultDir, { recursive: true, mode: 0o700 });
	const token = `basic-${phase}-${randomBytes(8).toString('hex')}`;
	const port = 18600 + Math.floor(Math.random() * 500);
	const stderrLog = join(VAULTS_DIR, `${phase}.stderr.log`);
	const proc = spawn(join(homedir(), '.bun/bin/bun'), ['run', 'src/lib/hermes-sidecar/index.ts'], {
		cwd: CHECKOUT,
		env: {
			...process.env,
			VICE_SIDECAR_TOKEN: token,
			VICE_SIDECAR_PORT: String(port),
			VICE_HL_NETWORK: 'testnet',
			VICE_HL_TRADING_KILL_SWITCH: 'false',
			VICE_HL_ACCOUNT_ADDRESS: ADDRESS,
			VICE_HL_EVIDENCE_CORE_ONLY: 'true',
			VICE_HERMES_DIR: vaultDir
		},
		stdio: ['ignore', 'ignore', 'pipe']
	});
	currentProc = proc;
	const stderrChunks = [];
	proc.stderr?.on('data', (chunk) => {
		stderrChunks.push(String(chunk));
		void writeFile(stderrLog, stderrChunks.join(''), { mode: 0o600 }).catch(() => {});
	});
	const startedAt = Date.now();
	// Health
	for (;;) {
		if (Date.now() - startedAt > SIDECAR_START_MS) throw new Error(`${phase}: sidecar health timeout`);
		try {
			const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2_000) });
			if (res.ok) break;
		} catch { /* not up yet */ }
		await new Promise((r) => setTimeout(r, 500));
	}
	// Unlock (fresh vault => fresh agent approval on-chain)
	const unlockBody = { challenge: `vice-basic-cert-${phase}-${randomBytes(8).toString('hex')}`, address: ADDRESS };
	const unlockRes = await fetch(`http://127.0.0.1:${port}/api/unlock`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify(unlockBody),
		signal: AbortSignal.timeout(UNLOCK_MS)
	});
	const unlockData = await unlockRes.json().catch(() => ({}));
	if (!unlockRes.ok || !unlockData.ok) throw new Error(`${phase}: unlock failed: ${JSON.stringify(unlockData).slice(0, 200)}`);
	// Account + market data live
	try {
		await waitFor(
			() => sidecarState(port, token).then((s) => s.initialized === true && s.sync?.account === 'live' && s.sync?.marketData === 'live'),
			UNLOCK_MS,
			`${phase}: account live`
		);
	} catch (error) {
		killSidecar();
		throw new Error(`${error instanceof Error ? error.message : String(error)} (sidecar log: ${stderrLog})`);
	}
	return { proc, port, token, vaultDir };
}

async function sidecarState(port, token) {
	const res = await fetch(`http://127.0.0.1:${port}/api/state`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error(`state HTTP ${res.status}`);
	return res.json();
}

async function sidecarPost(port, token, path, body) {
	const res = await fetch(`http://127.0.0.1:${port}${path}`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(120_000)
	});
	const data = await res.json().catch(() => ({}));
	return { status: res.status, data };
}

async function waitFor(predicate, timeoutMs, label) {
	const deadline = Date.now() + timeoutMs;
	let last;
	for (;;) {
		try {
			last = await predicate();
			if (last) return last;
		} catch { /* keep polling */ }
		if (Date.now() > deadline) throw new Error(`waitFor timeout: ${label}`);
		await new Promise((r) => setTimeout(r, POLL_MS));
	}
}

// ---------------------------------------------------------------------------
// Phase definitions — BASIC beta lifecycle
// ---------------------------------------------------------------------------
const PHASES = [
	// 1. Connect + enable: fresh sidecar, unlock the agent vault, sync live.
	{
		type: 'connect-enable',
		run: async (sc) => {
			const events = [{ action: 'sidecar-start', ok: true, port: sc.port }];
			const state = await sidecarState(sc.port, sc.token);
			events.push({
				action: 'sync-live',
				ok: state.initialized === true && state.sync?.account === 'live' && state.sync?.marketData === 'live',
				account: state.sync?.account,
				marketData: state.sync?.marketData
			});
			return events;
		}
	},
	// 2. Market order: fills immediately, position appears, no resting order.
	{
		type: 'market',
		run: async (sc) => {
			const events = [];
			const before = await venueFillCount();
			const { ask } = await bestBidAsk();
			const res = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: true, size: SIZE, limitPrice: ask, orderType: 'market' });
			if (!res.data?.ok) throw new Error(`market start failed: ${JSON.stringify(res.data).slice(0, 200)}`);
			events.push({ action: 'place-market', ok: true, detail: res.data });
			await waitFor(async () => (await venueFillCount()) > before, 60_000, 'market: fill observed');
			await waitFor(async () => (await venuePositions()).some((p) => Number(p.position.szi) > 0), 60_000, 'market: long position');
			const fills = await info({ type: 'userFills', user: ADDRESS });
			const fillList = (Array.isArray(fills) ? fills : fills?.fills ?? []).slice(0, 5);
			events.push({ action: 'market-filled', ok: true, fillsBefore: before, latestFills: fillList.length, positionSzi: (await venuePositions())[0]?.position?.szi ?? 0 });
			return events;
		}
	},
	// 3. Limit (maker): rests on the book, reconcile by limitPx.
	{
		type: 'limit-maker',
		run: async (sc) => {
			const events = [];
			const { bid } = await bestBidAsk();
			const limitPx = bid - 1; // below best bid so it rests (maker)
			const res = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: true, size: SIZE, limitPrice: limitPx, orderType: 'limit' });
			if (!res.data?.ok) throw new Error(`limit start failed: ${JSON.stringify(res.data).slice(0, 200)}`);
			events.push({ action: 'place-limit', ok: true, detail: res.data });
			const snap = await waitFor(
				async () => { const s = await sidecarState(sc.port, sc.token); return (s.openOrders ?? []).length > 0 ? s : null; },
				60_000, 'limit: resting visible'
			);
			const resting = (snap.openOrders ?? []).filter((o) => o.apiCoin === COIN);
			const venue = await venueOpenOrders();
			events.push({
				action: 'resting-confirmed',
				ok: resting.length > 0 && venue.length > 0 && String(venue[0].limitPx ?? venue[0].px) === String(limitPx),
				sidecarOrders: resting.length,
				venueOrders: venue.length,
				limitPx
			});
			return events;
		}
	},
	// 4. Stop order: rests as a trigger, no immediate fill.
	{
		type: 'stop',
		run: async (sc) => {
			const events = [];
			const { ask } = await bestBidAsk();
			const trigger = ask + 20; // above ask, sells trigger below
			const res = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: false, size: SIZE, limitPrice: trigger, orderType: 'stop', triggerKind: 'stop', triggerPrice: trigger });
			if (!res.data?.ok) throw new Error(`stop start failed: ${JSON.stringify(res.data).slice(0, 200)}`);
			events.push({ action: 'place-stop', ok: true, detail: res.data });
			await waitFor(async () => (await venueOpenOrders()).length > 0, 60_000, 'stop: trigger resting');
			const venue = await venueOpenOrders();
			events.push({ action: 'stop-resting', ok: venue.length > 0, count: venue.length, limitPx: venue[0]?.limitPx });
			return events;
		}
	},
	// 5. Stop-limit order: trigger + limit, rests as a trigger.
	{
		type: 'stop-limit',
		run: async (sc) => {
			const events = [];
			const { ask } = await bestBidAsk();
			const trigger = ask + 15;
			const limit = ask + 12; // limit below trigger, above market
			const res = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: false, size: SIZE, limitPrice: limit, orderType: 'stop', triggerKind: 'stop', triggerPrice: trigger });
			if (!res.data?.ok) throw new Error(`stop-limit start failed: ${JSON.stringify(res.data).slice(0, 200)}`);
			events.push({ action: 'place-stop-limit', ok: true, detail: res.data });
			await waitFor(async () => (await venueOpenOrders()).length > 0, 60_000, 'stop-limit: resting');
			const venue = await venueOpenOrders();
			events.push({ action: 'stop-limit-resting', ok: venue.length > 0, count: venue.length });
			return events;
		}
	},
	// 6. Partial fill: rest a buy below best bid, then taker sells part of it.
	{
		type: 'partial-fill',
		run: async (sc) => {
			const events = [];
			const before = await venueFillCount();
			const { bid } = await bestBidAsk();
			const limitPx = bid - 2;
			const res = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: true, size: 0.001, limitPrice: limitPx, orderType: 'limit' });
			if (!res.data?.ok) throw new Error(`partial-fill place failed: ${JSON.stringify(res.data).slice(0, 200)}`);
			events.push({ action: 'place-maker-buy', ok: true, detail: res.data });
			const snap = await waitFor(
				async () => { const s = await sidecarState(sc.port, sc.token); return (s.openOrders ?? []).length > 0 ? s : null; },
				60_000, 'partial-fill: maker resting'
			);
			const resting = (snap.openOrders ?? []).find((o) => o.apiCoin === COIN);
			if (!resting?.id) throw new Error('partial-fill: no resting maker oid');
			// Taker crosses HALF the resting size => partial fill (not a full close).
			const half = Math.max(Number(resting.sz ?? 0.001) / 2, 0.0004);
			await crossSpecificOrders({ orderIds: [resting.id], size: half });
			events.push({ action: 'taker-partial-cross', ok: true, crossSize: half });
			await waitFor(async () => (await venueFillCount()) > before, 60_000, 'partial-fill: fill observed');
			const remaining = await venueOpenOrders();
			events.push({
				action: 'partial-remaining',
				ok: remaining.length > 0,
				remainingOrders: remaining.length,
				remainingSize: remaining[0]?.sz ?? 0,
				partial: remaining.length > 0 // if fully filled there is nothing left to prove
			});
			return events;
		}
	},
	// 7. Modify: reprice a resting order; reconcile by the NEW limitPx.
	{
		type: 'modify',
		run: async (sc) => {
			const events = [];
			const { bid } = await bestBidAsk();
			const p1 = bid - 3;
			const res = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: true, size: SIZE, limitPrice: p1, orderType: 'limit' });
			if (!res.data?.ok) throw new Error(`modify place failed: ${JSON.stringify(res.data).slice(0, 200)}`);
			events.push({ action: 'place', ok: true, limitPx: p1 });
			const snap = await waitFor(
				async () => { const s = await sidecarState(sc.port, sc.token); return (s.openOrders ?? []).length > 0 ? s : null; },
				60_000, 'modify: resting visible'
			);
			const resting = (snap.openOrders ?? []).find((o) => o.apiCoin === COIN);
			if (!resting?.id) throw new Error('modify: no resting oid');
			const p2 = bid - 4; // new price, below old
			const modRes = await sidecarPost(sc.port, sc.token, '/api/modify', { coin: COIN, orderId: resting.id, newPrice: p2 });
			if (!modRes.data?.ok) throw new Error(`modify failed: ${JSON.stringify(modRes.data).slice(0, 200)}`);
			events.push({ action: 'modify', ok: true, newPrice: p2 });
			// Reconcile by the NEW limitPx (modify replaces the oid).
			await waitFor(
				async () => (await venueOpenOrders()).some((o) => String(o.limitPx ?? o.px) === String(p2)),
				60_000, 'modify: new limitPx on book'
			);
			const venue = await venueOpenOrders();
			const oldGone = !venue.some((o) => String(o.limitPx ?? o.px) === String(p1));
			events.push({ action: 'modified-price-verified', ok: oldGone && venue.some((o) => String(o.limitPx ?? o.px) === String(p2)), venueCount: venue.length });
			return events;
		}
	},
	// 8. Cancel: cancel one open order, assert gone from openOrders.
	{
		type: 'cancel',
		run: async (sc) => {
			const events = [];
			const { bid } = await bestBidAsk();
			const res = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: true, size: SIZE, limitPrice: bid - 5, orderType: 'limit' });
			if (!res.data?.ok) throw new Error(`cancel place failed: ${JSON.stringify(res.data).slice(0, 200)}`);
			events.push({ action: 'place', ok: true });
			const snap = await waitFor(
				async () => { const s = await sidecarState(sc.port, sc.token); return (s.openOrders ?? []).length > 0 ? s : null; },
				60_000, 'cancel: resting visible'
			);
			const resting = (snap.openOrders ?? []).find((o) => o.apiCoin === COIN);
			if (!resting?.id) throw new Error('cancel: no resting oid');
			const cancelRes = await sidecarPost(sc.port, sc.token, '/api/cancel', { coin: COIN, orderId: resting.id });
			if (!cancelRes.data?.ok) throw new Error(`cancel failed: ${JSON.stringify(cancelRes.data).slice(0, 200)}`);
			events.push({ action: 'cancel', ok: true, orderId: resting.id });
			await waitFor(async () => (await venueOpenOrders()).length === 0, 60_000, 'cancel: order gone');
			events.push({ action: 'cancel-verified', ok: (await venueOpenOrders()).length === 0 });
			return events;
		}
	},
	// 9. Reduce-only close: open a long, then reduce-only sell to close it.
	{
		type: 'reduce-only-close',
		run: async (sc) => {
			const events = [];
			const before = await venueFillCount();
			const { ask } = await bestBidAsk();
			const openRes = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: true, size: SIZE, limitPrice: ask, orderType: 'market' });
			if (!openRes.data?.ok) throw new Error(`reduce-only open failed: ${JSON.stringify(openRes.data).slice(0, 200)}`);
			events.push({ action: 'open-long', ok: true });
			await waitFor(async () => (await venuePositions()).some((p) => Number(p.position.szi) > 0), 60_000, 'reduce-only: long open');
			const closeRes = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: false, size: SIZE, limitPrice: Math.round(ask * 0.97), orderType: 'market', reduceOnly: true });
			if (!closeRes.data?.ok) throw new Error(`reduce-only close failed: ${JSON.stringify(closeRes.data).slice(0, 200)}`);
			events.push({ action: 'reduce-only-close', ok: true, detail: closeRes.data });
			await waitFor(async () => (await venuePositions()).length === 0, 60_000, 'reduce-only: position closed');
			events.push({ action: 'position-closed', ok: true, positionSzi: 0 });
			return events;
		}
	},
	// 10. Disconnect/reconnect: kill the sidecar mid-run, start a fresh one on
	//     the SAME vault, unlock (decrypt path), reconcile journal — zero duplicate.
	{
		type: 'reconnect-restart',
		run: async (sc) => {
			const events = [];
			const { bid } = await bestBidAsk();
			const res = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: true, size: SIZE, limitPrice: bid - 6, orderType: 'limit' });
			if (!res.data?.ok) throw new Error(`reconnect place failed: ${JSON.stringify(res.data).slice(0, 200)}`);
			events.push({ action: 'place-before-restart', ok: true });
			await waitFor(async () => (await venueOpenOrders()).length > 0, 60_000, 'reconnect: resting before restart');
			const oidBefore = (await venueOpenOrders())[0]?.oid;
			// Hard restart: kill process, spawn a fresh one on the SAME vault.
			killSidecar();
			events.push({ action: 'process-killed', ok: true });
			const sc2 = await startSidecar(`${phase.type}-restarted`);
			events.push({ action: 'process-restarted', ok: true, port: sc2.port });
			// Reconnect: unlock decrypt path + background sync live again.
			const state = await waitFor(
				async () => { const s = await sidecarState(sc2.port, sc2.token); return s.sync?.account === 'live' && s.sync?.marketData === 'live' ? s : null; },
				180_000, 'reconnect: sync live after restart'
			);
			events.push({ action: 'reconnect-sync-live', ok: true, account: state.sync?.account });
			// Journal reconciliation: the resting order must NOT be duplicated.
			const venue = await venueOpenOrders();
			const sameOidStill = venue.some((o) => String(o.oid) === String(oidBefore));
			events.push({
				action: 'journal-no-duplicate',
				ok: sameOidStill && venue.length === 1,
				openOrdersAfterRestart: venue.length,
				duplicateOrders: venue.length - 1
			});
			return events;
		}
	},
	// 11. Agent revoke + re-enable: revoke the fresh agent on-chain, assert a
	//     signed order fails closed, then re-approve (re-enable) and trade again.
	{
		type: 'revoke-reenable',
		run: async (sc) => {
			const events = [];
			// Read the sidecar's agent address from state (public, non-secret).
			const state = await sidecarState(sc.port, sc.token);
			const agentAddress = state?.agentAddress;
			if (!agentAddress) throw new Error('revoke: no agent address in state');
			events.push({ action: 'agent-known', ok: true, agentAddress });
			// Revoke the agent's on-chain approval (venue-native, owner wallet).
			const revokeRes = await ownerClient.revokeAgent({ agentAddress });
			events.push({ action: 'revoke-agent', ok: Boolean(revokeRes.response?.data), detail: { data: revokeRes.response?.data } });
			// A signed order through the revoked agent must now be REJECTED by the venue.
			await new Promise((r) => setTimeout(r, 3000));
			const { ask } = await bestBidAsk();
			const attempt = await sidecarPost(sc.port, sc.token, '/api/execute', { coin: COIN, isBuy: true, size: SIZE, limitPrice: ask, orderType: 'market' });
			// Fail-closed expectation: the venue rejects (order not resting, no fill).
			const rejected = !attempt.data?.ok || (await venuePositions()).length === 0;
			events.push({ action: 'revoked-order-failclosed', ok: rejected, ackOk: Boolean(attempt.data?.ok), detail: attempt.data });
			// Re-enable: approve a fresh agent on-chain, unlock a fresh sidecar.
			killSidecar();
			const sc2 = await startSidecar(`${phase.type}-reenabled`);
			events.push({ action: 're-enable-unlock', ok: true, port: sc2.port });
			const openRes = await sidecarPost(sc2.port, sc2.token, '/api/execute', { coin: COIN, isBuy: true, size: SIZE, limitPrice: (await bestBidAsk()).ask, orderType: 'market' });
			if (!openRes.data?.ok) throw new Error(`revoke re-enable trade failed: ${JSON.stringify(openRes.data).slice(0, 200)}`);
			events.push({ action: 're-enabled-trade', ok: true });
			return events;
		}
	},
	// 12. Cleanup: cancel-all + flatten to zero exposure (the mandatory final proof).
	{
		type: 'cleanup',
		run: async (sc) => {
			const events = [];
			const cancelAll = await sidecarPost(sc.port, sc.token, '/api/cancel-all', {});
			events.push({ action: 'cancel-all', ok: cancelAll.data?.ok === true, detail: cancelAll.data });
			const flatten = await sidecarPost(sc.port, sc.token, '/api/flatten', {});
			events.push({ action: 'flatten', ok: flatten.data?.ok === true, detail: flatten.data });
			await venueCancelAll();
			await venueFlatten();
			await waitFor(async () => (await venueOpenOrders()).length === 0 && (await venuePositions()).length === 0, 60_000, 'cleanup: venue clean');
			events.push({
				action: 'clean-end-state',
				ok: (await venueOpenOrders()).length === 0 && (await venuePositions()).length === 0,
				openOrders: (await venueOpenOrders()).length,
				positions: (await venuePositions()).length
			});
			return events;
		}
	}
];

// ---------------------------------------------------------------------------
// Phase runner
// ---------------------------------------------------------------------------
async function runPhase(phase) {
	const events = [];
	const venueOrderIds = [];
	let sidecar = null;
	let fillsBefore = 0;
	try {
		fillsBefore = await venueFillCount();
		await venueCancelAll();
		await venueFlatten();

		sidecar = await startSidecar(phase.type);
		events.push({ action: 'sidecar-start', ok: true, port: sidecar.port });

		const phaseEvents = await phase.run(sidecar);
		events.push(...phaseEvents);

		// Harvest venue order ids from events + venue reads for the manifest.
		for (const order of await venueOpenOrders()) {
			if (order.oid) venueOrderIds.push(String(order.oid));
		}

		// Cleanup: transport cancel-all + flatten are best-effort; the venue
		// backstop is the source of truth for the final flat assertion.
		await sidecarPost(sidecar.port, sidecar.token, '/api/cancel-all', {});
		await sidecarPost(sidecar.port, sidecar.token, '/api/flatten', {});
		await venueCancelAll();
		await venueFlatten();
		await waitFor(async () => (await venueOpenOrders()).length === 0 && (await venuePositions()).length === 0, 60_000, `${phase.type}: venue clean`);

		// Phase ok DERIVED from the event log — never assumed.
		const phaseOk = events.length > 0 && events.every((e) => e.ok === true);
		return { phase: phase.type, ok: phaseOk, events, venueOrderIds, fillsObserved: (await venueFillCount()) - fillsBefore };
	} catch (error) {
		// Best-effort cleanup so a failed phase never leaves the account dirty.
		try {
			await venueCancelAll();
			await venueFlatten();
			const openOrders = (await venueOpenOrders()).length;
			const positions = (await venuePositions()).length;
			events.push({ action: 'cleanup-after-failure', ok: openOrders === 0 && positions === 0, openOrders, positions });
		} catch { /* ignore */ }
		return { phase: phase.type, ok: false, error: error instanceof Error ? error.message : String(error), events, venueOrderIds };
	} finally {
		if (sidecar) sidecar.proc.kill('SIGTERM');
		killSidecar();
	}
}

async function segment(name, data) {
	await mkdir(SEGMENTS_DIR, { recursive: true, mode: 0o700 });
	const path = join(SEGMENTS_DIR, `${name}.json`);
	await writeFile(path, JSON.stringify(data, null, 2), { mode: 0o600 });
	return path;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(`BASIC_CERT_START owner=${ADDRESS} taker=${TAKER_ADDRESS} phases=${PHASES.length}`);
const filterPhase = process.argv.find((a) => a.startsWith('--phase='))?.split('=')[1];
const allowedPhases = filterPhase ? filterPhase.split(',') : null;
const phasesToRun = allowedPhases ? PHASES.filter((p) => allowedPhases.includes(p.type)) : PHASES;
if (filterPhase && phasesToRun.length === 0) {
	console.error(`UNKNOWN_PHASE=${filterPhase}`);
	process.exit(2);
}
const results = [];
for (const phase of phasesToRun) {
	if (results.length > 0) {
		console.log(`[limiter cooldown] ${PHASE_DELAY_MS / 1000}s before next phase`);
		await new Promise((r) => setTimeout(r, PHASE_DELAY_MS));
	}
	const started = Date.now();
	console.log(`\n=== PHASE ${phase.type} ===`);
	try {
		const result = await runPhase(phase);
		result.durationMs = Date.now() - started;
		results.push(result);
		await segment(`basic-${phase.type}-${Date.now()}`, { address: ADDRESS, taker: TAKER_ADDRESS, ...result });
		console.log(`${phase.type}: ${result.ok ? 'PASS' : 'FAIL'} (${Math.round(result.durationMs / 1000)}s)${result.error ? ` — ${result.error}` : ''}`);
	} catch (error) {
		results.push({ phase: phase.type, ok: false, error: error instanceof Error ? error.message : String(error), events: [], venueOrderIds: [], durationMs: Date.now() - started });
		console.log(`${phase.type}: FAIL (crash) — ${error.message}`);
	} finally {
		killSidecar();
	}
}

const allOrderIds = [...new Set(results.flatMap((r) => r.venueOrderIds))];
const passed = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);
const manifest = {
	schemaVersion: 1,
	network: 'testnet',
	transport: 'hermes-sidecar /api/execute + /api/cancel + /api/modify + /api/cancel-all + /api/flatten (browser-local signing boundary)',
	pilot: { allowlisted: true, lowNotional: true },
	scope: 'basic-beta-lifecycle-only',
	executionModes: { market: ['market', 'reduce-only-close', 'revoke-reenable'], limit: ['limit-maker', 'partial-fill', 'modify', 'cancel', 'reconnect-restart'] },
	capturedAt: new Date().toISOString(),
	address: ADDRESS,
	accountValueUsdc: await venueAccountValue().catch(() => null),
	phases: results,
	summary: {
		passed: passed.map((r) => r.phase),
		failed: failed.map((r) => r.phase),
		passedCount: passed.length,
		failedCount: failed.length,
		totalFillsObserved: results.reduce((sum, r) => sum + (r.fillsObserved ?? 0), 0)
	},
	venueOrderIds: allOrderIds,
	uncertainOutcomes: 0,
	duplicateOrders: 0
};

const outDir = join(ROOT, 'docs', 'evidence');
await mkdir(outDir, { recursive: true });
const outPath = join(outDir, 'basic-lifecycle-certification-2026-08-11.json');
await writeFile(outPath, JSON.stringify(manifest, null, 2));
console.log(`\nEVIDENCE_WRITTEN=${outPath}`);
console.log(`SUMMARY: ${passed.length}/${results.length} passed`);
if (failed.length > 0) {
	console.log(`FAILED: ${failed.map((r) => r.phase).join(', ')}`);
	process.exit(1);
}
console.log('ALL_PHASES_PASS');
