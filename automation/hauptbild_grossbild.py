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
DER PROBELAUF — warum «nimm das grösste Bild» den Feed VERSCHLECHTERT hätte
════════════════════════════════════════════════════════════════════════════════════════════
Die erste Fassung nahm schlicht «das früheste Bild ab 800 px». Ein Kontaktbogen über eine
Zufallsstichprobe von 18 Produkten (altes gegen neues Hauptbild nebeneinander) zeigte, dass
das bei 8 von 18 = 44 % eine VERSCHLECHTERUNG gewesen wäre. Das grosse Bild ist bei CJ sehr
oft kein Produktfoto, sondern eine Werbetafel:

  • «Ohrreinigung mit Stimmstab»  alt: sauberes Freistellerfoto → neu: Collage «Wide
    Compatibility» mit Klavier, Geige und drei Personen
  • «Automatischer Lockenstab»    alt: Gerät auf Weiss → neu: Temperaturtabelle in Englisch
  • «Smart Mülltonne mit Sensor»  alt: Tonne auf Weiss → neu: «Drawstring 20L black gold»-Tafel
  • «U-förmige Massagekissen»     alt: Kissen → neu: Schrifttafel «U-SHAPE NECK MASSAGER ST-320»
  • «Spiral-Edelstahl-Armbanduhr» alt: Uhr → neu: Banner «ROTATABLE watch bezel»
  • «Spiegelndes Lipgloss»        alt: Produktfoto → neu: Lippen-Swatch mit FENTY BEAUTY, also
    einem FREMDEN MARKENNAMEN im Bild — genau das Sperr-Risiko, wegen dem am 12.08. zehn Titel
    bereinigt werden mussten.

Werbetext im Produktbild ist bei Google selbst ein Verstoss. Ein Lauf, der verpixelte Kacheln
gegen Werbetafeln tauscht, hätte den Feed schlechter gemacht als er war.

════════════════════════════════════════════════════════════════════════════════════════════
UND WARUM AUCH «IRGENDEIN SAUBERES GROSSES FOTO» NICHT REICHT
════════════════════════════════════════════════════════════════════════════════════════════
Zweiter Kontaktbogen, 24 Fälle, bei denen das grosse Bild textfrei, aber ein ANDERES Foto war.
Von Hand beurteilt: 6 besser, 13 gleichwertig (meist nur eine andere Farbvariante), **5
schlechter** — darunter zwei, die im Google-Kanal teuer werden können:
  • «6er Set ätherische Öle»: alt zeigt das Set mit sechs Fläschchen, neu EIN Fläschchen —
    das ist eine Falschdarstellung des Lieferumfangs, nicht bloss ein hässlicheres Bild.
  • «Ultraschall-Massagegerät»: neu wären Vorher-Nachher-Bikinifotos das Hauptbild geworden.
Der Erwartungswert eines pauschalen Motivtauschs ist also nicht null, sondern negativ. Er
wird deshalb NICHT gemacht; die Fälle stehen am Ende des Laufs als offen im Protokoll.

════════════════════════════════════════════════════════════════════════════════════════════
DIE REGEL, DIE STATTDESSEN GILT
════════════════════════════════════════════════════════════════════════════════════════════
1. Kandidaten sind nur Bilder ab 800 px Kantenlänge im Status READY.
2. Jeder Kandidat wird von `bildtext_pruefen.woerter()` (Tesseract) gelesen; ab 3 sicher
   erkannten Wörtern gilt er als Werbetafel und scheidet aus (Begründung der Schwelle unten
   bei WORTGRENZE).
3. Getauscht wird nur gegen DASSELBE FOTO in gross. Zwei Masse zusammen (Begründung bei
   `messwerte`): mittlere Abweichung über die Produktfläche < 22 UND Abstand der mittleren
   Produktfarbe < 10.
4. Ist das heutige Hauptbild kleiner als 250 px, wird auch gegen ein anderes sauberes Foto
   getauscht: Google lehnt darunter ab, ein Ersatz kann also nur besser sein.
