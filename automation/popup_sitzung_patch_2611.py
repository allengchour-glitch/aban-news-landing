#!/usr/bin/env python3
"""popup_sitzung_patch_2611.py — Newsletter-Fenster zählt die Zeit über die ganze Sitzung (26.11.2026, «suche kunden …»).

ANLASS: Das Tor vom 05.10. (popup_tor_wache.py) zählt nur die Zeit AUF EINER SEITE (mobil 30 s Mindestzeit, 75 s Timer
oder 60 % Scroll). Wer am Handy fünf Seiten je 20 s ansieht, bekommt das Fenster nie — jede Seite fängt bei 0 an.
NEU (zusätzlich, das alte Tor bleibt): ab der 2. Seite einer Sitzung, wenn die Sitzung mobil ≥ 45 s (Desktop ≥ 30 s)
läuft, darf das Fenster nach 10 s (Desktop 8 s) auf der Seite aufgehen — NIE auf Produktseiten (dort gilt weiter das
alte Tor; Clarity 05.10.: Fenster über «In den Warenkorb»), nie über dem Cookie-Banner, nie auf Warenkorb/Konto.
Sitzung = sessionStorage «lx_pop_s» {t0, n}; ohne sessionStorage bleibt alles wie bisher.

  python3 automation/popup_sitzung_patch_2611.py            # Trockenlauf (zeigt die drei Ersetzungen)
  SCHARF=1 python3 automation/popup_sitzung_patch_2611.py   # Live-Datei holen, sichern, ersetzen, zurücklesen
  python3 automation/popup_sitzung_patch_2611.py --zurueck  # alte Fassung aus der Sicherung (nur bei gleicher Prüfsumme)
Wächter: popup_tor_wache.py prüft die Marke «LX-POP-SITZUNG» mit.
"""
import hashlib, json, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
from main_theme import gid  # noqa: E402

DATEI = "sections/footer-group.json"
SICHERUNG = os.path.join(HIER, "..", "theme_backup", "footer-group.json.vor-popup-sitzung-2611")
MARKE = "LX-POP-SITZUNG"

ERSATZ = [
    ('var MIN_MS=MOBIL?30000:20000, TIMER_MS=MOBIL?75000:45000, scrollOk=false;',
     'var MIN_MS=MOBIL?30000:20000, TIMER_MS=MOBIL?75000:45000, scrollOk=false;\n'
     '  /* LX-POP-SITZUNG 26.11.2026 (automation/popup_sitzung_patch_2611.py): Zeit über die ganze Sitzung zählen. Ab der\n'
     '     2. Seite und Sitzung mobil >= 45 s (Desktop 30 s) genügen 10 s (8 s) auf der Seite — nie auf Produktseiten. */\n'
     '  var SKEY="lx_pop_s", sess={t0:T0,n:0}, SESS_MS=MOBIL?45000:30000, SEITE_MS=MOBIL?10000:8000;\n'
     '  try{ var s0=JSON.parse(sessionStorage.getItem(SKEY)||"null"); if(s0&&s0.t0) sess=s0; }catch(e){}\n'
     '  sess.n=(sess.n||0)+1; try{ sessionStorage.setItem(SKEY,JSON.stringify(sess)); }catch(e){}\n'
     '  function sessOk(){ return sess.n>=2 && Date.now()-sess.t0>=SESS_MS && location.pathname.indexOf("/products/")<0; }'),
    ('function versuche(){ if(shown) return; if(Date.now()-T0<MIN_MS || ckWarte() || !seiteOk()) return; show(); }',
     'function versuche(){ if(shown) return; if(Date.now()-T0<(sessOk()?SEITE_MS:MIN_MS) || ckWarte() || !seiteOk()) return; show(); }'),
    ('if(scrollOk || Date.now()-T0>=TIMER_MS) versuche();',
     'if(scrollOk || Date.now()-T0>=TIMER_MS || sessOk()) versuche();'),
]


def lesen(th):
    n = gql('query($i:ID!){theme(id:$i){files(filenames:["%s"]){nodes{checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}' % DATEI,
            {"i": th})["theme"]["files"]["nodes"][0]
    return n["body"]["content"], n["checksumMd5"]


def popup_code(raw):
    j = json.loads(raw[raw.find("{", raw.find("*/") if "*/" in raw else 0):])
    return j["sections"]["custom_liquid_lxpopup"]["settings"]["custom_liquid"]


def schreiben(th, inhalt):
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": th, "files": [{"filename": DATEI, "body": {"type": "TEXT", "value": inhalt}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        raise SystemExit(f"userErrors: {r['userErrors']}")


def main():
    th = gid()
    raw, md5 = lesen(th)
    if "--zurueck" in sys.argv:
        alt = open(SICHERUNG, encoding="utf-8").read()
        vor = open(SICHERUNG + ".md5-nachher").read().strip() if os.path.exists(SICHERUNG + ".md5-nachher") else ""
        if md5 != vor:
            raise SystemExit(f"Live-Datei seit dem Patch verändert (md5 {md5} ≠ {vor}) — nicht blind zurückschreiben")
        schreiben(th, alt)
        print("zurückgeschrieben:", hashlib.md5(alt.encode()).hexdigest()); return 0
    code = popup_code(raw)
    if MARKE in code:
        print("schon drin"); return 0
    neu = raw
    for alt, ers in ERSATZ:
        a, e = json.dumps(alt)[1:-1], json.dumps(ers)[1:-1]
        if neu.count(a) != 1:
            raise SystemExit(f"Anker {neu.count(a)}× (erwartet 1): {alt[:70]}")
        neu = neu.replace(a, e, 1)
        print("ersetze:", alt[:90])
    c2 = popup_code(neu)   # JSON muss parsen und alle drei Stellen tragen
    assert MARKE in c2 and all(e in c2 for _, e in ERSATZ), "Ersatz nach dem Parsen nicht vollständig"
    if os.environ.get("SCHARF") != "1":
        print(f"TROCKEN — SCHARF=1 schreibt ({len(raw)} → {len(neu)} Zeichen)"); return 0
    os.makedirs(os.path.dirname(SICHERUNG), exist_ok=True)
    open(SICHERUNG, "w", encoding="utf-8").write(raw)
    schreiben(th, neu)
    for _ in range(5):   # 26.11. gemessen: das erste Rücklesen direkt nach dem Schreiben kann noch den alten Text liefern
        time.sleep(3)
        raw3, md5_3 = lesen(th)
        c3 = popup_code(raw3)
        ok = MARKE in c3 and all(e in c3 for _, e in ERSATZ)
        if ok:
            break
    open(SICHERUNG + ".md5-nachher", "w").write(md5_3)
    print(("RÜCKGELESEN ✓ " if ok else "⚠️ RÜCKLESEN FEHLT ") + f"md5 {md5} → {md5_3}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
