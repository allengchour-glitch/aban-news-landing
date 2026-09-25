#!/usr/bin/env python3
"""fuellmenge_nachtragen.py — Kosmetik ohne Füllmenge: Menge von der Verpackung lesen (25.09.2026).

ANLASS: Die meistbesuchte Produkt-Landeseite der Woche (Tunmate Rizinusöl, 11 menschliche Sitzungen, 0 Warenkörbe)
nennt keine Füllmenge — nur «Gewicht: ca. 131 g» (Versandgewicht). Wer ein Öl für CHF 15.90 sieht, weiss nicht, ob es
10 ml oder 100 ml sind. Gemessen am 25.09.: 164 aktive Kosmetik-Flüssigprodukte (Öl/Creme/Serum/Lotion/Parfum/Gel)
ohne ml-Angabe in Titel, Text oder Varianten. In der Schweiz verlangt die Preisbekanntgabe bei vorverpackter Ware
ohnehin die Menge. Die CJ-Abfrage ist bis 28.09. durch den Vorrang des Kosten-Nachtrags gebremst, die Verpackung
steht aber meistens auf dem Produktbild: «60ml/2.02fl oz».

QUELLE = Tesseract-OCR der Galerie (bis 8 Bilder, lokal, gratis). GEGENPROBE eingebaut: ein ml-Wert gilt nur dann als
sicher, wenn auf demselben Bild eine fl-oz-Angabe steht, die rechnerisch dazu passt (1 fl oz = 29.57 ml, ±6 %).
Alles andere (nur ml ohne oz, mehrere Werte, nur Gramm) landet im Bericht zur Sichtprüfung; freigegeben wird es über
dropship/_fuellmenge_gesichtet.json ({handle: "30 ml"}) — dort steht nur, was ein Mensch/Agent am Bild gesehen hat.

SCHREIBEN (WRITE=1): unter /tmp/lock_produkttext.lock (nicht blockierend), Text unmittelbar davor live lesen,
Zeile «Füllmenge: 60 ml (laut Verpackung)» an den Anfang der Produktdetails, danach zurücklesen.
Ledger dropship/_fuellmenge_done.txt (handle\tergebnis\tdatum). Bericht dropship/FUELLMENGE.md.
"""
import fcntl, hashlib, json, os, re, subprocess, sys, time, urllib.request
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kollektionstexte_nachbessern import gql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(REPO)
LEDGER = "dropship/_fuellmenge_done.txt"
BERICHT = "dropship/FUELLMENGE.md"
GESICHTET = "dropship/_fuellmenge_gesichtet.json"
CACHE = "/tmp/fuellmenge_img"
WRITE = os.environ.get("WRITE") == "1"
LIMIT = int(os.environ.get("LIMIT", "400"))

TYPEN = ["Hautpflege", "Make-up", "Haarpflege", "Beauty-Tools", "Kosmetik", "Beauty", "Körperpflege", "Parfum", "Parfüm"]
QUERY = "status:active AND (" + " OR ".join(f"product_type:'{t}'" for t in TYPEN) + ")"
FLUESSIG = re.compile(r"öl\b|oel\b|öl[- ]|serum|shampoo|lotion|creme|crème|\bgel\b|gel[- ]|essenz|essence|toner|"
                      r"gesichtswasser|spray|conditioner|parfu|parfü|cologne|eau de|tinktur|balsam|balm|milch|fluid|"
                      r"tropfen|elixier|elixir|reiniger|duschgel|haaröl", re.I)
KEINE_FLUESSIGKEIT = re.compile(r"gemälde|malerei|spiegel|haarschneide|glätteisen|lockenstab|bürste|roller|diffus|"
                                r"luftbefeuchter|humidifier|sprayer|nebler|massagegerät|porenreiniger|kapseln|"
                                r"feuerzeug|palette|stift|puder|kugel|pflaster|maske\b|stick", re.I)
MENGE_DA = re.compile(r"\d+(?:[.,]\d+)?\s?(?:ml|cl|l|liter)\b|füllmenge|inhalt:\s*\d", re.I)
GRAMM_TITEL = re.compile(r"\d+(?:[.,]\d+)?\s?g\b", re.I)

