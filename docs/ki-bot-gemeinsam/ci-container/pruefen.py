#!/usr/bin/env python3
"""Commit in frischem Docker-Container prüfen, ohne Host-Mountprivileg oder Netz."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import uuid
import yaml

ROOT = Path(__file__).resolve().parents[3]


def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--suite', required=True, choices=['ci-tests', 'forschung'])
    p.add_argument('--image', required=True)
    p.add_argument('--ausgabe', required=True, type=Path)
    p.add_argument('--rev', default='HEAD')
    a = p.parse_args()
    rev = git('rev-parse', '--verify', a.rev + '^{commit}').decode().strip()
    workflow = '.github/workflows/' + ('luxestyle-automation-tests.yml' if a.suite == 'ci-tests' else 'deploy-check.yml')
    raw = git('show', rev + ':' + workflow)
    wf = yaml.safe_load(raw)
    job = wf['jobs']['tests' if a.suite == 'ci-tests' else 'validate']
    setup = job['steps']
    python = next(str(s['with']['python-version']) for s in setup if 'actions/setup-python@' in s.get('uses', ''))
    node = next((str(s['with']['node-version']) for s in setup if 'actions/setup-node@' in s.get('uses', '')), None)
    if a.suite == 'ci-tests':
        checkout = next(s for s in setup if 'actions/checkout@' in s.get('uses', ''))
        patterns = checkout['with']['sparse-checkout'].split()
        patterns = [':(glob)' + x if '*' in x else x for x in patterns]
        steps = [{'name': s.get('name', 'CI-Schritt'), 'run': s['run']} for s in setup if 'run' in s]
    else:
        patterns = ['docs/ki-bot-gemeinsam', 'tools/trading/daten/BTC-USD.json']
        step = next(s for s in setup if s.get('name') == 'KI-Bot-Forschung offline prüfen')
        steps = [{'name': step['name'], 'run': step['run'], 'min_tests': 1}]
        node = None  # Der ausgewählte Schritt verwendet nur Python.
    if not steps:
        raise SystemExit('Kein ausführbarer CI-Schritt gefunden')
    a.ausgabe.mkdir(parents=True, exist_ok=False)
    out = a.ausgabe.resolve()
    work, evidence = out / 'work', out / 'evidence'
    work.mkdir()
    evidence.mkdir()
    archive = git('archive', rev, '--', *patterns)
    with tarfile.open(fileobj=io.BytesIO(archive)) as t:
        t.extractall(work, filter='data')
    env = os.environ.copy()
    for k in ('DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'):
        env.pop(k, None)
    docker = ['docker', '--host=unix:///var/run/docker.sock']
    image = subprocess.check_output(docker + ['image', 'inspect', '--format', '{{.Id}}', a.image], env=env, text=True).strip()
    plan = {'revision': rev, 'suite': a.suite, 'image_id': image, 'python': python, 'node': node,
            'workflow_sha256': hashlib.sha256(raw).hexdigest(), 'steps': steps}
    (out / 'plan.json').write_text(json.dumps(plan, indent=2))
    (out / 'runner.py').write_bytes(git('show', rev + ':docs/ki-bot-gemeinsam/ci-container/runner.py'))
    cmd = docker + ['run', '--rm', '--name', 'codex-ci-' + uuid.uuid4().hex[:12],
                    '--network', 'none', '--cpus', '2', '--memory', '2g',
                    '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=536870912',
                    '--mount', f'type=bind,src={work},dst=/work',
                    '--mount', f'type=bind,src={evidence},dst=/evidence',
                    '--mount', f'type=bind,src={out / "plan.json"},dst=/run/ci-plan.json,readonly',
                    '--mount', f'type=bind,src={out / "runner.py"},dst=/run/ci-runner.py,readonly',
                    a.image, 'python3', '-B', '/run/ci-runner.py']
    print(f'Prüfe {a.suite} aus Commit {rev}; Ergebnisordner {out}', flush=True)
    r = subprocess.run(cmd, env=env)
    raise SystemExit(r.returncode)


if __name__ == '__main__':
    main()
