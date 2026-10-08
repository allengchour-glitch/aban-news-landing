"""cj_takt.py — EIN Takt für ALLE CJ-Verbraucher (21.09.2026, «schneller automation»).

Gemessen: acht CJ-Aufrufe hintereinander OHNE Takt → jeder zweite 1600200 (QPS), obwohl kein
anderer Prozess lief; die Helfer antworten darauf mit 8/16/24 s Strafschlaf. So kostete der
Varianten-Wächter ~12 s je Produkt, obwohl CJ selbst in 0,6 s antwortet. Zweite Messung: ein
EINZELNER Prozess mit 1,05 s Start-zu-Start wird noch in 1 von 6 Fällen gedrosselt, mit 2,1 s
nie — CJ zählt offenbar ab ANTWORT-ENDE. Deshalb misst diese Uhr Ende-zu-Start.

Dritte Messung (Python 0/8, Node 8/8 gedrosselt): wer sich am Start-Stempel einreiht, kommt
0,4 s nach dem ENDE des anderen dran. Darum RESERVIERTE Startzeiten: `takt()` holt unter der
Sperre den nächsten freien Startpunkt (letzter reservierter Start + ABSTAND), trägt ihn ein,
gibt die Sperre frei und schläft bis dahin. Der Abstand ist Start-zu-Start und enthält die
Antwortdauer (~0,6 s) — 1,8 s lässt ≥0,9 s Ruhe zwischen Antwort-Ende und nächstem Start.
`frei()` bleibt als Aufrufkompatibilität, tut nichts mehr.
Sperre: atomares mkdir (dasselbe Protokoll wie cj_takt.mjs, damit Python- und Node-Prozesse
EINE Uhr teilen); eine Sperre älter als 5 s gilt als Leiche. Kein Prozess kann sie dauerhaft
blockieren.
"""
import os, time

LOCKDIR = "/tmp/cj_takt.lockdir"
STEMPEL = "/tmp/cj_takt.stempel"        # naechster reservierter Start (Epoche, s)
ABSTAND = float(os.environ.get("CJ_TAKT_S", "1.8"))


def _sperren():
    while True:
        try:
            os.mkdir(LOCKDIR); return
        except FileExistsError:
            try:
                if time.time() - os.stat(LOCKDIR).st_mtime > 5:
                    os.rmdir(LOCKDIR); continue
            except FileNotFoundError:
                continue
            time.sleep(0.02)


def _frei_sperre():
    try: os.rmdir(LOCKDIR)
    except FileNotFoundError: pass


def _lesen():
    try:
        return float(open(STEMPEL).read().split()[0])
    except Exception:
        return 0.0


# 24.09.2026 VORRANG: Seit 16:00 (Budget-Reset) machten der Reel-Motor 196 und der Bewertungs-Nachholer 158 CJ-Aufrufe,
# der Kosten-Nachtrag 0 — und 13'018 aktive CJ-Produkte haben keinen EK (Preis-Verlustschutz blind). Solange ein
# VORRANG-Skript arbeitet (es frischt /tmp/cj_vorrang bei jedem Aufruf auf), warten alle anderen — ausser den
# Bestell-/Zahlungs-/Versandwaechtern (Kundinnen zuerst). Eine Vorrang-Datei aelter als 120 s zaehlt nicht (Leiche);
# niemand wartet laenger als VORRANG_MAX_S (Standard 90 min).
VORRANG_DATEI = "/tmp/cj_vorrang"
# 07.10.2026 (Plan Tag 8 «≥ 50 Produktvideos»): GEMESSEN im Vorrang-Fenster 00:00–01:30 — 06.10. 763 CJ-Aufrufe, davon
# cj_category_fill 377 / cj_perpetual 42 / cj_sku_import 23 (Grind ausserhalb der pausierten Runner 2–5), der Video-Nachtrag
# meldete sofort «Tagesbudget erschöpft» (0 Videos); 05.10. 27 Videos, 07.10. 17 (Ziel 250). Jetzt Vorrang wie der Kosten-Nachtrag.
VORRANG_SKRIPTE = ("cj_kosten_backfill", "cj_video_backfill", "auswahl_fehlt_messen")
# 08.10.2026 (Betreiber «rot oder pink auswahl, checke das auch bei anderen produkten»): 5'511 Produkte versprechen im Text eine
# Auswahl, die es nicht gibt; die Messung braucht je Produkt EINE CJ-Anfrage und lief am 08.10. um 18:40 UTC ins leere
# Tagesbudget (die Runner hatten es verbraucht). Kundenschutz vor Neuimport — begrenzter Job (~5'300 Aufrufe einmalig,
# danach nur Neuzugänge).
# 27.09.2026 (#1019): cj_ausgelistet_sichtbar schützt Bestellungen (ausgelistete, aber beworbene Ware) — wartete hinter
# dem Kosten-Nachtrag (Vorrang, bis 90 min) und kam nie an die Reihe. ≤ ~700 Aufrufe/Tag.
# 28.09.2026: cj_ersatz_suche (Einzelsuche für besuchte, nicht lieferbare Seiten, wenige Aufrufe).
# 07.10.2026: besuchte_seiten_lieferbar (Seiten mit Besuchern auf Lieferbarkeit) ist Kundenschutz wie cj_ausgelistet.
IMMER_FREI = ("cj_fulfill", "cj_order", "cj_zahlung", "versand_stillstand", "bestell", "cj_takt", "cj_ausgelistet", "cj_ersatz",
              "besuchte_seiten")
VORRANG_MAX_S = float(os.environ.get("VORRANG_MAX_S", "5400"))


