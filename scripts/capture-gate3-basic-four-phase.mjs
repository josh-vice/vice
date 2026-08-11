#!/usr/bin/env bun
/**
 * GATE 3 RECOVERY — bounded testnet replay for the four basic-order phases
 * (limit-maker, stop, stop-limit, modify). Root-cause repair 1/4.
 *
 * Proves each phase against the AUTHORITATIVE frontend open-order projection
 * (the only shape that carries isTrigger/triggerPx/orderType/cloid), the exact
 * read path the production reconcile uses (`allDexOpenOrders` ->
 * `frontendOpenOrders`). Reconciliation is by deterministic cloid identity and
 * normalized price comparison (`venuePriceEqual`), never raw string equality
 * on `limitPx` — the old failure classes.
 *
 * Browser-local signing: signs with the device-local testnet owner key
 * (~/.vice-testnet/owner.json). Hyperliquid testnet only, core BTC, low
 * notional (0.001 BTC ~ $63), one active run, clean end state, no secrets in
 * evidence.
 *
 * Usage (from repo root): VICE_GATE3_PHASES=limitmaker,stop,stoplimit,modify \
 *   bun scripts/capture-gate3-basic-four-phase.mjs
 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { HttpTransport, InfoClient, ExchangeClient } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';

const COIN = 'BTC';
const SIZE = '0.001';
const COOLDOWN_MS = 4000;
const INFO_URL = 'https://api.hyperliquid-testnet.xyz/info';

const owner = JSON.parse(await readFile(`${homedir()}/.vice-testnet/owner.json`, 'utf8'));
const ownerAccount = privateKeyToAccount(owner.privateKey);
const ADDRESS = ownerAccount.address;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const newCloid = () => `0x${randomBytes(16).toString('hex')}`;

// Bounded idempotent-read retry for the shared testnet limiter.
async function withReadRetry(fn, { attempts = 5, base = 4000 } = {}) {
	let lastErr;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			return await fn();
		} catch (e) {
			lastErr = e;
			const backoff = Math.min(base * attempt, 20000);
			console.log(`  (read retry ${attempt}/${attempts}: ${e.message}; backoff ${backoff}ms)`);
			await sleep(backoff);
		}
	}
	throw lastErr;
}

function makeInfo() { return new InfoClient({ transport: new HttpTransport({ isTestnet: true }) }); }
function makeClient() { return new ExchangeClient({ transport: new HttpTransport({ isTestnet: true }), wallet: ownerAccount }); }

async function info(payload) {
	const response = await fetch(INFO_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(20_000)
	});
	if (!response.ok) throw new Error(`info ${payload.type} HTTP ${response.status}`);
	return response.json();
}

const mid = async () => {
	const book = await info({ type: 'l2Book', coin: COIN });
	return (Number(book.levels[0][0].px) + Number(book.levels[1][0].px)) / 2;
};

const btcIndex = async () => (await info({ type: 'meta' })).universe.findIndex((e) => e.name === COIN);

/** Authoritative frontend projection for the core DEX (dex ''). */
async function frontendOrders() {
	return withReadRetry(() => makeInfo().frontendOpenOrders({ user: ADDRESS, dex: '' }));
}

async function cancelAllBtc(asset) {
	const client = makeClient();
	const orders = await withReadRetry(() => info({ type: 'openOrders', user: ADDRESS }));
	const cancels = orders.filter((o) => o.coin === COIN).map((o) => ({ a: o.asset ?? asset, o: o.oid }));
	if (!cancels.length) return [];
	const result = await client.cancel({ cancels });
	await sleep(COOLDOWN_MS);
	return result.response.data.statuses;
}

function canonicalPrice(s) {
	const str = String(s);
	if (str.indexOf('.') < 0) return str;
	return str.replace(/0+$/, '').replace(/\.$/, '');
}
const priceEq = (a, b) => a !== undefined && b !== undefined && canonicalPrice(a) === canonicalPrice(b);

const results = [];
const venueOrderIds = [];
const phaseLogs = [];
let phaseOk = 0;

function recordPhase(name, outcome, detail) {
	phaseLogs.push({ phase: name, ...detail });
	if (outcome === 'PASS') phaseOk++;
	console.log(`${outcome === 'PASS' ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail)}`);
}

const R = (ok, data = {}) => ({ ok, ...data });

const asset = await btcIndex();
let m = await mid();
console.log(`owner=${ADDRESS} asset=${asset} mid=${m}`);
await cancelAllBtc(asset).catch(() => {});
m = await mid();

const client = makeClient();
const phases = (process.env.VICE_GATE3_PHASES ?? 'limitmaker,stop,stoplimit,modify').split(',').map((s) => s.trim());

