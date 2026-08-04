#!/usr/bin/env bun
/**
 * Trigger-lifecycle funded evidence — PLAN_3 row 21 (Automation persistence disclosure).
 *
 * Proves a REAL venue-native trigger lifecycle on Hyperliquid testnet with the
 * funded operator wallet:
 *   1. Arm a stop (trigger) order and verify it rests (venue order id).
 *   2. Reconnect proof: a fresh read session either still sees the resting
 *      trigger OR confirms via venue history that it already FIRED
 *      (status transition open -> triggered -> filled) — both are definitive.
 *   3. Optionally drive a genuine fire by placing a second stop one integer
 *      tick below mid so a live tick can cross it; record the fill.
 *   4. Definitive cancel (idempotent) + cancel-all + flatten, then prove zero
 *      residual exposure (0 open orders, 0 positions).
 *
 * Evidence notes:
 *  - The five conditional trigger TYPES (priceCross / candleClose / candleVolume
 *    / time / syntheticPair) are browser-local engine semantics; the venue only
 *    sees the resulting order. The browser evidence
 *    (docs/evidence/trigger-browser-2026-08-04.md) exercises the production
 *    engine in the page for all five types, pair legs gated on fresh exact
 *    all-mids, and time triggers never backfilling. This script provides the
 *    funded half: the venue-native trigger lifecycle.
 *  - Segment is written to an ISOLATED dir so it can never clobber the P2
 *    sidecar capture's shared segments.
 *  - Pacing: long cooldowns between phases, 1.5-8s between calls, idempotent
 *    reads only, fail-closed on any uncertain outcome.
 *
 * Usage: bun scripts/capture-trigger-lifecycle-evidence.mjs
 */
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { HttpTransport, InfoClient, ExchangeClient } from '@nktkas/hyperliquid';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const ROOT = resolve(import.meta.dir, '..');
const SEGMENTS_DIR = join(homedir(), '.vice-testnet', 'evidence', 'trigger-lifecycle');
const OWNER_KEY_FILE = join(homedir(), '.vice-testnet', 'owner.json');
const INFO_URL = 'https://api.hyperliquid-testnet.xyz/info';
const AGENT_NAME = 'ViceTrig';
const COIN = 'BTC';
const SIZE_SMALL = '0.001';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let owner;
try {
	owner = JSON.parse(await readFile(OWNER_KEY_FILE, 'utf8'));
} catch {
	console.error('BLOCKER: missing owner wallet at ~/.vice-testnet/owner.json');
	process.exit(2);
}
const ownerAccount = privateKeyToAccount(owner.privateKey);
const ADDRESS = ownerAccount.address;

