#!/usr/bin/env python3
"""cj_nachpruefung_netz.py — Stand, Startbedingung und Ampelzeile für die CJ-Nachprüfung (#1019-Schutz), 21.10.2026.

ANLASS (Spähtrupp wf_3b017e9f, Befund W1, nachgemessen): `cj_ausgelistet_sichtbar.py` verspricht «sichtbare Ware höchstens 1 Tag,
der übrige aktive CJ-Bestand höchstens 30 Tage alt». GEMESSEN: von 53'275 aktiven CJ-Produkten waren 3'618 in 30 T geprüft (6,8 %),
Stufe A (alles Sichtbare, ~1'100) lief nur an 5 von 24 Tagen komplett. Ursachen: (1) der Lauf dauert länger als ein Container lebt
(Median 14,5 min) und wurde vom Aufseher höchstens 3×/Tag nachgeholt (Deckel), (2) der leere CJ-Punkte-Eimer (API-Code 16900500)
zählte als «kein Urteil» — 54–60 % aller Fragen, jede mit Takt-Verbrauch, (3) 1602001-Antworten (Produkt unbekannt) blieben ohne
Datum für immer vorn in der Schlange, (4) keine Ampelzeile — das Versprechen verfiel unbemerkt.

Dieses Modul: schreibt den Stand des Wächters (`dropship/_cj_nachpruefung_stand.json`), sagt dem Aufseher per `--noetig`, ob ein Lauf
sich lohnt (Tagesziel aus dem Ledger, Eimer-Pause), und liefert die Ampelzeile (`--zeile`). Reine Lese-/Schreib-Logik, kein CJ-Aufruf.
Selbsttest: `python3 automation/cj_nachpruefung_netz.py --selbsttest`.
"""
import datetime, json, os, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(REPO, "dropship", "_cj_nachpruefung_stand.json")
LEDGER = os.path.join(REPO, "dropship", "_cj_nachpruefung.tsv")
A_MAX_H = 36          # Stufe A (sichtbare Ware) darf höchstens so lange unvollständig bleiben, bevor die Ampel ruft
EIMER_PAUSE_MIN = 90  # nach «Eimer leer» so lange kein neuer Start (jeder Start verbrennt sonst nur Takt-Slots)
B_INFO_PROZENT = 50   # darunter: ℹ️ (Rest-Bestand in 30 T nur teilweise geprüft)
STARTS_JE_TAG = 12    # Obergrenze Starts je UTC-Tag (Schutz vor Endlosschleife)


def _jetzt():
    return datetime.datetime.now(datetime.timezone.utc)


def _iso(t):
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse(s):
    try:
        return datetime.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc)
    except Exception:
        return None


def lesen(pfad=None):
    try:
        return json.load(open(pfad or STAND, encoding="utf-8"))
    except Exception:
        return None


def schreiben(felder, pfad=None):
    """Mischt `felder` in den Stand; atomar (tmp + replace). `a_voll` (letzter Zeitpunkt mit 0 offenen A-Produkten) bleibt erhalten."""
    pfad = pfad or STAND
    alt = lesen(pfad) or {}
    neu = dict(alt)
    neu.update(felder)
    neu["stand"] = _iso(_jetzt())
    tmp = pfad + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(neu, f, ensure_ascii=False, indent=0, sort_keys=True)
    os.replace(tmp, pfad)
    return neu


def ledger_zaehlen(heute, ledger=None, grenze_tage=30):
    """(Einträge von heute, ok/weg in den letzten `grenze_tage` Tagen, letztes Datum) aus dem Ledger. «unklar» zählt für heute
    (die Schlange rückt weiter), aber NICHT für die Abdeckung (kein Urteil)."""
    ledger = ledger or LEDGER
    heute_n, letzte, neu = 0, "", {}
    grenze = (datetime.date.fromisoformat(heute) - datetime.timedelta(days=grenze_tage)).isoformat()
    try:
        for l in open(ledger, encoding="utf-8"):
            t = l.rstrip("\n").split("\t")
            if len(t) < 3:
                continue
            if t[1] == heute:
                heute_n += 1
            if t[1] > letzte:
                letzte = t[1]
            if t[1] > neu.get(t[0], ("", ""))[0]:
                neu[t[0]] = (t[1], t[2])
    except OSError:
        pass
    abgedeckt = sum(1 for d, u in neu.values() if d >= grenze and u in ("ok", "weg"))
    return heute_n, abgedeckt, letzte


