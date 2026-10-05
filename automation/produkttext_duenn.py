#!/usr/bin/env python3
"""produkttext_duenn.py — schreibt dünne Produkttexte (< 40 Wörter) sachlich neu (04.10.2026, Betreiber «fix 12 h lang alles»).

ANLASS: seo_voll_audit.py meldete 118 aktive Produkte mit < 40 Wörtern Text — alle CJ-Importe, alle mit der Importer-
Schablone «Das zeichnet es aus» (Floskel-Liste: «Vielfältige Grössen», «Aus hochwertigen Materialien», bei Raucherware
«Robuste Qualität für Geniesser»). Gemessen 04.10. 23:10 UTC: 118/118 ACTIVE, 0 mit Lieferzeit-Block, 117 mit Schablone.

FAKTEN kommen NUR aus: Titel · Optionen/Varianten · Varianten-Gewicht (Shopify inventoryItem, stammt aus CJ) · Sätze und
«Schlüssel: Wert»-Zeilen des alten Texts (vom Import) · den Bildern (Vision-Modell: Objekt, Farben, sichtbare Merkmale, Anzahl —
KEINE Materialien, KEINE Masse geschätzt) · CJ-Produktdaten (product/query?pid=; Varianten-SKU → variant/query?productSku=,
Stamm-Regel aus cj_kosten_backfill). Fehlt CJ (Tageskontingent 16900500, 04.10. 124'890/124'890 verbraucht), schreibt der
Lauf trotzdem — aus den übrigen Quellen; CJ-Daten wandern in den Faktenblock, sobald der Wächter sie am Folgetag bekommt.

TORE vor dem Schreiben (jedes verwirft den Entwurf, 2 Wiederholungen mit Fehlermeldung an das Modell):
  80–150 Wörter · du-Form (Sie/Ihr nur mitten im Satz gezählt) · ss statt ß (automatisch) · Floskel-Liste · Heilversprechen
  (heilversprechen.ist_heilaussage + Wirkwort-Liste) · JEDE Zahl muss in den Quellen stehen · JEDES Materialwort muss in den
  Quellen stehen · kein Englisch · keine Liefer-/Preis-/Rückgabe-Aussage im Fliesstext (Lieferzeit-Block bleibt zuständig) ·
  Raucherware: kein «Geniesser/Genuss/Aroma/entspannt» · Bild-Urteil «passt nicht zum Titel» → NICHT schreiben, Liste
  dropship/_duenne_texte_titel_pruefen.txt (Kanarienvogel 04.10.: «Pflegepuppe fürs Schlafzimmer» ist bei CJ ein
  Plüsch-Hähnchenschenkel-Kissen) · CJ 1602002 «removed from shelves» → DRAFT + Tags cj-entfernt/cj-entfernt-<datum>
  (gleiche Regel wie cj_ausgelistet_sichtbar.py), kein Text.

ERHALTEN bleibt: <p class="ls-liefer">, <div class="ls-produktdetails"> (Faktenblock), Sorglos-Kasten, «📦 …»-Zeile, jede
unbekannte <div>. Ersetzt wird: einleitende <p>, <p><strong>Titel</strong></p>, der Block «Das zeichnet … aus» (seine
sachlichen Zeilen fliessen als Quelle in den neuen Text/Faktenblock).

Ledger (Altwerte, Rücklesen): dropship/_duenne_texte_ledger.tsv (handle · woerter_alt · woerter_neu · quelle · alt_html · neu_html).
  python3 automation/produkttext_duenn.py                 trocken (Standard), zeigt Entwürfe
  SCHARF=1 LIMIT=40 python3 automation/produkttext_duenn.py
  HANDLES_FILE=/pfad/liste.txt                           statt /tmp/seo_voll_audit.json (text_duenn)
Modelle: Text openai/gpt-oss-20b (Massenlauf-Modell, Lehre 02.10.), Bild meta-llama/llama-4-scout-17b-16e-instruct — damit das
Bestell-Bildvergleich-Modell (qwen) sein Kontingent behält. Tageskontingent leer → Lauf endet ohne Quittung (zweitmodell.TagesKontingentLeer).
"""
import html as H
import io
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
os.environ.setdefault("GROQ_MODELL", "openai/gpt-oss-20b")
os.environ.setdefault("GROQ_AUSWEICH", "")
os.environ.setdefault("GROQ_MODELL_BILD", "meta-llama/llama-4-scout-17b-16e-instruct")
import zweitmodell as zm  # noqa: E402  (Schlüssel-Rotation, TagesKontingentLeer)
from eimer_etikette import nachlauf  # noqa: E402

# Gemessen 04.10. 23:30 UTC an api.groq.com/v1/models: Text nur openai/gpt-oss-20b + 120b, Bild nur qwen/qwen3.8-27b
# (llama-3.3/llama-4 → 404). gpt-oss-20b im JSON-Modus ohne reasoning_effort → «json_validate_failed» mit leerer
# Generation; mit reasoning_effort=low antwortet es, schreibt aber «fuer/Ausfuehrung» (ue-Umschrift) → Tor UMSCHRIFT.
# Reasoning-Tokens zählen in max_completion_tokens: medium + 1500 → «max completion tokens reached» (120b, 04.10.) → low + 3000.
TEXT_MODELLE = [m for m in os.environ.get("TEXT_MODELLE", "openai/gpt-oss-20b,openai/gpt-oss-120b").split(",") if m]
BILD_MODELL = os.environ.get("BILD_MODELL", "qwen/qwen3.8-27b")
USAGE = {"text": 0, "bild": 0, "aufrufe": 0}
TOT = {}          # (modell, schlüssel-index) → Zeit, ab der wieder probiert wird (Tageslimit ist bei Groq ein ROLLENDES Fenster:
                  # key2 gpt-oss-20b 199'668/200'000 «try again in 31 s», gemessen 04.10. 23:58 UTC)
LETZTES = {"modell": ""}


