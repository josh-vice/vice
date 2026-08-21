#!/usr/bin/env python3
"""Launch the one-command dev stack as an OWNED session/process-group leader.

Used by scripts/dev-verify.sh. macOS has no setsid(1); os.setsid() is the
POSIX equivalent. After setsid, every process spawned below (bash bun run dev
-> dev.sh -> cargo/gateway, bun -> vite) shares one process group rooted at
this PID, so the verifier can terminate the COMPLETE tree with a single
kill(-PGID) and can never touch anything outside it.

Writes the group-leader PID to <pid_file> immediately, runs `bun run dev`,
then writes the exit status to <status_file>.

Usage:
  dev-verify-launch.py <pid_file> <status_file> <root> <backend_port> \
      <frontend_port> <service_id> <run_token>
"""

import os
import shutil
import subprocess
import sys


def main() -> int:
    if len(sys.argv) != 8:
        print("usage: dev-verify-launch.py PID_FILE STATUS_FILE ROOT BACKEND_PORT FRONTEND_PORT SERVICE_ID RUN_TOKEN", file=sys.stderr)
        return 2

    pid_file, status_file, root, backend_port, frontend_port, service_id, run_token = sys.argv[1:]

    if shutil.which("bun") is None:
        print("Error: bun not found on PATH; the one-command dev stack cannot start", file=sys.stderr)
        with open(status_file, "w", encoding="utf-8") as f:
            f.write("127")
        return 127

    # New session + process group. Leader pid == os.getpid(); the verifier
    # reads it back from pid_file and group-kills this exact tree only.
    os.setsid()
    with open(pid_file, "w", encoding="utf-8") as f:
        f.write(str(os.getpid()))

    env = os.environ.copy()
    env.update(
        {
            "VICE_BACKEND_PORT": backend_port,
            "VICE_FRONTEND_PORT": frontend_port,
            "VICE_SERVICE_ID": service_id,
            "VICE_RUN_TOKEN": run_token,
        }
    )

    proc = subprocess.Popen(["bun", "run", "dev"], cwd=root, env=env)
    rc = proc.wait()
    with open(status_file, "w", encoding="utf-8") as f:
        f.write(str(rc))
    return rc


if __name__ == "__main__":
    sys.exit(main())