def lauf_noetig(jetzt=None, stand=None, ledger=None, starts=None):
    """(ja/nein, Grund). Ja, wenn das Tagesziel (Stufe A komplett + ROLLEN Rest-Bestand) heute noch nicht erreicht ist
    und der Eimer nicht gerade leer war."""
    jetzt = jetzt or _jetzt()
    heute = jetzt.date().isoformat()
    s = stand if stand is not None else lesen()
    if starts is not None and starts >= STARTS_JE_TAG:
        return False, f"{starts} Starts heute (Obergrenze {STARTS_JE_TAG})"
    if not s:
        return True, "kein Stand"
    e = _parse(s.get("eimer") or "")
    if e and (jetzt - e).total_seconds() < EIMER_PAUSE_MIN * 60:
        return False, f"CJ-Eimer war vor {int((jetzt - e).total_seconds() // 60)} min leer"
    ziel = int(s.get("ziel") or 0)
    if s.get("tag") != heute or ziel <= 0:
        return True, "neuer Tag"
    n, _, _ = ledger_zaehlen(heute, ledger)
    if n < ziel:
        return True, f"Tagesziel {n}/{ziel}"
    return False, f"Tagesziel erreicht {n}/{ziel}"


def zeile(jetzt=None, stand=None, ledger=None):
    """Ampelzeile oder ''. ⚠️ nur, wenn Stufe A (alles Sichtbare) länger als A_MAX_H nicht vollständig geprüft wurde oder der Wächter
    gar nicht mehr schreibt; ℹ️, solange der Rest-Bestand in 30 Tagen unter B_INFO_PROZENT geprüft ist."""
    jetzt = jetzt or _jetzt()
    s = stand if stand is not None else lesen()
    if not s:
        _, _, letzte = ledger_zaehlen(jetzt.date().isoformat(), ledger)
        if letzte and (jetzt.date() - datetime.date.fromisoformat(letzte)).days > 2:
            return f"⚠️ NACHPRÜFUNG (CJ ausgelistet): kein Stand und der letzte Ledger-Eintrag ist vom {letzte} — der #1019-Schutz läuft nicht"
        return ""
    a_voll = _parse(s.get("a_voll") or "")
    st = _parse(s.get("stand") or "")
    teile = []
    if st and (jetzt - st).total_seconds() > A_MAX_H * 3600:
        teile.append(f"Wächter schreibt seit {int((jetzt - st).total_seconds() // 3600)} h nichts mehr")
    if not a_voll or (jetzt - a_voll).total_seconds() > A_MAX_H * 3600:
        h = f"{int((jetzt - a_voll).total_seconds() // 3600)} h" if a_voll else "unbekannter Zeit"
        teile.append(f"Stufe A (sichtbare Ware) seit {h} nicht vollständig geprüft (offen {s.get('a_offen', '?')} von {s.get('a_gesamt', '?')})")
        if s.get("eimer"):
            teile[-1] += " · CJ-Eimer leer"
    aktiv = int(s.get("cj_aktiv") or 0)
    pct = round(100 * int(s.get("b_abgedeckt") or 0) / aktiv) if aktiv else None
    if teile:
        return "⚠️ NACHPRÜFUNG (CJ ausgelistet, #1019-Schutz): " + " · ".join(teile) + (f" · Gesamtbestand in 30 T geprüft {pct} %" if pct is not None else "")
    if pct is not None and pct < B_INFO_PROZENT:
        return f"ℹ️ NACHPRÜFUNG (CJ ausgelistet): Stufe A vollständig, übriger Bestand in 30 T erst {pct} % geprüft (Soll 100 %, Tagesziel {s.get('ziel', '?')})"
    return ""


