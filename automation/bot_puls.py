#!/usr/bin/env python3
"""bot_puls.py — sagt, ob der Hetzner-Browser-Agent noch lebt.

GEMESSEN 18.09.2026, und das ist der ganze Anlass: `grep -rln luxe_auftrag_runner`
ueber `automation/` und `tools/` gab **0 Treffer**. Der Agent, der als einziger einen
echten Browser hat — Shopify-Admin, Pinterest, Storefront-Wahrheit — stand in keiner
Wacht-Liste. Er konnte sterben, ohne dass eine Zeile irgendwo anders wird.

Dazu die zweite Haelfte: sein Runner endete bei leerer Warteschlange mit `exit 0`,
ohne Spur. Der haeufigste Lauf hinterliess also gar nichts, und «acht Stunden keine
Quittung» war nicht von «tot» zu unterscheiden. Beides ist behoben: der Runner
schreibt jetzt `auftraege/_puls.json` bei JEDEM Lauf, und diese Datei liest das hier.

⚠️ Der Fall, der beim Bauen am wichtigsten war: **die Puls-Datei fehlt.** Am
18.09. traf das zu — der neue Runner war noch nicht einmal gelaufen. Wer das als
«Agent tot» meldet, baut sich einen Fehlalarm, der stundenlang laut ist und dem
danach niemand mehr glaubt. Fehlende Datei heisst «noch kein Puls», nicht «tot».
Und kaputtes JSON heisst «unklar», nie stillschweigend in Ordnung.
"""
import json
import pathlib
from datetime import datetime, timedelta, timezone

PULS = pathlib.Path(__file__).resolve().parent.parent / "auftraege" / "_puls.json"
STILL_AB_STUNDEN = 2.0   # der Timer laeuft alle 5 Min; 2 h sind 24 verpasste Laeufe


def puls_zeile(pfad=PULS, jetzt=None):
    """Gibt eine Ampel-Zeile oder None (= alles in Ordnung, nichts zu melden)."""
    jetzt = jetzt or datetime.now(timezone.utc)
    if not pfad.exists():
        # Kein Fehler und kein Alarm: eine Aussage darueber, dass noch nicht gemessen wurde.
        return "BOT: noch kein Puls (auftraege/_puls.json fehlt — der Agent hat seit dem Einbau am 18.09. nicht gelaufen)"
    try:
        d = json.loads(pfad.read_text())
        rohzeit = d["letzter_lauf"]
        wann = datetime.fromisoformat(rohzeit.replace("Z", "+00:00"))
        if wann.tzinfo is None:
            wann = wann.replace(tzinfo=timezone.utc)
    except Exception as e:
        # Lieber laut unklar als leise in Ordnung.
        return f"BOT: Puls unlesbar ({type(e).__name__}: {e}) — von Hand nach auftraege/_puls.json sehen"

    alter_h = (jetzt - wann).total_seconds() / 3600.0
    if alter_h > STILL_AB_STUNDEN:
        tage = f", {alter_h/24:.1f} Tage" if alter_h > 24 else ""
        return (f"⚠️ BOT STILL seit {alter_h:.1f} h{tage} (letzter Lauf {wann:%d.%m. %H:%M} UTC) — "
                f"kein Browser-Auftrag wird mehr erledigt. Auf dem Server: "
                f"systemctl status luxe-agent.timer")
    return None


QUITTUNGEN = pathlib.Path(__file__).resolve().parent.parent / "auftraege" / "erledigt"
HAENGT_AB_MINUTEN = 30.0


