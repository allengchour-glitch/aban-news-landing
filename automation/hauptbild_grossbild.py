#!/usr/bin/env python3
"""Hebt bei aktiven Produkten ein vorhandenes Grossbild auf Position 1 — dorthin, wo heute
eine Miniatur steht.

════════════════════════════════════════════════════════════════════════════════════════════
BEFUND (Fehlersuche 14.08.2026, live nachgemessen am selben Tag)
════════════════════════════════════════════════════════════════════════════════════════════
Von 34'677 aktiven Produkten zeigen **265** als Hauptbild ein Bild unter 500 px, obwohl im
SELBEN Produkt ein Bild ab 800 px liegt. Es fehlt kein Material, es ist reine Reihenfolge.
Dazu 2 Produkte, deren erste Medien im Status FAILED stehen (gar kein Bild abrufbar), während
weiter hinten ein fertiges 800-px-Bild liegt — dieselbe Reparatur hilft auch dort.

Warum das teuer ist: `featuredMedia` ist exakt das Bild, das Google als `image_link` bekommt,
das die Kollektionskachel füllt und das als og:image in Social-Vorschauen erscheint. Das Theme
fordert per srcset bis 3840 px an; geliefert werden 250–499 px, die Kachel wird um das Drei-
bis Sechzehnfache hochskaliert. Google verlangt zudem mindestens 250×250 (Bekleidung/Schmuck)
bzw. 100×100 — darunter wird das Angebot abgelehnt, nicht bloss schlechter platziert.

════════════════════════════════════════════════════════════════════════════════════════════
DER PROBELAUF — warum die naheliegende Regel FALSCH ist
════════════════════════════════════════════════════════════════════════════════════════════
Die erste Fassung nahm schlicht «das früheste Bild ab 800 px». Ein Kontaktbogen über eine
Zufallsstichprobe von 18 Produkten (altes gegen neues Hauptbild nebeneinander) zeigte, dass
das bei **8 von 18 = 44 %** eine VERSCHLECHTERUNG gewesen wäre. Das grosse Bild ist bei CJ
sehr oft kein Produktfoto, sondern eine Werbetafel:

  • «Ohrreinigung mit Stimmstab»  alt: sauberes Freistellerfoto → neu: Collage «Wide
    Compatibility» mit Klavier, Geige und drei Personen
  • «Automatischer Lockenstab»    alt: Gerät auf Weiss → neu: Temperaturtabelle in Englisch
  • «Smart Mülltonne mit Sensor»  alt: Tonne auf Weiss → neu: «Drawstring 20L black gold»-Tafel
  • «U-förmige Massagekissen»     alt: Kissen → neu: Schrifttafel «U-SHAPE NECK MASSAGER ST-320»
  • «Spiral-Edelstahl-Armbanduhr» alt: Uhr → neu: Banner «ROTATABLE watch bezel»
  • «Spiegelndes Lipgloss»        alt: Produktfoto → neu: Lippen-Swatch mit **FENTY BEAUTY**,
    also einem FREMDEN MARKENNAMEN im Bild — genau das Sperr-Risiko, wegen dem am 12.08. schon
    zehn Titel bereinigt werden mussten.

Werbetext im Produktbild ist bei Google ausserdem selbst ein Verstoss. Ein Aufräumlauf, der
verpixelte Kacheln gegen Werbetafeln tauscht, hätte den Feed also schlechter gemacht als er
war — bei 265 Produkten im einzigen Kanal mit belegten Verkäufen.

════════════════════════════════════════════════════════════════════════════════════════════
DIE REGEL, DIE STATTDESSEN GILT
════════════════════════════════════════════════════════════════════════════════════════════
1. Kandidaten sind nur Bilder ab 800 px Kantenlänge im Status READY.
2. Jeder Kandidat wird von `bildtext_pruefen.woerter()` (Tesseract) gelesen. Ab 4 sicher
   erkannten Wörtern gilt er als Werbetafel und scheidet aus. Die Schwelle ist dort geeicht,
   nicht hier geraten: eine Massangabe «20cm/7.87in» bleibt darunter, ein Marketingsatz nicht.
3. Getauscht wird nur gegen DASSELBE MOTIV in gross. Gemessen wird die mittlere Farbabweichung
   zweier 24×24-Raster (0…255); unter 22 ist es nachweislich dieselbe Aufnahme. Ein
   Graustufen-Hash reichte dafür nicht: er hielt bei den «Herren Zehensteg-Sandalen» die rote
   und die blaue Ausführung für dasselbe Bild und beim «Daunenmantel Slim-Fit» die schwarze
   und die rosa — die Kundin hätte eine andere Farbe gesehen als vorher.
4. Zeigt kein Grossbild dasselbe Motiv, bleibt das Produkt stehen — ES SEI DENN, das heutige
   Hauptbild ist kleiner als 250 px und wird von Google ohnehin abgelehnt. Dort ist jedes
   scharfe, textfreie Produktfoto besser als gar keine Ausspielung.
5. Findet sich KEIN textfreies Grossbild, bleibt das Produkt unangetastet und wird als offen
   protokolliert. Ein verpixeltes Produktfoto ist besser als eine scharfe Werbetafel.
6. Ein Bild, das nicht geladen oder nicht gelesen werden konnte, gilt als UNBEKANNT, nicht als
   sauber, und das Produkt wandert in die offene Liste — beim nächsten Lauf wird es erneut
   versucht. «Keine Antwort» ist nicht «keine Daten».

Gelöscht wird nichts. `productReorderMedia` verschiebt nur; alle Bilder bleiben am Produkt.

════════════════════════════════════════════════════════════════════════════════════════════
DIE QUELLE (ohne sie wäre die Reparatur wertlos)
════════════════════════════════════════════════════════════════════════════════════════════
243 der Betroffenen tragen eine CJ-SKU, 50 wurden im August angelegt, der jüngste am 12.08.
`automation/cj_category_fill.mjs` übernahm CJs `productImageSet` unverändert in der
Lieferanten-Reihenfolge (Zeile ~434) und machte `imgs[0]` zum Hauptbild — CJs erster Eintrag
ist mitunter ein 50×50-Thumbnail. Deshalb ist dort in derselben Session `grossbildNachVorn()`
eingebaut worden: nach dem Bild-Empfang wird das grösste READY-Bild nach vorn geholt. Ohne das
legte der Importer täglich neue Fälle an und diese Datei wäre eine Sisyphusarbeit.

Aufruf:  python3 automation/hauptbild_grossbild.py            (Probelauf, ändert nichts)
         python3 automation/hauptbild_grossbild.py --scharf   (schreibt)
         python3 automation/hauptbild_grossbild.py --bogen    (Kontaktbogen alt|neu als PNG)
"""
import io
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image

