#!/usr/bin/env bash
# Shared helpers for the one-command runtime verifier (dev-verify.sh).
#
# Sourced by scripts/dev-verify.sh and exercised directly by
# scripts/dev-launcher.test.mjs so the exact production code paths are the
# tested code paths.

# PIDs listening on a TCP port (space-separated, empty when free).
dev_verify_port_pids() {
	local port="$1"
	if command -v lsof >/dev/null 2>&1; then
		lsof -nP -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ' || true
	fi
}

# Actionable ownership diagnostics for an occupied port (stderr).
dev_verify_port_owner_diagnostics() {
	local port="$1" pid owner comm comm_lower
	local pids
	pids="$(dev_verify_port_pids "${port}")"
	if [[ -z "${pids}" ]]; then
		return 0
	fi
	echo "Error: port ${port} is already in use by PID(s): ${pids}" >&2
	for pid in ${pids}; do
		if [[ "${pid}" =~ ^[0-9]+$ ]]; then
			owner="$(ps -p "${pid}" -o pid=,comm=,args= 2>/dev/null || true)"
			if [[ -n "${owner}" ]]; then
				echo "  -> ${owner}" >&2
				comm="$(ps -p "${pid}" -o comm= 2>/dev/null || true)"
				comm_lower="$(printf '%s' "${comm}" | tr '[:upper:]' '[:lower:]' || true)"
				if [[ "${comm_lower}" == *docker* ]]; then
					echo "  Note: Docker Desktop commonly owns port 8080 on this machine; pick another port." >&2
				fi
			fi
		fi
	done
}

# Returns 0 when both ports are free, 1 when either has a listener.
# Prints ownership diagnostics + an optional context line on occupation.
# Never launches or kills anything; callers decide what to do.
dev_verify_assert_ports_free() {
	local backend_port="$1" frontend_port="$2" context="$3"
	local occupied=0 pids port
	for port in "${backend_port}" "${frontend_port}"; do
		if ! [[ "${port}" =~ ^[0-9]+$ ]] || (( port < 1024 || port > 65535 )); then
			echo "Error: invalid development port ${port}" >&2
			return 1
		fi
		pids="$(dev_verify_port_pids "${port}")"
		if [[ -n "${pids}" ]]; then
			occupied=1
			dev_verify_port_owner_diagnostics "${port}"
		fi
	done
	if (( occupied )); then
		if [[ -n "${context}" ]]; then
			echo "  ${context}" >&2
		fi
		return 1
	fi
	return 0
}

# True (0) if either port has a listener.
dev_verify_ports_occupied() {
	local backend_port="$1" frontend_port="$2"
	if [[ -n "$(dev_verify_port_pids "${backend_port}")" ]]; then
		return 0
	fi
	if [[ -n "$(dev_verify_port_pids "${frontend_port}")" ]]; then
		return 0
	fi
	return 1
}

# True (0) if the process group still has a non-zombie member. Zombies keep a
# group alive for kill(2) purposes until their parent reaps them, so a dead
# but unreaped leader must not make cleanup spin waiting on an empty group.
dev_verify_group_has_live_member() {
	local pgid="$1" ps_out
	if command -v ps >/dev/null 2>&1; then
		ps_out="$(ps -o pgid=,stat= -ax 2>/dev/null)" || ps_out=""
		if [[ -n "${ps_out}" ]]; then
			if printf '%s\n' "${ps_out}" | awk -v g="${pgid}" '$1 == g && $2 !~ /^Z/ { found = 1 } END { exit !found }'; then
				return 0
			fi
			return 1
		fi
	fi
	# Fallback: classic group liveness.
	if kill -0 -- "-${pgid}" 2>/dev/null; then
		return 0
	fi
	return 1
}

# Terminate an OWNED process group only: SIGTERM, bounded wait, then SIGKILL.
# Takes the numeric PGID of a group this script launched (the launcher created
# the group with os.setsid). Never uses pkill or PID hunting, so a group from
# another run can never be touched.
dev_verify_owned_group_kill() {
	local pgid="$1"
	if [[ -z "${pgid}" ]] || ! [[ "${pgid}" =~ ^[0-9]+$ ]]; then
		return 1
	fi
	kill -TERM -- "-${pgid}" 2>/dev/null || true
	for _ in $(seq 1 50); do
		if ! dev_verify_group_has_live_member "${pgid}"; then
			return 0
		fi
		sleep 0.1
	done
	kill -KILL -- "-${pgid}" 2>/dev/null || true
	return 0
}
