#!/usr/bin/env python3
"""Prüft und paketiert den Anfragen-Assistenten lokal. Kein Dauerlauf, keine externen Aktionen."""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import zipfile
import projekte
import automationen
import experten
from datetime import date

ROOT = Path(__file__).resolve().parent
PRODUKT = ROOT / "anfragen_assistent"
DATEIEN = ["assistent.py", "test_assistent.py", "demo.csv", "README.md", "email_antworter.py", "gmail_import.py", "test_gmail_import.py", "pruefseite.py", "test_email_antworter.py", "demo-email.eml", "kommentar_antworter.py", "wissenspflege.py", "test_wissenspflege.py", "test_kommentar_antworter.py", "demo-kommentare.csv", "demo-faq.json"]


def lauf(out):
    out = Path(out)
    if out.exists():
        raise ValueError("Ausgabeordner existiert bereits; neuen Ordner wählen.")
    out.mkdir(parents=True)
    status = {"version": 1, "projekt": "anfragen-assistent", "gemessen": datetime.now(timezone.utc).isoformat(),
              "stationen": {"bauen": "offen", "pruefen": "offen", "angebot": "offen"},
              "dauerlauf": False, "verkaeufe_gemessen": False}
    def speichern():
        (out / "expertenplan.json").write_text(json.dumps(experten.planen(status), ensure_ascii=False, indent=2), encoding="utf-8")
        (out / "status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    speichern()
    test = subprocess.run([sys.executable, "-B", "-m", "unittest", "discover", "-s", str(PRODUKT), "-p", "test_*.py"],
                          cwd=ROOT, capture_output=True, text=True, timeout=60)
    (out / "pruefung.txt").write_text(test.stdout + test.stderr, encoding="utf-8")
    status["stationen"]["pruefen"] = "bestanden" if test.returncode == 0 else "fehlgeschlagen"
    speichern()
    if test.returncode:
        return 1
    extra = subprocess.run([sys.executable, "-B", "-m", "unittest", "test_automationen"], cwd=ROOT, capture_output=True, text=True, timeout=30)
    (out / "automation-pruefung.txt").write_text(extra.stdout + extra.stderr, encoding="utf-8")
    if extra.returncode:
        status["stationen"]["pruefen"] = "fehlgeschlagen"
        speichern()
        return 1
    spec = importlib.util.spec_from_file_location("anfragen_assistent", PRODUKT / "assistent.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.verarbeiten(PRODUKT / "demo.csv", out / "demo", "Beispielbetrieb (Demo)")
    email_demo = subprocess.run([sys.executable, "-B", str(PRODUKT / "email_antworter.py"), str(PRODUKT / "demo-email.eml"),
                                 str(out / "email-demo"), "--firma", "Beispielbetrieb (Demo)", "--absender", "buero@example.invalid"],
                                cwd=ROOT, capture_output=True, text=True, timeout=30)
    if email_demo.returncode:
        status["stationen"]["bauen"] = "offen"
        speichern()
        raise ValueError("E-Mail-Demo konnte nicht gebaut werden; kein Lieferpaket freigegeben.")
    kommentar_demo = subprocess.run([sys.executable, "-B", str(PRODUKT / "kommentar_antworter.py"), str(PRODUKT / "demo-kommentare.csv"),
                                     str(out / "kommentar-demo"), "--wissen", str(PRODUKT / "demo-faq.json"), "--verlauf", str(out / "kommentar-verlauf.json")],
                                    cwd=ROOT, capture_output=True, text=True, timeout=30)
    if kommentar_demo.returncode:
        speichern()
        raise ValueError("Kommentar-Demo konnte nicht gebaut werden; kein Lieferpaket freigegeben.")
    with zipfile.ZipFile(out / "anfragen-assistent.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for name in DATEIEN:
            z.write(PRODUKT / name, arcname="anfragen-assistent/" + name)
    (out / "angebote-demo.json").write_text(json.dumps(automationen.nachfassen([
        {"id": "DEMO-1", "datum": "2026-11-01", "status": "offen"}], date(2026, 11, 8)), ensure_ascii=False), encoding="utf-8")
    (out / "webseiten-demo.json").write_text(json.dumps(automationen.seite_pruefen('<title>Demobetrieb</title>'), ensure_ascii=False), encoding="utf-8")
    with zipfile.ZipFile(out / "automationen.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for name in ("automationen.py", "test_automationen.py", "projekte.py", "PROJEKTE.md"):
            z.write(ROOT / name, arcname=name)
        for name in DATEIEN:
            z.write(PRODUKT / name, arcname="anfragen_assistent/" + name)
    status["projekte"] = projekte.bericht(out, True)
    status["stationen"]["bauen"] = "bestanden"
    (out / "angebotsentwurf.txt").write_text((ROOT / "PROJEKT.md").read_text(encoding="utf-8"), encoding="utf-8")
    status["stationen"]["angebot"] = "entwurf"
    status["gemessen"] = datetime.now(timezone.utc).isoformat()
    speichern()
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ausgabe", type=Path)
    args = parser.parse_args()
    try:
        code = lauf(args.ausgabe)
    except (ValueError, OSError, subprocess.TimeoutExpired) as e:
        parser.exit(2, f"Werkstatt abgebrochen: {e}\n")
    print("Werkstatt: " + ("Demo und Lieferpaket gebaut; Angebot ist Entwurf." if code == 0 else "Prüfung fehlgeschlagen; kein Lieferpaket gebaut."))
    sys.exit(code)