import bildtext_pruefen

SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
TOKEN = open("/tmp/cj_shop_token.txt").read().strip()
LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "..", "dropship", "_hauptbild_grossbild.txt")
CACHE = "/tmp/hauptbild_media.jsonl"          # Ergebnis der Bulk-Abfrage
MINI = 500          # darunter gilt das Hauptbild als Miniatur
GROSS = 800         # ab hier gilt ein Bild als Grossbild
WORTGRENZE = 4      # ab so vielen sicher gelesenen Wörtern: Werbetafel


def gql(query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}})
    for versuch in range(5):
        r = subprocess.run(
            ["curl", "-sS", "--max-time", "120", "-X", "POST", SHOP,
             "-H", f"X-Shopify-Access-Token: {TOKEN}",
             "-H", "Content-Type: application/json", "--data-binary", "@-"],
            input=body.encode(), capture_output=True)
        try:
            j = json.loads(r.stdout)
        except Exception:
            time.sleep(3 * (versuch + 1))
            continue
        if j.get("errors") and any("Throttled" in str(e) for e in j["errors"]):
            time.sleep(5 * (versuch + 1))
            continue
        return j
    # Eine gescheiterte Anfrage ist KEIN Ergebnis (Regel 6): der Aufrufer muss None sehen.
    return None


# ────────────────────────────────── Katalog holen ──────────────────────────────────
BULK = '''
{ products(query: "status:active") { edges { node {
    id title handle createdAt
    media(first: 30) { edges { node { ... on MediaImage { id status image { url width height } } } } }
} } } }
'''


