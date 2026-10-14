#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""google_bild_abruf.py — Google meldet «Unable to show image»: Bild einmal nicht abgeholt → neue Adresse (14.10.2026)

ANLASS (GEMESSEN 14.10.): Die Klasse «Unable to show image in [Free_listings,Shopping_ads] [CH,LI]» sprang
zwischen dem 09.10. (2 Produkte) und dem 10.10. 07:08 UTC (109) hoch, heute 126 — alle blockiert, also auch
NICHT in den Gratis-Einträgen. Keines war vorher «Image under review». Die Bilder sind in Ordnung: 126/126 liefern
als «Googlebot-Image» HTTP 200, 123 JPEG + 3 PNG, 0,16–6,3 MP, 13–676 KB. 87 der 126 (Erstmeldung 10.10.) haben
ein Hauptbild vom August, seither nicht verändert. Die übrigen 39 sind Neuimporte vom 06.–12.10.
In 4 Tagen heilten 28, aber 87 hängen seit dem 10.10. fest.

REGEL (QUELLE: Google Merchant Center Help 12159032, «Unable to show image»):
  «We haven't yet been able to successfully retrieve the image» — Gründe: Crawl-Rate zu langsam, Bild noch nicht
  live/kürzlich geändert, falsche HTTP-Kopfzeilen, robots.txt. Neuabruf typisch ≤ 72 h, aber «up to 30 days»,
  bei gleicher Adresse bis 6 Wochen; «use a new image URL … helps … crawl the new image quickly».
  → Ist das Bild abrufbar und die Meldung älter als WARTE_TAGE, bekommt die Bilddatei eine NEUE ADRESSE
    (fileUpdate filename, gleiche Datei, gleiche Endung, Suffix «-gMMTT»). Das ändert das Produkt (updatedAt),
    die App «Google & YouTube» schickt die neue image_link, Google holt sie neu ab.
  GEMESSEN 14.10. (Probe strand-sandalen-608900): neue Adresse sofort am Produkt, HTTP 200, updatedAt neu;
  alte Adresse ohne ?v= → 404 (mit altem ?v= liefert der CDN-Zwischenspeicher sie noch).
  Nicht abrufbar → «BILD KAPUTT» im Bericht (Fall für den Bildtausch, kein Umbenennen).
  Nach einer Umbenennung NEU_TAGE Ruhe; ist die Meldung dann noch da → «ESKALATION» (Bild selbst prüfen).

SCHUTZ: nur ACTIVE · Werbetest-Sperre (`werbetest_sperre.gesperrt`) · Dateiname nicht in einer Social-Queue oder
in der Produktbeschreibung (dort würde die alte Adresse brechen) · höchstens CAP Produkte je Lauf, 20 Dateien je
Produkt · Eimer-Etikette über `google_feedback_wache.gql` (nachlauf je Antwort).

    python3 automation/google_bild_abruf.py              Trockenlauf: was würde umbenannt
    SCHARF=1 python3 automation/google_bild_abruf.py     … und umbenennen (Aufseher, täglich NACH google_feedback_wache)
    python3 automation/google_bild_abruf.py --selbsttest

Dateien: dropship/_google_bild_abruf_seit.json (erste Meldung je Handle) · dropship/_google_bild_abruf.tsv (Ledger)
         · dropship/GOOGLE-BILD-ABRUF.md (Bericht) · Zeile «GOOGLE-BILD: …» auf stdout.