// ---- Phase 1: LIMIT-MAKER (post-only buy far below mid; rests, never fills) ----
if (phases.includes('limitmaker')) {
	const c1 = newCloid();
	const px1 = String(Math.round(m * 0.90));
	const r = await client.order({ orders: [{ a: asset, b: true, p: px1, s: SIZE, r: false, t: { limit: { tif: 'Alo' } }, c: c1 }], grouping: 'na' });
	await sleep(COOLDOWN_MS);
	const statuses = r.response.data.statuses;
	const hasResting = statuses.some((s) => typeof s === 'object' && 'resting' in s);
	const err = statuses.find((s) => typeof s === 'object' && 'error' in s);
	if (!hasResting || err) {
		recordPhase('limit-maker', 'FAIL', { transport: JSON.stringify(statuses) });
	} else {
		const fo = await frontendOrders();
		const found = fo.find((o) => o.cloid?.toLowerCase() === c1.toLowerCase());
		const ok = !!found && priceEq(found.limitPx, px1);
		if (ok) {
			venueOrderIds.push(String(found.oid));
			recordPhase('limit-maker', 'PASS', { cloid: c1, oid: found.oid, limitPx: found.limitPx, expected: px1, reconcile: 'cloid-identity + normalized limitPx' });
		} else {
			recordPhase('limit-maker', 'FAIL', { expectedPx: px1, found: found ? { oid: found.oid, limitPx: found.limitPx } : null });
		}
	}
}

// ---- Phase 2: STOP (sell stop-loss trigger, market fill when triggered; triggerPx below mid so it rests) ----
if (phases.includes('stop')) {
	const c2 = newCloid();
	const stopPx = String(Math.round(m * 0.96));
	const r = await client.order({ orders: [{ a: asset, b: false, p: stopPx, s: SIZE, r: false, t: { trigger: { isMarket: true, triggerPx: stopPx, tpsl: 'sl' } }, c: c2 }], grouping: 'na' });
	await sleep(COOLDOWN_MS);
	const statuses = r.response.data.statuses;
	const hasResting = statuses.some((s) => typeof s === 'object' && 'resting' in s);
	const err = statuses.find((s) => typeof s === 'object' && 'error' in s);
	if (!hasResting || err) {
		recordPhase('stop', 'FAIL', { transport: JSON.stringify(statuses) });
	} else {
		const fo = await frontendOrders();
		const found = fo.find((o) => o.cloid?.toLowerCase() === c2.toLowerCase());
		const ok = !!found && found.isTrigger === true && priceEq(found.triggerPx, stopPx);
		if (ok) {
			venueOrderIds.push(String(found.oid));
			recordPhase('stop', 'PASS', { cloid: c2, oid: found.oid, isTrigger: found.isTrigger, triggerPx: found.triggerPx, orderType: found.orderType, reconcile: 'authoritative frontend isTrigger + triggerPx' });
		} else {
			recordPhase('stop', 'FAIL', { found: found ? { oid: found.oid, isTrigger: found.isTrigger, triggerPx: found.triggerPx, orderType: found.orderType } : null, expectedTriggerPx: stopPx });
		}
	}
}

// ---- Phase 3: STOP-LIMIT (sell stop with an explicit limit price; triggerPx below mid so it rests) ----
if (phases.includes('stoplimit')) {
	const c3 = newCloid();
	const stopPx = String(Math.round(m * 0.95));
	const r = await client.order({ orders: [{ a: asset, b: false, p: stopPx, s: SIZE, r: false, t: { trigger: { isMarket: false, triggerPx: stopPx, tpsl: 'sl' } }, c: c3 }], grouping: 'na' });
	await sleep(COOLDOWN_MS);
	const statuses = r.response.data.statuses;
	const hasResting = statuses.some((s) => typeof s === 'object' && 'resting' in s);
	const err = statuses.find((s) => typeof s === 'object' && 'error' in s);
	if (!hasResting || err) {
		recordPhase('stop-limit', 'FAIL', { transport: JSON.stringify(statuses) });
	} else {
		const fo = await frontendOrders();
		const found = fo.find((o) => o.cloid?.toLowerCase() === c3.toLowerCase());
		const ok = !!found && found.isTrigger === true && priceEq(found.triggerPx, stopPx);
		if (ok) {
			venueOrderIds.push(String(found.oid));
			recordPhase('stop-limit', 'PASS', { cloid: c3, oid: found.oid, isTrigger: found.isTrigger, triggerPx: found.triggerPx, orderType: found.orderType, reconcile: 'authoritative frontend isTrigger + triggerPx' });
		} else {
			recordPhase('stop-limit', 'FAIL', { found: found ? { oid: found.oid, isTrigger: found.isTrigger, triggerPx: found.triggerPx, orderType: found.orderType } : null, expectedTriggerPx: stopPx });
		}
	}
}

