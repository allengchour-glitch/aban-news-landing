#!/usr/bin/env python3
"""Mutationsprobe für den KI-Trader-Cloud-Lauf: jede dieser Änderungen an automation/ki_trader_cloud.py muss
automation/test_ki_trader_cloud.py rot machen. Aufruf im Repo-Wurzelordner: python3 automation/ki_trader_cloud_mutationsprobe.py
Arbeitet nur in einem Temp-Baum (schreibt nichts ins Repo). Vorab muss die unveränderte Kopie grün sein, sonst gälte jeder Mutant
als «erkannt». Ein Muster, das nicht genau einmal vorkommt, zählt als «nicht anwendbar» (Exit 1). Die Tests laufen ohne
ANTHROPIC-Variablen der Umgebung: kein Mutant kann eine echte Anfrage auslösen."""
import os
import shutil
import subprocess
import sys
import tempfile

REPO = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
AUT = os.path.join(REPO, "automation")
ZIEL, TEST = "ki_trader_cloud.py", "test_ki_trader_cloud.py"
QUELLE = open(os.path.join(AUT, ZIEL), encoding="utf-8").read()

# (Name, altes Stück, neues Stück)
M = [
    ("M01 Freigabedatei wird nicht geprüft", "if not (root / FREIGABE).exists():\n        return {\"status\": \"aus\"", "if False:\n        return {\"status\": \"aus\""),
    ("M02 fehlender Schlüssel wird nicht geprüft", "if client is None and not _schluessel(env):", "if False:"),
    ("M03 Leerzeichen gelten als Schlüssel", "return (env.get(\"ANTHROPIC_API_KEY\") or \"\").strip()", "return (env.get(\"ANTHROPIC_API_KEY\") or \"\")"),
    ("M04 Kurse von genau 2 Tagen gelten als alt", "if alter > MAX_KURS_ALTER_TAGE:", "if alter >= MAX_KURS_ALTER_TAGE:"),
    ("M05 alte Kurse werden nie abgelehnt", "if alter > MAX_KURS_ALTER_TAGE:", "if False:"),
    ("M06 vorhandene Einschätzung wird neu geholt", "if ki[\"entscheide\"] and ki[\"entscheide\"][-1][\"stand\"] == stand:", "if False:"),
    ("M07 Kostengrenze erst oberhalb", "if monat >= grenze:", "if monat > grenze:"),
    ("M08 Kostengrenze wird nie geprüft", "if monat >= grenze:", "if False:"),
    ("M09 Vormonat zählt zur Kostengrenze", "if str(tag).startswith(monat) and isinstance(t, dict):", "if isinstance(t, dict):"),
    ("M10 Monatssumme zählt Anfragen statt USD", "summe += float(t.get(\"usd\") or 0.0)", "summe += float(t.get(\"n\") or 0.0)"),
    ("M11 Tagesgrenze erst oberhalb", "if heute >= hoechstens:", "if heute > hoechstens:"),
    ("M12 Tagesgrenze wird nie geprüft", "if heute >= hoechstens:", "if False:"),
    ("M13 Grenze 0 aus der Umgebung gilt", "if not (wert > 0) or wert == float(\"inf\"):", "if not (wert >= 0) or wert == float(\"inf\"):"),
    ("M14 Grenze unendlich aus der Umgebung gilt", "if not (wert > 0) or wert == float(\"inf\"):", "if not (wert > 0):"),
    ("M15 Komma in der Grenze wird nicht gelesen", ".strip().replace(\",\", \".\"))", ".strip())"),
    ("M16 Kostengrenze liest den falschen Schalter", "return _zahl(env, \"KI_CLOUD_MAX_USD_MONAT\", MAX_USD_MONAT)", "return _zahl(env, \"KI_CLOUD_MAX_USD\", MAX_USD_MONAT)"),
    ("M17 Tagesgrenze liest den falschen Schalter", "return _zahl(env, \"KI_CLOUD_MAX_ANFRAGEN_TAG\", MAX_ANFRAGEN_TAG, ganz=True)", "return _zahl(env, \"KI_CLOUD_MAX_ANFRAGEN\", MAX_ANFRAGEN_TAG, ganz=True)"),
    ("M18 Vorgabe 30 statt 3 USD", "MAX_USD_MONAT = 3.0 ", "MAX_USD_MONAT = 30.0 "),
    ("M19 Vorgabe 40 statt 4 Anfragen", "MAX_ANFRAGEN_TAG = 4 ", "MAX_ANFRAGEN_TAG = 40 "),
    ("M20 der Lauf schickt Handy-Nachrichten", "lage_text=lage_text, push=False)", "lage_text=lage_text, push=True)"),
    ("M21 Schlüssel wird in Texten nicht ersetzt", "return text.replace(s, \"***\") if len(s) >= 8 else text", "return text"),
    ("M22 winziger Wert wird als Schlüssel ersetzt", "if len(s) >= 8 else text", "if len(s) >= 1 else text"),
    ("M23 Fehlvermerk im Logbuch behält den Schlüssel", "if fehler and fehler.get(\"hinweis\") != hinweis:", "if False:"),
    ("M24 Fehler steht nicht als Warnung im Lauf", "LAUT = (\"fehler\", \"kostengrenze\"", "LAUT = (\"kostengrenze\""),
    ("M25 jeder Ausgang ist eine Warnung", "if erg[\"status\"] in LAUT:", "if True:"),
    ("M26 keine Zusammenfassung des Laufs", "    if ziel:\n        with open(ziel, \"a\", encoding=\"utf-8\") as f:", "    if False:\n        with open(ziel, \"a\", encoding=\"utf-8\") as f:"),
    ("M27 Programmfehler gibt Exit 0", "[:300])\n            return 1", "[:300])\n            return 0"),
    ("M28 Programmfehler zeigt den Schlüssel", "ohne_geheimnis(f\"{type(ex).__name__}: {ex}\", os.environ)[:300]", "f\"{type(ex).__name__}: {ex}\"[:300]"),
    ("M29 Pilot aus dem Schattenbuch bleibt leer", "for t in lb.get(\"tage\") or [] for m, v in (t.get(\"maerkte\") or {}).items()]", "for t in [] for m, v in (t.get(\"maerkte\") or {}).items()]"),
    ("M30 kaputtes Schattenbuch stürzt ab", "except (OSError, ValueError, KeyError, TypeError, AttributeError):\n        return []", "except (OSError,):\n        return []"),
    ("M31 Stand zeigt die Freigabe verkehrt", "{'ja' if (root / FREIGABE).exists() else 'nein'}", "{'nein' if (root / FREIGABE).exists() else 'ja'}"),
    ("M32 Text nennt die Monatskosten nicht", " + f\"\\nKosten in diesem Monat: {monat:.2f} von {grenze:.2f} USD (Grenze).\"}", "}"),
    ("M33 kaputte Tageszeile im Kostenbuch stürzt ab", "except (TypeError, ValueError, AttributeError):\n        return 0", "except (ZeroDivisionError,):\n        return 0"),
    ("M34 Freigabedatei an anderem Ort", "FREIGABE = Path(\"docs\") / \"KI-TRADER-CLOUD-FREI.txt\"", "FREIGABE = Path(\"docs\") / \"KI-TRADER-CLOUD.txt\""),
    ("M35 Logbuch landet im Ordner des PCs", "ORDNER = Path(\"data\") / \"ki-cloud\"", "ORDNER = Path(\"data\")"),
]


