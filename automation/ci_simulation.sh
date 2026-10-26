#!/bin/bash
# Spielt den Job «tests» aus .github/workflows/luxestyle-automation-tests.yml lokal nach — mit demselben Sparse-Checkout-Dateisatz
# (git archive des eingecheckten Stands, NICHT des Arbeitsbaums) und mit LEEREM /tmp (eigener Mount-Namespace, tmpfs).
# Warum: Skripte, die beim Import Dateien aus /tmp lesen (Messdaten, Katalog-Schnappschuss), laufen auf dem Entwicklungsrechner und
# scheitern in der CI. Am 26.10.2026 meldete eine Simulation ohne leeres /tmp «grün», die CI «rot» (dropship/.../herren_gen.mjs).
# Aufruf:  bash automation/ci_simulation.sh [REV]     (REV = Commit, Vorgabe HEAD; nur Eingechecktes zählt → vorher committen)
set -e
cd "$(dirname "$0")/.."
REV="${1:-HEAD}"
PLAN="$(mktemp -p "$HOME" ci_plan.XXXXXX.json)"
python3 - "$PLAN" <<'PY'
import sys, json, yaml
y = yaml.safe_load(open('.github/workflows/luxestyle-automation-tests.yml'))
steps = y['jobs']['tests']['steps']
pat = [s for s in steps if 'actions/checkout' in s.get('uses', '')][0]['with']['sparse-checkout'].split()
json.dump({'pat': [':(glob)' + p if '*' in p else p for p in pat],
           'runs': [(s.get('name'), s['run']) for s in steps if 'run' in s]}, open(sys.argv[1], 'w'))
PY
export REV PLAN REPO="$PWD" NODE_BIN="${NODE_BIN:-$(command -v node || echo /opt/node22/bin/node)}"
unshare -m bash -c '
mount -t tmpfs tmpfs /tmp && mkdir -p /tmp/ci && cd "$REPO"
python3 - <<PY
import json, os, subprocess
plan = json.load(open(os.environ["PLAN"]))
r = subprocess.run(["git", "archive", os.environ["REV"], "--"] + plan["pat"], capture_output=True)
assert r.returncode == 0, r.stderr
subprocess.run(["tar", "-x", "-C", "/tmp/ci"], input=r.stdout, check=True)
rc = 0
for n, (name, cmd) in enumerate(plan["runs"]):
    p = subprocess.run(["bash", "-e", "-c", cmd.replace("node ", os.environ["NODE_BIN"] + " ")], capture_output=True, text=True, cwd="/tmp/ci", timeout=900)
    print(f"[{n}] {name} -> rc={p.returncode}")
    if p.returncode:
        rc = 1; print("\n".join((p.stdout + p.stderr).strip().splitlines()[-8:]))
print("GESAMT", "GRÜN" if rc == 0 else "ROT"); raise SystemExit(rc)
PY'
rc=$?; rm -f "$PLAN"; exit $rc
