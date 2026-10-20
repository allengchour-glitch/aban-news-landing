#!/usr/bin/env python3
"""waffen_bild_wache.py — wacht über das Waffen-Sicherheitsnetz selbst (20.10.2026).

ANLASS (Verbesserungsrunde 20.10., Spähtrupp + Skeptiker, an der Admin-API gemessen): der Wächter `ueberwachung_waffen_guard.py`
sah drei Waffen-Zubehör-Produkte nicht (Titel «Zielklammer für optisches Visier», «dekorative schräge Zielvorrichtung»,
«Leichte taktische Brusttasche» — alle ACTIVE in sechs Kanälen), und das Netz darunter war still:
  · `dropship/_waffen_bild_pruefen.json` (Bildprüf-Liste) stand seit 15.10. auf 2 Fällen — niemand besitzt sie, niemand sah sie;
  · `dropship/_waffen_voll_stand.txt` (Stempel des Wochen-Volllaufs) stand auf 10.10. — der Voll-Lauf war seit 17.10. fällig und
    ist in den stündlichen Container-Neustarts mehrfach gestorben, ohne dass etwas meldete (das Log hat keine Schlusszeile).
Ein Netz, das niemand misst, meldet «0 ohne waffe-pruefen» und wirkt grün, obwohl es seit Tagen nichts mehr verarbeitet.

Diese Wache liefert EINE Ampelzeile (oder None = in Ordnung):
  · Bildprüf-Liste: Einträge älter als LISTE_ALT_TAGE (2) → «WAFFEN-BILDPRÜFUNG: n offen, ältester x Tage» + wie man sie abarbeitet;
  · Volllauf-Stempel älter als VOLL_ALT_TAGE (8) oder unlesbar/fehlend → «WAFFEN-VOLLLAUF überfällig».
Unlesbare Dateien heissen «unklar», nie «in Ordnung».

  python3 automation/waffen_bild_wache.py            Zeile drucken
  python3 automation/waffen_bild_wache.py --selbsttest
"""
import datetime as dt
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LISTE = os.path.join(REPO, "dropship", "_waffen_bild_pruefen.json")
STEMPEL = os.path.join(REPO, "dropship", "_waffen_voll_stand.txt")
LISTE_ALT_TAGE = 2
VOLL_ALT_TAGE = 8


def _tage(datum_text, jetzt):
    """Alter in Tagen (float) eines «JJJJ-MM-TT»-Texts, sonst None."""
    try:
        d = dt.datetime.strptime(str(datum_text).strip()[:10], "%Y-%m-%d").replace(tzinfo=dt.timezone.utc)
    except Exception:
        return None
    return (jetzt - d).total_seconds() / 86400.0


def liste_zeile(pfad=LISTE, jetzt=None):
    jetzt = jetzt or dt.datetime.now(dt.timezone.utc)
    if not os.path.exists(pfad):
        return None                       # noch nie etwas vorgemerkt = nichts offen
    try:
        eintraege = json.load(open(pfad, encoding="utf-8"))
        if not isinstance(eintraege, list):
            raise ValueError("keine Liste")
    except Exception as e:
        return f"WAFFEN-BILDPRÜFUNG: Liste unlesbar ({type(e).__name__}) — dropship/_waffen_bild_pruefen.json von Hand ansehen"
    if not eintraege:
        return None
    alter = []
    for e in eintraege:
        t = _tage((e or {}).get("datum"), jetzt) if isinstance(e, dict) else None
        if t is None:                     # ohne Datum: Dateizeit als Notnagel, und das ist ein Befund für sich
            t = (jetzt.timestamp() - os.path.getmtime(pfad)) / 86400.0
        alter.append(t)
    aelteste = max(alter)
    if aelteste <= LISTE_ALT_TAGE:
        return None
    return (f"⚠️ WAFFEN-BILDPRÜFUNG: {len(eintraege)} Produkt(e) warten seit bis zu {int(aelteste)} Tagen auf ein Bildurteil "
            f"(Kontaktbogen: python3 automation/bild_kontaktbogen_liste.py dropship/_waffen_bild_pruefen.json waffen; Entscheid in "
            f"automation/data/schusswaffen_zubehoer_regel.json: bild_geprueft = Waffe → Tag, bild_ok = keine Waffe)")


def voll_zeile(pfad=STEMPEL, jetzt=None):
    jetzt = jetzt or dt.datetime.now(dt.timezone.utc)
    try:
        roh = open(pfad, encoding="utf-8").read().strip()
    except OSError:
        return "⚠️ WAFFEN-VOLLLAUF: kein Stempel (dropship/_waffen_voll_stand.txt fehlt) — der Wochen-Volllauf lief nie durch"
    t = _tage(roh, jetzt)
    if t is None:
        return f"⚠️ WAFFEN-VOLLLAUF: Stempel unlesbar («{roh[:20]}»)"
    if t > VOLL_ALT_TAGE:
        return (f"⚠️ WAFFEN-VOLLLAUF überfällig: letzter erfolgreicher Lauf {roh[:10]} ({int(t)} Tage) — der Lauf stirbt vermutlich im "
                f"Container-Neustart (Log /tmp/ueberwachung_waffen_guard.log ohne Schlusszeile)")
    return None


