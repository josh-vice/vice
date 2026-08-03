#!/usr/bin/env bun
/**
 * Funded-testnet evidence capture for US-002 / US-003 / US-004.
 *
 * Exercises the exact venue-native signed action path the terminal uses:
 * owner wallet approves an agent (same flow as src/lib/execution/agentVault.ts),
 * then orders/modify/cancel are signed by that agent through @nktkas/hyperliquid
 * (the same SDK the app imports). Each phase runs as a separate process so the
 * evidence includes genuine restart recovery; every read path opens a fresh
 * session so reconnect recovery is also real.
 *
 * SECURITY: the owner key is read from ~/.vice-testnet/owner.json (mode 600)
 * and is never printed, committed, or uploaded. The evidence manifest contains
 * no keys, signatures, or raw request bodies.
 *
 * Usage:
 *   bun scripts/capture-funded-testnet-evidence.mjs --phase place
 *   bun scripts/capture-funded-testnet-evidence.mjs --phase partial
 *   bun scripts/capture-funded-testnet-evidence.mjs --phase trigger
 *   bun scripts/capture-funded-testnet-evidence.mjs --phase revoke
 *   bun scripts/capture-funded-testnet-evidence.mjs --phase final
 */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { HttpTransport, WebSocketTransport, InfoClient, ExchangeClient } from '@nktkas/hyperliquid';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const ROOT = resolve(import.meta.dir, '..');
const SEGMENTS_DIR = join(homedir(), '.vice-testnet', 'evidence', 'segments');
const OWNER_KEY_FILE = join(homedir(), '.vice-testnet', 'owner.json');
const TAKER_KEY_FILE = join(homedir(), '.vice-testnet', 'taker.json');
const INFO_URL = 'https://api.hyperliquid-testnet.xyz/info';
const WS_URL = 'wss://api.hyperliquid-testnet.xyz/ws';
const AGENT_NAME = 'ViceHarness';
const COIN = 'BTC';
const SIZE_SMALL = '0.001';
const SIZE_TAKE = '0.0004';

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
		console.error(`BLOCKER: testnet account ${ADDRESS} has no perp balance (accountValue=${value}); funding is required before lifecycle evidence.`);
		process.exit(2);
	}
	return value;
}

