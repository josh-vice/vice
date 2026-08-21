import { describe, expect, test } from 'bun:test';

const ROOT = new URL('../', import.meta.url).pathname;

function read(relative) {
	return Bun.file(new URL(relative, import.meta.url)).text();
}

function spawnProc(argv, opts = {}, timeoutMs = 30000) {
	const proc = Bun.spawn(argv, {
		cwd: ROOT,
		env: { ...process.env, ...(opts.env ?? {}) },
		stdout: 'pipe',
		stderr: 'pipe'
	});
	const timer = setTimeout(() => proc.kill(), timeoutMs);
	return proc.exited.then(async (code) => {
		clearTimeout(timer);
		const stdout = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();
		return { code, stdout, stderr };
	});
}

async function freePort() {
	const server = Bun.serve({ port: 0, fetch: () => new Response('x') });
	const port = server.port;
	server.stop(true);
	return port;
}

function alive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function untilGone(pids, timeoutMs = 3000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (pids.every((p) => !alive(p))) return true;
		await Bun.sleep(100);
	}
	return pids.every((p) => !alive(p));
}

async function pgidOf(pid) {
	const res = Bun.spawnSync(['ps', '-o', 'pgid=', '-p', String(pid)], { stdout: 'pipe' });
	const out = new TextDecoder().decode(res.stdout).trim();
	return out ? Number(out) : null;
}

async function readWithTimeout(reader, ms) {
	return Promise.race([
		reader.read(),
		new Promise((_, reject) => setTimeout(() => reject(new Error('stdout read timeout')), ms))
	]);
}

