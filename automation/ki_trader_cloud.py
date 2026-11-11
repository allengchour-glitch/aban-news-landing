#!/usr/bin/env python3
"""KI-Trader in der Cloud: Claudes tägliche Einschätzung für Bitcoin und Ethereum, NUR im Schattenkonto (Spielgeld).

Kein Auftrag, kein Broker, kein Geld an einer Börse. Der Lauf ruft tools/trading/krypto_bot/ki_trader.py (Stufen: an ruhigen
Tagen zuerst Haiku, sonst Opus) und führt ein eigenes Logbuch im Repo; der Git-Verlauf ist der Zeitstempel:
    data/ki-cloud/ki-trader.json   Einschätzungen mit Begründung, Modell und Kosten
    data/ki-cloud/ki-kosten.json   Kostenbuch (Anfragen und USD je Modell und Tag)
Das Logbuch des PCs (data/ki-trader.json, nicht im Repo) bleibt unberührt.

Schutz, in dieser Reihenfolge. Jeder Punkt beendet den Lauf OHNE Anfrage, also ohne Kosten:
  1. Freigabedatei docs/KI-TRADER-CLOUD-FREI.txt fehlt              → aus (Datei löschen = Stopp)
  2. kein ANTHROPIC_API_KEY                                          → übersprungen
  3. Kurse älter als 2 Tage (Kursquelle gestört)                     → übersprungen
  4. die Einschätzung für diesen Tagesschluss liegt schon vor        → nichts zu tun
  5. Kosten des Monats ≥ KI_CLOUD_MAX_USD_MONAT (Vorgabe 3 USD)      → übersprungen
  6. heute schon ≥ KI_CLOUD_MAX_ANFRAGEN_TAG Anfragen (Vorgabe 4)    → übersprungen
Die Kostengrenze wird vor der Anfrage geprüft; eine Entscheidung kann sie um höchstens ihren eigenen Preis überschreiten.

    python3 automation/ki_trader_cloud.py --lauf     # ein Lauf (GitHub Actions, einmal täglich)
    python3 automation/ki_trader_cloud.py --stand    # Stand lesen, keine Anfrage

Exit 0 auch bei «übersprungen» und «keine Einschätzung» (der Grund steht in der Ausgabe, als Warnung im Lauf und im Logbuch),
Exit 1 nur bei einem Programmfehler. Keine Anlageberatung.
"""
from __future__ import annotations

import argparse
import contextlib
import io
import json
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FREIGABE = Path("docs") / "KI-TRADER-CLOUD-FREI.txt"
ORDNER = Path("data") / "ki-cloud"
PILOT_SCHATTEN = Path("data") / "krypto-pilot-schatten.json"
MAX_USD_MONAT = 3.0          # Vorgabe; KI_CLOUD_MAX_USD_MONAT übersteuert
MAX_ANFRAGEN_TAG = 4         # Vorgabe; KI_CLOUD_MAX_ANFRAGEN_TAG übersteuert (eine Entscheidung braucht 1 bis 2 Anfragen)
MAX_KURS_ALTER_TAGE = 2      # der letzte Tagesschluss darf höchstens so alt sein
LAUT = ("fehler", "kostengrenze", "tagesgrenze", "kurse-alt")   # diese Ausgänge stehen als Warnung im Lauf


def _kt():
    """ki_trader erst hier laden: das Modul hängt seine Ordner selbst an den Suchpfad."""
    kb = str(ROOT / "tools" / "trading" / "krypto_bot")
    if kb not in sys.path:
        sys.path.insert(0, kb)
    import ki_trader
    return ki_trader


def _schluessel(env):
    return (env.get("ANTHROPIC_API_KEY") or "").strip()


def _zahl(env, name, vorgabe, ganz=False):
    """Positive Zahl aus der Umgebung, sonst die Vorgabe (leer, unlesbar, null oder negativ = Vorgabe)."""
    try:
        wert = float(str(env.get(name) or "").strip().replace(",", "."))
    except ValueError:
        return vorgabe
    if not (wert > 0) or wert == float("inf"):
        return vorgabe
    return int(wert) if ganz else wert


