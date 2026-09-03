#!/usr/bin/env python3
"""Ein Durchgang über den GANZEN aktiven Katalog — alle maschinell prüfbaren Fehlerklassen.

Betreiber 03.09.2026 nach Bestellung #1016: «prüf alle produkten, fehler zu viel passiert».

WARUM EIN VOLL-EXPORT UND NICHT VIELE ABFRAGEN: Dubletten und Klassenzahlen sind Fragen über
den GESAMTEN Bestand; eine Stichprobe der jüngsten Importe ist keine Stichprobe des Katalogs
(Lehre 27.08.). Und Shopifys Suchfilter schweigen bei falscher Syntax, statt zu scheitern
(28.08.) — lokal gerechnet kann das nicht passieren.

DIESES SKRIPT ÄNDERT NICHTS. Es zählt und schreibt einen Bericht. Repariert wird klassenweise
mit spezialisierten Werkzeugen, nachdem ein Mensch die Trefferliste GELESEN hat — ein breites
Suchmuster ist ein Netz, kein Urteil (29.08.).
"""
import json, os, re, sys, unicodedata
from collections import defaultdict, Counter

EXPORT = os.environ.get("EXPORT", "/tmp/katalog_full.jsonl")
BERICHT = os.environ.get("BERICHT", "dropship/VOLL-AUDIT.md")
BEISPIELE = int(os.environ.get("BEISPIELE", "8"))

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from klingenregel import ist_klinge
except Exception:
    def ist_klinge(t): return False

# ---------------------------------------------------------------- Muster
# Verankert, weil kurze Wörter als Fremdwort-Endung vorkommen (IPL in Lipliner, led in Leder,
# ski in Skincare, auto in Automatik, monitor in Monitoring) — Substring-Familie, 8 Fassungen.
WIRKVERSPRECHEN = re.compile(
    r"(?:(?:wimpern|haar|bart|augenbrauen|nagel|nägel)\w*wachstum|wachstums(?:serum|öl|oel)"
    r"|gegen\s+(?:pigmentflecken|falten|akne|cellulite|haarausfall|schuppen|narben|krampfadern)"
    r"|anti[- ]?aging\s*facelift|facelift|dauerhafte\s+haarentfernung"
    r"|abnehmen\b|gewichtsverlust|schlankheits\w*|fettverbrenn\w*|detox\b|whitening)", re.I)
MEDIZIN = re.compile(r"\b(blutzucker|blutdruck\s*mess|ekg\b|harnsäure|blutfett|hörgerät\w*"
                     r"|fetal|doppler|beatmung|stethoskop|otoskop|endoskop|thermometer\s*klinisch)", re.I)
CODE_TITEL = re.compile(r"(?<![\wäöüß])(?:[A-Z]{1,4}\d{3,}[A-Z]?|\d{4,})(?![\wäöüß])")
CODE_OK = re.compile(r"\b(UV400|TR90|RF433|SR626SW|20\d\d|18650|26650|9V|5V|12V|24V|4K|1080P|720P"
                     r"|USB|LED|IP6[78]|CR20\d\d|AA|AAA|A4|A5|A3|3D|2D|360|5G|4G|WIFI|WLAN|S925|925|750|585|316L|18K|24K|K9|PD\d*|QC\d*|H\d{3,4}|EU\d{2}|ML|CM|MM)\b", re.I)
# ⚠️ Ein SET-Inhalt ist keine Auswahl: «5 Lätzchen im Set: Fünf Farben zur Auswahl»
# beschreibt, was mitgeliefert wird — die Kundin waehlt nichts. Ebenso «2× gross, 2× klein».
# Ohne diese Gegenprobe meldete C1 am 03.09. 6'172 Faelle, von denen die Stichprobe zwei
# Drittel als Set-Beschreibung entlarvte. Das Werkzeug wahlversprechen.py kennt die
# Unterscheidung seit dem 01.09.; der Audit kannte sie nicht.
SET_INHALT = re.compile(r"(?:\b\d{1,2}\s*(?:×|x|St(?:k|ück)?\.?)\s|\bim\s+Set\b|\bSet\s+(?:mit|aus|à)\b"
                        r"|\b\d{1,2}er[- ]?Set\b|\benthält\b|\bLieferumfang\b|\bbestehend\s+aus\b)", re.I)
WAHL = re.compile(r"(?:in\s+(?:zwei|drei|vier|fünf|sechs|verschiedenen|mehreren|diversen)\s+"
                  r"(?:farben|grössen|groessen|größen|varianten|ausführungen|modellen)"
                  r"|erhältlich\s+in\s+(?:den\s+)?(?:farben|grössen|größen)"
                  r"|(?:farben|grössen|größen)\s+(?:zur\s+auswahl|verfügbar))", re.I)