def groq(prompt, bilder=None, modelle=None, effort="low", max_tokens=3000):
    """JSON-Antwort von Groq; Schlüssel-Rotation nur beim Tageslimit (wie zweitmodell), Modellkette bei 400/404/429."""
    import base64, urllib.error
    modelle = modelle or ([BILD_MODELL] if bilder else TEXT_MODELLE)
    inhalt = prompt if not bilder else [{"type": "text", "text": prompt}] + [
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(b).decode()}} for b in bilder]
    ks = zm.groq_schluessel()
    if not ks:
        raise RuntimeError("GROQ_API_KEY fehlt")
    letzter, tageslimit = "", set()
    for modell in modelle:
        body = {"model": modell, "temperature": 0, "messages": [{"role": "user", "content": inhalt}],
                "response_format": {"type": "json_object"}, "max_completion_tokens": max_tokens}
        if modell.startswith("openai/gpt-oss"):
            body["reasoning_effort"] = effort
        weiter = True                                    # False = dieses Modell aufgeben (400/404/413)
        for ki, k in enumerate(ks):
            if not weiter:
                break
            if TOT.get((modell, ki), 0) > time.time():
                tageslimit.add((modell, ki)); continue
            for a in range(3):
                try:
                    r = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=json.dumps(body).encode(),
                                               headers={"Content-Type": "application/json", "Authorization": "Bearer " + k,
                                                        "User-Agent": "luxestyle-produkttext/1"})
                    j = json.load(urllib.request.urlopen(r, timeout=120))
                    USAGE["bild" if bilder else "text"] += int((j.get("usage") or {}).get("total_tokens") or 0); USAGE["aufrufe"] += 1
                    LETZTES["modell"] = modell
                    return json.loads(re.search(r"\{.*\}", j["choices"][0]["message"]["content"], re.S).group(0))
                except urllib.error.HTTPError as e:
                    letzter = f"{modell} HTTP {e.code}: {e.read()[:300].decode('utf-8', 'replace')}"
                    if e.code in (400, 404, 413):
                        weiter = False; break                 # Modell/Anfrage passt nicht → nächstes Modell
                    if e.code == 429:
                        m = re.search(r"try again in (?:(\d+)m)?([\d.]+)(ms|s)", letzter)
                        warte = (int(m.group(1) or 0) * 60 + float(m.group(2)) / (1000 if m.group(3) == "ms" else 1)) if m else 30
                        if "per day" in letzter or warte > 180:
                            tageslimit.add((modell, ki)); TOT[(modell, ki)] = time.time() + min(900, warte); break   # Tageslimit → nächster Schlüssel
                        time.sleep(min(90, warte + 1)); continue
                    time.sleep(10 * (a + 1))
                except Exception as e:
                    letzter = f"{modell} {type(e).__name__}: {str(e)[:120]}"; time.sleep(5 * (a + 1))
    if tageslimit and len({m for m, _ in tageslimit}) == len(modelle):
        raise zm.TagesKontingentLeer("Groq-Tageskontingent leer — " + letzter[:160])
    raise RuntimeError("Groq ohne Antwort — " + letzter)

try:
    from heilversprechen import ist_heilaussage  # noqa: E402
except Exception:                                 # Token-Datei fehlt im frischen Container → eigene Liste genügt
    def ist_heilaussage(s): return False

SCHARF = os.environ.get("SCHARF") == "1"
LIMIT = int(os.environ.get("LIMIT", "40"))
SHOP = "au3j0y-hq.myshopify.com"
HEUTE = time.strftime("%Y-%m-%d", time.gmtime())
LEDGER = os.path.join(REPO, "dropship", "_duenne_texte_ledger.tsv")
TITEL_PRUEFEN = os.path.join(REPO, "dropship", "_duenne_texte_titel_pruefen.txt")
CJ_CACHE = "/tmp/produkttext_duenn_cj.json"
# URTEILE_FILE: JSON {handle: {"objekt","farben","merkmale","anzahl_teile","passt_zum_titel","grund"}} — Bild-Urteile aus dem
# Kontaktbogen (Regel 5), gemessen 04.10.: qwen-TPD 200'000 je Org, EIN Bild = 2'143 Tokens → 118 Produkte sprengen den Tag.
URTEILE = json.load(open(os.environ["URTEILE_FILE"])) if os.environ.get("URTEILE_FILE") else {}
BILD_AUS = os.environ.get("BILD_AUS") == "1"
_bild_tot = {"ja": False}
AUDIT = "/tmp/seo_voll_audit.json"
MIN_W, MAX_W = 80, 150

FLOSKEL = re.compile(r"\b(hochwertig\w*|perfekt\w*|ideal\w*|sorgt\s+für|sorgen\s+für|einzigartig\w*|exklusiv\w*|luxuri[öo]s\w*|"
                     r"premium|unverzichtbar\w*|highlight\w*|must-?have|hervorragend\w*|optimal\w*|erstklassig\w*|traumhaft\w*|"
                     r"wundersch[öo]n\w*|stilvoll\w*|elegant\w*|trendig\w*|zeitlos\w*|raffiniert\w*|begeister\w*|"
                     r"verleiht|unterstreicht|Blickfang|Statement|Eyecatcher|langlebig\w*|robust\w*|zuverl[äa]ssig\w*|"
                     r"garantiert|Garantie|zertifiziert|gepr[üu]ft\w*|original\w*|Qualit[äa]t\w*|professionell\w*)\b", re.I)
# Gemessen Trockenlauf 04.10.: «edel\w*» traf «Edelstahl» (Kanarienvogel) → eigener Ausschluss, nicht in der Floskel-Liste.
EDEL = re.compile(r"\bedel(?!stahl|stein|metall)\w*", re.I)
# Trockenlauf 2 (05.10. 00:10): «Bild\w*» traf «bilden», «erhältlich» und «Angebot» sind normale Wörter → enger gefasst.
META = re.compile(r"\b(Bild|Bilder|Bildes|Bildern|Foto|Fotos|abgebildete?[nmrs]?|dargestellte?[nmrs]?|laut|Kategorie\w*|Quelle\w*|CJ|Home Storage)\b")
WAHL = re.compile(r"\b(w[äa]hl\w*|Auswahl|Varianten?)\b", re.I)
SIE = re.compile(r"(?<![.!?:»«\"]\s)(?<!^)\b(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b")
# Satzanfang «Sie können sie …» (Herz-Ohrringe, 05.10.) ist Sie-Form, obwohl «Sie» am Satzanfang auch «sie» (Mehrzahl) sein kann →
# nur mit typischem Anrede-Verb dahinter; ein Fehlalarm kostet einen Versuch, nicht mehr.
SIE_ANFANG = re.compile(r"(?:^|[.!?]\s+)Sie\s+(k[öo]nnen|erhalten|bekommen|finden|w[äa]hlen|sollten|m[üu]ssen|d[üu]rfen|haben|tragen|nutzen|verwenden|brauchen)\b")
CODE = re.compile(r"\b(Style|Pattern|Type|Typ|Muster)\s*\d|\d\s*-\s*\d\s*(pair|Paar|pcs|Stk)\b", re.I)
SYNONYM = {"velours": "samt", "velvet": "samt", "suede": "wildleder", "dacron": "polyester", "vinylon": "kunstfaser polyester", "resin": "harz",
           "cubic zirconia": "zirkonia", "zirkon": "zirkonia", "alloy": "legierung metall", "pu": "kunstleder pu", "plush": "plüsch", "knitted": "strick",
           "cotton": "baumwolle", "polyester": "polyester", "spandex": "elasthan", "edelstahl": "stahl metall", "kupfer": "kupfer metall", "messing": "metall",
           "zinklegierung": "zink legierung metall", "titanstahl": "titan stahl metall", "silikon": "silikon", "glas": "glas", "keramik": "keramik"}