def grenze_usd(env):
    return _zahl(env, "KI_CLOUD_MAX_USD_MONAT", MAX_USD_MONAT)


def max_anfragen(env):
    return _zahl(env, "KI_CLOUD_MAX_ANFRAGEN_TAG", MAX_ANFRAGEN_TAG, ganz=True)


def monat_usd(kosten, jetzt):
    """Summe der gebuchten Kosten im Monat von `jetzt` (das Kostenbuch hält 60 Tage, das deckt jeden laufenden Monat)."""
    monat = jetzt.date().isoformat()[:7]
    summe = 0.0
    for tag, t in (kosten.get("tage") or {}).items():
        if str(tag).startswith(monat) and isinstance(t, dict):
            try:
                summe += float(t.get("usd") or 0.0)
            except (TypeError, ValueError):
                pass
    return round(summe, 6)


def anfragen_heute(kosten, jetzt):
    t = (kosten.get("tage") or {}).get(jetzt.date().isoformat())
    try:
        return int((t or {}).get("n") or 0)
    except (TypeError, ValueError, AttributeError):
        return 0


def pilot_aus_schatten(pfad):
    """Entscheide des Krypto-Piloten aus seinem Schattenbuch im Repo, in der Form, die ki_trader.vergleich erwartet.
    Fehlt die Datei oder ist sie unlesbar: leere Liste (der Vergleich zeigt den Piloten dann flach)."""
    try:
        lb = json.loads(Path(pfad).read_text(encoding="utf-8"))
        return [{"stand": t["stand"], "markt": str(m), "hebel": float(v["hebel"])}
                for t in lb.get("tage") or [] for m, v in (t.get("maerkte") or {}).items()]
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return []


def ohne_geheimnis(text, env):
    """Der Schlüssel darf nie in eine Ausgabe oder ins Logbuch (es liegt im Repo): sein Wert wird ersetzt, falls ihn eine Fehlermeldung trägt."""
    text, s = str(text), _schluessel(env)
    return text.replace(s, "***") if len(s) >= 8 else text


def lauf(env=None, root=None, client=None, jetzt=None, kurse=None, lage_text=None):
    """Ein Lauf. → {"status": aus | kein-schluessel | kurse-alt | liegt-vor | kostengrenze | tagesgrenze | neu | fehler, "text": Satz}.
    `client`, `kurse`, `lage_text` sind für Tests (kein Netz, kein Schlüssel); wirft nur bei einem Programmfehler."""
    env = os.environ if env is None else env
    root = Path(root) if root else ROOT
    jetzt = jetzt or datetime.now(timezone.utc)
    if not (root / FREIGABE).exists():
        return {"status": "aus", "text": f"KI-Trader (Cloud): aus. Die Freigabedatei {FREIGABE.as_posix()} fehlt."}
    if client is None and not _schluessel(env):
        return {"status": "kein-schluessel", "text": "KI-Trader (Cloud): übersprungen, das Secret ANTHROPIC_API_KEY fehlt."}
    kt = _kt()
    reihen = kurse or kt.kurse_laden(jetzt=jetzt)
    stand = min(r[-1][0] for r in reihen.values())
    alter = (jetzt.date() - date.fromisoformat(stand)).days
    if alter > MAX_KURS_ALTER_TAGE:
        return {"status": "kurse-alt", "text": f"KI-Trader (Cloud): übersprungen, der letzte Tagesschluss ({stand}) ist {alter} Tage alt (Kursquelle gestört?)."}
    ordner = root / ORDNER
    ordner.mkdir(parents=True, exist_ok=True)
    pfad, buch = ordner / "ki-trader.json", ordner / kt.KOSTEN_BUCH.name
    ki = kt.lies(pfad)
    if ki["entscheide"] and ki["entscheide"][-1]["stand"] == stand:
        return {"status": "liegt-vor", "text": f"KI-Trader (Cloud): die Einschätzung für {stand} liegt schon vor, keine Anfrage."}
    kosten = kt.lies_kosten(buch)
    monat, grenze = monat_usd(kosten, jetzt), grenze_usd(env)
    if monat >= grenze:
        return {"status": "kostengrenze", "text": f"KI-Trader (Cloud): übersprungen, die Kostengrenze ist erreicht ({monat:.2f} von {grenze:.2f} USD in diesem Monat)."}
    heute, hoechstens = anfragen_heute(kosten, jetzt), max_anfragen(env)
    if heute >= hoechstens:
        return {"status": "tagesgrenze", "text": f"KI-Trader (Cloud): übersprungen, heute sind schon {heute} Anfragen gebucht (Grenze {hoechstens})."}
    with contextlib.redirect_stdout(io.StringIO()):     # ki_trader druckt seinen eigenen Stand (mit dem Piloten des PCs, den es hier nicht gibt)
        e = kt.lauf(client=client, jetzt=jetzt, logbuch=pfad, kurse=reihen, lage_text=lage_text, push=False)
    ki = kt.lies(pfad)
    if e is None:
        fehler = ki.get("letzter_fehler") or {}
        hinweis = ohne_geheimnis(fehler.get("hinweis") or "Grund unbekannt", env)
        if fehler and fehler.get("hinweis") != hinweis:
            fehler["hinweis"] = hinweis
            kt.schreibe(ki, pfad)
        return {"status": "fehler", "text": f"KI-Trader (Cloud): keine Einschätzung für {stand}. {hinweis}"}
    vgl = kt.vergleich(ki, pilot_aus_schatten(root / PILOT_SCHATTEN), {c: dict(reihen[c]) for c in kt.COINS})
    monat = monat_usd(kt.lies_kosten(buch), jetzt)
    return {"status": "neu", "text": ohne_geheimnis(kt.stand_text(ki, vgl), env) + f"\nKosten in diesem Monat: {monat:.2f} von {grenze:.2f} USD (Grenze)."}