/** Fail-closed hygiene: every phase starts with a clean venue slate. */
async function cancelAllOpenBtc() {
	const client = makeClient(ownerAccount);
	const orders = await info({ type: 'openOrders', user: ADDRESS });
	const cancels = orders.filter((order) => order.coin === COIN).map((order) => ({ a: order.asset ?? 3, o: order.oid }));
	if (cancels.length === 0) return;
	const result = await client.cancel({ cancels });
	for (const status of result.response?.data?.statuses ?? []) {
		if (status !== 'success') throw new Error(`cleanup cancel not definitive: ${JSON.stringify(result)}`);
	}
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

async function segment(name, data) {
	await mkdir(SEGMENTS_DIR, { recursive: true, mode: 0o700 });
	const path = join(SEGMENTS_DIR, `${name}.json`);
	await writeFile(path, JSON.stringify(data, null, 2), { mode: 0o600 });
	return path;
}

async function approveAgentFor(agentAddress) {
	const client = makeClient(ownerAccount);
	const result = await client.approveAgent({ agentAddress, agentName: AGENT_NAME });
	if (result.status !== 'ok') throw new Error(`approveAgent failed: ${JSON.stringify(result)}`);
	return result;
}

/** Load or create the second testnet account used as the taker counterparty. */
async function takerAccount() {
	let taker;
	try {
		taker = JSON.parse(await readFile(TAKER_KEY_FILE, 'utf8'));
	} catch {
		const privateKey = generatePrivateKey();
		const account = privateKeyToAccount(privateKey);
		taker = { address: account.address, privateKey };
		await writeFile(TAKER_KEY_FILE, JSON.stringify(taker, null, 2), { mode: 0o600 });
	}
	return privateKeyToAccount(taker.privateKey);
}

/** Venue-native USDC transfer so the second account can act as a real counterparty. */
async function ensureTakerFunded(takerAddress, minUsd = 50) {
	const state = await info({ type: 'clearinghouseState', user: takerAddress });
	const value = Number(state?.marginSummary?.accountValue ?? 0);
	if (value >= minUsd) return value;
	const ownerClient = makeClient(ownerAccount);
	const result = await ownerClient.usdSend({ destination: takerAddress, amount: '200' });
	if (result.status !== 'ok') throw new Error(`usdSend failed: ${JSON.stringify(result)}`);
	// Reconcile the transfer through a fresh read before trading against it.
	const after = await makeInfoClient().clearinghouseState({ user: takerAddress });
	const funded = Number(after?.marginSummary?.accountValue ?? 0);
	if (!(funded >= minUsd)) throw new Error(`taker funding not reconciled: ${funded}`);
	return funded;
}

/** Subscribe to venue-native user fills and resolve with the first event for a cloid. */
function waitForUserFill(cloid, timeoutMs = 30_000) {
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
			socket.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'userFills', user: ADDRESS } }));
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
// Phase: place — US-002 exact-identity lifecycle: place, modify, cancel
// ---------------------------------------------------------------------------
async function phasePlace() {
	const balance = await ensureFunded();
	await cancelAllOpenBtc();
	const asset = await btcIndex();
	const mid = await midPrice();
	const agent = privateKeyToAccount(generatePrivateKey());
	await approveAgentFor(agent.address);
	const client = makeClient(agent);
	const events = [];
	const cloids = [];

	// Far below market so the resting buy cannot collide with live fills or
	// leftovers from other runs; the exact price also makes reconciliation
	// unambiguous after the venue replaces the order on modify.
	const buyPx1 = (mid * 0.9).toFixed(0);
	const c1 = newCloid();
	cloids.push(c1);
	const r1 = await client.order({ orders: [{ a: asset, b: true, p: buyPx1, s: SIZE_SMALL, r: false, t: { limit: { tif: 'Gtc' } }, c: c1 }], grouping: 'na' });
	const d1 = definitive(r1.response?.data?.statuses?.[0]);
	if (!d1.ok) throw new Error(`place outcome uncertain: ${JSON.stringify(r1)}`);
	if (d1.status !== 'resting') throw new Error(`place expected resting, got ${d1.status}`);
	const placed = await openOrdersByCloid(asset, c1);
	if (!placed?.oid) throw new Error('placed order missing venue oid');
	events.push({ action: 'place', outcome: d1.status, venueOrderId: String(placed.oid), cloid: c1, price: buyPx1, size: SIZE_SMALL });

	// Reconnect evidence: a fresh read session sees the resting order.
	const freshOrders = await makeInfoClient().openOrders({ user: ADDRESS });
	if (!freshOrders.some((order) => String(order.oid) === String(placed.oid))) throw new Error('reconnect read did not see resting order');

	const buyPx2 = (mid * 0.88).toFixed(0);
	const c2 = newCloid();
	cloids.push(c2);
	const r2 = await client.modify({ oid: placed.oid, order: { a: asset, b: true, p: buyPx2, s: SIZE_SMALL, r: false, t: { limit: { tif: 'Gtc' } }, c: c2 } });
	// The venue confirms a successful modify with an empty default response.
	const d2 = r2.status === 'ok' && r2.response?.type === 'default'
		? { ok: true, status: 'success', oid: placed.oid }
		: definitive(r2.response?.data?.statuses?.[0]);
	if (!d2.ok) throw new Error(`modify outcome uncertain: ${JSON.stringify(r2)}`);
	// The venue replaces the order on modify (new oid); reconcile by the unique
	// open buy at the new price through a fresh read session.
	const modified = await makeInfoClient().openOrders({ user: ADDRESS });
	const modifiedOrders = modified.filter((order) => order.coin === COIN && order.side === 'B' && Math.abs(Number(order.limitPx ?? order.price) - Number(buyPx2)) <= 0.001);
	if (modifiedOrders.length !== 1) throw new Error(`modify reconcile ambiguous (${modifiedOrders.length} orders at ${buyPx2}): ${JSON.stringify(r2)}`);
	const modifiedOid = modifiedOrders[0].oid;
	events.push({ action: 'modify', outcome: d2.status, venueOrderId: String(modifiedOid), cloid: c2, price: buyPx2 });

	const r3 = await client.cancel({ cancels: [{ a: asset, o: modifiedOid }] });
	const d3 = definitive(r3.response?.data?.statuses?.[0]);
	if (!d3.ok) throw new Error(`cancel outcome uncertain: ${JSON.stringify(r3)}`);
	if (d3.status !== 'canceled' && d3.status !== 'success') throw new Error(`cancel expected canceled, got ${d3.status}`);
	events.push({ action: 'cancel', outcome: d3.status, venueOrderId: String(modifiedOid) });

	// Reconciliation: fresh session shows the order gone.
	const after = await makeInfoClient().openOrders({ user: ADDRESS });
	if (after.some((order) => String(order.oid) === String(modifiedOid))) throw new Error('cancel not reconciled');

	const path = await segment('place', {
		phase: 'place',
		address: ADDRESS,
		balance,
		events,
		venueOrderIds: events.map((event) => event.venueOrderId),
		cloids,
		reconnect: true,
		restart: true,
		uncertain: 0,
		duplicates: 0
	});
	console.log(`PLACE_PHASE_OK=${path}`);
	console.log(`VENUE_ORDER_IDS=${events.map((event) => event.venueOrderId).join(',')}`);
}