ML = re.compile(r"(\d{1,4}(?:[.,]\d{1,2})?)\s?m[lI1]\b", re.I)
OZ = re.compile(r"(\d{1,2}(?:[.,]\d{1,2})?)\s?(?:fl\.?\s?oz|floz|fl\s?0z)", re.I)
NETTO_G = re.compile(r"(?:net\s?w[te]t?|n\.?w\.?|netto|inhalt)\D{0,6}(\d{1,4}(?:[.,]\d)?)\s?g\b", re.I)


def ledger():
    d = {}
    if os.path.exists(LEDGER):
        for z in open(LEDGER, encoding="utf-8"):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 2:
                d[t[0]] = t[1]
    return d


def ledger_add(handle, ergebnis):
    with open(LEDGER, "a", encoding="utf-8") as fh:
        fh.write(f"{handle}\t{ergebnis}\t{time.strftime('%Y-%m-%d')}\n")


def text(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or ""))


def kandidaten():
    after, out = None, []
    while True:
        r = gql('query($q:String!,$a:String){products(first:100,query:$q,after:$a){pageInfo{hasNextPage endCursor} '
                'nodes{id handle title productType descriptionHtml variants(first:20){nodes{title}} '
                'media(first:8){nodes{... on MediaImage{image{url}}}}}}}', {"q": QUERY, "a": after})["products"]
        for n in r["nodes"]:
            t = n["title"]
            if not FLUESSIG.search(t) or KEINE_FLUESSIGKEIT.search(t) or GRAMM_TITEL.search(t):
                continue
            alles = t + " " + text(n["descriptionHtml"]) + " " + " ".join(v["title"] for v in n["variants"]["nodes"])
            if MENGE_DA.search(alles):
                continue
            out.append(n)
        if not r["pageInfo"]["hasNextPage"]:
            break
        after = r["pageInfo"]["endCursor"]
    return out


def ocr(url):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, hashlib.md5(url.split("?")[0].encode()).hexdigest() + ".jpg")
    if not os.path.exists(p):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=40) as r:
                open(p, "wb").write(r.read())
        except Exception:
            return ""
    try:
        return subprocess.run(["tesseract", p, "-", "--psm", "11"], capture_output=True, text=True, timeout=60).stdout
    except Exception:
        return ""


def zahl(s):
    return float(s.replace(",", "."))


def lesen(n):
    """→ (wert|None, sicher: bool, belege: list[str])"""
    ml_stimmen, belege, sicher_werte, gramm = Counter(), [], set(), Counter()
    for m in n["media"]["nodes"]:
        url = (m.get("image") or {}).get("url")
        if not url:
            continue
        t = ocr(url)
        mls = [zahl(x) for x in ML.findall(t) if 2 <= zahl(x) <= 1000]
        ozs = [zahl(x) for x in OZ.findall(t) if 0.05 <= zahl(x) <= 34]
        for v in set(mls):
            ml_stimmen[v] += 1
            if any(abs(v / 29.57 - o) / o <= 0.06 for o in ozs):
                sicher_werte.add(v)
        for g in NETTO_G.findall(t):
            if 2 <= zahl(g) <= 1000:
                gramm[zahl(g)] += 1
        if mls or ozs:
            belege.append(re.sub(r"\s+", " ", " ".join(ML.findall(t) + OZ.findall(t)))[:60] + " @ " + url.split("?")[0].rsplit("/", 1)[-1])
    if len(ml_stimmen) == 1:
        v = next(iter(ml_stimmen))
        return f"{v:g} ml", v in sicher_werte, belege
    if len(sicher_werte) == 1 and len(ml_stimmen) > 1:
        v = next(iter(sicher_werte))
        return f"{v:g} ml", False, belege + [f"weitere ml-Werte: {sorted(ml_stimmen)}"]
    if not ml_stimmen and len(gramm) == 1:
        return f"{next(iter(gramm)):g} g", False, belege + ["nur Nettogewicht auf der Verpackung"]
    if ml_stimmen:
        return None, False, belege + [f"mehrdeutig: {sorted(ml_stimmen)}"]
    return None, False, belege