WIRK = re.compile(r"\b(lindert|lindern|heilt|heilen|therap\w*|entgift\w*|straff\w*|Cellulite|Durchblutung|Schmerz\w*|"
                  r"Migr[äa]ne|Stress|Entz[üu]ndung\w*|Akne|Pigment\w*|Anti-?Aging|Anti-?Falten|verj[üu]ng\w*|medizinisch\w*|klinisch\w*|"
                  r"gesund\w*|Gesundheit|Heilung|Krankheit\w*|Symptom\w*|regenerier\w*|Kollagen|Hautbild|Poren|Augenringe|"
                  r"Verspannung\w*|Muskelkater|Blutdruck|Immun\w*|beruhig\w*|entspann\w*|wohltuend|Wellness|Heilwirkung|"
                  r"(?:f[öo]rdert|verbessert|reduziert|st[äa]rkt|unterst[üu]tzt)\s+(?:die|das|den|deine?n?|ihre?n?)?\s*(?:Haut\w*|Durchblutung|Schlaf|Gesundheit|"
                  r"Immunsystem|Stoffwechsel|Heilung|Konzentration|Wohlbefinden|Haar\w*|Stimmung|Atmung|Haltung|Muskel\w*|Gelenk\w*|Augen|Sehkraft)|"
                  r"sch[üu]tzt vor UV|UV-?Schutz|UPF|SPF|LSF|wasserdicht|wasserfest|"
                  r"schlagfest|kratzfest|bruchsicher|feuerfest|hitzebest[äa]ndig)\b", re.I)
UMSCHRIFT = re.compile(r"\b(fuer|ueber|groesse\w*|ausfuehrung\w*|moeglich\w*|schoen\w*|koenn\w*|waehl\w*|waerme|kueche|tuer\w*|buero|stueck\w*|"
                       r"zubehoer|gruen\w*|oel\w*|haelt|traeg\w*|laess\w*|faellt|aermel|naehe|hoehe|laenge|gefuehl|muede|fruehling|kaelte|"
                       r"\w*(?<!q)[bcdfghklmnprstvwxz](?:ae|oe|ue)[bcdfghklmnprstvwxz]\w*)\b", re.I)
UMSCHRIFT_OK = re.compile(r"uell|uett|uenz|aero|poes|israel|michael|duo|statue|aktue|manue|visue|eventue|individue|punktue|rituel|virtue|textue|sexue|kontinue|soue", re.I)
# Scharflauf 05.10. 00:13: «reduziert Fingerabdrücke» (Schutzglas) fiel 5× am Wirkwort-Tor → generische Verben nur noch mit Körper-/Gesundheits-Objekt.
# Trockenlauf 3 (05.10. 00:15, gpt-oss-120b): «misst etwa einen Zentimeter» (Zahl als WORT umging das Ziffern-Tor), «luftdicht»,
# «lässt sich einfach reinigen», «passt auf ein Standard-Kissen» — Eigenschaften, die keine Quelle nennt → zwei weitere Tore.
ZAHLWORT = re.compile(r"\b(ein(?:en|e|em|er|es)?|zwei|drei|vier|f[üu]nf|sechs|sieben|acht|neun|zehn|elf|zw[öo]lf|zwanzig|dreissig|vierzig|f[üu]nfzig|hundert|"
                      r"etwa|ca\.?|ungef[äa]hr|rund|knapp)\s+(Zentimeter\w*|Millimeter\w*|Meter\w*|Gramm|Kilo\w*|Liter\w*|Milliliter\w*|Zoll|Watt|Volt|Stunden?|Minuten?|Prozent|cm|mm|g|kg|ml|l|W|V)\b", re.I)
ANSPRUCH = re.compile(r"\b(luftdicht|wasserdicht|wasserabweisend|sp[üu]lmaschinen\w*|waschmaschinen\w*|bruchsicher|rostfrei|hitzebest[äa]ndig|BPA\w*|"
                      r"allergiker\w*|nickelfrei|hypoallergen|antibakteriell|lebensmittelecht|kratzfest|stossfest|sto[ßs]fest|leicht zu reinigen|"
                      r"einfach zu reinigen|pflegeleicht|waschbar|b[üu]gelfrei|atmungsaktiv|rutschfest|auslaufsicher|ergonomisch|faltbar|zusammenklappbar|"
                      r"verstellbar|abnehmbar|wiederverwendbar|recycl\w*|vegan|bio|handgefertigt|handgemacht|Standard-?\w*|universell|kompatibel\w*|passt (?:auf|zu|in) \w+)\b", re.I)
# Stichprobe 10 vom Scharflauf (05.10. 00:00): «aus Rubber gefertigt», «als Studs konzipiert», «Wallet», «Stroller», «casuales» —
# englische Restwörter aus Import-Text und CJ-Daten → Liste erweitert; «passend für.» als Satzende → Tor SATZENDE.
ENGLISCH = re.compile(r"\b(the|and|with|for|your|of|is|are|this|that|high|quality|made|from|free|rubber|steel|plated|cotton|leather|wood|silver|"
                      r"zinc|alloy|stainless|plastic|studs?|strap|casual\w*|wallet|stroller|cloth|fabric|size|color|colour|style|pattern|"
                      r"light|night|fast|charging|pair|pcs|set of|bag|case|cover|holder)\b", re.I)
SATZENDE = re.compile(r"\b(f[üu]r|und|oder|mit|zu|zum|zur|von|der|die|das|den|dem|des|auf|in|im|an|am|bei|aus|ein|eine|einen|einem|einer|sowie|als|wie|"
                      r"durch|ohne|gegen|nach|vor|[üu]ber|unter|leicht|gut|sehr)[.!?]?$", re.I)