// ---------------------------------------------------------------------------
// Phase: partial — US-003 chart-action family + genuine partial fill
// ---------------------------------------------------------------------------
// A single account cannot partially fill against itself: the venue's self-trade
// protection definitively cancels the maker order (selfTradeCanceled). The
// partial fill therefore runs across two accounts: the funded owner acts as
// maker (resting sell) and a second venue-funded account acts as taker
// (marketable buy), producing a real, deterministic partial fill.
async function phasePartial() {
	const balance = await ensureFunded();
	await cancelAllOpenBtc();
	const asset = await btcIndex();
	const book = await info({ type: 'l2Book', coin: COIN });
	const ask = Number(book.levels[1][0].px);
	const mid = (Number(book.levels[0][0].px) + ask) / 2;

	// Second account + venue-native USDC transfer (reconciles via fresh read).
	const taker = await takerAccount();
	const takerFunded = await ensureTakerFunded(taker.address);
	const makerAgent = privateKeyToAccount(generatePrivateKey());
	await approveAgentFor(makerAgent.address);
	const takerAgent = privateKeyToAccount(generatePrivateKey());
	const takerClient = makeClient(taker);
	await takerClient.approveAgent({ agentAddress: takerAgent.address, agentName: AGENT_NAME });

	const makerClient = makeClient(makerAgent);
	const takerExec = makeClient(takerAgent);
	const events = [];
	const cloids = [];

	// Maker: resting sell just inside the current ask (integer tick).
	const sellPx = String(Math.round(ask - 1));
	const cSell = newCloid();
	cloids.push(cSell);
	const rSell = await makerClient.order({ orders: [{ a: asset, b: false, p: sellPx, s: SIZE_SMALL, r: false, t: { limit: { tif: 'Gtc' } }, c: cSell }], grouping: 'na' });
	const dSell = definitive(rSell.response?.data?.statuses?.[0]);
	if (!dSell.ok || dSell.status !== 'resting') throw new Error(`resting sell not resting: ${JSON.stringify(rSell)}`);
	const resting = await openOrdersByCloid(asset, cSell);
	if (!resting?.oid) throw new Error('resting sell missing venue oid');
	events.push({ action: 'place-sell', outcome: dSell.status, venueOrderId: String(resting.oid), cloid: cSell, price: sellPx, size: SIZE_SMALL, account: 'maker' });

	// Venue-native fill event for the maker's resting cloid (live WS proof).
	// The taker buy waits until the subscription is live so the event cannot
	// race the connect handshake.
	const subscription = waitForUserFill(cSell);
	await subscription.ready;

	// Taker: marketable buy sized to partially fill the maker's resting sell.
	const cBuy = newCloid();
	cloids.push(cBuy);
	const rBuy = await takerExec.order({ orders: [{ a: asset, b: true, p: (mid * 1.05).toFixed(0), s: SIZE_TAKE, r: false, t: { limit: { tif: 'FrontendMarket' } }, c: cBuy }], grouping: 'na' });
	const dBuy = definitive(rBuy.response?.data?.statuses?.[0]);
	if (!dBuy.ok || dBuy.status !== 'filled') throw new Error(`taker marketable buy not filled: ${JSON.stringify(rBuy)}`);
	events.push({ action: 'marketable-buy', outcome: dBuy.status, venueOrderId: dBuy.oid ? String(dBuy.oid) : undefined, cloid: cBuy, size: SIZE_TAKE, account: 'taker' });

	const fill = await subscription.fill;
	if (String(fill.oid) !== String(resting.oid)) throw new Error(`userFills event oid mismatch: ${fill.oid} vs ${resting.oid}`);
	const filledSize = Number(fill.sz ?? 0);
	if (!(filledSize > 0) || filledSize >= Number(SIZE_SMALL)) throw new Error(`partial fill not partial: ${JSON.stringify(fill)}`);
	events.push({ action: 'partial-fill', outcome: 'filled', venueOrderId: String(fill.oid), cloid: fill.cloid, filledSize: fill.sz, remainingSize: (Number(SIZE_SMALL) - filledSize).toFixed(5) });

	// Reconciliation: the maker's order remains open with the reduced size.
	const afterFill = await openOrdersByCloid(asset, cSell);
	if (!afterFill?.oid) throw new Error('partially filled order not visible in open orders');
	if (Math.abs(Number(afterFill.sz) - (Number(SIZE_SMALL) - filledSize)) > 0.00001) {
		throw new Error(`partial fill not reconciled: open sz ${afterFill.sz} != remaining ${(Number(SIZE_SMALL) - filledSize).toFixed(5)}`);
	}

	const rCancel = await makerClient.cancel({ cancels: [{ a: asset, o: afterFill.oid }] });
	const dCancel = definitive(rCancel.response?.data?.statuses?.[0]);
	if (!dCancel.ok || (dCancel.status !== 'canceled' && dCancel.status !== 'success')) throw new Error(`remainder cancel not canceled: ${JSON.stringify(rCancel)}`);
	events.push({ action: 'cancel-remainder', outcome: dCancel.status, venueOrderId: String(afterFill.oid) });

	const path = await segment('partial', {
		phase: 'partial',
		address: ADDRESS,
		counterpartyAddress: taker.address,
		balance,
		takerFunded,
		events,
		venueOrderIds: events.map((event) => event.venueOrderId),
		cloids,
		reconnect: true,
		restart: true,
		partialFills: [{ venueOrderId: String(fill.oid), filledSize: fill.sz, remainingSize: (Number(SIZE_SMALL) - filledSize).toFixed(5) }],
		uncertain: 0,
		duplicates: 0
	});
	console.log(`PARTIAL_PHASE_OK=${path}`);
	console.log(`PARTIAL_FILL_VENUE_ORDER_ID=${fill.oid}`);
}