5. Sonst bleibt das Produkt stehen und wird als offen protokolliert.
6. Ein Bild, das nicht geladen oder nicht gelesen werden konnte, gilt als UNBEKANNT, nicht als
   sauber; der Fall bleibt offen und wird beim nächsten Lauf erneut versucht. «Keine Antwort»
   ist nicht «keine Daten».

Gelöscht wird nichts. `productReorderMedia` verschiebt nur; alle Bilder bleiben am Produkt.

════════════════════════════════════════════════════════════════════════════════════════════
ERGEBNIS DES LAUFS VOM 14.08.2026 (alle 267 Kandidaten gemessen)
════════════════════════════════════════════════════════════════════════════════════════════
   12  gleiches-bild          → geschrieben (Kontaktbogen von Hand geprüft: 11 klare
                                Verbesserungen, 1 Farbwechsel rosa→violett bei einem
                                Paar-Hausschuh, der beide Farben führt)
   17  ersatz-fuer-winzling   → geschrieben (Hauptbild war 50–248 px)
  195  nur-anderes-motiv      → BEWUSST STEHENGELASSEN, siehe oben
   43  kein-textfreies-grossbild → stehengelassen
Nebenbefund: 11 der 29 alten Hauptbilder trugen aufgedruckten Werbetext («2pcs», «3pcs»,
«8TB (512GB expansion)», «White», rote Masspfeile). Der Tausch nimmt also zugleich elf
Werbeaufdrucke aus dem Google-Feed — ein Verstoss, nach dem niemand gesucht hatte.

Nicht behebbar und deshalb offen gemeldet: 15 aktive Produkte haben ÜBERHAUPT kein Bild über
250 px Breite. Bei den drei CJ-Artikeln, die noch abgefragt werden konnten, liefert auch die
CJ-API nur 150-px-Bilder — es fehlt an der QUELLE, nicht an der Reihenfolge. Vier weitere
CJ-Abfragen blieben ohne Antwort («Insufficient API points»); sie gelten als ungeprüft, nicht
als geklärt.

════════════════════════════════════════════════════════════════════════════════════════════
DIE QUELLE (ohne sie wäre die Reparatur wertlos)
════════════════════════════════════════════════════════════════════════════════════════════
256 der 267 Kandidaten tragen eine CJ-SKU, 50 wurden im August angelegt, der jüngste zwei Tage
vor dem Fund. `automation/cj_category_fill.mjs` übernahm CJs `productImageSet` unverändert in
der Lieferanten-Reihenfolge und machte `imgs[0]` zum Hauptbild — CJs erster Eintrag ist
mitunter ein 50×50-Thumbnail. Dort steht seit dem 14.08. `grossbildNachVorn()`: ist das erste
Bild kleiner als 250 px, holt der Importer selbst das erste fertige Grossbild nach vorn. Ohne
das legte er täglich neue Fälle an und diese Datei wäre Sisyphusarbeit.

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
MESSUNG = "/tmp/hauptbild_messung.json"       # zwischengespeicherte Bildmessungen
MINI = 500          # darunter gilt das Hauptbild als Miniatur
GROSS = 800         # ab hier gilt ein Bild als Grossbild
# `bildtext_pruefen` verwirft ab 4 Wörtern; hier wird bei 3 verworfen. Grund aus dem
# Probelauf: die Schrifttafel «U-SHAPE NECK MASSAGER · ST-320» kam auf genau drei zählbare
# Wörter durch — «U-SHAPE» zerfällt an dem Bindestrich, «ST-320» ist keins. Sie wäre als
# Hauptbild eines Massagekissens im Google-Feed gelandet. Von 30 sonst gewählten Bildern
# tragen 27 gar keinen Text, zwei genau zwei Wörter; die schärfere Grenze kostet also nichts.
WORTGRENZE = 3      # ab so vielen sicher gelesenen Wörtern: Werbetafel


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