"""
import datetime as dt
import glob
import io
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(REPO, "dropship", "_google_feedback_stand.json")
STAND_REL = "dropship/_google_feedback_stand.json"
SEIT = os.path.join(REPO, "dropship", "_google_bild_abruf_seit.json")
LEDGER = os.path.join(REPO, "dropship", "_google_bild_abruf.tsv")
BERICHT = os.path.join(REPO, "dropship", "GOOGLE-BILD-ABRUF.md")
KLASSE = "Unable to show image"
WARTE_TAGE = int(os.environ.get("WARTE_TAGE", "3"))     # Google: Neuabruf typisch ≤ 72 h
NEU_TAGE = int(os.environ.get("NEU_TAGE", "21"))         # nach einer neuen Adresse so lange Ruhe
CAP = int(os.environ.get("CAP", "150"))
MAX_DATEIEN = 20
STAND_MAX_H = 48                                          # älterer Diagnose-Stand = nicht handeln
SUFFIX = re.compile(r"-g\d{4}$")
FORMATE = {"JPEG", "PNG", "WEBP", "GIF", "BMP", "TIFF"}


# ---------- reine Regeln (Selbsttest) ----------

def neuer_name(dateiname, heute):
    """'abc.jpg' → 'abc-g1014.jpg'; vorhandenes -gMMTT wird ersetzt, nie gestapelt. Endung bleibt (Shopify-Pflicht)."""
    stamm, punkt, endung = dateiname.rpartition(".")
    if not punkt or not stamm:
        return None
    stamm = SUFFIX.sub("", stamm)
    return f"{stamm}-g{heute:%m%d}.{endung}"


def bild_urteil(code, bildformat, breite, hoehe, bytes_):
    """Abrufbar im Sinne von Googles Bildregeln? → (ok, grund)."""
    if code != 200:
        return False, f"HTTP {code}"
    if bildformat not in FORMATE:
        return False, f"Format {bildformat}"
    if not breite or not hoehe or breite < 100 or hoehe < 100:
        return False, f"zu klein ({breite}×{hoehe})"
    if breite * hoehe > 64_000_000:
        return False, f"über 64 MP ({breite}×{hoehe})"
    if bytes_ > 16 * 1024 * 1024:
        return False, f"über 16 MB ({bytes_})"
    return True, f"{bildformat} {breite}×{hoehe} {bytes_ // 1024} KB"


def entscheid(seit, heute, letzte_umbenennung, bild_ok):
    """→ 'warten' | 'umbenennen' | 'ruhe' | 'eskalation' | 'kaputt'."""
    if not bild_ok:
        return "kaputt"
    if (heute - seit).days < WARTE_TAGE:
        return "warten"
    if letzte_umbenennung is None:
        return "umbenennen"
    if (heute - letzte_umbenennung).days < NEU_TAGE:
        return "ruhe"
    return "eskalation"


# ---------- Zustand ----------

def stand_lesen():
    s = json.load(open(STAND, encoding="utf-8"))
    alter_h = (dt.datetime.now(dt.timezone.utc)
               - dt.datetime.strptime(s["stand"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=dt.timezone.utc)).total_seconds() / 3600
    return s, alter_h


def seit_aus_verlauf():
    """Erstbefüllung: erste Meldung je Handle aus der git-Geschichte des Diagnose-Stands (30 Tage)."""
    log = subprocess.run(["git", "-C", REPO, "log", "--format=%h %cI", "--since=30 days ago", "--", STAND_REL],
                         capture_output=True, text=True).stdout.split("\n")
    seit = {}
    for zeile in reversed([z for z in log if z.strip()]):
        h, datum = zeile.split()
        try:
            s = json.loads(subprocess.run(["git", "-C", REPO, "show", f"{h}:{STAND_REL}"],
                                          capture_output=True, text=True).stdout)
        except Exception:
            continue
        for hd in (s.get("handles") or {}).get(KLASSE, []):
            seit.setdefault(hd, datum[:10])
    return seit


def ledger_lesen():
    letzte = {}
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding="utf-8"):
            f = z.rstrip("\n").split("\t")
            if len(f) >= 6 and f[5] == "ok":
                letzte[f[1]] = max(letzte.get(f[1], ""), f[0][:10])
    return letzte


def ledger_anhaengen(zeilen):
    neu_datei = not os.path.exists(LEDGER)
    with open(LEDGER, "a", encoding="utf-8") as f:
        if neu_datei:
            f.write("zeit\thandle\tmedia\talt\tneu\tergebnis\n")
        f.write("\n".join(zeilen) + "\n")


def queue_text():
    t = []
    for p in glob.glob(os.path.join(REPO, "social", "*.csv")) + [os.path.join(REPO, "automation", "reels_seed.csv")]:
        try:
            t.append(open(p, encoding="utf-8", errors="ignore").read())
        except OSError:
            pass
    return "\n".join(t)


# ---------- Shopify / Netz ----------

Q = """query($q:String!){products(first:10,query:$q){nodes{id handle status descriptionHtml
 featuredMedia{id ... on MediaImage{image{url}}}
 variants(first:100){nodes{image{url}}}
 media(first:100){nodes{id ... on MediaImage{image{url}}}}}}}"""
M = """mutation($f:[FileUpdateInput!]!){fileUpdate(files:$f){files{id fileStatus ... on MediaImage{image{url}}}
 userErrors{field message code}}}"""


def holen(gql, handles):
    out = {}
    for i in range(0, len(handles), 10):
        teil = handles[i:i + 10]
        d = gql(Q, {"q": " OR ".join(f"handle:{h}" for h in teil)})
        for n in d["data"]["products"]["nodes"]:
            out[n["handle"]] = n
    return out


def abrufen(url):
    """Wie Googles Bild-Crawler: Kennung Googlebot-Image, Accept */*."""
    from PIL import Image
    r = subprocess.run(["curl", "-s", "-o", "-", "-w", "\n%{http_code}", "-A", "Googlebot-Image/1.0",
                        "-H", "Accept: */*", "--max-time", "60", url], capture_output=True)
    body, _, code = r.stdout.rpartition(b"\n")
    try:
        code = int(code.decode() or 0)
    except ValueError:
        code = 0
    try:
        im = Image.open(io.BytesIO(body))
        return bild_urteil(code, im.format, im.size[0], im.size[1], len(body))
    except Exception:
        return bild_urteil(code, "unlesbar", 0, 0, len(body))