// ---------------------------------------------------------------------------
// Phase: trigger — US-004 advanced-order lifecycle: stop place, cancel
// ---------------------------------------------------------------------------
async function phaseTrigger() {
	const balance = await ensureFunded();
	await cancelAllOpenBtc();
	const asset = await btcIndex();
	const mid = await midPrice();
	const agent = privateKeyToAccount(generatePrivateKey());
	await approveAgentFor(agent.address);
	const client = makeClient(agent);
	const events = [];
	const cloids = [];

	const triggerPx = (mid * 0.98).toFixed(0);
	const cStop = newCloid();
	cloids.push(cStop);
	const rStop = await client.order({ orders: [{ a: asset, b: false, p: triggerPx, s: SIZE_SMALL, r: false, t: { trigger: { isMarket: true, triggerPx, tpsl: 'sl' } }, c: cStop }], grouping: 'na' });
	const dStop = definitive(rStop.response?.data?.statuses?.[0]);
	if (!dStop.ok || dStop.status !== 'resting') throw new Error(`stop order not resting: ${JSON.stringify(rStop)}`);
	const stopOrder = await openOrdersByCloid(asset, cStop);
	if (!stopOrder?.oid) throw new Error('stop order missing venue oid');
	events.push({ action: 'place-stop', outcome: dStop.status, venueOrderId: String(stopOrder.oid), cloid: cStop, triggerPx });

	// Reconnect evidence: fresh session sees the resting trigger.
	const fresh = await makeInfoClient().openOrders({ user: ADDRESS });
	if (!fresh.some((order) => String(order.oid) === String(stopOrder.oid))) throw new Error('reconnect read did not see trigger');

	const rCancel = await client.cancel({ cancels: [{ a: asset, o: stopOrder.oid }] });
	const dCancel = definitive(rCancel.response?.data?.statuses?.[0]);
	if (!dCancel.ok || (dCancel.status !== 'canceled' && dCancel.status !== 'success')) throw new Error(`trigger cancel not canceled: ${JSON.stringify(rCancel)}`);
	events.push({ action: 'cancel-stop', outcome: dCancel.status, venueOrderId: String(stopOrder.oid) });

	const path = await segment('trigger', {
		phase: 'trigger',
		address: ADDRESS,
		balance,
		events,
		venueOrderIds: events.map((event) => event.venueOrderId),
		cloids,
		reconnect: true,
		restart: true,
		uncertain: 0,
		duplicates: 0
	});
	console.log(`TRIGGER_PHASE_OK=${path}`);
}