describe('one-command launcher safety', () => {
	test('rejects a backend/frontend host-port collision and exposes service identity', async () => {
		const source = await read('./dev.sh');
		const health = await read('../vice-backend/gateway/src/main.rs');
		const smoke = await read('./smoke.mjs');
		expect(source).toContain('backend and frontend cannot bind the same host/port');
		expect(source).toContain('VICE_SERVICE_ID');
		expect(health).toContain('no_shared_hyperliquid_key');
		expect(health).toContain('serviceId');
		expect(smoke).toContain("d.service === 'vice-backend'");
		expect(smoke).toContain("d.custody === 'no_shared_hyperliquid_key'");
		const verify = await read('./dev-verify.sh');
		expect(verify).toContain('VICE_BACKEND_URL');
		expect(verify).toContain('bun run smoke');
		expect(verify).toContain('bun run test:browser');
		expect(verify).toContain('scripts/live-feed-smoke.mjs');
		const liveFeed = await read('./live-feed-smoke.mjs');
		expect(liveFeed).toContain('criticalTimeoutMs');
		expect(liveFeed).toContain("const critical = new Set(['allMids', 'l2Book', 'trades'])");
		expect(verify).toContain('trap cleanup EXIT');
		expect(verify).toContain('START_STATUS_FILE');
		expect(verify).toContain('exited before verification completed (status ${status})');
	});

	test('one-command verifier owns its process group, checks ports before launch, and proves run identity', async () => {
		const verify = await read('./dev-verify.sh');
		const lib = await read('./dev-verify-lib.sh');
		const launcher = await read('./dev-verify-launch.py');
		const readiness = await read('./runtime-readiness.mjs');
		const tokenRoute = await read('../vice-terminal/src/routes/api/run-token/+server.ts');

		// Fail before launch with ownership diagnostics
		expect(verify).toContain('dev_verify_assert_ports_free "${BACKEND_PORT}" "${FRONTEND_PORT}"');
		expect(verify).toContain('Refusing to launch');
		expect(lib).toContain('already in use by PID(s)');

		// Owned process group via the setsid launcher
		expect(launcher).toContain('os.setsid()');
		expect(verify).toContain('dev-verify-launch.py');
		expect(verify).toContain('DEV_PGID');
		expect(lib).toContain('kill -TERM -- "-${pgid}"');
		expect(lib).toContain('kill -KILL -- "-${pgid}"');

		// Readiness must prove identity, not any healthy listener
		expect(verify).toContain('runtime-readiness.mjs');
		expect(readiness).toContain('--backend-service-id');
		expect(readiness).toContain('--frontend-token');
		expect(readiness).toContain('belongs to a different run');
		expect(tokenRoute).toContain('process.env.VICE_RUN_TOKEN');

		// Unique per-run identity wired into the launched stack: generated in
		// dev-verify.sh, passed to the launcher as args, set as env there.
		expect(verify).toContain('SERVICE_ID="vice-devverify-${RUN_ID}"');
		expect(verify).toContain('RUN_TOKEN="${RUN_ID}"');
		expect(verify).toContain('"${BACKEND_PORT}" "${FRONTEND_PORT}" "${SERVICE_ID}" "${RUN_TOKEN}"');
		expect(launcher).toContain('"VICE_SERVICE_ID": service_id');
		expect(launcher).toContain('"VICE_RUN_TOKEN": run_token');

		// 5. Post-cleanup port-free assertion before printing success.
		expect(verify).toContain('dev_verify_assert_ports_free "${BACKEND_PORT}" "${FRONTEND_PORT}"');
		expect(verify).toContain('One-command runtime verification passed.');
	});

	test('fails before launch when a requested port is occupied, with ownership diagnostics', async () => {
		// A pre-existing listener on a requested port must hard-fail BEFORE
		// anything is launched, with ownership diagnostics, instead of being
		// treated as readiness (the prior false-positive case).
		const blocker = Bun.serve({ port: 0, fetch: () => new Response('pre-existing service') });
		const blockerPort = blocker.port;
		const frontendPort = await freePort();
		const started = Date.now();
		const { code, stdout, stderr } = await spawnProc(
			['bash', 'scripts/dev-verify.sh'],
			{
				env: {
					VICE_BACKEND_PORT: String(blockerPort),
					VICE_FRONTEND_PORT: String(frontendPort)
				}
			},
			20000
		);
		const elapsed = Date.now() - started;
		blocker.stop(true);

		expect(code).not.toBe(0);
		expect(stderr).toContain(`port ${blockerPort} is already in use`);
		expect(stderr).toContain(String(process.pid)); // actionable: names the owning PID
		expect(stderr).toContain('Refusing to launch');
		expect(stdout + stderr).not.toContain('One-command runtime verification passed');
		expect(elapsed).toBeLessThan(15000); // failed fast, before any launch
	});

	test('readiness rejects healthy-but-unrelated services and accepts the run identity', async () => {
		// Healthy-but-unrelated services (a different serviceId / run token)
		// must be rejected — readiness is the identity handshake, not "any
		// healthy listener".
		const backend = Bun.serve({ port: 0, fetch: (req) => {
			if (new URL(req.url).pathname === '/health') {
				return Response.json({ status: 'ok', service: 'vice-backend', serviceId: 'other-run' });
			}
			return new Response('nope', { status: 404 });
		}});
		const frontend = Bun.serve({ port: 0, fetch: (req) => {
			const path = new URL(req.url).pathname;
			if (path === '/') return new Response('<html>suite-shell</html>', { headers: { 'content-type': 'text/html' } });
			if (path === '/api/run-token') return Response.json({ token: 'other-token' });
			return new Response('nope', { status: 404 });
		}});
		const run = (backendServiceId, frontendToken) => spawnProc(
			['bun', 'scripts/runtime-readiness.mjs', '--backend-url', `http://127.0.0.1:${backend.port}`, '--backend-service-id', backendServiceId, '--frontend-url', `http://127.0.0.1:${frontend.port}`, '--frontend-token', frontendToken, '--timeout-ms', '1500'],
			{}, 15000
		);
		// wrong backend identity -> fail
		const wrongBackend = await run('expected-run', 'expected-token');
		expect(wrongBackend.code).not.toBe(0);
		expect(wrongBackend.stderr).toContain('different run');
		// correct backend, wrong frontend token -> fail
		const wrongFrontend = await run('other-run', 'expected-token');
		expect(wrongFrontend.code).not.toBe(0);
		expect(wrongFrontend.stderr).toContain('different run');
		// both correct -> pass
		const bothRight = await run('other-run', 'other-token');
		expect(bothRight.code).toBe(0);
		backend.stop(true); frontend.stop(true);
	});

	test('owned process-group termination kills the whole tree and spares outsiders', async () => {
		// Synthetic tree in its own session, mirroring scripts/dev-verify-launch.py:
		const treeSource = `
import os, subprocess, sys
os.setsid()
sys.stdout.write("leader:" + str(os.getpid()) + "\\n")
sys.stdout.flush()
c1 = subprocess.Popen(["sleep", "30"])
c2 = subprocess.Popen(["sleep", "30"])
nested = subprocess.Popen([sys.executable, "-c", "import subprocess,sys; ch=subprocess.Popen(['sleep','30']); print('s3:'+str(ch.pid), flush=True); ch.wait()"])
sys.stdout.write("p1:" + str(c1.pid) + "\\n")
sys.stdout.write("p2:" + str(c2.pid) + "\\n")
sys.stdout.flush()
c1.wait(); c2.wait(); nested.wait()
`;
		let tree = null;
		let control = null;
		try {
			tree = Bun.spawn(['python3', '-c', treeSource], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
			// control process OUTSIDE the tree (in the test runner's group)
			control = Bun.spawn(['sleep', '30'], { stdout: 'ignore', stderr: 'ignore' });

			// wait for the tree to print its pids
			const outReader = tree.stdout.getReader();
			const decoder = new TextDecoder();
			let out = '';
			const deadline = Date.now() + 5000;
			while (!out.includes('p1:') || !out.includes('s3:')) {
				const { done, value } = await readWithTimeout(outReader, 5000);
				if (done) break;
				out += decoder.decode(value, { stream: true });
				if (Date.now() > deadline) break;
			}
			await outReader.cancel();

			const leader = Number(/leader:(\d+)/.exec(out)?.[1] ?? 0);
			const p1 = Number(/p1:(\d+)/.exec(out)?.[1] ?? 0);
			const p2 = Number(/p2:(\d+)/.exec(out)?.[1] ?? 0);
			const s3 = Number(/s3:(\d+)/.exec(out)?.[1] ?? 0);
			expect(leader).toBeGreaterThan(0);
			expect(p1).toBeGreaterThan(0);
			expect(p2).toBeGreaterThan(0);
			expect(s3).toBeGreaterThan(0);

			// every tree member shares the leader's process group
			expect(await pgidOf(leader)).toEqual(leader);
			expect(await pgidOf(p1)).toEqual(leader);
			expect(await pgidOf(p2)).toEqual(leader);
			expect(await pgidOf(s3)).toEqual(leader);

			// kill ONLY the owned group via the exact production function
			const killResult = await spawnProc(
				['bash', '-c', 'source scripts/dev-verify-lib.sh && dev_verify_owned_group_kill "$1"', 'kill-sh', String(leader)],
				{},
				15000
			);
			expect(killResult.code).toBe(0);

			// reap the tree leader (its parent is this test runner)
			await tree.exited.catch(() => {});

			// no member of the owned group survives
			expect(await untilGone([leader, p1, p2, s3])).toBe(true);

			// the outsider was never touched
			expect(alive(control.pid)).toBe(true);
		} finally {
			if (tree) { try { tree.kill(); } catch {} }
			if (control) { try { control.kill(); } catch {} }
		}
	});

	test('reports and cleans up when the launcher exits before readiness (early-failure path)', async () => {
		// Strip bun from PATH so the launcher fails immediately (status 127)
		// before it can own a process group. The verifier must detect the
		// early launcher exit, report it, and leave both ports free.
		const backendPort = await freePort();
		const frontendPort = await freePort();
		const filteredPath = (process.env.PATH ?? '').split(':').filter((p) => !p.toLowerCase().includes('bun')).join(':');
		const { code, stdout, stderr } = await spawnProc(
			['bash', 'scripts/dev-verify.sh'],
			{
				env: {
					...process.env,
					PATH: filteredPath,
					VICE_BACKEND_PORT: String(backendPort),
					VICE_FRONTEND_PORT: String(frontendPort)
				}
			},
			20000
		);
		expect(code).not.toBe(0);
		expect(stderr).toContain('failed to start the one-command dev launcher (owned process group)');
		expect(stderr).toContain('bun not found on PATH');

		// Ports must be free after the failed run.
		await Bun.sleep(300);
		const backendCheck = await spawnProc(['lsof', '-nP', '-tiTCP:' + String(backendPort), '-sTCP:LISTEN'], {}, 5000);
		const frontendCheck = await spawnProc(['lsof', '-nP', '-tiTCP:' + String(frontendPort), '-sTCP:LISTEN'], {}, 5000);
		expect(backendCheck.stdout.trim()).toBe('');
		expect(frontendCheck.stdout.trim()).toBe('');
	});
});