def schreiben(pid, handle, wert):
    """Live lesen → Zeile einsetzen → schreiben → zurücklesen. True/False/None(gesperrt)."""
    fh = open("/tmp/lock_produkttext.lock", "a")
    try:
        fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return None
    try:
        p = gql("query($id:ID!){product(id:$id){status descriptionHtml}}", {"id": pid})["product"]
        html = p["descriptionHtml"] or ""
        if p["status"] != "ACTIVE":
            return False
        if MENGE_DA.search(text(html)):
            return True  # inzwischen vorhanden (anderer Schreiber)
        zeile = f"<li>\n<strong>Füllmenge:</strong> {wert} (laut Verpackung)</li>"
        if 'class="ls-produktdetails"' in html and re.search(r'class="ls-produktdetails".*?<ul>', html, re.S):
            neu = re.sub(r'(class="ls-produktdetails".*?<ul>)', lambda m: m.group(1) + zeile, html, count=1, flags=re.S)
        else:
            block = f'\n<div class="ls-produktdetails">\n<h4>Produktdetails</h4>\n<ul>{zeile}</ul>\n</div>\n'
            i = html.find("<div style=")
            neu = html[:i] + block + html[i:] if i >= 0 else html + block
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{field message}}}",
                {"p": {"id": pid, "descriptionHtml": neu}})["productUpdate"]
        if r["userErrors"]:
            print("  FEHLER", handle, r["userErrors"])
            return False
        zurueck = gql("query($id:ID!){product(id:$id){descriptionHtml}}", {"id": pid})["product"]["descriptionHtml"]
        return f"Füllmenge:</strong> {wert}" in zurueck
    finally:
        fcntl.flock(fh, fcntl.LOCK_UN)
        fh.close()


def main():
    led = ledger()
    gesichtet = json.load(open(GESICHTET)) if os.path.exists(GESICHTET) else {}
    ks = kandidaten()
    print(f"{len(ks)} Kandidaten ohne Füllmenge ({'WRITE' if WRITE else 'DRY'})", flush=True)
    zeilen, geschrieben, gesperrt = [], 0, 0
    for n in ks[:LIMIT]:
        h = n["handle"]
        wert, sicher, belege = lesen(n)
        freigabe = gesichtet.get(h)
        ziel = freigabe or (wert if sicher else None)
        status = "sicher (ml+oz)" if sicher else ("gesichtet" if freigabe else ("Vorschlag — sichten" if wert else "nichts lesbar"))
        if ziel and WRITE and led.get(h) != f"ok {ziel}":
            ok = schreiben(n["id"], h, ziel)
            if ok is None:
                gesperrt += 1
                status += " · Text-Sperre belegt"
            elif ok:
                geschrieben += 1
                ledger_add(h, f"ok {ziel}")
                status += " · geschrieben"
            else:
                status += " · NICHT geschrieben"
        elif led.get(h, "").startswith("ok"):
            status += " · schon geschrieben"
        zeilen.append((h, n["title"], ziel or wert or "—", status, "; ".join(belege)[:160]))
        print(f"  {status:40} {wert or '—':8} {h}", flush=True)
    with open(BERICHT, "w", encoding="utf-8") as fh:
        fh.write(f"# Füllmenge fehlt — Stand {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}\n\n")
        fh.write(f"Werkzeug `automation/fuellmenge_nachtragen.py` · Kandidaten: {len(ks)} aktive Kosmetik-Flüssigprodukte ohne "
                 f"ml-Angabe · diesmal geschrieben: {geschrieben} · Text-Sperre belegt: {gesperrt}\n\n")
        fh.write("Sicher = ml und fl oz auf demselben Bild passen rechnerisch. «Vorschlag — sichten»: Bild ansehen, dann "
                 "`{handle: \"30 ml\"}` in `dropship/_fuellmenge_gesichtet.json` eintragen.\n\n")
        fh.write("| Produkt | Menge | Status | Beleg (OCR) |\n|---|---|---|---|\n")
        for h, t, w, s, b in sorted(zeilen, key=lambda z: z[3]):
            fh.write(f"| [{t}](https://luxestyle.ch/products/{h}) | {w} | {s} | {b.replace('|', '/')} |\n")
    print(f"FERTIG: {len(ks)} Kandidaten, {geschrieben} geschrieben, {gesperrt} gesperrt · {BERICHT}")


if __name__ == "__main__":
    main()