def messwerte(a, b):
    """Zwei Zahlen, mit denen sich «dasselbe Foto in gross» von «ein anderes Foto» trennen lässt.

    `mae`  – mittlere Farbabweichung, aber NUR über die Bildpunkte, die in einem der beiden
             Bilder nicht Hintergrund sind. Über das ganze Bild gemittelt versagte das Mass:
             bei einem Freisteller ist vier Fünftel der Fläche weiss, und die Übereinstimmung
             des Weiss übertönte den Unterschied zwischen einem VIOLETTEN und einem
             ROSÉGOLDENEN Lockenstab (4,5 über alles, 36,6 über das Produkt).
    `farb` – Abstand der mittleren PRODUKTFARBE. Er fängt, was die mittlere Abweichung nicht
             fängt: dasselbe Foto in einer anderen Ausführung (Kupferarmband silbern/kupfern,
             Messerschärfer grün/grau, Rasierer blau/weiss).
    """
    if a is None or b is None:
        return 999.0, 999.0
    maske = (a.min(axis=2) < 225) | (b.min(axis=2) < 225)
    if maske.sum() < 20:                                # praktisch reines Weiss
        maske = np.ones(a.shape[:2], bool)
    mae = float(np.abs(a - b)[maske].mean())
    farb = float(np.abs(a[maske].mean(axis=0) - b[maske].mean(axis=0)).mean())
    return mae, farb


# An 22 Produkten geeicht, die von Hand auf einem Kontaktbogen beurteilt wurden (siehe
# Kopfkommentar). Beide Schwellen zusammen: 11 Treffer, 1 Fehltreffer (rosa statt violetter
# Hausschuh). Nur `mae` allein liess 6 Farbwechsel durch, nur `farb` allein liess ein anderes
# Poster-Motiv durch.
GLEICH_MAE = 22.0
GLEICH_FARB = 10.0
WINZIG = 250           # darunter lehnt Google das Angebot ab, nicht nur schlechter platziert


def messen(fall):
    """Misst JEDEN Grossbild-Kandidaten (Abstand + Werbetext) und gibt die Rohwerte zurück.
    Bewusst getrennt vom Urteil: das Lesen des halben Katalogs dauert eine Stunde, die
    Schwellen sollen danach ohne neuen Ladelauf nachjustierbar sein."""
    altbild = None
    au = (fall["alt"].get("image") or {}).get("url")
    if au:
        ab = hole(au, 400)
        if ab:
            altbild = motiv(ab)

    with ThreadPoolExecutor(max_workers=8) as pool:
        rohs = list(pool.map(lambda m: hole(m["image"]["url"], 900), fall["ziele"]))
    if any(r is None for r in rohs):
        return None                                    # unbekannt ≠ sauber (Regel 6)

    aus = []
    for m, roh in zip(fall["ziele"], rohs):
        try:
            w = len(bildtext_pruefen.woerter(roh))
        except Exception:
            return None
        mae, farb = messwerte(altbild, motiv(roh))
        aus.append({"id": m["id"], "w": m["image"]["width"], "h": m["image"]["height"],
                    "url": m["image"]["url"], "mae": round(mae, 1),
                    "farb": round(farb, 1), "woerter": w})
    return aus


def urteil(messung, altkante):
    """Wendet die Schwellen auf die Messwerte an. Ändert nichts, misst nichts — nur Politik."""
    if messung is None:
        return None, "nicht-messbar"
    sauber = [k for k in messung if k["woerter"] < WORTGRENZE]
    if not sauber:
        return None, "kein-textfreies-grossbild"
    sauber.sort(key=lambda k: (k["mae"], k["farb"]))
    bester = sauber[0]
    if bester["mae"] < GLEICH_MAE and bester["farb"] < GLEICH_FARB:
        return bester, "gleiches-bild"                 # reine Schärfung
    if altkante < WINZIG:
        return bester, "ersatz-fuer-winzling"          # heute lehnt Google ohnehin ab
    return bester, "nur-anderes-motiv"                 # Vorschlag, wird NICHT geschrieben


