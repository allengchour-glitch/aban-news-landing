#!/usr/bin/env python3
"""Räumt die Social-Warteschlangen auf: nur postbare Zeilen bleiben «ready».

Betreiber 03.09.2026 («mach alles sauber»), nach dem Screenshot mit dem doppelten
Serpent-Armreif. Geprüft wird je ready-Zeile:

  dead-url-skip      Medium liegt auf abannews.com — die Domain ist tot (Lehre 28.08.).
  dup-produkt-skip   Diese WARE wurde schon gepostet oder steht weiter oben in der Queue.
                     Schlüssel aus post_guard.produktKey (« »-Name > Produkt-ID > Slug).
  saison-skip        Der Text bewirbt einen vergangenen Anlass (Sommer, Muttertag, 1. August).
                     Im September ist «Sommer-Liebling» keine Werbung, sondern ein Datum.
  produkt-weg-skip   Das beworbene Produkt ist nicht mehr ACTIVE (oder nicht im Onlineshop) — genau die
                     Falle, wegen der ein Reel einmal gedraftete Klimaanlagen bewarb.
  preis-veraltet-skip (24.09.2026) Ein CHF-Preis der Caption liegt ausserhalb des Live-Preisbands (nach dem Preisschutz).
  bildtext-skip      (23.09.2026, Betreiber-Screenshot IG-Raster: «made from natural stone», «300ml Aroma Diffuser
                     7 color LED change») Das BILD trägt englischen Lieferanten-Werbetext — Tesseract liest ≥4
                     sichere Wörter. Nur Bild-Posts; Ergebnis je URL in dropship/_bildtext_queue.txt gemerkt.

⚠️ 23.09.2026: Dieses Skript hatte seit dem 03.09. KEINEN Starter (kein Log je geschrieben) — gemessen: 3 von 73
«ready»-Bildposts bewarben gedraftete Ware. Jetzt taeglich im Aufseher (fixer_keepalive.sh, Tagesliste).

NICHTS WIRD GELÖSCHT. Es ändert sich nur die Status-Spalte; jede Zeile bleibt lesbar und
lässt sich von Hand zurücksetzen. DRY=1 zeigt nur.
"""
import csv, json, os, re, sys, time, urllib.request
from collections import Counter

DRY  = os.environ.get("DRY") == "1"
SHOP = "au3j0y-hq.myshopify.com"
DATEIEN = ["social/posts_image.csv", "social/video_queue.csv",
           "automation/reels_seed.csv", "social/tiktok_queue.csv"]

# Anlässe, die am 03.09. VORBEI sind. Herbst, Halloween, Advent stehen bewusst NICHT hier —
# die kommen erst. Ein Saisonwort ist nur dann ein Fehler, wenn die Saison vorbei ist.
VORBEI = re.compile(r"\b(sommer\w*|summer|muttertag\w*|vatertag\w*|ostern|ostern?\w*|"
                    r"1\.\s*august|erster august|fasnacht\w*|wm\s*2026|badesaison)\b", re.I)

def produkt_key(cap, zid):
    m = re.search(r'[«"„]([^»"“]{2,40})[»"“]', cap or "")
    if m: return "name:" + re.sub(r"[^a-zäöüß0-9]", "", m.group(1).lower())
    i = re.search(r"(\d{12,})\s*$", zid or "")
    if i: return "pid:" + i.group(1)
    s = re.sub(r"[^a-z0-9-]", "", re.sub(r"-\d{6,}$", "", re.sub(r"-\d{4}-\d{2}-\d{2}$", "",
        re.sub(r"^(?:ki|kimi|img|clip|post|auto|fresh\d*|meta-auto)-", "", (zid or "").lower()))))
    return "slug:" + s if len(s) >= 6 else ""

def gql(q, v=None):
    tok = open("/tmp/cj_shop_token.txt").read().strip()
    req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
        data=json.dumps({"query": q, "variables": v or {}}).encode(),
        headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    for i in range(5):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=45))
            if d.get("data"): return d
        except Exception: pass
        time.sleep(2 ** i)
    # ⚠️ 17.09.2026: Hier stand `return {}`. Gemessen an zwei Aufrufern in dieser
    # Klasse, was das anrichtet: `kollektion_leer.py` macht
    # `gql(...).get("collections")` → None → `if not d: break`, und
    # `tote_rabattcodes.py` bricht bei `hasNextPage` ab. Beide melden dann ein
    # ordentliches Ergebnis über NULL Datensätze, obwohl Shopify nur gedrosselt hat.
    # Eine Null, die wie eine Messung aussieht, ist der teuerste Befund dieses
    # Projekts (95 Klingen blieben im Verkauf, weil ein Wächter «0» meldete).
    # Darum: laut scheitern. Ein Traceback im Log ist ein Befund, eine falsche Null nicht.
    raise RuntimeError(
        "Shopify hat auf keinen Versuch mit Daten geantwortet. FRÜHER gab diese"
        " Funktion hier ein leeres Ergebnis zurück und der Aufrufer meldete «0» —"
        " das ist keine Messung, sondern ein Ausfall.")

PREIS = {}   # pid → (min, max) live