VERSAND = re.compile(r"\b(Lieferung|Lieferzeit|Versand\w*|Werktag\w*|R[üu]ckgabe|R[üu]cksend\w*|CHF|Fr\.|Preis\w*|Rabatt\w*|"
                     r"bestell\w*|kauf\w*|Warenkorb|Aktion|g[üu]nstig\w*|Schweiz\w*|Shop|LuxeStyle|Lager\w*|sofort|lieferbar)\b", re.I)
RAUCH_VERBOT = re.compile(r"Genie?ss\w*|Genuss\w*|Aroma\w*|entspann\w*|gem[üu]tlich\w*|Ritual|Lifestyle|cool\w*|stylisch\w*", re.I)
MATERIALIEN = ["Baumwolle", "Baumwoll", "Polyester", "Edelstahl", "Metall", "Kunststoff", "Glas", "Keramik", "Holz", "Leder",
               "Kunstleder", "PU", "Silikon", "Samt", "Velours", "Nylon", "Acryl", "Kupfer", "Messing", "Zink", "Legierung", "Harz",
               "Resin", "Bambus", "Stahl", "Titan", "Silber", "Gold", "vergoldet", "versilbert", "Zirkonia", "Kristall", "Perle",
               "Plüsch", "Spandex", "Elasthan", "Chiffon", "Spitze", "Denim", "Wolle", "Seide", "Leinen", "Papier", "Gummi", "Latex",
               "Schaum", "PP", "PVC", "ABS", "TPU", "EVA", "Aluminium", "Eisen", "Stein", "Marmor", "Kork", "Rattan", "Filz", "Mesh",
               "Viskose", "Strick", "Fleece", "Suede", "Wildleder", "Rindsleder", "Rindleder", "Dacron", "Vinylon", "Kaschmir",
               "Mikrofaser", "Canvas", "Jute", "Porzellan", "Emaille", "Carbon", "Diamant", "Edelstein", "Malachit", "Jade", "Opal",
               "Bernstein", "Achat", "Quarz", "Vlies", "Nonwoven", "Oxford", "Flanell", "Kunstfell", "Fell", "Daunen", "Federn",
               "Teflon", "Antihaft", "Granit", "Gusseisen", "Zinn", "Bronze", "Chrom", "Nickel", "Lithium", "Nickel-Metallhydrid"]
MAT_RE = re.compile(r"\b(" + "|".join(sorted(map(re.escape, MATERIALIEN), key=len, reverse=True)) + r")\w*", re.I)
MAT_DE = {"plastic": "Kunststoff", "metal": "Metall", "glass": "Glas", "stainless steel": "Edelstahl", "cotton": "Baumwolle",
          "polyester": "Polyester", "polyester fiber": "Polyester", "wood": "Holz", "ceramic": "Keramik", "silicone": "Silikon",
          "silica gel": "Silikon", "leather": "Leder", "pu leather": "PU-Leder", "pu": "PU-Leder", "alloy": "Metall-Legierung",
          "zinc alloy": "Zinklegierung", "copper": "Kupfer", "acrylic": "Acryl", "nylon": "Nylon", "canvas": "Canvas", "latex": "Latex",
          "resin": "Harz", "bamboo": "Bambus", "linen": "Leinen", "velvet": "Samt", "tpu": "TPU", "abs": "ABS-Kunststoff", "pvc": "PVC",
          "sponge": "Schaumstoff", "iron": "Eisen", "rubber": "Gummi", "paper": "Papier", "crystal": "Kristall", "pearl": "Perle",
          "zircon": "Zirkonia", "flannel": "Flanell", "oxford cloth": "Oxford-Gewebe", "oxford": "Oxford-Gewebe", "spandex": "Elasthan",
          "silk": "Seide", "wool": "Wolle", "aluminum": "Aluminium", "aluminium": "Aluminium", "aluminum alloy": "Aluminium-Legierung",
          "carbon fiber": "Carbon", "eva": "EVA-Schaum", "pp": "Polypropylen", "pet": "PET", "lace": "Spitze", "denim": "Denim",
          "chiffon": "Chiffon", "cashmere": "Kaschmir", "stainless": "Edelstahl", "titanium steel": "Titanstahl", "titanium": "Titan",
          "brass": "Messing", "925 silver": "925er Silber", "sterling silver": "925er Silber", "plush": "Plüsch", "fleece": "Fleece",
          "faux fur": "Kunstfell", "microfiber": "Mikrofaser", "polyurethane": "PU", "tempered glass": "Gehärtetes Glas", "stone": "Stein",
          "marble": "Marmor", "cork": "Kork", "rattan": "Rattan", "jute": "Jute", "felt": "Filz", "mesh": "Mesh-Gewebe", "knitted": "Strick",
          "viscose": "Viskose", "pp cotton": "PP-Baumwolle (Füllung)", "short plush": "Kurzplüsch"}

Q = """query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status tags descriptionHtml
  options{name values} variants(first:30){nodes{sku title price selectedOptions{name value} inventoryItem{measurement{weight{value unit}}}}}
  media(first:6){nodes{ ... on MediaImage{ image{url} } } } } }"""


def tok():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(HERE, "shop_token_refresh.sh")], capture_output=True)
    return open(p).read().strip()


TOK = tok()


def gql(q, v=None):
    grund = ""
    for i in range(8):
        try:
            r = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
                                       data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(r, timeout=60))
        except Exception as e:
            grund = f"{type(e).__name__}: {e}"[:100]; time.sleep(3 + i); continue
        errs = d.get("errors") or []
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in errs):
            ts = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
            time.sleep(min(20, max(2, (600 - float(ts.get("currentlyAvailable") or 0)) / float(ts.get("restoreRate") or 50) + 1)))
            grund = "gedrosselt"; continue
        if errs:
            grund = str(errs)[:120]; time.sleep(2); continue
        nachlauf(d)
        return d["data"]
    raise RuntimeError("Shopify antwortet nicht — " + grund)


def strip(h):
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", h or ""))).strip()


def woerter(s):
    return len(strip(s).split())


