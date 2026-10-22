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
  typ wartung, aktion mit `aendert: false` in server/wartung.mjs UND wiederkehrend (22.10.2026) — siehe unten.
Alles andere bleibt «laufend» und wird weiter gemeldet (unbekannte Seiteneffekte nicht wegschliessen).
Schwelle: 3 h (bot_puls meldet ab HAENGT_AB_MINUTEN; hier erst später, damit ein langsamer Lauf nicht abgeräumt wird).

NACHTRAG 22.10.2026 (Verbesserungsrunde 12:25): `server-zustand-2026-10-22` (Wartung `waechter_zustand`, rein lesend, täglich
wiederkehrend) stand 12 h auf «laufend»: Claim 00:16:14 UTC, danach nie eine Schlussquittung, der Agent lief aber weiter
(nächster Claim 00:36:40, Bot-Puls stündlich). Die Ampel rief «BOT-AUFTRAG HAENGT», obwohl nichts zu tun war — der Runner legt
die Reihe am nächsten Tag von selbst neu an (`faellige_anlegen` entscheidet an der DATEI `<id>-<Datum>.json`, nicht am Stand;
ein «laufend» blockiert den Folgetag nicht). Der Schliesser kannte aber nur vier Auftragsarten. Neu: eine Wartungsaktion gilt als
lesend, wenn server/wartung.mjs sie mit `aendert: false` führt (die Allowlist des Servers ist die Quelle, keine zweite Liste hier;
Unklarheit = leere Menge = nichts wird geschlossen). Nur WIEDERKEHRENDE Läufe werden geschlossen (Einmal-Aufträge hat jemand
bestellt und wartet auf die Antwort — deren Ausfall bleibt sichtbar). **Zweimal hintereinander gestorben = System, nicht Zufall:**
ist die jüngste frühere Quittung derselben Reihe «laufend» oder «abgebrochen…», wird NICHT geschlossen und die Ampel bleibt rot.

  python3 automation/auftrag_haenger_schliessen.py           # Trockenlauf
  SCHARF=1 python3 automation/auftrag_haenger_schliessen.py  # schreibt die Quittungen um
  python3 automation/auftrag_haenger_schliessen.py --selbsttest   # Fälle + Mutanten (Aufseher täglich)
