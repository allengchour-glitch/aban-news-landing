#!/usr/bin/env python3
"""theme_marken_wache.py — prüft täglich, ob unsere Theme-Änderungen noch im LIVE-Theme stehen (21.10.2026).

ANLASS: Ein Horizon-Update, ein Theme-Editor-Speichern oder eine App überschreibt Theme-Dateien still. Für die Patches der Startseite
(startseite_schlank_patch.py) und die Organisation-Auszeichnung (google_org_richtlinien.py) gibt es eigene Wächter; die kleinen Einzel-
Änderungen hatten keinen. Erster Eintrag: Blog-Seitenleiste (Spähtrupp wf_32ed9d12 L3: der Ratgeber zeigte nur 50 von 306 Artikeln, 256 hatten
keinen einzigen internen Link vom Blog-Index; seit 21.10. 24 je Seite mit Seiten-Links).

Jede Marke = (Datei, Text, Bedeutung). Neue Theme-Änderung → Zeile in MARKEN, dann meldet die Ampel, sobald sie verschwindet.
  python3 automation/theme_marken_wache.py            prüft live, schreibt dropship/_theme_marken_stand.json, Ausgabe «FERTIG …»
  python3 automation/theme_marken_wache.py --selbsttest | --zeile
"""
import datetime as dt, json, os, sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
STAND = os.path.join(REPO, "dropship", "_theme_marken_stand.json")
STALE_H = 36

MARKEN = [
    ("sections/main-blog.liquid", "LUX-BLOG-PAGINATE", "Blog-Index mit 24 Artikeln je Seite und Seiten-Links (21.10.2026)"),
    ("sections/main-blog.liquid", "pagination-controls", "Blog-Index rendert die Seitenleiste"),
    ("snippets/pagination-controls.liquid", "pagination__list", "Seitenleisten-Baustein des Themes ist vorhanden"),
    ("snippets/product-grid.liquid", "LUX-SEITENNAV", "Pagination-Pilot: Seitenlinks unter dem Raster der 12 Pilot-Kollektionen (21.10.2026, dropship/PAGINATION-PILOT-2026-10-21.md)"),
    ("sections/product-information.liquid", "LUX-VIDEO-JSONLD", "VideoObject-Block auf Produktseiten mit Video-Medium, 547 Seiten (22.10.2026, dropship/VIDEO-AUSZEICHNUNG-2026-10-22.md; Rückweg video_auszeichnung_einbauen.py --zurueck)"),
    ("sections/product-information.liquid", '"@type": "VideoObject"', "VideoObject-Ausgabe selbst (nicht nur der Kommentar)"),
    ("sections/product-information.liquid", "replace_first: '\"@type\":\"Product\",'", "Bewertungs-Logik (aggregateRating) des Product-JSON-LD vom 22.09.2026 — der Video-Einbau darf sie nicht berühren"),
]


def befunde(lesen, marken=None):
    """lesen(dateiname) → Text oder None. Gibt eine Liste Befund-Texte zurück (leer = alles steht)."""
    out = []
    for datei, text, sinn in (marken if marken is not None else MARKEN):
        inhalt = lesen(datei)
        if inhalt is None:
            out.append(f"{datei} fehlt ({sinn})")
        elif text not in inhalt:
            out.append(f"«{text}» fehlt in {datei} ({sinn})")
    return out


def live_lesen():
    from lux_assistent import _gql, theme_id, datei_lesen
    g = _gql()
    tid = theme_id(g)
    cache = {}

    def lesen(name):
        if name not in cache:
            cache[name] = datei_lesen(g, tid, name)
        return cache[name]
    return lesen


