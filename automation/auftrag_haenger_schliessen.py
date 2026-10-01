#!/usr/bin/env python3
"""auftrag_haenger_schliessen.py — schliesst hängende Server-Quittungen, deren Nachholen schon geregelt ist.

ANLASS 01.10.2026 (Verbesserungsrunde): Die Ampel meldete seit 30.09. 20:32 UTC stündlich «BOT-AUFTRAG HAENGT»
für cj-torquellen-…-c und -e (je 3 CJ-Quellvideos, keines angekommen) und am Morgen für pinterest-pin-…-1.
Der Hinweis in jeder Quittung sagt «von Hand prüfen» — das tat niemand, die Meldung wurde zum Rauschen,
und eine echte Panne wäre darin untergegangen.

Nur Auftragsarten, deren Nachholen NACHWEISLICH woanders geregelt ist, werden geschlossen:
  cj_quellvideo_holen.mjs  — reiner Download. tor_quellen_anfragen.mjs fragt jede pid ohne Quelle nach 24 h
                             erneut an (Merkliste dropship/_reel_serverquelle.txt). Geschlossen mit Liste der
                             fehlenden Videos.
  pinterest_pin_erstellen.mjs — Seiteneffekt! Nur geschlossen, wenn ein SPÄTERER Pin-Auftrag fertig ist: jeder Lauf
                             liest vor dem Pin die Pinnwand (Plattform-Wahrheit) und überspringt «SCHON DA».
  typ seite_text / screenshot — rein lesend.
Alles andere bleibt «laufend» und wird weiter gemeldet (unbekannte Seiteneffekte nicht wegschliessen).
Schwelle: 3 h (bot_puls meldet ab HAENGT_AB_MINUTEN; hier erst später, damit ein langsamer Lauf nicht abgeräumt wird).

  python3 automation/auftrag_haenger_schliessen.py           # Trockenlauf
  SCHARF=1 python3 automation/auftrag_haenger_schliessen.py  # schreibt die Quittungen um
"""
import glob, json, os, sys
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
ERLEDIGT = os.path.join(REPO, "auftraege", "erledigt")
ERGEBNIS = os.path.join(REPO, "auftraege", "ergebnis")
AB_STUNDEN = float(os.environ.get("AB_STUNDEN", "3"))
SCHARF = os.environ.get("SCHARF") == "1"


def zeit(d, pfad):
    roh = d.get("begonnen") or d.get("zeit")
    if roh:
        try:
            w = datetime.fromisoformat(str(roh).replace("Z", "+00:00"))
            return w if w.tzinfo else w.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.fromtimestamp(os.path.getmtime(pfad), timezone.utc)


def spaeterer_pin_fertig(name, alle):
    """gibt es einen Pin-Auftrag mit späterer ID, der fertig ist (also die Pinnwand gelesen hat)?"""
    for n, d in alle.items():
        if n > name and n.startswith("pinterest-pin-") and d.get("stand") not in (None, "laufend") \
                and (d.get("ergebnis") or {}).get("schritte"):
            return n
    return None


def entscheiden(name, d, alle):
    s, t = d.get("skript"), d.get("typ")
    if s == "cj_quellvideo_holen.mjs":
        fehlt = [v.get("name") for v in d.get("videos") or []
                 if not glob.glob(os.path.join(ERGEBNIS, f"*{v.get('name')}*"))]
        return ("abgebrochen", f"Download-Lauf gestorben; {len(fehlt)} Video(s) fehlen ({', '.join(fehlt)}). "
                "Nachholen: tor_quellen_anfragen.mjs fragt jede pid ohne Quelle nach 24 h neu an.")
    if s == "pinterest_pin_erstellen.mjs":
        f = spaeterer_pin_fertig(name, alle)
        if f:
            return ("abgebrochen-unklar", f"Lauf gestorben; {f} hat danach die Pinnwand gelesen (Pin entweder da "
                    "oder wird dort neu gesetzt) — nicht von Hand wiederholen.")
        return None
    if t in ("seite_text", "screenshot"):
        return ("abgebrochen", "rein lesender Auftrag gestorben — bei Bedarf neu anlegen.")
    return None


def main():
    jetzt = datetime.now(timezone.utc)
    alle = {}
    for p in sorted(glob.glob(os.path.join(ERLEDIGT, "*.json"))):
        try:
            alle[os.path.basename(p)[:-5]] = json.load(open(p))
        except Exception:
            pass
    geschlossen, bleibt = 0, []
    for name, d in alle.items():
        if d.get("stand") != "laufend":
            continue
        pfad = os.path.join(ERLEDIGT, name + ".json")
        alter_h = (jetzt - zeit(d, pfad)).total_seconds() / 3600
        if alter_h < AB_STUNDEN:
            continue
        e = entscheiden(name, d, alle)
        if not e:
            bleibt.append(name); continue
        stand, grund = e
        print(f"{'SCHLIESSE' if SCHARF else 'WÜRDE schliessen'} {name} ({alter_h:.0f} h) → {stand}: {grund[:140]}")
        if SCHARF:
            d["stand"] = stand
            d["geschlossen"] = {"wann": jetzt.strftime("%Y-%m-%dT%H:%M:%SZ"), "durch": "auftrag_haenger_schliessen.py",
                                "grund": grund}
            tmp = pfad + ".tmp"
            json.dump(d, open(tmp, "w"), ensure_ascii=False, indent=2)
            os.replace(tmp, pfad)
            if json.load(open(pfad)).get("stand") != stand:      # zurücklesen
                print(f"⚠️ Rücklesen {name} gescheitert", file=sys.stderr); sys.exit(1)
        geschlossen += 1
    print(f"FERTIG: {geschlossen} {'geschlossen' if SCHARF else 'würden geschlossen'}, "
          f"{len(bleibt)} bleiben gemeldet{(': ' + ', '.join(bleibt[:5])) if bleibt else ''}")


if __name__ == "__main__":
    main()