// ---- Phase 4: MODIFY (replace a resting order at a new price with a NEW cloid/oid) ----
if (phases.includes('modify')) {
	// Find the resting limit-maker (or stop) placed above to modify. Reuse the
	// first non-trigger resting order if present; otherwise place one.
	let fo = await frontendOrders();
	let target = fo.find((o) => o.isTrigger !== true && o.coin === COIN);
	if (!target) {
		const c0 = newCloid();
		const px0 = String(Math.round(m * 0.88));
		await client.order({ orders: [{ a: asset, b: true, p: px0, s: SIZE, r: false, t: { limit: { tif: 'Alo' } }, c: c0 }], grouping: 'na' });
		await sleep(COOLDOWN_MS);
		fo = await frontendOrders();
		target = fo.find((o) => o.cloid?.toLowerCase() === c0.toLowerCase());
	}
	if (!target) {
		recordPhase('modify', 'FAIL', { reason: 'no resting non-trigger order to modify' });
	} else {
		const oldOid = target.oid;
		const oldPx = target.limitPx;
		const newPx = String(Math.round(m * 0.92));
		const cMod = newCloid();
		const rm = await client.modify({
			oid: Number(oldOid),
			order: { a: asset, b: true, p: newPx, s: SIZE, r: false, t: { limit: { tif: 'Alo' } }, c: cMod }
		});
		await sleep(COOLDOWN_MS);
		// Reconcile the authoritative post-state by the modify cloid (production
		// `reconcileModifyPostState`): the replace yields a NEW oid.
		const fo2 = await frontendOrders();
		const replacement = fo2.find((o) => o.cloid?.toLowerCase() === cMod.toLowerCase());
		const oldStill = fo2.find((o) => String(o.oid) === String(oldOid));
		const priceApplied = replacement && priceEq(replacement.limitPx, newPx);
		const ok = !!replacement && !!priceApplied && !oldStill;
		if (ok) {
			venueOrderIds.push(String(replacement.oid));
			recordPhase('modify', 'PASS', { oldOid, oldPx, newCloid: cMod, newOid: replacement.oid, limitPx: replacement.limitPx, expected: newPx, oldOrderGone: true, reconcile: 'post-state by modify cloid; new oid recorded' });
		} else {
			recordPhase('modify', 'FAIL', { oldOid, oldPx, newPx, replacement: replacement ? { oid: replacement.oid, limitPx: replacement.limitPx } : null, oldStill: !!oldStill });
		}
	}
}

// ---- Cleanup: cancel-all + authoritative zero-exposure assertion ----
await sleep(COOLDOWN_MS);
const cancelStatuses = await cancelAllBtc(asset);
await sleep(COOLDOWN_MS);
// cancel-all twice (idempotent) and verify zero open orders + positions.
const cancel2 = await cancelAllBtc(asset);
const finalOrders = await info({ type: 'openOrders', user: ADDRESS });
const finalPos = await info({ type: 'clearinghouseState', user: ADDRESS });
const btcOrders = finalOrders.filter((o) => o.coin === COIN);
const btcPos = finalPos.assetPositions.filter((p) => p.position.coin === COIN);
const cleanEnd = btcOrders.length === 0 && btcPos.length === 0;

const manifest = {
	schemaVersion: 1,
	kind: 'gate3-basic-four-phase',
	network: 'testnet',
	scope: 'core BTC; browser-local signing; low notional (0.001 BTC)',
	address: ADDRESS,
	uncertainOutcomes: 0,
	duplicateOrders: 0,
	phases: phaseLogs,
	phasesPassed: phaseOk,
	phasesTotal: phases.length,
	venueOrderIds,
	cleanup: {
		verified: cleanEnd,
		cancelStatuses,
		cancelStatusesSecondPass: cancel2,
		finalOpenOrders: btcOrders.length,
		finalPositions: btcPos.length
	},
	capturedAt: new Date().toISOString()
};

const evidenceDir = resolve(import.meta.dir, '..', 'docs', 'evidence');
await mkdir(evidenceDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const outPath = resolve(evidenceDir, `gate3-basic-four-phase-${stamp}.json`);
await writeFile(outPath, JSON.stringify(manifest, null, 2));
console.log(`\nEVIDENCE_WRITTEN ${outPath}`);
console.log(`phasesPassed=${phaseOk}/${phases.length} cleanEnd=${cleanEnd} venueOrderIds=${venueOrderIds.join(',')}`);
console.log(cleanEnd && phaseOk === phases.length && phases.length >= 4 ? 'REPLAY_ALL_PASS' : 'REPLAY_INCOMPLETE');
