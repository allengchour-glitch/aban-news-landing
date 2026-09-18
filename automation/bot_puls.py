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
from datetime import datetime, timezone

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
    return all(ok for _, ok in faelle)


if __name__ == "__main__":
    import sys
    if "--selbsttest" in sys.argv:
        print("Selbsttest bot_puls:")
        sys.exit(0 if _selbsttest() else 1)
    z = puls_zeile()
    print(z if z else "BOT: Puls frisch")