# ---------------------------------------------------------------- CJ
def cj_holen(sku):
    cache = json.load(open(CJ_CACHE)) if os.path.exists(CJ_CACHE) else {}
    if sku in cache and cache[sku].get("code") in (200, 1602002):
        return cache[sku]
    try:
        from cj_versand_ch_guard import cj
    except Exception as e:
        return {"code": 0, "msg": f"cj-helfer fehlt: {e}"[:80], "data": None}
    def frage(pfad):
        c, d, m = cj(pfad)
        return int(c or 0), d, m
    ergebnis = {"code": 0, "msg": "", "data": None}
    mPid = re.match(r"^CJ-(\d{10,}|[0-9A-F]{8}-[0-9A-F-]{20,})$", sku, re.I)
    mVar = re.match(r"^(?:CJ-)?(CJ[A-Z]{2}[0-9A-Z]{4,}?)(?:-.*)?$", sku, re.I)
    if mPid:
        c, d, m = frage(f"/product/query?pid={mPid.group(1)}"); ergebnis = {"code": c, "msg": m, "data": d}
    elif mVar:
        v = mVar.group(1)
        c, d, m = frage(f"/product/variant/query?productSku={v}")
        pid = None
        if c == 200 and d:
            pid = (d[0] if isinstance(d, list) else d).get("pid")
        if not pid and c != 16900500:
            st = re.match(r"^(.*[0-9])\d{2}[A-Z]{2}$", v, re.I)
            if st:
                c, d, m = frage(f"/product/variant/query?productSku={st.group(1)}")
                if c == 200 and d:
                    pid = (d[0] if isinstance(d, list) else d).get("pid")
                if not pid and c != 16900500:
                    c, d, m = frage(f"/product/query?productSku={st.group(1)}")
                    if c == 200 and d:
                        ergebnis = {"code": c, "msg": m, "data": d}
        if pid:
            c, d, m = frage(f"/product/query?pid={pid}"); ergebnis = {"code": c, "msg": m, "data": d}
        elif ergebnis["code"] != 200:
            ergebnis = {"code": c, "msg": m, "data": None}
    if isinstance(ergebnis.get("data"), dict):
        ergebnis["data"].pop("productImageSet", None)
    if ergebnis["code"] == 0 and "removed from shelves" in (ergebnis.get("msg") or ""):
        ergebnis["code"] = 1602002
    cache[sku] = ergebnis
    json.dump(cache, open(CJ_CACHE, "w"), ensure_ascii=False)
    return ergebnis


def cj_fakten(d):
    """Belegte Werte aus CJ: Material (nur übersetzt), Gewicht, «key: value»-Zeilen mit Ziffer, Varianten-Schlüssel, Packung."""
    f, rows = [], []
    if not isinstance(d, dict):
        return f, rows
    if d.get("productNameEn"):
        f.append("CJ-Produktname (englisch): " + str(d["productNameEn"])[:120])
    mats = [MAT_DE.get(str(m).lower().strip()) for m in (d.get("materialNameEnSet") or d.get("materialNameEn") or [])]
    mats = [m for m in mats if m]
    if mats:
        f.append("Material (CJ): " + ", ".join(dict.fromkeys(mats))); rows.append(("Material", ", ".join(dict.fromkeys(mats))))
    try:
        g = float(d.get("productWeight") or 0)
        if g > 0:
            rows.append(("Gewicht", f"{int(round(g))} g" if g < 1000 else f"{g/1000:.1f} kg"))
    except (TypeError, ValueError):
        pass
    desc = re.sub(r"<br\s*/?>|</(p|li|div|tr)>", "\n", str(d.get("description") or ""), flags=re.I)
    desc = H.unescape(re.sub(r"<[^>]+>", " ", desc))
    for z in desc.split("\n"):
        z = re.sub(r"\s+", " ", z).strip()
        m = re.match(r"^([A-Za-z][A-Za-z /]{2,24})\s*[:：]\s*(.{2,120})$", z)
        if m and re.search(r"\d", m.group(2)) and not re.search(r"[一-鿿]", z):
            f.append("CJ-Beschreibung: " + z[:160])
    keys = [str(v.get("variantKey") or "") for v in (d.get("variants") or [])][:12]
    keys = [k for k in keys if k and not re.search(r"[一-鿿]", k)]
    if keys:
        f.append("CJ-Varianten: " + " | ".join(dict.fromkeys(keys)))
    return f, rows


# ---------------------------------------------------------------- Bilder
def bild_bytes(url, px=384):
    try:
        from PIL import Image
        r = urllib.request.Request(url, headers={"User-Agent": "luxestyle-text/1"})
        b = urllib.request.urlopen(r, timeout=30).read()
        im = Image.open(io.BytesIO(b)).convert("RGB"); im.thumbnail((px, px))
        out = io.BytesIO(); im.save(out, "JPEG", quality=80); return out.getvalue()
    except Exception:
        return None


def bild_urteil(titel, urls, handle=None):
    if handle and handle in URTEILE:
        return URTEILE[handle]
    if BILD_AUS or _bild_tot["ja"]:
        return None
    bilder = [b for b in (bild_bytes(u) for u in urls[:1]) if b]       # 1 Bild à 384 px — qwen ist das Bestell-Bildvergleich-Modell, Kontingent schonen
    if not bilder:
        return None
    prompt = (f"Produktbilder eines Online-Shop-Artikels mit dem Titel «{titel}». Beschreibe NUR, was sichtbar ist. "
              "Antworte als JSON: {\"objekt\": \"<was zu sehen ist, 3–8 Wörter, deutsch>\", \"farben\": [\"…\"], "
              "\"merkmale\": [\"<nur sichtbare Merkmale: Form, Teile, Verschluss, Aufdruck, Muster, Anzahl — max. 6, deutsch>\"], "
              "\"anzahl_teile\": <Zahl oder null>, \"passt_zum_titel\": true/false, \"grund\": \"<ein Satz>\"}. "
              "Keine Materialien raten, keine Masse schätzen, keine Werbung.")
    try:
        u = groq(prompt, bilder, max_tokens=1500)
        return u if isinstance(u, dict) else None
    except zm.TagesKontingentLeer as e:
        _bild_tot["ja"] = True                      # Bild-Modell für den Rest des Laufs aus; Text läuft weiter
        print(f"  Bild-Modell Tageskontingent leer → ohne Bild-Urteil weiter: {str(e)[:100]}", flush=True)
        return None
    except Exception as e:
        print(f"  Bild-Urteil fehlgeschlagen: {str(e)[:120]}", flush=True)
        return None


# ---------------------------------------------------------------- Quellen aus dem Produkt
SCHABLONE_LI = re.compile(r"hochwertig|Robuste Qualit|Praktisch|langlebig|Diskret|Chic|Vielf[äa]ltig|Design$|Qualit[äa]t|stylisch|"
                          r"elegant|modern|trendig|^Kalt$|Grossz[üu]gig", re.I)


