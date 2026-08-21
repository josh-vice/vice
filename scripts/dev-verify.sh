#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PORT="${VICE_BACKEND_PORT:-8080}"
FRONTEND_PORT="${VICE_FRONTEND_PORT:-5173}"
BACKEND_URL="${VICE_BACKEND_URL:-http://127.0.0.1:${BACKEND_PORT}}"
FRONTEND_URL="${VICE_FRONTEND_URL:-http://127.0.0.1:${FRONTEND_PORT}}"
DEV_PID=""
DEV_PGID=""
START_STATUS_FILE="${TMPDIR:-/tmp}/vice-dev-verify.${$}.status"
PGID_FILE="${TMPDIR:-/tmp}/vice-dev-verify.${$}.pgid"

# Unique run identity. The backend echoes it from /health as serviceId; the
# frontend echoes it from /api/run-token. Readiness only passes when BOTH
# responses match this run, so a pre-existing listener on either port can
# never satisfy the verifier (the prior false-positive case).
RUN_ID="$(date +%s)-${RANDOM}-$$"
SERVICE_ID="vice-devverify-${RUN_ID}"
RUN_TOKEN="${RUN_ID}"

# shellcheck disable=SC1091
source "${ROOT}/scripts/dev-verify-lib.sh"

if ! command -v python3 >/dev/null 2>&1; then
	echo "Error: python3 not found; the owned process-group launcher (scripts/dev-verify-launch.py) requires it." >&2
	exit 1
fi

# 1. Fail BEFORE launch if either requested port is occupied, with ownership
#    diagnostics (PID + command). Nothing is spawned until both ports are free.
if ! dev_verify_assert_ports_free "${BACKEND_PORT}" "${FRONTEND_PORT}" \
	"Refusing to launch. Free the port or set VICE_BACKEND_PORT / VICE_FRONTEND_PORT to unused ports."; then
	exit 1
fi

cleanup() {
	set +e
	local pgid="${DEV_PGID}"
	DEV_PGID=""
	if [[ -n "${pgid}" ]]; then
		# 4. Terminate only the process group this run owns. The launcher
		#    created a new session (os.setsid), so cargo -> gateway binary and
		#    bun -> vite share PGID == the launcher PID. TERM then KILL reaches
		#    the whole tree and nothing outside it (the prior orphan-child case).
		dev_verify_owned_group_kill "${pgid}"
		if [[ -n "${DEV_PID}" ]]; then
			wait "${DEV_PID}" 2>/dev/null
		fi
		# 5. After cleanup, prove the ports were released.
		if dev_verify_ports_occupied "${BACKEND_PORT}" "${FRONTEND_PORT}"; then
			echo "Error: ports ${BACKEND_PORT}/${FRONTEND_PORT} still have listeners after cleanup" >&2
			dev_verify_port_owner_diagnostics "${BACKEND_PORT}"
			dev_verify_port_owner_diagnostics "${FRONTEND_PORT}"
		fi
	fi
	rm -f "${START_STATUS_FILE}" "${PGID_FILE}"
	set -e
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# 2. Launch the one-command dev stack in an OWNED process group. The launcher
#    writes its group-leader PID to ${PGID_FILE} immediately after setsid.
python3 "${ROOT}/scripts/dev-verify-launch.py" \
	"${PGID_FILE}" "${START_STATUS_FILE}" "${ROOT}" \
	"${BACKEND_PORT}" "${FRONTEND_PORT}" "${SERVICE_ID}" "${RUN_TOKEN}" &
DEV_PID=$!

# read owned group leader
for _ in $(seq 1 100); do
	if [[ -s "${PGID_FILE}" ]]; then
		DEV_PGID="$(<"${PGID_FILE}")"
		break
	fi
	if ! kill -0 "${DEV_PID}" 2>/dev/null; then
		break
	fi
	sleep 0.1
done
if [[ -z "${DEV_PGID}" ]]; then
	echo "Error: failed to start the one-command dev launcher (owned process group)" >&2
	exit 1
fi

# 3. Identity-bound readiness loop: backend /health must echo THIS run's
#    serviceId and frontend /api/run-token must echo THIS run's token.
ready=0
for _ in $(seq 1 180); do
	if [[ -f "${START_STATUS_FILE}" ]]; then
		status="$(<"${START_STATUS_FILE}")"
		echo "Error: one-command dev launcher exited before verification completed (status ${status})" >&2
		exit 1
	fi
	if ! kill -0 "${DEV_PID}" 2>/dev/null; then
		echo "Error: one-command dev launcher exited before verification completed" >&2
		exit 1
	fi
	if bun scripts/runtime-readiness.mjs \
		--backend-url "${BACKEND_URL}" \
		--backend-service-id "${SERVICE_ID}" \
		--frontend-url "${FRONTEND_URL}" \
		--frontend-token "${RUN_TOKEN}" \
		--timeout-ms 2500; then
		ready=1
		break
	fi
	sleep 1
done

if (( ready == 0 )); then
	echo "Error: services did not become ready for verification" >&2
	exit 1
fi

# 4. Verification steps.
VICE_BACKEND_URL="${BACKEND_URL}" VICE_FRONTEND_URL="${FRONTEND_URL}" bun run smoke
VICE_FRONTEND_URL="${FRONTEND_URL}" bun run test:browser
VITE_HL_NETWORK="${VITE_HL_NETWORK:-testnet}" bun scripts/live-feed-smoke.mjs

# 5. Cleanup (kill owned group, assert ports free), then print success.
cleanup
echo "One-command runtime verification passed."