def katalog_laden(neu=False):
    if os.path.exists(CACHE) and not neu and os.path.getsize(CACHE) > 1000:
        return CACHE
    m = gql('mutation { bulkOperationRunQuery(query: """%s""") { bulkOperation { id } '
            'userErrors { message } } }' % BULK)
    if not m or m.get("data", {}).get("bulkOperationRunQuery", {}).get("userErrors"):
        raise SystemExit(f"Bulk-Start fehlgeschlagen: {m}")
    while True:
        time.sleep(15)
        s = gql("{ currentBulkOperation { status objectCount url errorCode } }")
        if not s:
            continue
        b = s["data"]["currentBulkOperation"]
        print("   bulk:", b["status"], b["objectCount"], flush=True)
        if b["status"] == "COMPLETED":
            subprocess.run(["curl", "-sS", "-o", CACHE, b["url"]], check=True)
            return CACHE
        if b["status"] in ("FAILED", "CANCELED"):
            raise SystemExit(f"Bulk {b['status']}: {b['errorCode']}")


def kandidaten(pfad):
    """Produkte, bei denen Position 1 klein ist und weiter hinten ein Grossbild liegt."""
    prod, med = {}, {}
    for zeile in open(pfad):
        d = json.loads(zeile)
        p = d.get("__parentId")
        if p is None:
            prod[d["id"]] = d
        elif "/MediaImage/" in d.get("id", ""):
            med.setdefault(p, []).append(d)
    raus = []
    for pid, pd in prod.items():
        bilder = med.get(pid, [])
        if not bilder:
            continue
        def kante(m):
            i = m.get("image") or {}
            w, h = i.get("width"), i.get("height")
            return max(w, h) if (w and h) else None
        erste = kante(bilder[0])
        # erste is None → das Hauptmedium ist FAILED, es gibt gar kein sichtbares Bild.
        if erste is not None and erste >= MINI:
            continue
        ziele = [m for m in bilder
                 if m.get("status") == "READY" and (kante(m) or 0) >= GROSS]
        if not ziele:
            continue
        raus.append({"id": pid, "title": pd["title"], "handle": pd["handle"],
                     "createdAt": pd["createdAt"], "alt": bilder[0], "ziele": ziele,
                     "anzahl": len(bilder)})
    return raus


# ────────────────────────────────── Bildprüfung ──────────────────────────────────
def hole(url, breite):
    r = subprocess.run(["curl", "-sL", "--max-time", "40",
                        url.split("?")[0] + f"?width={breite}"], capture_output=True)
    return r.stdout or None


def motiv(rohbytes, n=24):
    """Bild auf ein 24×24-Farbraster eindampfen. Ein Graustufen-Hash genügt hier NICHT: er
    hielt bei den Zehensteg-Sandalen die rote und die blaue Ausführung für dasselbe Bild und
    beim Daunenmantel die schwarze und die rosa. Farbe muss mitzählen."""
    try:
        im = Image.open(io.BytesIO(rohbytes)).convert("RGB")
    except Exception:
        return None
    s = max(im.size)                                   # auf Quadrat mit weissem Rand:
    q = Image.new("RGB", (s, s), "white")              # unterschiedliche Seitenverhältnisse
    q.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    return np.asarray(q.resize((n, n), Image.LANCZOS), dtype=float)


def abstand(a, b):
    """Mittlere Farbabweichung 0…255. Unter ~22 ist es nachweislich dasselbe Foto in gross."""
    if a is None or b is None:
        return 999.0
    return float(np.abs(a - b).mean())


GLEICHES_BILD = 22.0   # an einer Stichprobe von 18 Produkten geeicht, siehe Kopfkommentar
WINZIG = 250           # darunter lehnt Google das Angebot ab, nicht nur schlechter platziert


def waehle(fall):
    """Gibt (ziel_media, grund) oder (None, grund) zurück. Nie raten: unlesbar → None.

    Zwei Stufen, weil «gross» allein nicht «besser» heisst:
      A) Dasselbe Motiv liegt gross vor (Abstand < GLEICHES_BILD) und trägt keinen Werbetext →
         reine Schärfung, für die Kundin ändert sich nichts ausser der Auflösung. Immer machen.
      B) Es liegt nur ein ANDERES Foto gross vor. Dann wird nur getauscht, wenn das heutige
         Hauptbild ohnehin unbrauchbar ist (< 250 px, Google lehnt ab) — dort ist jedes scharfe
         Produktfoto besser. Ist das heutige Bild 250–499 px, bleibt es stehen: ein leicht
         unscharfes Foto DES PRODUKTS schlägt ein scharfes Foto einer anderen Farbe oder einer
         Wohnzimmerszene.
    """
    altbild = None
    au = (fall["alt"].get("image") or {}).get("url")
    if au:
        ab = hole(au, 400)
        if ab:
            altbild = motiv(ab)
    ai = fall["alt"].get("image") or {}
    altkante = max(ai.get("width") or 0, ai.get("height") or 0)

    with ThreadPoolExecutor(max_workers=6) as pool:
        rohs = list(pool.map(lambda m: hole(m["image"]["url"], 900), fall["ziele"]))
    if any(r is None for r in rohs):
        return None, "bild-nicht-ladbar"               # unbekannt ≠ sauber

    rang = sorted(((abstand(altbild, motiv(r)), i) for i, r in enumerate(rohs)))
    for d, i in rang:
        if d >= GLEICHES_BILD and altkante >= WINZIG:
            return None, f"nur-anderes-motiv(d={rang[0][0]:.0f})"
        try:
            woerter = bildtext_pruefen.woerter(rohs[i])
        except Exception:
            return None, "ocr-fehlgeschlagen"
        if len(woerter) < WORTGRENZE:
            art = "gleiches-bild" if d < GLEICHES_BILD else "ersatz-fuer-winzling"
            return fall["ziele"][i], f"{art} d={d:.0f}"
    return None, "kein-textfreies-grossbild"