def haengende_auftraege(ordner=QUITTUNGEN, jetzt=None):
    """Meldet Quittungen, die auf `stand: laufend` stehengeblieben sind.

    ANLASS 18./19.09.2026 — die Luecke, die der Puls NICHT schliesst. Der Herzschlag
    beweist, dass der Runner LEBT; er beweist nicht, dass ein Auftrag ANKOMMT. Am
    18.09. starb der Storefront-Lauf beim ersten Seitenaufruf: die Quittung stand seit
    10:09 auf «laufend», kein Bild, kein Ergebnis — und gemeldet hat es niemand, weil
    der Puls daneben luekenlos alle fuenf Minuten «leer» schrieb. Gemessen am 19.09.
    hingen ZWEI Quittungen seit dem 17.09., also 37 Stunden lang, unbemerkt.

    Der Runner setzt `laufend` als Claim VOR der Arbeit (damit nach einem misslungenen
    Push nichts zweimal laeuft — die IG-Doppelpost-Lehre). Steht der Claim spaeter
    immer noch da, ist der Lauf mittendrin gestorben. Genau das ist hier die Frage.

    ⚠️ Zeitquelle: `begonnen` im JSON, wenn vorhanden. Die Dateizeit ist nur der
    Notnagel — nach einem frischen Klon traegt jede Datei die Klon-Zeit, und der
    Waechter schwiege ausgerechnet dann, wenn er gebraucht wird. Fehlt `begonnen`,
    wird das in der Meldung gesagt, statt es zu verschweigen.
    """
    jetzt = jetzt or datetime.now(timezone.utc)
    if not ordner.is_dir():
        return None                      # kein Auftragskasten = nichts zu melden
    haengt, unlesbar = [], []
    for pfad in sorted(ordner.glob("*.json")):
        try:
            d = json.loads(pfad.read_text())
        except Exception:
            unlesbar.append(pfad.name)
            continue
        if d.get("stand") != "laufend":
            continue
        roh = d.get("begonnen") or d.get("zeit")
        quelle = "begonnen"
        if roh:
            try:
                wann = datetime.fromisoformat(str(roh).replace("Z", "+00:00"))
                if wann.tzinfo is None:
                    wann = wann.replace(tzinfo=timezone.utc)
            except Exception:
                roh = None
        if not roh:
            wann = datetime.fromtimestamp(pfad.stat().st_mtime, timezone.utc)
            quelle = "Dateizeit"
        alter_min = (jetzt - wann).total_seconds() / 60.0
        if alter_min > HAENGT_AB_MINUTEN:
            haengt.append((pfad.name, alter_min, quelle))
    teile = []
    if haengt:
        haengt.sort(key=lambda x: -x[1])
        namen = ", ".join(f"{n} ({a/60:.0f} h, {q})" for n, a, q in haengt[:3])
        mehr = f" und {len(haengt)-3} weitere" if len(haengt) > 3 else ""
        teile.append(f"⚠️ BOT-AUFTRAG HAENGT: {len(haengt)} Quittung(en) stehen auf «laufend» — "
                     f"{namen}{mehr}. Der Lauf ist mittendrin gestorben; der Puls sieht das nicht.")
    if unlesbar:
        teile.append(f"⚠️ {len(unlesbar)} Quittung(en) unlesbar: {', '.join(unlesbar[:3])}")
    return " · ".join(teile) if teile else None


