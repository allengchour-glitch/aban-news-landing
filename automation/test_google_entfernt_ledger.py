"""Gegenprobe für google_sperrliste.entfernte_handles() (20.10.2026): bewusst aus dem Google-Kanal entfernte Handles aus dem
Ledger dropship/_*unpub*.tsv — Grund: die 112 Entfernungen vom 12.10. trugen keinen Sperr-Tag und wurden am 13.10. vom
täglichen Kanal-Schliesser in 109 s zurückgeholt. In BEIDE Richtungen: gezählt wird nur Art «google-kanal-entfernt».
Aufruf: python3 automation/test_google_entfernt_ledger.py   (Exit 0 = alle richtig)"""
import os, sys, tempfile, shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import google_sperrliste as g

d = tempfile.mkdtemp(prefix="entfernt_test_")
ok = True


def pruefe(name, bedingung, detail=""):
    global ok
    ok &= bool(bedingung)
    print(f"  {'ok  ' if bedingung else 'FEHL'} {name}" + (f"\n        → {detail}" if detail and not bedingung else ""))


try:
    open(os.path.join(d, "_a_unpub.tsv"), "w").write(
        "2026-10-12T08:31Z\tHandle-Eins\tgoogle-kanal-entfernt\tgrund\n"
        "2026-10-12T08:31Z\thandle-zwei\tgoogle-kanal-wiederhergestellt\tanderes\n"   # andere Art → zählt nicht
        "kaputte Zeile ohne Tabs\n"
        "2026-10-12T08:31Z\t\tgoogle-kanal-entfernt\tleeres Handle\n")
    open(os.path.join(d, "_b_unpub_zweit.tsv"), "w").write("2026-10-20T14:00Z\thandle-drei\tgoogle-kanal-entfernt\tx\n")
    open(os.path.join(d, "_c_andere_datei.tsv"), "w").write("2026-10-20T14:00Z\thandle-vier\tgoogle-kanal-entfernt\tx\n")  # kein 'unpub'
    hs = g.entfernte_handles(d)
    pruefe("Handle mit Art «google-kanal-entfernt» (klein geschrieben)", "handle-eins" in hs, str(hs))
    pruefe("zweite *unpub*-Datei wird mitgelesen", "handle-drei" in hs, str(hs))
    pruefe("andere Art zählt NICHT", "handle-zwei" not in hs, str(hs))
    pruefe("Datei ohne «unpub» im Namen zählt NICHT", "handle-vier" not in hs, str(hs))
    pruefe("kaputte/leere Zeilen ergeben keinen Eintrag", hs == {"handle-eins", "handle-drei"}, str(hs))
    pruefe("fehlendes Verzeichnis → leere Menge, kein Absturz", g.entfernte_handles(os.path.join(d, "gibt-es-nicht")) == set())
    echt = g.entfernte_handles()
    pruefe("echtes Ledger: die 4 Handles vom 20.10./12.10. sind drin",
           {"sommer-einfarbiges-hohlkleid-613600", "seidenmaske-mit-halsbedeckung-fur-damen-628900"} <= echt, f"{len(echt)} Handles")
finally:
    shutil.rmtree(d, ignore_errors=True)
print("ALLE GRUEN" if ok else "FEHLSCHLAG")
sys.exit(0 if ok else 1)
