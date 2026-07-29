#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PORT="${VICE_BACKEND_PORT:-8080}"
FRONTEND_PORT="${VICE_FRONTEND_PORT:-5173}"
BACKEND_URL="${VICE_BACKEND_URL:-http://127.0.0.1:${BACKEND_PORT}}"
FRONTEND_URL="${VICE_FRONTEND_URL:-http://127.0.0.1:${FRONTEND_PORT}}"
DEV_PID=""
START_STATUS_FILE="${TMPDIR:-/tmp}/vice-dev-verify.${$}.status"

cleanup() {
	if [[ -n "${DEV_PID}" ]] && kill -0 "${DEV_PID}" 2>/dev/null; then
		kill -TERM "${DEV_PID}" 2>/dev/null || true
		for _ in $(seq 1 50); do
			if ! kill -0 "${DEV_PID}" 2>/dev/null; then
				break
			fi
			sleep 0.1
		done
		if kill -0 "${DEV_PID}" 2>/dev/null; then
			kill -KILL "${DEV_PID}" 2>/dev/null || true
		fi
		wait "${DEV_PID}" 2>/dev/null || true
	fi
	rm -f "${START_STATUS_FILE}"
}
trap cleanup EXIT INT TERM

(
	set +e
	cd "${ROOT}"
	VICE_BACKEND_PORT="${BACKEND_PORT}" \
	VICE_FRONTEND_PORT="${FRONTEND_PORT}" \
	bun run dev
	status=$?
	printf '%s\n' "${status}" >"${START_STATUS_FILE}"
	exit "${status}"
) &
DEV_PID=$!

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
	if curl -sf "${BACKEND_URL}/health" >/dev/null 2>&1 && curl -sf "${FRONTEND_URL}/" >/dev/null 2>&1; then
		ready=1
		break
	fi
	sleep 1
done

if (( ready == 0 )); then
	echo "Error: services did not become ready for verification" >&2
	exit 1
fi

VICE_BACKEND_URL="${BACKEND_URL}" VICE_FRONTEND_URL="${FRONTEND_URL}" bun run smoke
VICE_FRONTEND_URL="${FRONTEND_URL}" bun run test:browser
VITE_HL_NETWORK="${VITE_HL_NETWORK:-testnet}" bun scripts/live-feed-smoke.mjs
echo "One-command runtime verification passed."
