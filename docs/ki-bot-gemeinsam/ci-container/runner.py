"""Im isolierten Container: gespeicherte CI-Befehle ausführen und Ergebnisse sichern."""
import json
import os
import platform
import re
import subprocess
import time
from pathlib import Path

plan = json.loads(Path('/run/ci-plan.json').read_text())
if not plan['steps'] or os.listdir('/tmp'):
    raise SystemExit('Kein Plan oder /tmp ist vor Testbeginn nicht leer')
if not platform.python_version().startswith(plan['python'] + '.'):
    raise SystemExit('Python-Version passt nicht zum ausgewählten Workflow')
if plan.get('node'):
    version = subprocess.check_output(['node', '--version'], text=True).strip()
    if not version.startswith('v' + plan['node'] + '.'):
        raise SystemExit('Node-Version passt nicht zum Workflow')
else:
    version = 'nicht verwendet'
summary = {'revision': plan['revision'], 'suite': plan['suite'], 'image_id': plan['image_id'],
           'python': platform.python_version(), 'node': version, 'tmp_anfangs_leer': True,
           'netzwerk': 'Docker --network none', 'steps': [], 'bestanden': False}
Path('/evidence/summary.json').write_text(json.dumps(summary, indent=2))
for i, step in enumerate(plan['steps']):
    start = time.monotonic()
    try:
        r = subprocess.run(['bash', '--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', step['run']],
                           cwd='/work', text=True, capture_output=True, timeout=900)
        rc, stdout, stderr = r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired as e:
        rc, stdout, stderr = 124, '', f'Zeitgrenze900s überschritten: {e.cmd[0]}'
    name = f'{i:02d}'
    Path(f'/evidence/{name}.stdout.log').write_text(stdout)
    Path(f'/evidence/{name}.stderr.log').write_text(stderr)
    counts = re.findall(r'Ran\s+(\d+)\s+tests?', stdout + '\n' + stderr)
    n = sum(map(int, counts))
    if step.get('min_tests') and n < step['min_tests']:
        rc = rc or 1
        stderr += '\nKeine ausreichende Anzahl ausgeführter Tests nachgewiesen'
        Path(f'/evidence/{name}.stderr.log').write_text(stderr)
    item = {'name': step['name'], 'returncode': rc, 'sekunden': round(time.monotonic() - start, 2),
            'unittest_anzahl': n, 'stdout': name + '.stdout.log', 'stderr': name + '.stderr.log'}
    summary['steps'].append(item)
    Path('/evidence/summary.json').write_text(json.dumps(summary, indent=2))
    print(f"[{i + 1}/{len(plan['steps'])}] {step['name']} -> rc={rc}", flush=True)
    if rc:
        print('\n'.join((stdout + '\n' + stderr).splitlines()[-12:]), flush=True)
summary['bestanden'] = len(summary['steps']) == len(plan['steps']) and all(s['returncode'] == 0 for s in summary['steps'])
Path('/evidence/summary.json').write_text(json.dumps(summary, indent=2))
print('GESAMT ' + ('GRÜN' if summary['bestanden'] else 'ROT'), flush=True)
raise SystemExit(0 if summary['bestanden'] else 1)