# ────────────────────────────────── Schreiben ──────────────────────────────────
REORDER = ('mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m)'
           '{userErrors{message}}}')


def main():
    scharf = "--scharf" in sys.argv
    bogen = "--bogen" in sys.argv
    pfad = katalog_laden(neu="--frisch" in sys.argv)
    faelle = kandidaten(pfad)
    print(f"Kandidaten: {len(faelle)}")

    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t")[0] for z in open(LEDGER).read().splitlines() if z}
    faelle = [f for f in faelle if f["id"] not in erledigt]
    print(f"noch offen: {len(faelle)}")

    log = open(LEDGER, "a")
    paare, geaendert, offen = [], 0, []
    for i, f in enumerate(faelle, 1):
        ziel, grund = waehle(f)
        kid = f["id"].split("/")[-1]
        if ziel is None:
            offen.append((kid, f["title"], grund))
            print(f"  [{i}] ⏭️  {grund:<26} {f['title'][:50]}", flush=True)
            continue
        a = f["alt"].get("image") or {}
        z = ziel["image"]
        print(f"  [{i}] {a.get('width')}x{a.get('height')} → {z['width']}x{z['height']} "
              f"({grund}) {f['title'][:46]}", flush=True)
        paare.append((f, ziel))
        if scharf:
            r = gql(REORDER, {"id": f["id"], "m": [{"id": ziel["id"], "newPosition": "0"}]})
            if r is None or r.get("data", {}).get("productReorderMedia", {}).get("userErrors"):
                offen.append((kid, f["title"], "reorder-fehler"))
                continue
            geaendert += 1
            log.write(f"{f['id']}\t{ziel['id']}\t{z['width']}x{z['height']}\n")
            log.flush()                                # Regel 5: nach JEDER Zeile
            os.fsync(log.fileno())
    log.close()

    if bogen:
        kontaktbogen(paare)
    print(f"\n{'GEÄNDERT' if scharf else 'WÜRDE ÄNDERN'}: {len(paare) if not scharf else geaendert}")
    print(f"unangetastet: {len(offen)}")
    for kid, t, g in offen:
        print(f"   {kid} {g:<26} {t[:52]}")


def kontaktbogen(paare, pfad="/tmp/hauptbild_bogen.png"):
    from PIL import ImageDraw
    B, H, sp = 200, 232, 6
    n = len(paare) * 2
    zeilen = (n + sp - 1) // sp
    bl = Image.new("RGB", (sp * B, zeilen * H), "white")
    d = ImageDraw.Draw(bl)
    k = 0
    for f, ziel in paare:
        for url, lab in (((f["alt"].get("image") or {}).get("url"), "ALT"),
                         (ziel["image"]["url"], "NEU")):
            try:
                im = Image.open(io.BytesIO(hole(url, 400))).convert("RGB")
                im.thumbnail((B - 8, H - 40))
            except Exception:
                im = Image.new("RGB", (40, 40), "red")
            x, y = (k % sp) * B, (k // sp) * H
            bl.paste(im, (x + 4, y + 20))
            d.text((x + 4, y + 4), f"{k//2} {lab}", fill="black")
            d.text((x + 4, y + H - 12), f["title"][:28], fill="#555")
            k += 1
    bl.save(pfad)
    print("Kontaktbogen:", pfad)


if __name__ == "__main__":
    main()
