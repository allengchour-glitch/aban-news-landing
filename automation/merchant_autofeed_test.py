#!/usr/bin/env python3
"""Offline-Test für merchant_autofeed.py (Aufruf: python3 -I automation/merchant_autofeed_test.py)."""
import os, sys, types

for name in ("requests", "google", "google.oauth2", "google.oauth2.service_account",
             "google.auth", "google.auth.transport", "google.auth.transport.requests"):
    sys.modules.setdefault(name, types.ModuleType(name))
sys.modules["google.oauth2"].service_account = sys.modules["google.oauth2.service_account"]
sys.modules["google.auth.transport.requests"].Request = object
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import merchant_autofeed as m  # noqa: E402

fehler = 0


def gleich(ist, soll, was):
    global fehler
    if ist != soll:
        fehler += 1
        print(f"FEHLER {was}: ist {ist!r}, soll {soll!r}")


gleich(m.werte({"enableProducts": True, "eligible": True}), (True, True), "an")
gleich(m.werte({"eligible": True}), (False, True), "fehlendes Feld heisst aus (proto3)")
gleich(m.werte({"enableProducts": False}), (False, False), "ausdrücklich aus")
gleich(m.werte({}), (False, False), "leere Antwort")
gleich(m.soll_wert("pruefen"), None, "pruefen liest nur")
gleich(m.soll_wert("aus"), False, "aus")
gleich(m.soll_wert("ein"), True, "ein")
gleich(m.soll_wert("x"), "unbekannt", "unbekannter Modus")
os.environ["MODUS"] = "falsch"
gleich(m.main(), 2, "unbekannter Modus bricht ab, bevor angemeldet wird")

print(f"{'OK' if not fehler else 'FEHLGESCHLAGEN'}: {fehler} Fehler")
sys.exit(1 if fehler else 0)