def schreiben(b):
    d = {"geprueft": f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", "befunde": b, "marken": len(MARKEN)}
    tmp = STAND + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    os.replace(tmp, STAND)


def zeile(jetzt=None, stand=None):
    """Leer = in Ordnung (oder noch nie gelaufen). ⚠️ bei fehlender Marke oder Stand älter als 36 h."""
    pfad = stand or STAND
    if not os.path.exists(pfad):
        return ""
    try:
        s = json.load(open(pfad, encoding="utf-8"))
        alter = ((jetzt or dt.datetime.utcnow()) - dt.datetime.strptime(s["geprueft"], "%Y-%m-%dT%H:%MZ")).total_seconds() / 3600
    except Exception:
        return "⚠️ THEME-MARKEN: Stand unlesbar (dropship/_theme_marken_stand.json)"
    if s.get("befunde"):
        return "⚠️ THEME-MARKEN: " + "; ".join(s["befunde"])[:300] + " — Theme-Update/Editor hat eine Änderung überschrieben?"
    if alter > STALE_H:
        return f"⚠️ THEME-MARKEN: seit {alter:.0f} h nicht geprüft (Takt 24 h) — Log /tmp/theme_marken_wache.log"
    return ""


def selbsttest():
    fehler = []
    ok = lambda b, t: b or fehler.append(t)
    dateien = {"sections/main-blog.liquid": "{% comment %} LUX-BLOG-PAGINATE {% endcomment %} {% render 'pagination-controls' %}",
               "snippets/pagination-controls.liquid": '<ul class="pagination__list">'}
    testmarken = [("sections/main-blog.liquid", "LUX-BLOG-PAGINATE", "t"), ("sections/main-blog.liquid", "pagination-controls", "t"),
                  ("snippets/pagination-controls.liquid", "pagination__list", "t")]       # unabhängig von MARKEN (wächst mit jeder Theme-Änderung)
    ok(befunde(dateien.get, testmarken) == [], "alles da → keine Befunde")
    d2 = dict(dateien, **{"sections/main-blog.liquid": "{% for a in blog.articles %}{% endfor %}"})
    b = befunde(d2.get, testmarken)
    ok(len(b) == 2 and "LUX-BLOG-PAGINATE" in b[0], f"Update überschreibt Blog-Abschnitt → 2 Befunde ({b})")
    d3 = {k: v for k, v in dateien.items() if k != "snippets/pagination-controls.liquid"}
    ok(any("fehlt" in x and "pagination-controls.liquid" in x for x in befunde(d3.get, testmarken)), "Datei fehlt → Befund")
    ok(all(any(m[1] == x for m in MARKEN) for x in ("LUX-BLOG-PAGINATE", "LUX-SEITENNAV")), "echte Liste trägt Blog- und Pilot-Marke")
    import tempfile
    tmp = os.path.join(tempfile.mkdtemp(), "s.json")
    jetzt = dt.datetime(2026, 10, 22, 12, 0)
    ok(zeile(jetzt, tmp) == "", "ohne Stand: leer")
    json.dump({"geprueft": "2026-10-22T08:00Z", "befunde": []}, open(tmp, "w"))
    ok(zeile(jetzt, tmp) == "", "frisch + sauber: leer")
    json.dump({"geprueft": "2026-10-22T08:00Z", "befunde": ["«X» fehlt in y"]}, open(tmp, "w"))
    ok("THEME-MARKEN" in zeile(jetzt, tmp) and "fehlt" in zeile(jetzt, tmp), "Befund → ⚠️")
    json.dump({"geprueft": "2026-10-20T08:00Z", "befunde": []}, open(tmp, "w"))
    ok("nicht geprüft" in zeile(jetzt, tmp), "Stand 52 h alt → ⚠️")
    if fehler:
        print("SELBSTTEST FEHLER:\n  " + "\n  ".join(fehler))
        return 1
    print("SELBSTTEST OK (Marken fehlen/Datei fehlt/Stand alt)")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zeile" in sys.argv:
        print(zeile() or "OK")
        sys.exit(0)
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", flush=True)
    b = befunde(live_lesen())
    schreiben(b)
    print(f"FERTIG: {len(MARKEN)} Marken geprüft, {len(b)} Befunde" + ("" if not b else " — " + "; ".join(b)))
    if b:
        raise SystemExit("Error: Theme-Marken fehlen — " + "; ".join(b)[:200])