def _selbsttest():
    """Die Regel muss ihren Koeder fangen UND einen echten Fall durchlassen."""
    import tempfile
    jetzt = datetime(2026, 9, 18, 12, 0, tzinfo=timezone.utc)
    faelle = []
    with tempfile.TemporaryDirectory() as d:
        p = pathlib.Path(d) / "_puls.json"

        # (a) frischer Puls -> SCHWEIGT. Ohne diesen Fall waere eine Regel, die immer
        #     meldet, «erfolgreich» — und damit wertlos.
        p.write_text(json.dumps({"letzter_lauf": "2026-09-18T11:30:00Z"}))
        faelle.append(("frisch (30 min) schweigt", puls_zeile(p, jetzt) is None))

        # (b) alter Puls -> MELDET
        p.write_text(json.dumps({"letzter_lauf": "2026-09-18T05:00:00Z"}))
        z = puls_zeile(p, jetzt)
        faelle.append(("7 h alt meldet", z is not None and "STILL" in z and "7.0 h" in z))

        # (c) Grenze knapp darunter -> schweigt (1.9 h)
        p.write_text(json.dumps({"letzter_lauf": "2026-09-18T10:06:00Z"}))
        faelle.append(("1.9 h schweigt", puls_zeile(p, jetzt) is None))

        # (d) kaputtes JSON -> unklar, NICHT stillschweigend ok
        p.write_text("{kein json")
        z = puls_zeile(p, jetzt)
        faelle.append(("kaputtes JSON meldet unklar", z is not None and "unlesbar" in z))

        # (e) Feld fehlt -> unklar
        p.write_text(json.dumps({"zustand": "leer"}))
        z = puls_zeile(p, jetzt)
        faelle.append(("Feld fehlt meldet unklar", z is not None and "unlesbar" in z))

        # (f) Datei fehlt -> «noch kein Puls», und ausdruecklich NICHT «STILL»
        z = puls_zeile(pathlib.Path(d) / "gibt-es-nicht.json", jetzt)
        faelle.append(("fehlende Datei: kein Fehlalarm",
                       z is not None and "noch kein Puls" in z and "STILL" not in z))

    for name, ok in faelle:
        print(("  ok   " if ok else "  FEHL ") + name)

    # ── Gegenproben fuer haengende_auftraege: eine Wache, die nur ihren Erfolgsfall
    #    kennt, ist keine Sicherung (Klingen-Lehre 16.09.). Beide Richtungen.
    import tempfile, os
    with tempfile.TemporaryDirectory() as tmp:
        t = pathlib.Path(tmp)
        jetzt = datetime(2026, 9, 19, 12, 0, tzinfo=timezone.utc)

        def schreib(name, inhalt, mtime_min_alt=0):
            p = t / name
            p.write_text(json.dumps(inhalt))
            if mtime_min_alt:
                ts = (jetzt - timedelta(minutes=mtime_min_alt)).timestamp()
                os.utime(p, (ts, ts))
            return p

        # (a) Koeder: haengende Quittung MUSS erscheinen
        schreib("a.json", {"stand": "laufend", "begonnen": "2026-09-19T08:00:00Z"})
        r = haengende_auftraege(t, jetzt)
        faelle.append(("haengende Quittung wird gemeldet", bool(r) and "HAENGT" in r))

        # (b) Gegenrichtung: saubere Quittungen duerfen NICHT alarmieren
        for f in t.glob("*.json"):
            f.unlink()
        schreib("b.json", {"stand": "ok"})
        schreib("c.json", {"stand": "nicht-angemeldet"})
        faelle.append(("saubere Quittungen schweigen", haengende_auftraege(t, jetzt) is None))

        # (c) Ein Lauf, der GERADE erst begonnen hat, ist kein Befund
        for f in t.glob("*.json"):
            f.unlink()
        schreib("d.json", {"stand": "laufend", "begonnen": "2026-09-19T11:55:00Z"})
        faelle.append(("frisch begonnener Lauf schweigt (5 Min)", haengende_auftraege(t, jetzt) is None))

        # (d) Ohne `begonnen` faellt er auf die Dateizeit zurueck UND sagt es
        for f in t.glob("*.json"):
            f.unlink()
        schreib("e.json", {"stand": "laufend"}, mtime_min_alt=120)
        r = haengende_auftraege(t, jetzt)
        faelle.append(("ohne begonnen: Dateizeit, und sie wird benannt",
                       bool(r) and "Dateizeit" in r))

        # (e) Kaputtes JSON: laut unklar, nie leise in Ordnung
        for f in t.glob("*.json"):
            f.unlink()
        (t / "f.json").write_text("{kaputt")
        r = haengende_auftraege(t, jetzt)
        faelle.append(("kaputte Quittung wird gemeldet", bool(r) and "unlesbar" in r))

        # (f) Kein Ordner = nichts zu melden (kein Fehlalarm auf frischem Klon)
        faelle.append(("fehlender Ordner schweigt",
                       haengende_auftraege(t / "gibtesnicht", jetzt) is None))

    return all(ok for _, ok in faelle)


if __name__ == "__main__":
    import sys
    if "--selbsttest" in sys.argv:
        print("Selbsttest bot_puls:")
        sys.exit(0 if _selbsttest() else 1)
    zeilen = [puls_zeile(), haengende_auftraege()]
    zeilen = [z for z in zeilen if z]
    print("\n".join(zeilen) if zeilen else "BOT: Puls frisch, keine haengenden Auftraege")