# 24.09.2026 GLOBALER VORRANG: Server (luxe-waechter) und Cloud-Container teilen EIN CJ-Konto, aber jede Maschine hat
# ihre eigene Taktuhr und /tmp/cj_vorrang — der Server-Video-Indexer leerte den Eimer weiter, während hier der
# Kosten-Nachtrag wartete. dropship/_cj_vorrang_global (im Repo, beide Seiten lesen es nach jedem Merge) trägt ein
# ISO-Enddatum; bis dahin teilen sich alle NICHT-Vorrang-, NICHT-Bestell-Aufrufe je Maschine einen Abstand von
# GLOBAL_ABSTAND_S (siehe unten), niemand blockiert ganz. Der Kosten-Nachtrag löscht die Datei, sobald eine volle Runde nichts fand.
def _repo():
    """⚠️ 05.10.2026: cj_verfuegbarkeit/cj_varianten_wache/cj_versand_ch_guard laufen als /tmp-Spiegelkopie und importieren
    /tmp/cj_takt.py — dirname(dirname(__file__)) ist dann «/», der globale Vorrang in «/dropship/…» wäre unsichtbar.
    Kandidaten: $REPO, Lage der Datei, Arbeitsverzeichnis, fester Pfad; gültig nur mit dropship/ UND automation/."""
    hier = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for k in (os.environ.get("REPO"), hier, os.getcwd(), "/home/user/aban-news-landing"):
        if k and os.path.isdir(os.path.join(k, "dropship")) and os.path.isdir(os.path.join(k, "automation")):
            return k
    return hier


GLOBAL_DATEI = os.path.join(_repo(), "dropship", "_cj_vorrang_global")
GLOBAL_ABSTAND_S = float(os.environ.get("GLOBAL_ABSTAND_S", "180"))
GLOBAL_UHR = "/tmp/cj_bremse_letzter"
# 24.09.2026 18:40 GEMESSEN: usedToday 107'890 (16:51) → 112'620 (18:40) = ~43 Punkte/min Nachfluss, nicht 165. Beide
# Maschinen zusammen machten ~300 Aufrufe/h (Takt-Berichte dropship/_cj_takt_*.json) — alles sichtbar, nur zu viel.
# 30 s Schlaf je Aufruf liess den Server-Reel-Motor trotzdem 54 Aufrufe/h machen (Obergrenze 120/h). Jetzt ein
# gemeinsamer ABSTAND je Maschine: höchstens ein nicht dringender Aufruf alle GLOBAL_ABSTAND_S (180 s → 20/h je Maschine).


def _global_bremse():
    try:
        bis = open(GLOBAL_DATEI).read().split()[0]
        import datetime
        if datetime.datetime.fromisoformat(bis.replace("Z", "+00:00")).timestamp() <= time.time():
            return
    except Exception:
        return
    while True:
        try:
            alter = time.time() - os.stat(GLOBAL_UHR).st_mtime
        except FileNotFoundError:
            alter = GLOBAL_ABSTAND_S
        if alter >= GLOBAL_ABSTAND_S:
            try:
                with open(GLOBAL_UHR, "w") as f:
                    f.write(_skript())
            except Exception:
                pass
            return
        time.sleep(min(GLOBAL_ABSTAND_S - alter, 30) + 0.1)


def _skript():
    import sys
    return os.path.basename(sys.argv[0] or "?") or "?"


def _vorrang_warten():
    name = _skript()
    if any(name.startswith(v) for v in VORRANG_SKRIPTE):
        try:
            with open(VORRANG_DATEI, "w") as f:
                f.write(name)
        except Exception:
            pass
        return
    if any(name.startswith(v) for v in IMMER_FREI):
        return
    _global_bremse()
    ende = time.time() + VORRANG_MAX_S
    while time.time() < ende:
        try:
            if time.time() - os.stat(VORRANG_DATEI).st_mtime > 120:
                return
        except FileNotFoundError:
            return
        time.sleep(10)


def takt(abstand=None):
    """Reserviert den naechsten freien Startpunkt und blockiert bis dahin (Start-zu-Start ABSTAND)."""
    _vorrang_warten()
    abstand = ABSTAND if abstand is None else abstand
    _sperren()
    try:
        start = max(time.time(), _lesen() + abstand)
        with open(STEMPEL, "w") as f:
            f.write(f"{start:.3f}")
    finally:
        _frei_sperre()
    _protokoll(start)
    warte = start - time.time()
    if warte > 0:
        time.sleep(warte)


def _protokoll(start):
    """24.09.2026: WER verbraucht das CJ-Tagesbudget? Je Aufruf eine Zeile (Epoche, Skript) in
    /tmp/cj_takt_<Datum>.log — sonst ist «der Kosten-Nachtrag bekommt nur 500 Produkte/Tag» nicht zu
    klären (30 Verbraucher, ein Budget). Fehler hier dürfen den Aufruf nie stören."""
    try:
        import sys
        name = os.path.basename(sys.argv[0] or "?") or "?"
        with open(time.strftime("/tmp/cj_takt_%Y-%m-%d.log", time.gmtime(start)), "a") as f:
            f.write(f"{int(start)}\t{name}\n")
    except Exception:
        pass


def frei():
    """Kompatibilitaet: frueher Ende-Stempel, seit der dritten Messung ohne Wirkung."""
    return None


if __name__ == "__main__":
    n = int(os.environ.get("N", "5")); t = []
    for _ in range(n):
        takt(); t.append(time.time())
    d = [round(b - a, 3) for a, b in zip(t, t[1:])]
    print("Start-Abstaende:", d, "| ok" if all(x >= ABSTAND - 0.02 for x in d) else "| ZU DICHT")