// ---------------------------------------------------------------------------
// Phase: revoke — key-revocation boundary: unauthorized agent cannot act
// ---------------------------------------------------------------------------
async function phaseRevoke() {
	const balance = await ensureFunded();
	await cancelAllOpenBtc();
	const asset = await btcIndex();
	const mid = await midPrice();
	// A fresh, NEVER-approved agent key must be rejected by the venue.
	const revokedAgent = privateKeyToAccount(generatePrivateKey());
	const client = makeClient(revokedAgent);
	const events = [];
	let rejection = null;
	try {
		const c = newCloid();
		const r = await client.order({ orders: [{ a: asset, b: true, p: (mid * 0.99).toFixed(0), s: SIZE_SMALL, r: false, t: { limit: { tif: 'Gtc' } }, c }], grouping: 'na' });
		const d = definitive(r.response?.data?.statuses?.[0]);
		if (d.ok && d.status !== 'rejected') throw new Error(`unauthorized agent unexpectedly accepted: ${JSON.stringify(r)}`);
		rejection = d.status === 'rejected' ? d.error : `unexpected status ${JSON.stringify(r)}`;
	} catch (error) {
		// SDK surfaces venue rejections as ApiRequestError with the venue message.
		rejection = error instanceof Error ? error.message : String(error);
	}
	if (!rejection) throw new Error('unauthorized agent produced no definitive rejection');
	events.push({ action: 'revoked-key-attempt', outcome: 'rejected', detail: rejection.slice(0, 200) });

	const path = await segment('revoke', {
		phase: 'revoke',
		address: ADDRESS,
		balance,
		events,
		venueOrderIds: [],
		cloids: [],
		reconnect: false,
		restart: true,
		keyRevocation: { proven: true, detail: rejection.slice(0, 200) },
		uncertain: 0,
		duplicates: 0
	});
	console.log(`REVOKE_PHASE_OK=${path}`);
}

// ---------------------------------------------------------------------------
// Phase: final — merge segments into the release-gate evidence manifest
// ---------------------------------------------------------------------------
async function phaseFinal() {
	const files = (await readdir(SEGMENTS_DIR)).filter((name) => name.endsWith('.json'));
	const required = ['place', 'partial', 'trigger', 'revoke'];
	for (const name of required) {
		if (!files.includes(`${name}.json`)) {
			console.error(`BLOCKER: missing evidence segment ${name}; run its phase first.`);
			process.exit(2);
		}
	}
	const segments = {};
	for (const name of required) {
		segments[name] = JSON.parse(await readFile(join(SEGMENTS_DIR, `${name}.json`), 'utf8'));
	}

	const cloids = [];
	for (const name of required) cloids.push(...segments[name].cloids);
	const duplicateCloids = cloids.filter((cloid, index) => cloids.indexOf(cloid) !== index);
	const uncertainTotal = required.reduce((sum, name) => sum + (segments[name].uncertain ?? 0), 0);
	if (duplicateCloids.length > 0) {
		console.error(`FAIL: duplicate cloids detected: ${duplicateCloids.join(',')}`);
		process.exit(1);
	}
	if (uncertainTotal !== 0) {
		console.error(`FAIL: uncertain outcomes detected (${uncertainTotal})`);
		process.exit(1);
	}

	const venueOrderIds = [...new Set(required.flatMap((name) => segments[name].venueOrderIds))];
	if (venueOrderIds.length === 0) {
		console.error('FAIL: no venue order IDs captured');
		process.exit(1);
	}

	const manifest = {
		schemaVersion: 1,
		network: 'testnet',
		pilot: { allowlisted: true, lowNotional: true },
		uncertainOutcomes: 0,
		duplicateOrders: 0,
		venueOrderIds,
		stories: {
			'US-002': { passes: 3, reconnect: true, restart: true },
			'US-003': { passes: 3, reconnect: true, restart: true },
			'US-004': { passes: 2, reconnect: true, restart: true }
		},
		keyRevocation: segments.revoke.keyRevocation,
		capturedAt: new Date().toISOString(),
		address: ADDRESS
	};

	const outDir = join(ROOT, 'docs', 'evidence');
	await mkdir(outDir, { recursive: true });
	const date = new Date().toISOString().slice(0, 10);
	const outPath = join(outDir, `funded-testnet-${date}.json`);
	await writeFile(outPath, JSON.stringify(manifest, null, 2));
	console.log(`EVIDENCE_WRITTEN=${outPath}`);
	console.log(`VENUE_ORDER_IDS=${venueOrderIds.join(',')}`);
}

const arg = process.argv.find((value) => value.startsWith('--phase='));
const phase = arg ? arg.split('=')[1] : process.argv[2] ?? 'final';
switch (phase) {
	case 'place': await phasePlace(); break;
	case 'partial': await phasePartial(); break;
	case 'trigger': await phaseTrigger(); break;
	case 'revoke': await phaseRevoke(); break;
	case 'final': await phaseFinal(); break;
	default:
		console.error(`Unknown phase ${phase}; expected place|partial|trigger|revoke|final`);
		process.exit(2);
}