def preis_veraltet(cap, pid):
    """24.09.2026: Reels und Bild-Posts tragen den Preis in Caption UND Bild/Video. Der Preisschutz hob an einem Tag
    23'121 Varianten — ein wartender Post warb danach mit dem alten, tieferen Preis. Jeder CHF-Preis der Caption muss im
    Live-Preisband liegen. Ohne Live-Preis (Abfrage fehlgeschlagen) kein Urteil."""
    band = PREIS.get(pid)
    if not band:
        return False
    # «Gratis-Versand ab CHF 50» ist eine Schwelle, kein Produktpreis (erster Lauf: 5 Fehlalarme); Produktpreise tragen immer
    # Rappen («14.90») — «ab CHF 14.90» bleibt ein Preis, der geprüft wird.
    rein = re.sub(r"(?:versand|lieferung|gratis|kostenlos)[^.\n]{0,25}?CHF\s?\d+(?:[.,]\d{2})?",
                  " ", cap or "", flags=re.I)
    for m in re.finditer(r"CHF\s?(\d+[.,]\d{2})\b", rein):
        x = float(m.group(1).replace(",", "."))
        if not (band[0] - 0.005 <= x <= band[1] + 0.005):
            return True
    return False


def status_von(ids):
    """Live-Status je Produkt-ID. Bei Ausfall LEERES dict — dann wird NICHT gedraftet
    (ein Nullergebnis aus einer kaputten Abfrage ist kein Befund)."""
    out = {}
    ids = [i for i in ids if i]
    for i in range(0, len(ids), 50):
        d = gql("query($ids:[ID!]!){nodes(ids:$ids){... on Product{id status onlineStoreUrl "
                "priceRangeV2{minVariantPrice{amount} maxVariantPrice{amount}}}}}",
                {"ids": ["gid://shopify/Product/" + x for x in ids[i:i+50]]})
        # 23.09.2026: ACTIVE ohne onlineStoreUrl (nicht im Onlineshop publiziert) ist fuer die Kundin dieselbe 404 —
        # der Reel-/Karussell-Poster fragen beides, hier zaehlte nur der Status.
        for n in ((d.get("data") or {}).get("nodes") or []):
            if n:
                out[n["id"].split("/")[-1]] = n["status"] if n.get("onlineStoreUrl") else "OHNE-ONLINESHOP"
                pr = n.get("priceRangeV2") or {}
                try:
                    PREIS[n["id"].split("/")[-1]] = (float(pr["minVariantPrice"]["amount"]), float(pr["maxVariantPrice"]["amount"]))
                except (KeyError, TypeError, ValueError):
                    pass
    return out

gepostet = set()
if os.path.exists("dropship/_posted_produkte.txt"):
    gepostet = {l.strip() for l in open("dropship/_posted_produkte.txt", encoding="utf-8") if l.strip()}

# Bildtext (OS-Voraussetzung Tesseract; fehlt sie, wird die Pruefung still uebersprungen — «nicht lesbar» ≠ Text)
try:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault("OMP_THREAD_LIMIT", "1")
    from bild_heilversprechen import lies as _lies
except Exception:
    _lies = None
BT_CACHE = "dropship/_bildtext_queue.txt"
_bt = {}
if os.path.exists(BT_CACHE):
    for l in open(BT_CACHE, encoding="utf-8"):
        u, _, w = l.rstrip("\n").partition("\t")
        if u: _bt[u] = int(w or 0)

def bildtext_woerter(url):
    """Anzahl sicher gelesener Wörter im Bild; None = nicht pruefbar."""
    if not _lies or not re.search(r"\.(jpe?g|png|webp)(\?|$)", url, re.I):
        return None
    if url in _bt:
        return _bt[url]
    w = _lies(url)
    if w is None:
        return None
    _bt[url] = len(w)
    if not DRY:
        with open(BT_CACHE, "a", encoding="utf-8") as f:
            f.write(f"{url}\t{len(w)}\n")
    return len(w)

gesamt = Counter()
for datei in DATEIEN:
    if not os.path.exists(datei): continue
    with open(datei, newline="", encoding="utf-8") as f:
        rd = csv.DictReader(f); felder = rd.fieldnames; rows = list(rd)
    ready = [r for r in rows if (r.get("status") or "").strip() == "ready"]
    pids = [ (re.search(r"(\d{12,})\s*$", r.get("id") or "") or [None,None])[1] for r in ready ]
    live = status_von([p for p in pids if p])
    gesehen = set(gepostet)
    n = Counter()
    for r in ready:
        medium = (r.get("image_url") or r.get("video_url") or r.get("url") or "")
        cap    = r.get("caption") or ""
        zid    = r.get("id") or ""
        pid    = (re.search(r"(\d{12,})\s*$", zid) or [None,None])[1]
        k      = produkt_key(cap, zid)
        neu = None
        if "abannews.com" in medium:                      neu = "dead-url-skip"
        elif k and k in gesehen:                          neu = "dup-produkt-skip"
        elif VORBEI.search(cap):                          neu = "saison-skip"
        elif pid and live.get(pid) and live[pid] != "ACTIVE": neu = "produkt-weg-skip"
        elif pid and preis_veraltet(cap, pid):          neu = "preis-veraltet-skip"
        elif r.get("image_url") and (bildtext_woerter(r["image_url"]) or 0) >= 4: neu = "bildtext-skip"
        if neu:
            n[neu] += 1
            if not DRY: r["status"] = neu
        else:
            n["bleibt ready"] += 1
            if k: gesehen.add(k)
    if not DRY and n:
        with open(datei, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=felder, lineterminator="\n"); w.writeheader(); w.writerows(rows)
    print(f"{datei:32s} ready {len(ready):4d} → " + " · ".join(f"{k} {v}" for k, v in n.most_common()))
    gesamt.update(n)
print(("DRY — " if DRY else "") + "GESAMT: " + " · ".join(f"{k} {v}" for k, v in gesamt.most_common()))