SIE_FORM = re.compile(r"\b(Entdecken\s+Sie|Ihre[nmrs]?\b|Ihnen\b|Sie\s+(?:können|erhalten|finden|geniessen))")
ALT_VERSAND = re.compile(r"(?:USA:?\s*(?:<[^>]+>\s*)*\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage"
                         r"|🇪🇺\s*EU:?\s*(?:<[^>]+>\s*)*\d"
                         r"|Gratis-?Versand\s+ab\s+CHF\s*(?:65|60)\b"
                         r"|Lieferung\s+ca\.\s*7\s*[–-]\s*14\s*Tage)", re.I)
TRUST_ALT = re.compile(r"Geprüfte\s+(?:Qualität|Markenqualität)", re.I)
DETAILS_DOPPELT = re.compile(r"Produktdetails", re.I)
ESZETT = re.compile(r"ß")
MARKEN = re.compile(r"(?<![\wäöüß])(nike|adidas|puma|reebok|gucci|prada|chanel|rolex|apple|samsung"
                    r"|dyson|lego|disney|pokemon|marvel|ferrari|porsche|lamborghini|tesla|bmw"
                    r"|mercedes|audi|louis\s*vuitton|hermès|dior|versace|balenciaga)(?![\wäöüß])", re.I)
MARKE_OK = re.compile(r"\b(für|kompatibel|passend|geeignet|im\s+\w+-?Stil|ersatz)\b", re.I)
ENG_WORT = re.compile(r"\b(the|with|for|and|your|premium\s+quality|new\s+arrival|hot\s+sale"
                      r"|fashion|women|men's|portable|adjustable|multifunctional|wireless)\b", re.I)
SKU_OK = re.compile(r"^(CJ[-A-Z0-9]{4,}|bb-[A-Za-z0-9]+|BB-[A-Za-z0-9]+|fortura-[\w-]+|CJYD|CJLY|CJLX"
                    r"|CJ[A-Z]{2}\d|LX[-A-Z0-9]+|\d{6,}_\d+|SET-[\w-]+|TRANSFER-[\w-]+)", re.I)

def norm(t):
    t = unicodedata.normalize("NFKD", (t or "").lower())
    t = t.replace("ä","ae").replace("ö","oe").replace("ü","ue").replace("ß","ss")
    return re.sub(r"[^a-z0-9]+", " ", t).strip()

def bildpfad(url):
    return (url or "").split("?")[0].rsplit("/", 1)[-1]

# ---------------------------------------------------------------- Sammeln
prod, medien, varianten, kanaele = {}, defaultdict(list), defaultdict(list), defaultdict(list)
befund = defaultdict(list)
gesamt = 0

with open(EXPORT, encoding="utf-8") as f:
    for zeile in f:
        try: o = json.loads(zeile)
        except Exception: continue
        pid = o.get("__parentId")
        if pid is None:
            if str(o.get("id","")).startswith("gid://shopify/Product/"):
                prod[o["id"]] = o; gesamt += 1
            continue
        if "publication" in o: kanaele[pid].append(o)
        elif "price" in o:     varianten[pid].append(o)
        elif "mediaContentType" in o or "image" in o: medien[pid].append(o)

sys.stderr.write(f"gelesen: {gesamt} Produkte, {sum(map(len,varianten.values()))} Varianten\n")

# ---------------------------------------------------------------- Prüfen
titel_gruppe, bild_gruppe, sku_gruppe = defaultdict(list), defaultdict(list), defaultdict(list)