def basis(url):
    return (url or "").split("?")[0].rsplit("/", 1)[-1]


def dateien(p):
    """Hauptbild + davon abweichende Variantenbilder → [(media_id, url)], Hauptbild zuerst."""
    nach_url = {basis((m.get("image") or {}).get("url")): m["id"] for m in p["media"]["nodes"] if m.get("image")}
    fm = p.get("featuredMedia") or {}
    liste, gesehen = [], set()
    kandidaten = [(fm.get("image") or {}).get("url")] + [(v.get("image") or {}).get("url") for v in p["variants"]["nodes"]]
    for u in kandidaten:
        b = basis(u)
        if not b or b in gesehen or b not in nach_url:
            continue
        gesehen.add(b)
        liste.append((nach_url[b], u))
    return liste[:MAX_DATEIEN]


# ---------- Lauf ----------

def lauf(scharf):
    from google_feedback_wache import gql
    from werbetest_sperre import gesperrt

    heute = dt.datetime.now(dt.timezone.utc).date()
    s, alter_h = stand_lesen()
    if not s.get("vollstaendig") or alter_h > STAND_MAX_H:
        print(f"GOOGLE-BILD: Diagnose-Stand {s.get('stand')} unvollständig/zu alt ({alter_h:.0f} h) — nichts getan")
        return 1
    jetzt = list((s.get("handles") or {}).get(KLASSE, []))

    seit = json.load(open(SEIT, encoding="utf-8")) if os.path.exists(SEIT) else seit_aus_verlauf()
    for hd in jetzt:
        seit.setdefault(hd, s["stand"][:10])
    geheilt = sorted(h for h in seit if h not in jetzt)
    seit = {h: seit[h] for h in jetzt}

    tmp = SEIT + ".tmp"
    json.dump(seit, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    os.replace(tmp, SEIT)

    letzte = ledger_lesen()
    qtext = queue_text()
    p_alle = holen(gql, jetzt)

    zaehl = {"warten": 0, "umbenennen": 0, "ruhe": 0, "eskalation": 0, "kaputt": 0, "uebersprungen": 0, "fehler": 0}
    kaputt, eskal, umbenannt = [], [], 0
    for hd in jetzt:
        p = p_alle.get(hd)
        if not p or p["status"] != "ACTIVE":
            zaehl["uebersprungen"] += 1
            continue
        if gesperrt(p["id"]) or gesperrt(hd):
            zaehl["uebersprungen"] += 1
            continue
        ds = dateien(p)
        if not ds:
            zaehl["kaputt"] += 1
            kaputt.append((hd, "kein Hauptbild"))
            continue
        ok, grund = abrufen(ds[0][1])
        lu = letzte.get(hd)
        e = entscheid(dt.date.fromisoformat(seit[hd]), heute, dt.date.fromisoformat(lu) if lu else None, ok)
        if e == "kaputt":
            kaputt.append((hd, grund))
        if e == "eskalation":
            eskal.append((hd, seit[hd], lu))
        if e != "umbenennen":
            zaehl[e] += 1
            continue
        if umbenannt >= CAP:
            zaehl["warten"] += 1
            continue
        frei = [(mid, u) for mid, u in ds if basis(u) not in qtext and basis(u) not in (p.get("descriptionHtml") or "")]
        if len(frei) < len(ds):
            print(f"  ⚠ {hd}: {len(ds) - len(frei)} Datei(en) in Queue/Beschreibung verwendet — bleiben")
        if not frei:
            zaehl["uebersprungen"] += 1
            continue
        plan = [(mid, u, neuer_name(basis(u), heute)) for mid, u in frei]
        plan = [x for x in plan if x[2] and x[2] != basis(x[1])]
        if not plan:            # heute schon neu adressiert (Lauf ohne Ledger-Zeile gestorben) → nur quittieren
            if scharf:
                stempel = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
                ledger_anhaengen(["\t".join([stempel, hd, mid, basis(u), basis(u), "ok"]) for mid, u in frei])
            zaehl["ruhe"] += 1
            continue
        if not scharf:
            zaehl["umbenennen"] += 1
            print(f"  → {hd}: {len(plan)} Datei(en), seit {seit[hd]} ({grund})")
            continue
        r = gql(M, {"f": [{"id": mid, "filename": neu} for mid, _, neu in plan]})["data"]["fileUpdate"]
        fehler = r.get("userErrors") or []
        neu_urls = {f["id"]: ((f.get("image") or {}).get("url") or "") for f in (r.get("files") or [])}
        stempel = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
        # Ledger SOFORT je Produkt (Container startet ~stündlich neu; ein Lauf ohne Schlusszeile darf nichts vergessen)
        ledger_anhaengen(["\t".join([stempel, hd, mid, basis(u), neu, "ok" if (not fehler and neu in neu_urls.get(mid, ""))
                                     else "fehler:" + str(fehler)[:150]]) for mid, u, neu in plan])
        if fehler:
            zaehl["fehler"] += 1
            print(f"  ✗ {hd}: {fehler}")
            continue
        ok2, grund2 = abrufen(neu_urls.get(plan[0][0], ""))
        print(f"  ✓ {hd}: {len(plan)} neu adressiert, Hauptbild {'abrufbar' if ok2 else 'NICHT abrufbar: ' + grund2}")
        zaehl["umbenennen"] += 1
        umbenannt += 1


    zeile = (f"GOOGLE-BILD: {len(jetzt)} «{KLASSE}» · {zaehl['umbenennen']} neu adressiert"
             f"{'' if scharf else ' (TROCKEN)'} · {zaehl['warten']} warten (< {WARTE_TAGE} T) · {zaehl['ruhe']} in Ruhe"
             f" · {zaehl['eskalation']} Eskalation · {zaehl['kaputt']} Bild kaputt · {zaehl['uebersprungen']} übersprungen"
             f" · {len(geheilt)} nicht mehr gemeldet"
             f"{' · ' + str(zaehl['fehler']) + ' Fehler' if zaehl['fehler'] else ''}")
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write(f"# Google «{KLASSE}» — Stand {dt.datetime.now(dt.timezone.utc):%Y-%m-%dT%H:%MZ}\n\n")
        f.write(f"{zeile}\n\nQuelle: `{STAND_REL}` (Stand {s['stand']}). Werkzeug + Regel: `automation/google_bild_abruf.py`, "
                f"Herleitung `dropship/GOOGLE-BILD-NICHT-ABRUFBAR-2026-10-14.md`.\n\n")
        if eskal:
            f.write("## Eskalation (neue Adresse vor ≥ %d T, Meldung bleibt → Bild selbst prüfen)\n\n" % NEU_TAGE)
            f.write("".join(f"- {h} · gemeldet seit {a} · neu adressiert {b}\n" for h, a, b in eskal) + "\n")
        if kaputt:
            f.write("## Bild nicht abrufbar (Bildtausch-Fall)\n\n")
            f.write("".join(f"- {h} · {g}\n" for h, g in kaputt) + "\n")
    print(zeile)
    return 0 if not zaehl["fehler"] else 1


def selbsttest():
    h = dt.date(2026, 10, 14)
    fehler = []

    def soll(name, ist, erwartet):
        print(f"  {'OK  ' if ist == erwartet else 'FEHL'} {name}: {ist!r}")
        if ist != erwartet:
            fehler.append(name)

    soll("Name neu", neuer_name("abc.jpg", h), "abc-g1014.jpg")
    soll("Name kein Stapeln", neuer_name("abc-g1010.jpg", h), "abc-g1014.jpg")
    soll("Name uuid", neuer_name("359c4a20-0297-4dc1-a229-4948d06135e1.png", h), "359c4a20-0297-4dc1-a229-4948d06135e1-g1014.png")
    soll("Name ohne Endung", neuer_name("abc", h), None)
    soll("Name Ziffern-Ende bleibt", neuer_name("bild-g12345.jpg", h), "bild-g12345-g1014.jpg")
    soll("Bild ok", bild_urteil(200, "JPEG", 800, 800, 90_000)[0], True)
    soll("Bild 404", bild_urteil(404, "unlesbar", 0, 0, 2770)[0], False)
    soll("Bild klein", bild_urteil(200, "JPEG", 90, 300, 9_000)[0], False)
    soll("Bild AVIF", bild_urteil(200, "AVIF", 800, 800, 9_000)[0], False)
    soll("Bild 70 MP", bild_urteil(200, "JPEG", 10000, 7000, 9_000_000)[0], False)
    d = dt.date
    soll("frisch → warten", entscheid(d(2026, 10, 12), h, None, True), "warten")
    soll("3 T → umbenennen", entscheid(d(2026, 10, 11), h, None, True), "umbenennen")
    soll("kaputt schlägt alles", entscheid(d(2026, 9, 1), h, None, False), "kaputt")
    soll("nach Umbenennung Ruhe", entscheid(d(2026, 10, 1), h, d(2026, 10, 10), True), "ruhe")
    soll("nach 21 T Eskalation", entscheid(d(2026, 9, 1), h, d(2026, 9, 20), True), "eskalation")
    p = {"featuredMedia": {"image": {"url": "https://x/files/a.jpg?v=1"}},
         "variants": {"nodes": [{"image": None}, {"image": {"url": "https://x/files/b.jpg?v=2"}},
                                {"image": {"url": "https://x/files/a.jpg?v=1"}}, {"image": {"url": "https://x/files/fremd.jpg"}}]},
         "media": {"nodes": [{"id": "M1", "image": {"url": "https://x/files/a.jpg?v=1"}},
                             {"id": "M2", "image": {"url": "https://x/files/b.jpg?v=2"}}]}}
    soll("Dateien: Haupt zuerst, Variante einmal, fremd raus", [m for m, _ in dateien(p)], ["M1", "M2"])
    print("SELBSTTEST", "OK" if not fehler else "FEHLER " + ", ".join(fehler))
    return 0 if not fehler else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.exit(lauf(os.environ.get("SCHARF") == "1"))