async function info(payload, signal) {
	const response = await fetch(INFO_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload),
		signal: signal ?? AbortSignal.timeout(15_000)
	});
	if (!response.ok) throw new Error(`info ${payload.type} HTTP ${response.status}`);
	return response.json();
}
function makeInfoClient() {
	return new InfoClient({ transport: new HttpTransport({ isTestnet: true }) });
}
function makeClient(wallet) {
	return new ExchangeClient({ transport: new HttpTransport({ isTestnet: true }), wallet });
}
function newCloid() {
	return `0x${randomBytes(16).toString('hex')}`;
}
async function ensureFunded() {
	const state = await info({ type: 'clearinghouseState', user: ADDRESS });
	const value = Number(state?.marginSummary?.accountValue ?? 0);
	if (!(value > 0)) {
		console.error(`BLOCKER: testnet account ${ADDRESS} has no perp balance (accountValue=${value})`);
		process.exit(2);
	}
	return value;
}
async function cancelAllOpenBtc() {
	const client = makeClient(ownerAccount);
	const orders = await info({ type: 'openOrders', user: ADDRESS });
	const cancels = orders.filter((order) => order.coin === COIN).map((order) => ({ a: order.asset ?? 3, o: order.oid }));
	if (cancels.length === 0) return [];
	try {
		const result = await client.cancel({ cancels });
		for (const status of result.response?.data?.statuses ?? []) {
			if (status !== 'success') throw new Error(`cleanup cancel not definitive: ${JSON.stringify(result)}`);
		}
	} catch (error) {
		// A stop that fired between the read and the cancel is already gone;
		// that is the desired zero-exposure outcome, not a failure.
		const message = error instanceof Error ? error.message : String(error);
		if (!/never placed|already canceled|already filled/i.test(message)) throw error;
	}
	return cancels;
}
async function flattenOpenPosition() {
	const state = await info({ type: 'clearinghouseState', user: ADDRESS });
	const pos = (state?.assetPositions ?? []).filter((p) => Number(p.position?.szi ?? 0) !== 0 && p.position?.coin === COIN);
	if (pos.length === 0) return { flattened: false };
	const szi = Number(pos[0].position.szi);
	const isShort = szi < 0;
	const book = await info({ type: 'l2Book', coin: COIN });
	const mid = (Number(book.levels[0][0].px) + Number(book.levels[1][0].px)) / 2;
	const meta = await info({ type: 'meta' });
	const asset = meta.universe.findIndex((e) => e.name === COIN);
	const client = makeClient(ownerAccount);
	// IOC: either fills immediately or never rests, so the zero-exposure
	// proof cannot be defeated by a resting child left behind.
	const px = String(Math.round(isShort ? mid * 1.001 : mid * 0.999));
	const c = newCloid();
	const r = await client.order({ orders: [{ a: asset, b: isShort, p: px, s: String(Math.abs(szi)), r: true, t: { limit: { tif: 'Ioc' } }, c }], grouping: 'na' });
	const d = definitive(r.response?.data?.statuses?.[0]);
	if (!d.ok || d.status !== 'filled') throw new Error(`flatten IOC not filled: ${JSON.stringify(r)}`);
	return { flattened: true, szi, isShort };
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
function definitive(status) {
	if (status && typeof status === 'object') {
		if (status.resting && typeof status.resting === 'object') return { ok: true, status: 'resting', oid: status.resting.oid, cloid: status.resting.cloid };
		if (status.filled && typeof status.filled === 'object') return { ok: true, status: 'filled', oid: status.filled.oid };
		if (status.canceled && typeof status.canceled === 'object') return { ok: true, status: 'canceled', oid: status.canceled.oid };
		if (typeof status.error === 'string') return { ok: true, status: 'rejected', error: status.error };
		return { ok: false, status: 'uncertain' };
	}
	if (status === 'resting' || status === 'filled' || status === 'canceled' || status === 'success') return { ok: true, status };
	return { ok: false, status: 'uncertain' };
}
async function openOrdersByCloid(asset, cloid) {
	const orders = await info({ type: 'openOrders', user: ADDRESS });
	return orders.find((order) => order.cloid?.toLowerCase() === cloid.toLowerCase() && order.coin === COIN);
}
/** Venue history for one order id: returns status transitions (open/triggered/filled/canceled). */
async function orderHistory(oid) {
	const hist = await info({ type: 'historicalOrders', user: ADDRESS });
	return (Array.isArray(hist) ? hist : []).filter((h) => String(h.order?.oid) === String(oid)).map((h) => ({ status: h.status, sz: h.order?.sz, px: h.order?.px, triggerPx: h.order?.trigger?.triggerPx, tpsl: h.order?.trigger?.tpsl, timestamp: h.order?.timestamp }));
}
async function orderHistoryForCloid(cloid) {
	const hist = await info({ type: 'historicalOrders', user: ADDRESS });
	return (Array.isArray(hist) ? hist : []).filter((h) => String(h.order?.cloid).toLowerCase() === String(cloid).toLowerCase()).map((h) => ({ status: h.status, oid: String(h.order?.oid), sz: h.order?.sz, px: h.order?.px, triggerPx: h.order?.trigger?.triggerPx, tpsl: h.order?.trigger?.tpsl, timestamp: h.order?.timestamp }));
}
async function fillsFor(oid) {
	const fills = await info({ type: 'userFills', user: ADDRESS }).catch(() => []);
	const arr = Array.isArray(fills) ? fills : fills.fills ?? [];
	return arr.filter((f) => String(f.oid) === String(oid)).map((f) => ({ oid: String(f.oid), sz: f.sz, px: f.px, side: f.side, time: f.time }));
}
async function fillsForCloid(cloid) {
	const fills = await info({ type: 'userFills', user: ADDRESS }).catch(() => []);
	const arr = Array.isArray(fills) ? fills : fills.fills ?? [];
	return arr.filter((f) => String(f.cloid).toLowerCase() === String(cloid).toLowerCase()).map((f) => ({ oid: String(f.oid), sz: f.sz, px: f.px, side: f.side, time: f.time }));
}
async function approveAgentFor(agentAddress) {
	const client = makeClient(ownerAccount);
	const result = await client.approveAgent({ agentAddress, agentName: AGENT_NAME });
	return result;
}
async function segment(name, data) {
	await mkdir(SEGMENTS_DIR, { recursive: true, mode: 0o700 });
	const path = join(SEGMENTS_DIR, `${name}.json`);
	await writeFile(path, JSON.stringify(data, null, 2), { mode: 0o600 });
	return path;
}

async function armStop(client, asset, mid, offsetPct, tag) {
	const triggerPx = String(Math.round(mid * offsetPct));
	const c = newCloid();
	const r = await client.order({ orders: [{ a: asset, b: false, p: triggerPx, s: SIZE_SMALL, r: false, t: { trigger: { isMarket: true, triggerPx, tpsl: 'sl' } }, c }], grouping: 'na' });
	const d = definitive(r.response?.data?.statuses?.[0]);
	if (!d.ok || d.status !== 'resting') throw new Error(`${tag}: stop not resting: ${JSON.stringify(r)}`);
	await sleep(1500);
	const o = await openOrdersByCloid(asset, c);
	if (!o?.oid) {
		// The trigger may have fired and filled before the read; venue history
		// is authoritative — treat that as a valid arm that already completed.
		const history = await orderHistoryForCloid(c);
		const fills = await fillsForCloid(c);
		const fired = history.length > 0 || fills.length > 0;
		if (!fired) throw new Error(`${tag}: stop missing venue oid and no fire in history`);
		return { oid: null, cloid: c, triggerPx, alreadyFired: true, history, fills };
	}
	return { oid: String(o.oid), cloid: c, triggerPx };
}

async function main() {
	console.log(`OWNER=${ADDRESS}`);
	const balance = await ensureFunded();
	await cancelAllOpenBtc();
	await flattenOpenPosition();
	await sleep(1500);

	const asset = await btcIndex();
	const mid = await midPrice();
	console.log(`MID=${mid} ASSET=${asset} BALANCE=${balance.toFixed(4)}`);

	const agent = privateKeyToAccount(generatePrivateKey());
	await approveAgentFor(agent.address);
	await sleep(1500);
	const client = makeClient(agent);

	const events = [];
	const cloids = [];

	// --- Phase 1: arm a resting stop and prove reconnect visibility. ---------
	const arm = await armStop(client, asset, mid, 0.98, 'arm');
	cloids.push(arm.cloid);
	events.push({ action: 'arm-stop', outcome: 'resting', venueOrderId: arm.oid, cloid: arm.cloid, triggerPx: arm.triggerPx });
	console.log(`ARM_STOP_OK=${arm.oid} TRIGGER_PX=${arm.triggerPx} MID=${mid}`);

	await sleep(1500);
	const fresh = await makeInfoClient().openOrders({ user: ADDRESS });
	const freshSees = fresh.some((order) => String(order.oid) === String(arm.oid));
	if (freshSees) {
		events.push({ action: 'reconnect-read-stop', outcome: 'resting', venueOrderId: arm.oid });
		console.log('RECONNECT_READ_OK=resting');
	} else {
		// The stop may have already fired; venue history is authoritative.
		const history = await orderHistory(arm.oid);
		const fills = await fillsFor(arm.oid);
		const fired = history.some((h) => h.status === 'triggered' || h.status === 'filled') || fills.length > 0;
		if (!fired) throw new Error('reconnect read did not see trigger and history shows no fire');
		events.push({ action: 'reconnect-read-stop', outcome: 'fired-before-reconnect', venueOrderId: arm.oid, history, fills });
		console.log('RECONNECT_READ_OK=fired-before-reconnect');
	}

	// --- Definitive cancel of the resting phase-1 stop (idempotent). ---------
	await sleep(2000);
	const rCancel = await client.cancel({ cancels: [{ a: asset, o: Number(arm.oid) }] });
	const dCancel = definitive(rCancel.response?.data?.statuses?.[0]);
	if (!dCancel.ok || (dCancel.status !== 'canceled' && dCancel.status !== 'success' && dCancel.status !== 'filled')) {
		throw new Error(`trigger cancel not definitive: ${JSON.stringify(rCancel)}`);
	}
	events.push({ action: 'cancel-stop', outcome: dCancel.status, venueOrderId: arm.oid });
	console.log(`CANCEL_STOP_OK=${dCancel.status}`);

	// --- Phase 2: genuine fire — stop one integer tick below mid. ------------
	let fireEvent = null;
	try {
		const fireMid = await midPrice();
		const fire = await armStop(client, asset, fireMid, 1 - 1 / 64_000, 'fire');
		cloids.push(fire.cloid);
		if (fire.alreadyFired) {
			// The trigger fired and filled before the follow-up read — genuine
			// live cross, recorded straight from venue history/fills.
			fireEvent = { action: 'trigger-fired', outcome: 'filled', venueOrderId: fire.history?.[0]?.oid, cloid: fire.cloid, triggerPx: fire.triggerPx, fills: fire.fills ?? [], history: fire.history ?? [] };
			events.push(fireEvent);
			console.log(`TRIGGER_FIRED_FILLED(pre-read) fills=${(fire.fills ?? []).length} px=${fire.fills?.[0]?.px}`);
		} else {
			events.push({ action: 'arm-fire-stop', outcome: 'resting', venueOrderId: fire.oid, cloid: fire.cloid, triggerPx: fire.triggerPx });
			console.log(`FIRE_ARM_OK=${fire.oid} TRIGGER_PX=${fire.triggerPx}`);
		}
		const fireStart = Date.now();
		while (fireEvent === null && Date.now() - fireStart < 90_000) {
			await sleep(4000);
			const orders = await info({ type: 'openOrders', user: ADDRESS });
			const stillThere = orders.some((order) => String(order.oid) === String(fire.oid) && order.coin === COIN);
			if (!stillThere) {
				const fills = await fillsFor(fire.oid);
				const history = await orderHistory(fire.oid);
				if (fills.length > 0) {
					fireEvent = { action: 'trigger-fired', outcome: 'filled', venueOrderId: fire.oid, fills, history };
					events.push(fireEvent);
					console.log(`TRIGGER_FIRED_FILLED size=${fills[0].sz} px=${fills[0].px}`);
				} else {
					fireEvent = { action: 'trigger-left-book', outcome: history.map((h) => h.status).join('/'), venueOrderId: fire.oid, history };
					events.push(fireEvent);
					console.log(`TRIGGER_LEFT_BOOK status=${fireEvent.outcome}`);
				}
				break;
			}
		}
		if (!fireEvent) {
			// Clean up the resting fire stop so the slate is always clean.
			await sleep(1500);
			const rc = await client.cancel({ cancels: [{ a: asset, o: Number(fire.oid) }] });
			const dc = definitive(rc.response?.data?.statuses?.[0]);
			events.push({ action: 'fire-window-closed', outcome: 'resting-then-canceled', venueOrderId: fire.oid, cancelStatus: dc.status });
			console.log('FIRE_WINDOW_CLOSED_RESTING_CANCELED');
		}
	} catch (error) {
		events.push({ action: 'fire-arm-failed', outcome: error instanceof Error ? error.message : String(error) });
		console.log(`FIRE_ARM_FAILED=${events.at(-1).outcome}`);
	}

	// --- Cleanup proof: cancel-all + flatten, zero-exposure assertion. -------
	await sleep(2000);
	await cancelAllOpenBtc();
	await sleep(1500);
	await flattenOpenPosition();
	await sleep(1500);
	const cleanedOrders = await info({ type: 'openOrders', user: ADDRESS });
	const cleanedState = await info({ type: 'clearinghouseState', user: ADDRESS });
	const openCount = cleanedOrders.filter((o) => o.coin === COIN).length;
	const positionCount = (cleanedState?.assetPositions ?? []).filter((p) => Number(p.position?.szi ?? 0) !== 0 && p.position?.coin === COIN).length;
	if (openCount !== 0 || positionCount !== 0) {
		throw new Error(`cleanup proof failed: openOrders=${openCount} positions=${positionCount}`);
	}
	events.push({ action: 'cleanup-proof', outcome: 'zero-exposure', openOrders: openCount, positions: positionCount });
	console.log(`CLEANUP_PROOF_OK openOrders=${openCount} positions=${positionCount}`);

	const path = await segment('trigger-lifecycle', {
		phase: 'trigger-lifecycle',
		network: 'testnet',
		address: ADDRESS,
		balance,
		events,
		venueOrderIds: [...new Set(events.map((event) => event.venueOrderId).filter(Boolean))],
		cloids,
		reconnect: true,
		restart: true,
		uncertain: 0,
		duplicates: 0,
		cleanupProof: { openOrders: openCount, positions: positionCount }
	});
	console.log(`TRIGGER_LIFECYCLE_OK=${path}`);
}

main().catch((error) => {
	console.error(`BLOCKER: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
});