def alt_quellen(p):
    alt = p["descriptionHtml"] or ""
    f, rows = [], []
    kern = re.sub(r'<p class="ls-liefer".*?</p>|<div class="ls-produktdetails".*?</div>\s*</div>|<div[^>]*>.*?</div>|<p>📦.*?</p>',
                  " ", alt, flags=re.S)
    kern = re.sub(r"<p>\s*<strong>[^<]*</strong>\s*</p>", " ", kern)
    for s in re.split(r"</p>|</li>|</h\d>", kern):
        s = strip(s)
        if not s or re.match(r"Das zeichnet", s):
            continue
        m = re.match(r"^(Material|Gr[öo]sse|Masse|Mass|Gewicht|Farbe|Länge|Breite|Höhe|Durchmesser|Inhalt|Lieferumfang)\s*:\s*(.+?)\.?$", s, re.I)
        if m:
            k = m.group(1).capitalize().replace("Grösse", "Masse").replace("Grösse", "Masse").replace("Mass", "Masse").replace("Massee", "Masse")
            rows.append((k, m.group(2).strip()))
        if SCHABLONE_LI.search(s) and len(s.split()) <= 4:
            continue
        if CODE.search(s):
            continue                                   # «Style 1-1 pair» aus dem Import ist keine Quelle für Prosa
        f.append("Alter Text: " + s[:200])
    return f, rows


def produkt_quellen(p, cjd, urteil):
    f, rows = [], []
    f.append("Titel: " + p["title"])
    for o in p["options"]:
        if o["name"] != "Title":
            werte = [w for w in o["values"] if re.fullmatch(r"[A-Za-zÄÖÜäöüéè\- ]{2,25}", w) and not re.search(r"\b(style|muster|pattern|typ|type|default)\b", w, re.I)]
            if werte:
                f.append(f"Option {o['name']}: " + ", ".join(werte[:20]))
            else:                                        # «Style 1-1 Paar» (04.10., Herz-Ohrringe) — Codes gehören nicht in den Text
                f.append(f"Option {o['name']}: mehrere Ausführungen (Werte nicht nennen)")
    vs = p["variants"]["nodes"]
    if len(vs) == 1 and vs[0]["title"] == "Default Title":
        f.append("Varianten: eine Ausführung (keine Auswahl)")
    gew = [((v.get("inventoryItem") or {}).get("measurement") or {}).get("weight") or {} for v in vs]
    gew = [float(g["value"]) for g in gew if g.get("unit") == "GRAMS" and g.get("value")]
    if gew and min(gew) > 0:
        g = int(round(min(gew))) if len(set(gew)) == 1 else None
        if g:                                             # nur Faktenblock — in der Prosa wurde «70 g» zur «70-g-Flasche» (Körperöl, 04.10.)
            rows.append(("Gewicht", f"{g} g" if g < 1000 else f"{g/1000:.1f} kg"))
    af, ar = alt_quellen(p); f += af; rows += ar
    cf, cr = cj_fakten(cjd); f += cf
    for r in cr:
        if r[0] not in {x[0] for x in rows}:
            rows.append(r)
    if urteil:
        f.append("Bild zeigt: " + str(urteil.get("objekt") or ""))
        if urteil.get("farben"):
            f.append("Farben im Bild: " + ", ".join(map(str, urteil["farben"][:5])))
        if urteil.get("merkmale"):
            f.append("Sichtbare Merkmale: " + "; ".join(map(str, urteil["merkmale"][:6])))
        if urteil.get("anzahl_teile"):
            f.append(f"Anzahl Teile im Bild: {urteil['anzahl_teile']}")
    tags = set(t.lower() for t in p["tags"])
    rauch = bool(tags & {"raucher", "smoke-zubehoer", "18plus", "shisha", "tabak"}) or bool(re.search(r"Shisha|Aschenbecher|Zigar|Tabak|Grinder|Kohleanz", p["title"]))
    return f, rows, rauch


# ---------------------------------------------------------------- Schreiben + Tore
def quelle_text(f):
    q = " ".join(f).lower()
    for k, v in SYNONYM.items():
        if k in q:
            q += " " + v
    return q


def pruefen(absaetze, quellen, rauch, einzeln=False):
    t = " ".join(absaetze)
    fehler = []
    if EDEL.search(t):
        fehler.append("Floskel: " + EDEL.search(t).group(0))
    if META.search(t):
        fehler.append("Meta-Wort (nicht über Bild/Quelle/Kategorie schreiben): " + ", ".join(dict.fromkeys(m.group(0) for m in META.finditer(t))))
    if einzeln and WAHL.search(t):
        fehler.append("es gibt keine Auswahl — kein Satz über Wahl/Varianten/Ausführung: " + WAHL.search(t).group(0))
    n = len(t.split())
    if n < MIN_W:
        fehler.append(f"nur {n} Wörter — schreibe mindestens 90 Wörter (zwei Absätze à 45–60 Wörter)")
    elif n > MAX_W:
        fehler.append(f"{n} Wörter — höchstens {MAX_W}")
    if FLOSKEL.search(t):
        fehler.append("Floskel: " + ", ".join(dict.fromkeys(m.group(0) for m in FLOSKEL.finditer(t))))
    if SIE.search(t):
        fehler.append("Sie-Form: " + SIE.search(t).group(0))
    if SIE_ANFANG.search(t):
        fehler.append("Sie-Form (Anrede du!): " + SIE_ANFANG.search(t).group(0))
    if CODE.search(t):
        fehler.append("Varianten-Code gehört nicht in den Text: " + CODE.search(t).group(0))
    if ENGLISCH.search(t):
        fehler.append("Englisch: " + ENGLISCH.search(t).group(0))
    for a in absaetze:
        if not re.search(r"[.!?»\"]$", a.strip()) or SATZENDE.search(a.strip()):
            fehler.append("Absatz endet nicht mit einem vollständigen Satz: «…" + a.strip()[-40:] + "»")
    um = [m.group(0) for m in UMSCHRIFT.finditer(t) if not UMSCHRIFT_OK.search(m.group(0))]
    if um:
        fehler.append("Umschrift ae/oe/ue statt Umlaut: " + ", ".join(dict.fromkeys(um)))
    if VERSAND.search(t):
        fehler.append("Versand/Preis/Shop-Aussage: " + VERSAND.search(t).group(0))
    if WIRK.search(t):
        fehler.append("Wirk-/Heilaussage: " + WIRK.search(t).group(0))
    for s in re.split(r"(?<=[.!?])\s+", t):
        if ist_heilaussage(s):
            fehler.append("Heilversprechen: " + s[:60])
    if rauch and RAUCH_VERBOT.search(t):
        fehler.append("Raucherware-Werbewort: " + RAUCH_VERBOT.search(t).group(0))
    q = quelle_text(quellen)
    if ZAHLWORT.search(t):
        fehler.append("Masse/Mengen nur als Ziffern aus den Quellen, nicht als Wort oder Schätzung: " + ZAHLWORT.search(t).group(0))
    for m in ANSPRUCH.finditer(t):
        w = m.group(0).lower()
        if w.split()[0][:6] not in q:
            fehler.append(f"Eigenschaft «{m.group(0)}» steht in keiner Quelle")
    qz = set(re.findall(r"\d+(?:[.,]\d+)?", q))
    qz |= {z.replace(".", ",") for z in qz} | {z.replace(",", ".") for z in qz}
    for z in set(re.findall(r"\d+(?:[.,]\d+)?", t)):
        if z not in qz:
            fehler.append(f"Zahl {z} nicht in den Quellen")
    for m in MAT_RE.finditer(t):
        stamm = m.group(1).lower()
        if stamm not in q and stamm.rstrip("e") not in q:
            fehler.append(f"Material «{m.group(0)}» nicht in den Quellen")
    return fehler


