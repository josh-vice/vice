#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PID=""
FRONTEND_PID=""
BACKEND_HOST="${VICE_BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${VICE_BACKEND_PORT:-8080}"
FRONTEND_HOST="${VICE_FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${VICE_FRONTEND_PORT:-5173}"
BACKEND_URL="http://${BACKEND_HOST}:${BACKEND_PORT}"

port_owner() {
	if command -v lsof >/dev/null 2>&1; then
		lsof -nP -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' || true
	fi
}

for port in "${BACKEND_PORT}" "${FRONTEND_PORT}"; do
	if ! [[ "${port}" =~ ^[0-9]+$ ]] || (( port < 1024 || port > 65535 )); then
		echo "Error: invalid development port ${port}"
		exit 1
	fi
	during_start="$(port_owner "${port}")"
	if [[ -n "${during_start}" ]]; then
		echo "Error: port ${port} is already in use by PID(s): ${during_start}"
		echo "Choose another port with VICE_BACKEND_PORT or VICE_FRONTEND_PORT."
		exit 1
	fi
done

if [[ "${BACKEND_HOST}:${BACKEND_PORT}" == "${FRONTEND_HOST}:${FRONTEND_PORT}" ]]; then
	echo "Error: backend and frontend cannot bind the same host/port (${BACKEND_HOST}:${BACKEND_PORT})"
	exit 1
fi

cleanup() {
	if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
		echo ""
		echo "Stopping vice-terminal (pid ${FRONTEND_PID})..."
		kill "${FRONTEND_PID}" 2>/dev/null || true
		wait "${FRONTEND_PID}" 2>/dev/null || true
	fi
	if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
		echo ""
		echo "Stopping vice-backend (pid ${BACKEND_PID})..."
		kill "${BACKEND_PID}" 2>/dev/null || true
		wait "${BACKEND_PID}" 2>/dev/null || true
	fi
}
trap 'exit 130' INT TERM
trap cleanup EXIT

if ! command -v cargo >/dev/null 2>&1; then
	echo "Error: cargo not found. Install Rust: https://rustup.rs"
	exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
	echo "Error: bun not found. Install Bun: https://bun.sh"
	exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
	echo "Error: curl not found; it is required for backend readiness checks."
	exit 1
fi

echo "==> Starting vice-backend (${BACKEND_URL})"
(
	cd "${ROOT}/vice-backend"
	VICE_GATEWAY_BIND="${BACKEND_HOST}:${BACKEND_PORT}" \
	VICE_SERVICE_ID="${VICE_SERVICE_ID:-vice-backend-dev}" \
	cargo run -p vice-gateway
) &
BACKEND_PID=$!

backend_ready=0
# Wait until backend accepts connections (or cargo build finishes).
for _ in $(seq 1 120); do
	if curl -sf "${BACKEND_URL}/health" >/dev/null 2>&1; then
		backend_ready=1
		break
	fi
	if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
		echo "Error: vice-backend exited during startup"
		exit 1
	fi
	sleep 1
done

if (( backend_ready == 0 )); then
	echo "Error: vice-backend did not become ready at ${BACKEND_URL}/health"
	exit 1
fi

echo "==> Starting vice-terminal (http://${FRONTEND_HOST}:${FRONTEND_PORT})"
cd "${ROOT}/vice-terminal"

if [[ ! -d node_modules ]]; then
	echo "==> Installing frontend dependencies..."
	bun install
fi

env VICE_BACKEND_URL="${BACKEND_URL}" bun run dev --host "${FRONTEND_HOST}" --port "${FRONTEND_PORT}" &
FRONTEND_PID=$!
wait "${FRONTEND_PID}"