def selbsttest():
    import tempfile
    fehler = []
    def soll(ist, erwartet, name):
        if ist != erwartet:
            fehler.append(f"{name}: erwartet {erwartet!r}, war {ist!r}")
    d = tempfile.mkdtemp(prefix="nachpruef_")
    led, st = os.path.join(d, "l.tsv"), os.path.join(d, "s.json")
    jetzt = datetime.datetime(2026, 10, 21, 12, 0, 0, tzinfo=datetime.timezone.utc)
    heute = "2026-10-21"
    with open(led, "w", encoding="utf-8") as f:
        f.write(f"g1\t2026-09-01\tok\ng2\t{heute}\tok\ng3\t{heute}\tunklar\ng4\t{heute}\tweg\ng5\t2026-10-10\tok\n")
    # ledger_zaehlen: heute 3 (inkl. unklar), Abdeckung 30 T: g2 ok, g4 weg, g5 ok = 3 (g1 zu alt, g3 unklar), letztes Datum heute
    soll(ledger_zaehlen(heute, led), (3, 3, heute), "ledger_zaehlen")
    # lauf_noetig
    soll(lauf_noetig(jetzt, stand={}, ledger=led)[0], True, "kein Stand → Lauf")
    s1 = {"tag": heute, "ziel": 5, "eimer": ""}
    soll(lauf_noetig(jetzt, stand=s1, ledger=led)[0], True, "3 von 5 → Lauf")
    soll(lauf_noetig(jetzt, stand={"tag": heute, "ziel": 3}, ledger=led)[0], False, "Ziel erreicht → kein Lauf")
    soll(lauf_noetig(jetzt, stand={"tag": "2026-10-20", "ziel": 3}, ledger=led)[0], True, "gestriger Stand → Lauf")
    soll(lauf_noetig(jetzt, stand={"tag": heute, "ziel": 99, "eimer": _iso(jetzt - datetime.timedelta(minutes=30))}, ledger=led)[0], False, "Eimer vor 30 min → Pause")
    soll(lauf_noetig(jetzt, stand={"tag": heute, "ziel": 99, "eimer": _iso(jetzt - datetime.timedelta(minutes=120))}, ledger=led)[0], True, "Eimer vor 120 min → wieder")
    soll(lauf_noetig(jetzt, stand=s1, ledger=led, starts=STARTS_JE_TAG)[0], False, "Starts-Obergrenze")
    # zeile
    gut = {"stand": _iso(jetzt - datetime.timedelta(hours=1)), "a_voll": _iso(jetzt - datetime.timedelta(hours=5)), "a_gesamt": 1100, "a_offen": 0,
           "cj_aktiv": 1000, "b_abgedeckt": 900, "ziel": 2600}
    soll(zeile(jetzt, stand=gut, ledger=led), "", "alles gut → still")
    soll(zeile(jetzt, stand=dict(gut, b_abgedeckt=68), ledger=led).startswith("ℹ️"), True, "B 6,8 % → ℹ️")
    alt = dict(gut, a_voll=_iso(jetzt - datetime.timedelta(hours=50)), a_offen=700)
    z = zeile(jetzt, stand=alt, ledger=led)
    soll(z.startswith("⚠️") and "50 h" in z and "700 von 1100" in z, True, "A seit 50 h → ⚠️")
    soll(zeile(jetzt, stand=dict(gut, a_voll=""), ledger=led).startswith("⚠️"), True, "a_voll fehlt → ⚠️")
    soll("Eimer" in zeile(jetzt, stand=dict(alt, eimer=_iso(jetzt)), ledger=led), True, "Eimer im ⚠️-Text")
    tot = dict(gut, stand=_iso(jetzt - datetime.timedelta(hours=60)))
    soll("seit 60 h nichts mehr" in zeile(jetzt, stand=tot, ledger=led), True, "Stand 60 h alt → ⚠️")
    # ohne Stand: Ledger alt → ⚠️, Ledger frisch → still
    led_alt = os.path.join(d, "alt.tsv")
    open(led_alt, "w", encoding="utf-8").write("g1\t2026-10-10\tok\n")
    soll(zeile(jetzt, stand={}, ledger=led_alt).startswith("⚠️"), True, "ohne Stand + altes Ledger → ⚠️")
    soll(zeile(jetzt, stand={}, ledger=led), "", "ohne Stand + frisches Ledger → still")
    # schreiben/lesen/Erhalt von a_voll
    schreiben({"a_voll": "2026-10-21T01:00:00Z", "tag": heute}, st)
    schreiben({"a_offen": 5}, st)
    r = lesen(st)
    soll((r.get("a_voll"), r.get("a_offen"), bool(r.get("stand"))), ("2026-10-21T01:00:00Z", 5, True), "schreiben mischt, a_voll bleibt")
    import shutil
    shutil.rmtree(d, ignore_errors=True)
    if fehler:
        print("\n".join("❌ " + f for f in fehler)); return 1
    print("✅ Selbsttest cj_nachpruefung_netz: alle Fälle richtig")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zeile" in sys.argv:
        print(zeile()); sys.exit(0)
    if "--noetig" in sys.argv:
        jetzt = _jetzt()
        zaehler = f"/tmp/_nachpruef_starts_{jetzt.strftime('%Y%m%d')}"
        try:
            n = int(open(zaehler).read().strip() or 0)
        except Exception:
            n = 0
        ja, grund = lauf_noetig(jetzt, starts=n)
        print(("JA " if ja else "NEIN ") + grund)
        if ja:
            try:
                open(zaehler, "w").write(str(n + 1))
            except Exception:
                pass
        sys.exit(0 if ja else 1)
    print(__doc__)