for pid, p in prod.items():
    h, t = p.get("handle",""), p.get("title","") or ""
    tags = [x.lower() for x in (p.get("tags") or [])]
    txt = p.get("descriptionHtml") or ""
    vs, ms = varianten.get(pid, []), medien.get(pid, [])
    kn = {k["publication"]["name"]: k.get("isPublished") for k in kanaele.get(pid, [])}
    def add(klasse, extra=""):
        befund[klasse].append(f"{h}\t{t[:70]}\t{extra}")

    # --- A Kaufbarkeit
    skus = [(v.get("sku") or "").strip() for v in vs]
    if not any(skus) or not any(SKU_OK.match(s) for s in skus if s):
        add("A1 keine gültige Lieferanten-SKU", skus[0] if skus else "-")
    preise = [float(v.get("price") or 0) for v in vs]
    if not preise or max(preise) <= 0:
        add("A2 kein Preis")
    for v in vs:
        c = (v.get("inventoryItem") or {}).get("unitCost") or {}
        try: cost, pr = float(c.get("amount") or 0), float(v.get("price") or 0)
        except Exception: continue
        if cost > 0 and pr > 0 and pr < cost:
            add("A3 Preis unter Einstand", f"VK {pr:.2f} < EK {cost:.2f}"); break
    bilder = [m for m in ms if (m.get("image") or {}).get("url")]
    if not bilder:
        add("A4 kein Bild")
    else:
        gross = [b for b in bilder if min(b["image"].get("width") or 0, b["image"].get("height") or 0) >= 500]
        if not gross:
            b = bilder[0]["image"]
            add("A5 alle Bilder zu klein", f'{b.get("width")}x{b.get("height")}')
    if any(m.get("status") == "FAILED" for m in ms):
        add("A6 Bild im Status FAILED")

    # --- B Recht / Kanalrisiko
    bei_google = kn.get("Google & YouTube") or kn.get("Google &amp; YouTube")
    if WIRKVERSPRECHEN.search(t): add("B1 Wirkversprechen im Titel", "GOOGLE" if bei_google else "")
    if MEDIZIN.search(t):         add("B2 Medizin-/Messaussage im Titel", "GOOGLE" if bei_google else "")
    if ist_klinge(t) and bei_google: add("B3 Klinge im Google-Kanal")
    m = MARKEN.search(t)
    if m and not MARKE_OK.search(t): add("B4 fremde Marke im Titel", m.group(0))
    if ESZETT.search(t) or ESZETT.search(txt[:4000]): add("B5 ß statt ss")

    # --- C Text / Kundenerlebnis
    if len(vs) == 1 and WAHL.search(txt) and not SET_INHALT.search(txt):
        add("C1 Auswahl versprochen, 1 Variante")
    mc = CODE_TITEL.search(t)
    if mc and not CODE_OK.search(t): add("C2 Code im Titel", mc.group(0))
    if len(ENG_WORT.findall(t)) >= 2: add("C3 Titel wirkt englisch")
    if SIE_FORM.search(txt): add("C4 Sie-Form im Text")
    if ALT_VERSAND.search(txt): add("C5 alte Versand-/Preiszusage im Text")
    if TRUST_ALT.search(txt): add("C6 «Geprüfte Qualität» im Text")
    if len(DETAILS_DOPPELT.findall(txt)) > 1: add("C7 «Produktdetails» doppelt")
    if not (p.get("seo") or {}).get("description"): add("C8 keine SEO-Beschreibung")
    for v in vs:
        for so in (v.get("selectedOptions") or []):
            val = (so.get("value") or "")
            if re.match(r"^[A-Z]{2}\d{3,}", val) or re.search(r"\d+\s*style$", val, re.I):
                add("C9 Lieferantencode im Variantenwert", f'{so.get("name")}: {val}'); break
        else: continue
        break

    # --- D Struktur
    if kn.get("Online Store") and bei_google is False:
        add("D1 im Shop, nicht bei Google")
    titel_gruppe[norm(t)].append(h)
    if bilder: bild_gruppe[bildpfad(bilder[0]["image"]["url"])].append(h)
    for s in skus:
        if s and SKU_OK.match(s): sku_gruppe[s].append(h)

for name, gruppe in (("D2 gleicher Titel", titel_gruppe), ("D3 gleiches Hauptbild", bild_gruppe),
                     ("D4 gleiche SKU", sku_gruppe)):
    for k, hs in gruppe.items():
        if len(hs) > 1 and k:
            befund[name].append(f"{k[:60]}\t{len(hs)}×\t{', '.join(hs[:3])}")

# ---------------------------------------------------------------- Bericht
zeilen = [f"# Voll-Audit über {gesamt} aktive Produkte", "",
          "Erzeugt von `automation/voll_audit.py` aus einem frischen Bulk-Export. **Meldet nur.**",
          "Ein breites Suchmuster ist ein Netz, kein Urteil — jede Klasse gehört gelesen, bevor sie",
          "repariert wird.", "", "| Klasse | Treffer | Anteil |", "|---|---:|---:|"]
for k in sorted(befund, key=lambda x: -len(befund[x])):
    zeilen.append(f"| {k} | {len(befund[k])} | {len(befund[k])*100/max(gesamt,1):.1f} % |")
zeilen.append("")
for k in sorted(befund, key=lambda x: -len(befund[x])):
    zeilen += [f"## {k} — {len(befund[k])}", "```"] + befund[k][:BEISPIELE] + ["```", ""]
os.makedirs(os.path.dirname(BERICHT), exist_ok=True)
open(BERICHT, "w", encoding="utf-8").write("\n".join(zeilen) + "\n")
for k in sorted(befund, key=lambda x: -len(befund[x])):
    print(f"{len(befund[k]):7d}  {k}")
print(f"\nBericht: {BERICHT}  ({gesamt} Produkte geprüft)")