def stand(root=None):
    """Letzte Einschätzung und Kosten lesen; keine Anfrage, kein Netz."""
    root = Path(root) if root else ROOT
    kt = _kt()
    ordner = root / ORDNER
    ki, kosten = kt.lies(ordner / "ki-trader.json"), kt.lies_kosten(ordner / kt.KOSTEN_BUCH.name)
    text = kt.stand_text(ki, {})
    if ki.get("letzter_fehler"):
        f = ki["letzter_fehler"]
        text += f"\nLetzter Fehlversuch {f.get('zeit', '?')}: {f.get('hinweis', '?')}"
    return text + f"\nKosten in diesem Monat: {monat_usd(kosten, datetime.now(timezone.utc)):.2f} USD · Freigabe: {'ja' if (root / FREIGABE).exists() else 'nein'}"


def melden(erg, env=None):
    """Ausgabe für den Lauf: Text, bei lauten Ausgängen eine Warnung, dazu die Zusammenfassung des Laufs (falls GitHub sie anbietet)."""
    env = os.environ if env is None else env
    print(erg["text"])
    if erg["status"] in LAUT:
        print("::warning::" + erg["text"].splitlines()[0])
    ziel = (env.get("GITHUB_STEP_SUMMARY") or "").strip()
    if ziel:
        with open(ziel, "a", encoding="utf-8") as f:
            f.write(f"### KI-Trader (Cloud, Schattenkonto): {erg['status']}\n\n```\n{erg['text']}\n```\n")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lauf", action="store_true", help="ein Lauf (höchstens eine neue Einschätzung)")
    ap.add_argument("--stand", action="store_true", help="Stand lesen, keine Anfrage")
    a = ap.parse_args(argv)
    if a.lauf:
        try:
            melden(lauf())
        except Exception as ex:  # noqa: BLE001: ein Programmfehler soll den Lauf rot machen, aber nie einen Schlüssel zeigen
            print("::error::KI-Trader (Cloud): Programmfehler: " + ohne_geheimnis(f"{type(ex).__name__}: {ex}", os.environ)[:300])
            return 1
    elif a.stand:
        print(stand())
    else:
        ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