"""
import glob, json, os, re, sys, types
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
ERLEDIGT = os.path.join(REPO, "auftraege", "erledigt")
ERGEBNIS = os.path.join(REPO, "auftraege", "ergebnis")
WARTUNG_MJS = os.path.join(REPO, "server", "wartung.mjs")
AB_STUNDEN = float(os.environ.get("AB_STUNDEN", "3"))
SCHARF = os.environ.get("SCHARF") == "1"
_REIHE = re.compile(r"^(.*)-(\d{4}-\d{2}-\d{2})$")


def aktionstabelle(text=None):
    """{aktion: True (lesend: `aendert: false`) | False (verändernd) | None (aendert-Feld fehlt)} aus `export const AKTIONEN = {…}`
    in server/wartung.mjs. Datei fehlt oder Aufbau fremd → leeres Dict."""
    try:
        if text is None:
            text = open(WARTUNG_MJS, encoding="utf-8").read()
    except OSError:
        return {}
    m = re.search(r"^export const AKTIONEN = \{\n", text, re.M)
    if not m:
        return {}
    rest = text[m.end():]
    ende = re.search(r"^\};", rest, re.M)
    grenze = ende.start() if ende else len(rest)
    kopf = [k for k in re.finditer(r"^  ([a-z_][a-z0-9_]*): \{\s*$", rest, re.M) if k.start() < grenze]
    tab = {}
    for i, k in enumerate(kopf):
        bis = min(kopf[i + 1].start() if i + 1 < len(kopf) else grenze, grenze)
        a = re.search(r"^    aendert:\s*(true|false)\b", rest[k.end():bis], re.M)
        tab[k.group(1)] = None if not a else (a.group(1) == "false")
    return tab


def lesende_aktionen(text=None):
    """Aktionen, die der Server selbst als nicht-verändernd führt (`aendert: false`)."""
    return {n for n, lesend in aktionstabelle(text).items() if lesend is True}


def vorgaenger_stand(name, alle):
    """Stand der jüngsten FRÜHEREN Quittung derselben wiederkehrenden Reihe (`<id>-JJJJ-MM-TT`), sonst None."""
    m = _REIHE.match(name)
    if not m:
        return None
    basis, tag = m.groups()
    frueher = sorted(n for n in alle if n != name and _REIHE.match(n)
                     and _REIHE.match(n).group(1) == basis and _REIHE.match(n).group(2) < tag)
    return (alle[frueher[-1]] or {}).get("stand") if frueher else None


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


def entscheiden(name, d, alle, lesende=None):
    s, t = d.get("skript"), d.get("typ")
    if lesende is None:
        lesende = lesende_aktionen()
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
    if t == "wartung" and d.get("aktion") in lesende and "[wiederkehrend" in (d.get("warum") or ""):
        v = vorgaenger_stand(name, alle)
        if v == "laufend" or str(v or "").startswith("abgebrochen"):
            return None          # zweimal hintereinander gestorben = System, nicht Zufall → bleibt in der Ampel
        return ("abgebrochen", f"rein lesende Wartungsaktion «{d.get('aktion')}» (aendert: false) ohne Schlussquittung geblieben; "
                "der Runner legt die Reihe täglich selbst neu an (Datei <id>-<Datum>.json, der Stand ist egal). "
                "Stirbt auch der nächste Lauf, bleibt die Ampel rot.")
    return None


def _quittung(aktion, stand="laufend", warum="Lesen. [wiederkehrend, alle 1 Tag(e)]", typ="wartung"):
    return {"typ": typ, "aktion": aktion, "stand": stand, "warum": warum}


def faelle(mod):
    """Fachliche Fälle gegen ein Modul (das echte oder eine Mutante). Gibt die Liste der VERLETZTEN Fälle zurück."""
    lesend = mod.lesende_aktionen()
    f = []

    def e(name, d, alle):
        return mod.entscheiden(name, d, alle, lesend)

    def pruefe(ok, text):
        if not ok:
            f.append(text)

    heute = _quittung("waechter_zustand")
    r = e("server-zustand-2026-10-22", heute, {"server-zustand-2026-10-21": _quittung("waechter_zustand", "ok"),
                                              "server-zustand-2026-10-22": heute})
    pruefe(bool(r) and r[0] == "abgebrochen", "A lesend+wiederkehrend, Vortag ok → soll schliessen")
    r = e("server-zustand-2026-10-22", heute, {"server-zustand-2026-10-21": _quittung("waechter_zustand", "abgebrochen"),
                                              "server-zustand-2026-10-22": heute})
    pruefe(r is None, "B Vortag schon abgebrochen → soll NICHT schliessen (Wiederholung)")
    r = e("server-zustand-2026-10-22", heute, {"server-zustand-2026-10-21": _quittung("waechter_zustand", "laufend"),
                                              "server-zustand-2026-10-22": heute})
    pruefe(r is None, "C Vortag noch laufend → soll NICHT schliessen")
    r = e("server-zustand-2026-10-22", heute, {"server-zustand-2026-10-18": _quittung("waechter_zustand", "abgebrochen"),
                                              "server-zustand-2026-10-21": _quittung("waechter_zustand", "ok"),
                                              "server-zustand-2026-10-22": heute})
    pruefe(bool(r) and r[0] == "abgebrochen", "D nur die JÜNGSTE frühere Quittung zählt (älterer Abbruch, dann ok) → schliessen")
    einmal = _quittung("waechter_zustand", warum="Einmal bestellt.")
    pruefe(e("server-zustand-2026-10-22", einmal, {"server-zustand-2026-10-22": einmal}) is None,
           "E Einmal-Auftrag (nicht wiederkehrend) → soll NICHT schliessen")
    aend = _quittung("updates_einspielen")
    pruefe(e("updates-2026-10-22", aend, {"updates-2026-10-22": aend}) is None, "F verändernde Aktion → soll NICHT schliessen")
    fremd = _quittung("gibt_es_nicht")
    pruefe(e("x-2026-10-22", fremd, {"x-2026-10-22": fremd}) is None, "G unbekannte Aktion → soll NICHT schliessen")
    st = {"typ": "seite_text", "stand": "laufend"}
    r = e("a-1", st, {"a-1": st})
    pruefe(bool(r) and r[0] == "abgebrochen", "H alte Regel seite_text bleibt")
    pruefe("waechter_zustand" in lesend and "updates_einspielen" not in lesend and len(lesend) >= 3,
           f"I Parser: lesende Aktionen aus wartung.mjs = {sorted(lesend)}")
    return f


def selbsttest():
    """Fälle am echten Modul + Mutanten des eigenen Quelltexts (jede muss mindestens einen Fall verletzen)."""
    import types
    quelle = open(os.path.abspath(__file__), encoding="utf-8").read()
    tab = aktionstabelle()
    fehler = [f"Parser: Aktion(en) ohne aendert-Feld: {sorted(n for n, v in tab.items() if v is None)}"] \
        if any(v is None for v in tab.values()) or not tab else []
    fehler += faelle(sys.modules[__name__])
    mutanten = [
        ("wiederkehrend-Pflicht entfernt", '"[wieder' + 'kehrend" in (d.get("warum") or "")', "True"),
        ("Wiederholungs-Sperre entfernt", 'if v == "lau' + 'fend" or str(v or "").startswith("abgebrochen"):', "if False:"),
        ("aendert-Prüfung entfernt (jede Wartung gilt als lesend)", 'd.get("aktion") in ' + 'lesende', 'd.get("aktion")'),
        ("Parser kehrt aendert um", '(a.group(1) == "fa' + 'lse")', '(a.group(1) == "true")'),
        ("Vorgänger = ÄLTESTE statt jüngste", "return (alle[frueher[-1]] or {}).get(\"stand\")", "return (alle[frueher[0]] or {}).get(\"stand\")"),
    ]
    erkannt = 0
    for name, alt, neu in mutanten:
        if quelle.count(alt) != 1:
            fehler.append(f"Mutant «{name}»: Ersetzungsstelle {quelle.count(alt)}× gefunden (soll 1×) — Selbsttest veraltet")
            continue
        mod = types.ModuleType("mutant")
        mod.__file__ = os.path.abspath(__file__)
        exec(compile(quelle.replace(alt, neu), "mutant", "exec"), mod.__dict__)
        try:
            if faelle(mod):
                erkannt += 1
            else:
                fehler.append(f"Mutant «{name}» NICHT erkannt")
        except Exception:
            erkannt += 1          # ein Absturz der Mutante zählt als erkannt
    if fehler:
        print("SELBSTTEST FEHLGESCHLAGEN:\n  " + "\n  ".join(fehler))
        return 1
    print(f"SELBSTTEST OK: 9 Fälle, {erkannt}/{len(mutanten)} Mutanten erkannt, {len(tab)} Wartungsaktionen "
          f"({len([1 for v in tab.values() if v is True])} lesend)")
    return 0


def main():
    jetzt = datetime.now(timezone.utc)
    alle = {}
    for p in sorted(glob.glob(os.path.join(ERLEDIGT, "*.json"))):
        try:
            alle[os.path.basename(p)[:-5]] = json.load(open(p))
        except Exception:
            pass
    geschlossen, bleibt = 0, []
    lesende = lesende_aktionen()
    for name, d in alle.items():
        if d.get("stand") != "laufend":
            continue
        pfad = os.path.join(ERLEDIGT, name + ".json")
        alter_h = (jetzt - zeit(d, pfad)).total_seconds() / 3600
        if alter_h < AB_STUNDEN:
            continue
        e = entscheiden(name, d, alle, lesende)
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
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    main()
