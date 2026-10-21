#!/usr/bin/env python3
"""guard_vollpass.py — Ampelzeile für den wöchentlichen Voll-Durchlauf der Sicherheitswächter (21.10.2026).

ANLASS: tierschutz_guard.py und medizin_zweck_guard.py prüfen täglich nur die Neuimporte (3 Tage) und alle 7 Tage den GANZEN
Bestand (Stempel `dropship/_<wächter>_voll_stand.txt`, erst nach Exit 0 geschrieben). Der Tierschutz-Vollpass war am 20.10. fällig
(Stempel 13.10.), scheiterte aber dreimal an der Shopify-Drosselung — und das Ergebnis blieb unsichtbar: die Fehlzeile trug kein
«Error», `absturz_nachholen` holte nichts nach, und keine Ampelzeile fragte nach dem Alter des Stempels. Der Waffen-Vollpass hat
seine eigene Zeile (`waffen_bild_wache.py`).

  python3 automation/guard_vollpass.py --zeile       Ampelzeile (leer = in Ordnung)
  python3 automation/guard_vollpass.py --selbsttest
"""
import datetime as dt
import os
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DROP = os.path.join(REPO, "dropship")
STEMPEL = {"Tierschutz": "_tierschutz_voll_stand.txt", "Medizin": "_medizin_voll_stand.txt"}
MAX_TAGE = 9          # Takt 7 Tage + 2 Tage Karenz (ein Vollpass ist ein Lauf von Minuten bis Stunden und kann einen Tag verrutschen)


def zeile(basis=DROP, jetzt=None, stempel=None):
    """Ampelzeile oder None. Fehlender/kaputter Stempel ist «unklar», nie «in Ordnung»."""
    jetzt = jetzt or dt.datetime.now(dt.timezone.utc)
    teile = []
    for name, datei in (stempel or STEMPEL).items():
        try:
            tag = dt.datetime.strptime(open(os.path.join(basis, datei), encoding="utf-8").read().strip()[:10], "%Y-%m-%d")
        except Exception:  # noqa: BLE001
            teile.append(f"{name}: kein lesbarer Stempel ({datei})")
            continue
        alter = (jetzt - tag.replace(tzinfo=dt.timezone.utc)).days
        if alter > MAX_TAGE:
            teile.append(f"{name} {alter} Tage ohne Voll-Durchlauf (Stempel {tag.date()}, Takt 7 T)")
    if not teile:
        return None
    return ("⚠️ GUARD-VOLLPASS: " + " · ".join(teile)
            + " — Log /tmp/<wächter>_guard.log lesen; bei Drosselung holt der Aufseher nach (≤ 3×/Tag)")


def selbsttest():
    f = []

    def ok(n, b): f.append((n, bool(b)))
    jetzt = dt.datetime(2026, 10, 21, 8, 0, tzinfo=dt.timezone.utc)
    with tempfile.TemporaryDirectory() as dd:
        def schreibe(**kw):
            for name, datei in STEMPEL.items():
                inhalt = kw.get(name, "2026-10-20")
                if inhalt is None:
                    if os.path.exists(os.path.join(dd, datei)):
                        os.remove(os.path.join(dd, datei))
                else:
                    open(os.path.join(dd, datei), "w").write(inhalt + "\n")
        schreibe()
        ok("beide frisch → None", zeile(dd, jetzt) is None)
        schreibe(Tierschutz="2026-10-13")
        ok("8 Tage → noch in Ordnung", zeile(dd, jetzt) is None)
        schreibe(Tierschutz="2026-10-12")
        ok("9 Tage → noch in Ordnung (Grenze erst darüber)", zeile(dd, jetzt) is None)
        schreibe(Tierschutz="2026-10-11")
        z = zeile(dd, jetzt) or ""
        ok("10 Tage → nennt den Wächter und die Tage", "Tierschutz 10 Tage" in z and "Medizin" not in z)
        schreibe(Tierschutz="2026-10-01", Medizin="2026-10-02")
        z = zeile(dd, jetzt) or ""
        ok("beide alt → beide genannt", "Tierschutz 20 Tage" in z and "Medizin 19 Tage" in z)
        schreibe(Tierschutz=None)
        ok("fehlender Stempel → Warnung, nie 'in Ordnung'", "Tierschutz: kein lesbarer Stempel" in (zeile(dd, jetzt) or ""))
        schreibe(Medizin="kaputt")
        ok("kaputter Stempel → Warnung", "Medizin: kein lesbarer Stempel" in (zeile(dd, jetzt) or ""))
    for n, b in f:
        print(("  ok   " if b else "  FEHL ") + n)
    return 0 if all(b for _, b in f) else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    print(zeile() or "")