def entwurf(titel, quellen, rauch, fehler=None, einzeln=False, modelle=None):
    regeln = (
        "Schreibe eine sachliche Produktbeschreibung für einen Schweizer Online-Shop. Sprache: Deutsch, Anrede «du», Schweizer "
        "Schreibweise mit «ss» (nie ß). Länge 80 bis 150 Wörter, zwei Absätze. NUR Fakten aus der Quellenliste unten — erfinde "
        "keine Masse, Materialien, Zahlen, Funktionen oder Zertifikate. Was die Quellen nicht sagen, lässt du weg. "
        "Verboten: Werbefloskeln (hochwertig, perfekt, ideal, einzigartig, elegant, stilvoll, robust, langlebig, Qualität, sorgt für), "
        "Wirk- oder Gesundheitsaussagen (lindert, entspannt, verbessert, schützt, fördert, Wellness, Gesundheit), Aussagen zu Lieferung, Preis, "
        "Rückgabe oder Shop, englische Wörter, Ausrufezeichen. Schreibe NIE über die Quellen selbst: keine Wörter wie Bild, Foto, abgebildet, "
        "dargestellt, laut, Kategorie, Quelle — beschreibe das Produkt direkt («Der Deckel ist drehbar», nicht «Im Bild ist der Deckel drehbar»). "
        "Enthält eine Quelle ein verbotenes Wort, übernimm es nicht. Erfinde keine Eigenschaften (luftdicht, waschbar, passt auf X, leicht zu "
        "reinigen, Masse «etwa ein Zentimeter») — Zahlen nur als Ziffern und nur aus den Quellen. Lieber kürzer als erfunden. Beschreibe, was das "
        "Produkt ist, wie es aussieht, welche Teile es hat und wofür man es im Alltag verwendet (nur wenn aus den Quellen ableitbar). "
        "Ziel: 90 bis 115 Wörter — Absatz 1 und Absatz 2 je 45 bis 60 Wörter, zähle nach.")
    if einzeln:
        regeln += " Es gibt KEINE Auswahl (eine Ausführung) — schreibe nichts über Wahl, Varianten, Ausführungen oder Verfügbarkeit."
    else:
        regeln += " Nenne die vorhandenen Optionen (Farben, Grössen) sachlich in Absatz 2."
    if rauch:
        regeln += (" Dies ist Raucherzubehör: rein sachlich, keine Wörter wie Geniesser, Genuss, Aroma, entspannt, gemütlich; "
                   "nichts, was zum Rauchen anregt.")
    text = regeln + f"\n\nTitel: {titel}\nQuellen:\n- " + "\n- ".join(quellen)
    if fehler:
        text += "\n\nDein letzter Entwurf wurde verworfen, weil: " + "; ".join(fehler) + ". Behebe genau das."
    text += "\n\nAntworte als JSON: {\"absatz1\": \"…\", \"absatz2\": \"…\"}"
    try:
        j = groq(text, modelle=modelle)
    except zm.TagesKontingentLeer:
        rest = [m for m in TEXT_MODELLE if m not in (modelle or [])]
        if not rest:
            raise
        j = groq(text, modelle=rest)                   # kleines Modell leer → grosses übernimmt
    abs_ = [str(j.get("absatz1") or "").strip(), str(j.get("absatz2") or "").strip()]
    abs_ = [re.sub(r"\s+", " ", a.replace("ß", "ss")).strip() for a in abs_ if a.strip()]
    return abs_


def neu_html(p, absaetze, rows):
    alt = p["descriptionHtml"] or ""
    rest = alt
    rest = re.sub(r"<h3>\s*Das zeichnet[^<]*</h3>\s*(?:<ul>.*?</ul>)?", " ", rest, flags=re.S)
    rest = re.sub(r"<p>\s*<strong>[^<]*</strong>\s*</p>", " ", rest)
    # einleitende <p> ohne Klasse und ohne Emoji-Kennung ersetzen; <p class="ls-liefer"> und «📦»-Zeile bleiben
    rest = re.sub(r"<p>(?!📦)(?:(?!</p>).)*</p>", " ", rest, flags=re.S)
    rest = re.sub(r"\s{2,}", " ", rest).strip()
    out = "".join(f"<p>{H.escape(a, quote=False)}</p>" for a in absaetze)
    if rows and 'class="ls-produktdetails"' not in alt:
        out += '<div class="ls-produktdetails"><h4>Produktdetails</h4><ul>' + "".join(
            f"<li><strong>{H.escape(k, quote=False)}:</strong> {H.escape(v, quote=False)}</li>" for k, v in rows[:6]) + "</ul></div>"
    return out + ("\n" + rest if rest else "")


def quitt(h, w_alt, w_neu, quelle, alt, neu):
    neu_datei = not os.path.exists(LEDGER)
    with open(LEDGER, "a") as f:
        if neu_datei:
            f.write("zeit\thandle\twoerter_alt\twoerter_neu\tquelle\talt_html\tneu_html\n")
        f.write("\t".join([time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), h, str(w_alt), str(w_neu), quelle,
                           json.dumps(alt, ensure_ascii=False), json.dumps(neu, ensure_ascii=False)]) + "\n")