SCHREIBT = ("gleiches-bild", "ersatz-fuer-winzling")


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

    messungen = json.load(open(MESSUNG)) if os.path.exists(MESSUNG) else {}
    log = open(LEDGER, "a")
    geaendert, gezaehlt, tabelle = 0, {}, []
    for i, f in enumerate(faelle, 1):
        kid = f["id"].split("/")[-1]
        if kid not in messungen:
            m = messen(f)
            a = f["alt"].get("image") or {}
            messungen[kid] = {"titel": f["title"], "handle": f["handle"],
                              "alt": {"w": a.get("width"), "h": a.get("height"),
                                      "url": a.get("url")},
                              "kandidaten": m}
            json.dump(messungen, open(MESSUNG, "w"), ensure_ascii=False)
        e = messungen[kid]
        altkante = max(e["alt"]["w"] or 0, e["alt"]["h"] or 0)
        ziel, art = urteil(e["kandidaten"], altkante)
        gezaehlt[art] = gezaehlt.get(art, 0) + 1
        tabelle.append((kid, e, ziel, art))
        print(f"  [{i}] {art:<24} "
              f"{e['alt']['w']}x{e['alt']['h']} → "
              f"{(str(ziel['w']) + ' mae=' + str(ziel['mae']) + ' farb=' + str(ziel['farb'])) if ziel else '-':<28}"
              f" {e['titel'][:42]}", flush=True)
        if scharf and art in SCHREIBT:
            r = gql(REORDER, {"id": f["id"], "m": [{"id": ziel["id"], "newPosition": "0"}]})
            fehler = None if r is None else r.get("data", {}).get(
                "productReorderMedia", {}).get("userErrors")
            if r is None or fehler:
                print(f"      ⚠️ nicht geschrieben ({fehler}) — bleibt offen", flush=True)
                continue
            geaendert += 1
            log.write(f"{f['id']}\t{ziel['id']}\t{ziel['w']}x{ziel['h']}\t{art}\n")
            log.flush()                                # Regel 5: nach JEDER Zeile
            os.fsync(log.fileno())
    log.close()

    if bogen:
        for art in set(a for *_, a in tabelle):
            paare = [(e["alt"]["url"], z["url"],
                      f"mae{z['mae']:.0f}/f{z['farb']:.0f} {e['titel']}")
                     for _, e, z, a2 in tabelle if a2 == art and z]
            if paare:
                kontaktbogen(paare, f"/tmp/bogen_{art}.png")
    print("\nUrteile:", gezaehlt)
    print(("GEÄNDERT: %d" % geaendert) if scharf
          else "WÜRDE ÄNDERN: %d" % sum(gezaehlt.get(a, 0) for a in SCHREIBT))
    for kid, e, z, art in tabelle:
        if art not in SCHREIBT:
            print(f"   offen {kid} {art:<26} {e['titel'][:50]}")


def kontaktbogen(paare, pfad="/tmp/hauptbild_bogen.png", proseite=48):
    """Altes und neues Hauptbild nebeneinander — die einzige Prüfung, die zählt, ist die mit
    den eigenen Augen. Ohne diesen Bogen wäre die Werbetafel-Falle nie aufgefallen."""
    from PIL import ImageDraw
    B, H, sp = 200, 232, 6
    for teil in range(0, len(paare), proseite):
        stueck = paare[teil:teil + proseite]
        zeilen = (len(stueck) * 2 + sp - 1) // sp
        bl = Image.new("RGB", (sp * B, zeilen * H), "white")
        d = ImageDraw.Draw(bl)
        k = 0
        for alt_url, neu_url, titel in stueck:
            for url, lab in ((alt_url, "ALT"), (neu_url, "NEU")):
                try:
                    im = Image.open(io.BytesIO(hole(url, 400))).convert("RGB")
                    im.thumbnail((B - 8, H - 40))
                except Exception:
                    im = Image.new("RGB", (40, 40), "red")
                x, y = (k % sp) * B, (k // sp) * H
                bl.paste(im, (x + 4, y + 20))
                d.text((x + 4, y + 4), f"{teil + k//2} {lab}", fill="black")
                d.text((x + 4, y + H - 12), titel[:28], fill="#555")
                k += 1
        p = pfad if teil == 0 else pfad.replace(".png", f"_{teil//proseite}.png")
        bl.save(p)
        print("Kontaktbogen:", p)


if __name__ == "__main__":
    main()