def lauf(quelltext):
    """Kopie mit `quelltext` als Zieldatei aufbauen und den Test dort laufen lassen. → (Exit-Code, Ausgabe)."""
    with tempfile.TemporaryDirectory() as tmp:
        os.makedirs(os.path.join(tmp, "automation"))
        with open(os.path.join(tmp, "automation", ZIEL), "w", encoding="utf-8") as f:
            f.write(quelltext)
        shutil.copy(os.path.join(AUT, TEST), os.path.join(tmp, "automation", TEST))
        os.symlink(os.path.join(REPO, "tools"), os.path.join(tmp, "tools"))
        env = {k: v for k, v in os.environ.items() if not k.startswith("ANTHROPIC") and k != "GITHUB_STEP_SUMMARY"}
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        r = subprocess.run([sys.executable, os.path.join(tmp, "automation", TEST)], capture_output=True, text=True, env=env, timeout=300)
        return r.returncode, (r.stdout + r.stderr)[-600:]


def main():
    code, aus = lauf(QUELLE)
    if code != 0:
        print("ABBRUCH: die unveränderte Kopie ist nicht grün, die Probe wäre wertlos.\n" + aus)
        return 1
    erkannt, ueberlebt, unpassend = 0, [], []
    for name, alt, neu in M:
        if QUELLE.count(alt) != 1:
            unpassend.append(name)
            print(f"?  {name}: Muster kommt {QUELLE.count(alt)}-mal vor")
            continue
        code, _ = lauf(QUELLE.replace(alt, neu))
        if code == 0:
            ueberlebt.append(name)
            print(f"!! {name}: ÜBERLEBT")
        else:
            erkannt += 1
    print(f"Mutationsprobe ki_trader_cloud: {erkannt} von {len(M)} erkannt, {len(ueberlebt)} überlebt, {len(unpassend)} nicht anwendbar")
    return 1 if ueberlebt or unpassend else 0


if __name__ == "__main__":
    raise SystemExit(main())