def handles():
    hf = os.environ.get("HANDLES_FILE")
    if hf:
        return [z.strip() for z in open(hf) if z.strip() and not z.startswith("#")]
    if not os.path.exists(AUDIT) or time.time() - os.path.getmtime(AUDIT) > 36 * 3600:
        print("Audit fehlt/alt → seo_voll_audit.py", flush=True)
        subprocess.run(["python3", os.path.join(HERE, "seo_voll_audit.py")], cwd=REPO, timeout=1500)
    return json.load(open(AUDIT)).get("text_duenn") or []


def main():
    hs = handles()
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.split("\t")[1] for z in open(LEDGER) if "\t" in z and not z.startswith("zeit")}
    offen = [h for h in hs if h not in erledigt]
    rauch_h = re.compile(r"shisha|aschenbecher|zigar|tabak|grinder|kohleanz|raucher|rauchger", re.I)
    offen.sort(key=lambda h: bool(rauch_h.search(h)))        # Raucherware zuletzt — das Kontingent gehört zuerst der Google-Kanal-Ware
    print(f"{'SCHARF' if SCHARF else 'TROCKEN'} · dünn laut Audit: {len(hs)} · noch offen: {len(offen)} · LIMIT {LIMIT}", flush=True)
    z = {"geschrieben": 0, "titel_pruefen": 0, "cj_entfernt": 0, "verworfen": 0, "uebersprungen": 0}
    for h in offen[:LIMIT]:
        p = gql(Q, {"h": h})["productByIdentifier"]
        if not p or p["status"] != "ACTIVE":
            z["uebersprungen"] += 1; continue
        tags = set(t.lower() for t in p["tags"])
        if tags & {"pod", "printful", "selbst-gestalten"} or woerter(p["descriptionHtml"]) >= 40:
            z["uebersprungen"] += 1; continue
        sku = (p["variants"]["nodes"][0]["sku"] or "") if p["variants"]["nodes"] else ""
        cjd = cj_holen(sku) if sku.upper().startswith("CJ") else {"code": 0, "data": None, "msg": ""}
        if cjd.get("code") == 1602002:
            print(f"⛔ {h}: CJ «removed from shelves» → DRAFT + cj-entfernt", flush=True)
            z["cj_entfernt"] += 1
            if SCHARF:
                gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": p["id"], "t": ["cj-entfernt", f"cj-entfernt-{HEUTE}"]})
                r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{status} userErrors{message}}}', {"i": {"id": p["id"], "status": "DRAFT"}})
                if (r["productUpdate"].get("product") or {}).get("status") == "DRAFT":
                    quitt(h, woerter(p["descriptionHtml"]), 0, "cj-entfernt→DRAFT", p["descriptionHtml"], "")
            continue
        urls = [m["image"]["url"] for m in p["media"]["nodes"] if m.get("image")]
        urteil = bild_urteil(p["title"], urls, h)
        if not SCHARF:
            print(f"  👁 {h}: {json.dumps(urteil, ensure_ascii=False)[:300] if urteil else 'kein Bild-Urteil'}", flush=True)
        if urteil and urteil.get("passt_zum_titel") is False:
            print(f"❓ {h}: Bild passt nicht zum Titel «{p['title']}» — {urteil.get('objekt')} / {urteil.get('grund')}", flush=True)
            z["titel_pruefen"] += 1
            with open(TITEL_PRUEFEN, "a") as f:
                f.write(f"{HEUTE}\t{h}\t{p['title']}\t{urteil.get('objekt')}\t{urteil.get('grund')}\t{(cjd.get('data') or {}).get('productNameEn','') if isinstance(cjd.get('data'), dict) else ''}\n")
            continue
        quellen, rows, rauch = produkt_quellen(p, cjd.get("data"), urteil)
        vs = p["variants"]["nodes"]
        einzeln = len(vs) == 1 and vs[0]["title"] == "Default Title"
        fehler, abs_ = None, []
        for versuch in range(5):                        # Versuch 1–2 kleines Modell, 3–5 grosses (Kontingent des Zweitprüfers schonen)
            modelle = TEXT_MODELLE[:1] if versuch < 2 else TEXT_MODELLE[1:] or TEXT_MODELLE
            abs_ = entwurf(p["title"], quellen, rauch, fehler, einzeln, modelle)
            fehler = pruefen(abs_, quellen, rauch, einzeln) if abs_ else ["leere Antwort"]
            if not fehler:
                break
            print(f"  ↻ {h} Versuch {versuch + 1} verworfen: {'; '.join(fehler)[:200]}", flush=True)
        if fehler:
            z["verworfen"] += 1; continue
        neu = neu_html(p, abs_, rows)
        w_alt, w_neu = woerter(p["descriptionHtml"]), woerter(neu)
        quelle = "+".join(x for x, ok in (("cj", cjd.get("code") == 200), ("bild-kontaktbogen" if h in URTEILE else "bild", bool(urteil)), ("alt", True)) if ok)
        print(f"{'✍️' if SCHARF else '📝'} {h} ({w_alt}→{w_neu} W, {quelle}, {LETZTES['modell']})\n   " + "\n   ".join(abs_) + (f"\n   Details: {rows[:6]}" if rows else ""), flush=True)
        if not SCHARF:
            z["geschrieben"] += 1; continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}', {"i": {"id": p["id"], "descriptionHtml": neu}})
        pu = r.get("productUpdate") or {}
        zurueck = strip((pu.get("product") or {}).get("descriptionHtml"))
        if pu.get("userErrors") or zurueck != strip(neu):
            print(f"  ⚠️ NICHT quittiert: {pu.get('userErrors')} / Rücklesen {zurueck[:60]!r}", flush=True); continue
        quitt(h, w_alt, w_neu, quelle, p["descriptionHtml"], neu)
        z["geschrieben"] += 1
        time.sleep(0.5)
    print("BILANZ " + json.dumps(z, ensure_ascii=False) + f" · noch offen nach Lauf: {max(0, len(offen) - LIMIT)} · Groq-Tokens {USAGE}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except zm.TagesKontingentLeer as e:
        print(f"⏸ Groq-Tageskontingent leer — Lauf endet ohne weitere Quittung: {str(e)[:160]}", flush=True)
