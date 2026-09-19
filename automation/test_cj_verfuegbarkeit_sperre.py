"""Gegenprobe in beide Richtungen: die Sperre muss den ZWEITEN abweisen UND den ersten
arbeiten lassen — und nach dessen Tod muss der naechste wieder durchkommen."""
import subprocess, sys, time, os
HALTER = '''import sys, time
sys.path.insert(0,"automation")
import cj_verfuegbarkeit as m
m._nur_einmal()
print("HALTER hat die Sperre", flush=True)
time.sleep(6)
'''
ZWEITER = '''import sys
sys.path.insert(0,"automation")
import cj_verfuegbarkeit as m
m._nur_einmal()
print("ZWEITER kam durch — FALSCH")
'''
h = subprocess.Popen([sys.executable, "-c", HALTER], stdout=subprocess.PIPE, text=True)
time.sleep(1.5)
r = subprocess.run([sys.executable, "-c", ZWEITER], capture_output=True, text=True, timeout=30)
zwei_blockt = "haelt die Sperre" in r.stdout and "FALSCH" not in r.stdout
print(f"  {'ok  ' if zwei_blockt else 'FEHL'} zweiter Lauf wird abgewiesen (rc={r.returncode})")
print(f"        → {r.stdout.strip()[:95]}")
h.wait(timeout=30)
r2 = subprocess.run([sys.executable, "-c", ZWEITER], capture_output=True, text=True, timeout=30)
frei = "FALSCH" in r2.stdout                      # nach dem Tod des Halters MUSS er durch
print(f"  {'ok  ' if frei else 'FEHL'} nach Prozessende ist die Sperre wieder frei")
ok = zwei_blockt and frei
print("ALLE GRUEN" if ok else "FEHLSCHLAG")
sys.exit(0 if ok else 1)
