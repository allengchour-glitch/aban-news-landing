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

ROOT = Path(__file__).resolve().parent
PRODUKT = ROOT / "anfragen_assistent"
DATEIEN = ["assistent.py", "test_assistent.py", "demo.csv", "README.md", "email_antworter.py", "test_email_antworter.py", "demo-email.eml"]


def lauf(out):
    out = Path(out)
    if out.exists():
        raise ValueError("Ausgabeordner existiert bereits; neuen Ordner wählen.")
    out.mkdir(parents=True)
    status = {"version": 1, "projekt": "anfragen-assistent", "gemessen": datetime.now(timezone.utc).isoformat(),
              "stationen": {"bauen": "offen", "pruefen": "offen", "angebot": "offen"},
              "dauerlauf": False, "verkaeufe_gemessen": False}
    def speichern():
        (out / "status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    speichern()
    test = subprocess.run([sys.executable, "-B", "-m", "unittest", "discover", "-s", str(PRODUKT), "-p", "test_*.py"],
                          cwd=ROOT, capture_output=True, text=True, timeout=60)
    (out / "pruefung.txt").write_text(test.stdout + test.stderr, encoding="utf-8")
    status["stationen"]["pruefen"] = "bestanden" if test.returncode == 0 else "fehlgeschlagen"
    speichern()
    if test.returncode:
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
    with zipfile.ZipFile(out / "anfragen-assistent.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for name in DATEIEN:
            z.write(PRODUKT / name, arcname="anfragen-assistent/" + name)
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