def zeile(jetzt=None, liste=LISTE, stempel=STEMPEL):
    teile = [liste_zeile(liste, jetzt), voll_zeile(stempel, jetzt)]
    teile = [t for t in teile if t]
    return " · ".join(teile) if teile else None


def _selbsttest():
    import tempfile
    jetzt = dt.datetime(2026, 10, 20, 12, 0, tzinfo=dt.timezone.utc)
    faelle = []
    with tempfile.TemporaryDirectory() as d:
        L = os.path.join(d, "liste.json")
        S = os.path.join(d, "stempel.txt")

        def liste(inhalt):
            open(L, "w", encoding="utf-8").write(inhalt if isinstance(inhalt, str) else json.dumps(inhalt))

        # Liste
        faelle.append(("fehlende Liste schweigt", liste_zeile(os.path.join(d, "gibtesnicht.json"), jetzt) is None))
        liste([])
        faelle.append(("leere Liste schweigt", liste_zeile(L, jetzt) is None))
        liste([{"id": "1", "datum": "2026-10-19"}])
        faelle.append(("frischer Eintrag (1 Tag) schweigt", liste_zeile(L, jetzt) is None))
        liste([{"id": "1", "datum": "2026-10-15"}, {"id": "2", "datum": "2026-10-20"}])
        z = liste_zeile(L, jetzt)
        faelle.append(("5 Tage alter Eintrag meldet, mit Anzahl und Alter",
                       z is not None and "2 Produkt" in z and "5 Tagen" in z))
        liste([{"id": "1", "datum": "2026-10-18"}])
        faelle.append(("genau 2,5 Tage meldet (Grenze > 2)", liste_zeile(L, jetzt) is not None))
        liste([{"id": "1", "datum": "2026-10-18"}])
        faelle.append(("genau 2,0 Tage schweigt (Grenze: erst darüber)",
                       liste_zeile(L, dt.datetime(2026, 10, 20, 0, 0, tzinfo=dt.timezone.utc)) is None))
        liste("{kaputt")
        z = liste_zeile(L, jetzt)
        faelle.append(("kaputtes JSON meldet «unlesbar», nicht «in Ordnung»", z is not None and "unlesbar" in z))
        liste('{"a": 1}')
        faelle.append(("JSON ohne Liste meldet unlesbar", "unlesbar" in (liste_zeile(L, jetzt) or "")))
        liste([{"id": "1"}])
        os.utime(L, ((jetzt - dt.timedelta(days=6)).timestamp(),) * 2)
        faelle.append(("Eintrag ohne Datum: Dateizeit (6 Tage) meldet", liste_zeile(L, jetzt) is not None))

        # Stempel
        faelle.append(("fehlender Stempel meldet", "kein Stempel" in (voll_zeile(os.path.join(d, "x.txt"), jetzt) or "")))
        open(S, "w").write("2026-10-17\n")
        faelle.append(("Stempel 3 Tage alt schweigt", voll_zeile(S, jetzt) is None))
        open(S, "w").write("2026-10-12\n")
        faelle.append(("Stempel 8,5 Tage alt meldet überfällig", "überfällig" in (voll_zeile(S, jetzt) or "")))
        open(S, "w").write("2026-10-10\n")
        z = voll_zeile(S, jetzt)
        faelle.append(("Stempel 10.10. meldet mit Datum und Alter", z is not None and "2026-10-10" in z and "10 Tage" in z))
        open(S, "w").write("kaputt\n")
        faelle.append(("Stempel unlesbar meldet", "unlesbar" in (voll_zeile(S, jetzt) or "")))

        # Zusammenfassung
        liste([])
        open(S, "w").write("2026-10-19\n")
        faelle.append(("alles in Ordnung → None", zeile(jetzt, L, S) is None))
        liste([{"id": "1", "datum": "2026-10-10"}])
        open(S, "w").write("2026-10-01\n")
        z = zeile(jetzt, L, S)
        faelle.append(("beides kaputt → eine Zeile mit beiden Teilen", z is not None and "BILDPRÜFUNG" in z and "VOLLLAUF" in z))
    for n, ok in faelle:
        print(("  ok   " if ok else "  FEHL ") + n)
    return all(ok for _, ok in faelle)


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        print("Selbsttest waffen_bild_wache:")
        sys.exit(0 if _selbsttest() else 1)
    z = zeile()
    print(z or "WAFFEN-NETZ: Bildprüf-Liste leer/frisch, Volllauf-Stempel frisch")
