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

NACHTRAG 05.10.2026 (Prüferbefunde, Wache war mit dropship/_duenne_texte_angehalten angehalten) — sechs neue Tore:
  VARIANTEN: Sätze zu «erhältlich in / Farben / Grössen / Ausführungen / wählbar» nur, wenn die genannten Werte in den
    Shopify-OPTIONEN stehen (Flipflops bewarben 5 Farben + 3 Grössen bei «Default Title»); bei Einzelvariante jedes Wahl-Wort verboten.
  EDELSTEIN: Diamant/Brillant/Saphir/Rubin/Smaragd/Echtgold/925 nur bei belegtem Echtschmuck in den Quellen (CJ «Diamond-Inlaid» =
    Strass; Herz-Link wurde als «mit Diamanten besetzt» verkauft = täuschende Edelstein-Angabe). Gilt auch für den TITEL.
  MATERIAL-WIDERSPRUCH: Materialwort im Fliesstext muss zur Material-Zeile des Faktenblocks passen (Leder-Tote: Text «Rindleder»,
    Block «Kunststoff»); widersprechen sich CJ-Name und CJ-materialNameEn, schreibt der Lauf KEINE Material-Zeile.
  MÜLLQUELLE: CJ productNameEn aus nur Ziffern oder ≤ 3 Zeichen («12» beim Laufschuh wurde «Grösse 12») ist keine Quelle; Alt-Zeilen
    «12 Grösse» (Zahl + ein Wort ohne Einheit) ebenso nicht. EINHEIT: Zahl+Einheit im Text nur, wenn die Quelle dieselbe Einheit
    trägt (Variantencode «3 color 32» wurde «32 mm Lichtfläche»). ZIELGRUPPE: «18 bis 59 Jahren» (CJ-Feld) ist kein Produktfakt.
  NEGATIVQUELLE: wurde der Titel per Kontaktbogen korrigiert (dropship/_duenne_texte_titel_ledger.tsv), sind die Wörter des alten
    Titels im Text verboten («Frosch» nach Umbenennung auf Bär/Schleife/Muschel). Unpersönliches «Man kann» = Sie-Form-Klasse.
  MIN_W 70 statt 80, wenn weniger als 6 Quellenzeilen vorliegen (Velvet-Kissenbezug scheiterte 5× am Eigenschafts-Tor).
  NACHPRUEFEN=1: liest ALLE Ledger-Handles live, schickt den Live-Fliesstext durch die Tore, meldet Treffer + «SEO-Titel alt»
    (seo.title beginnt nicht mit dem Produkttitel) — schreibt NICHTS, nutzt NUR den CJ-Cache. Exit 0 = 0 Treffer.
  python3 automation/produkttext_duenn.py --test   Kanarienvögel der neuen Tore (ohne Shopify/CJ/Groq).
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
_URTEILE_STD = os.path.join(REPO, "dropship", "_duenne_texte_bildurteile.json")   # Kontaktbogen-Urteile 04.10. (118), Regel 5
URTEILE = json.load(open(os.environ.get("URTEILE_FILE") or _URTEILE_STD)) if (os.environ.get("URTEILE_FILE") or os.path.exists(_URTEILE_STD)) else {}
BILD_AUS = os.environ.get("BILD_AUS") == "1"
_bild_tot = {"ja": False}
AUDIT = "/tmp/seo_voll_audit.json"
MIN_W, MAX_W = 80, 150

FLOSKEL = re.compile(r"\b(hochwertig\w*|perfekt\w*|ideal\w*|sorgt\s+für|sorgen\s+für|einzigartig\w*|exklusiv\w*|luxuri[öo]s\w*|"
                     r"premium|unverzichtbar\w*|highlight\w*|must-?have|hervorragend\w*|optimal\w*|erstklassig\w*|traumhaft\w*|"
                     r"wundersch[öo]n\w*|stilvoll\w*|elegant\w*|trendig\w*|zeitlos\w*|raffiniert\w*|begeister\w*|"
                     r"verleiht|unterstreicht|Blickfang|Statement|Eyecatcher|langlebig\w*|robust\w*|zuverl[äa]ssig\w*|"
                     r"garantiert|Garantie|zertifiziert|gepr[üu]ft\w*|original\w*|Qualit[äa]t\w*|professionell\w*|wird als \w+ bezeichnet|"
                     r"besonders hervorgehoben|entsprechenden? Gr[öo]ssen|wird mit der entsprechenden|Aufstelldienst)\b", re.I)
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
           "cubic zirconia": "zirkonia", "zirkon": "zirkonia", "silver": "silber", "golden": "gold", "gold": "gold", "pearl": "perle",
           "rose gold": "rosegold roségold", "rhinestone": "strass", "crystal": "kristall", "glass": "glas", "stone": "stein",
           "rubber": "gummi", "foam": "schaum schaumstoff", "ni-mh": "nickel-metallhydrid nimh", "nimh": "nickel-metallhydrid",
           "synthetic resin": "kunstharz harz", "canvas": "canvas leinwand", "titanium": "titan", "malachite": "malachit", "pc": "polycarbonat", "alloy": "legierung metall", "pu": "kunstleder pu", "plush": "plüsch", "knitted": "strick",
           "cotton": "baumwolle", "polyester": "polyester", "spandex": "elasthan", "edelstahl": "stahl metall", "kupfer": "kupfer metall", "messing": "metall",
           "zinklegierung": "zink legierung metall", "titanstahl": "titan stahl metall", "silikon": "silikon", "glas": "glas", "keramik": "keramik"}
WIRK = re.compile(r"\b(lindert|lindern|heilt|heilen|therap\w*|entgift\w*|straff\w*|Cellulite|Durchblutung|Schmerz\w*|"
                  r"Migr[äa]ne|Stress|Entz[üu]ndung\w*|Akne|Pigment\w*|Anti-?Aging|Anti-?Falten|verj[üu]ng\w*|medizinisch\w*|klinisch\w*|"
                  r"gesund\w*|Gesundheit|Heilung|Krankheit\w*|Symptom\w*|regenerier\w*|Kollagen|Hautbild|Poren|Augenringe|"
                  r"Verspannung\w*|Muskelkater|Blutdruck|Immun\w*|beruhig\w*|entspann\w*|wohltuend|Wellness|Heilwirkung|"
                  r"(?:f[öo]rdert|verbessert|reduziert|st[äa]rkt|unterst[üu]tzt)\s+(?:die|das|den|deine?n?|ihre?n?)?\s*(?:Haut\w*|Durchblutung|Schlaf|Gesundheit|"
                  r"Immunsystem|Stoffwechsel|Heilung|Konzentration|Wohlbefinden|Haar\w*|Stimmung|Atmung|Haltung|Muskel\w*|Gelenk\w*|Augen|Sehkraft)|"
                  r"sch[üu]tzt vor UV|UV-?Schutz|UPF|SPF|LSF|wasserdicht|wasserfest|"
                  r"schlagfest|kratzfest|bruchsicher|feuerfest|hitzebest[äa]ndig|Hautproblem\w*|Hautbarriere|Falten|R[öo]tung\w*|repariert|"
                  r"Hautpflege\w*|Augenpflege\w*|pflegt die|n[äa]hrt)\b", re.I)
UMSCHRIFT = re.compile(r"\b(fuer|ueber|groesse\w*|ausfuehrung\w*|moeglich\w*|schoen\w*|koenn\w*|waehl\w*|waerme|kueche|tuer\w*|buero|stueck\w*|"
                       r"zubehoer|gruen\w*|oel\w*|haelt|traeg\w*|laess\w*|faellt|aermel|naehe|hoehe|laenge|gefuehl|muede|fruehling|kaelte|"
                       r"\w*(?<!q)[bcdfghklmnprstvwxz](?:ae|oe|ue)[bcdfghklmnprstvwxz]\w*)\b", re.I)
UMSCHRIFT_OK = re.compile(r"uell|uett|uenz|aero|poes|israel|michael|duo|statue|aktue|manue|visue|eventue|individue|punktue|rituel|virtue|textue|sexue|kontinue|soue", re.I)
# Scharflauf 05.10. 00:13: «reduziert Fingerabdrücke» (Schutzglas) fiel 5× am Wirkwort-Tor → generische Verben nur noch mit Körper-/Gesundheits-Objekt.
# Trockenlauf 3 (05.10. 00:15, gpt-oss-120b): «misst etwa einen Zentimeter» (Zahl als WORT umging das Ziffern-Tor), «luftdicht»,
# «lässt sich einfach reinigen», «passt auf ein Standard-Kissen» — Eigenschaften, die keine Quelle nennt → zwei weitere Tore.
ZAHLWORT = re.compile(r"\b(ein(?:en|e|em|er|es)?|zwei|drei|vier|f[üu]nf|sechs|sieben|acht|neun|zehn|elf|zw[öo]lf|zwanzig|dreissig|vierzig|f[üu]nfzig|hundert|"
                      r"etwa|ca\.?|ungef[äa]hr|rund|knapp)\s+(Zentimeter\w*|Millimeter\w*|Meter\w*|Gramm|Kilo\w*|Liter\w*|Milliliter\w*|Zoll|Watt|Volt|Stunden?|Minuten?|Prozent|cm|mm|g|kg|ml|l|W|V)\b", re.I)
# 05.10. Prüferbefund (hoch): «Haarspangen-Set … vier Spangen» — CJ liefert EINE (Packing list Accessories*1, 1 Variante); das Bild-Urteil
# zählte das Familienfoto. «Küchenhelfer-Set · 5-teilig» — Bilder und CJ-Name «6件套» sagen sechs. STÜCKZAHL-Tor: Set-Wörter und Stückzahlen
# in Titel/Text nur, wenn CJ-Packing-List, CJ-Name (en/zh), Optionswert oder — nur ohne CJ-Zahl — das Bild-Urteil sie trägt.
_ZW = {"zwei": 2, "drei": 3, "vier": 4, "fünf": 5, "fuenf": 5, "sechs": 6, "sieben": 7, "acht": 8, "neun": 9, "zehn": 10, "elf": 11, "zwölf": 12, "zwoelf": 12}
_ZWR = r"zwei|drei|vier|f[üu]nf|sechs|sieben|acht|neun|zehn|elf|zw[öo]lf"
STUECK_CLAIM = re.compile(r"\b(\d{1,3}|" + _ZWR + r")(?:er)?[\s-]*(?:teilig\w*|St[üu]ck\b|Stk\.?|Teile[ns]?\b|Paar\b|Paare[ns]?\b|-?er[- ]Set\b|Spangen\b|Ketten\b|Ringe[n]?\b|Ohrringe[n]?\b|"
                          r"Armb[äa]nder[n]?\b|Anh[äa]nger[n]?\b|Flaschen\b|Gl[äa]ser[n]?\b|Tassen\b|Becher[n]?\b|B[üu]rsten\b|Messer[n]?\b|L[öo]ffel[n]?\b|Teller[n]?\b|"
                          r"Schalen\b|Beutel[n]?\b|T[üu]cher[n]?\b|Socken\b|Haken\b|Kerzen\b|Figuren\b|Motive[n]?\b|Teilen\b)|"
                          r"\b(?:enth[äa]lt|besteht aus|umfasst|bestehend aus|Geliefert werden|Du erh[äa]ltst|Lieferumfang:?)\s+(\d{1,3}|" + _ZWR + r")\b", re.I)
SET_WORT = re.compile(r"(?:^|[\s(])(?:\w+-)?(Sets?|Garnitur\w*|Kombi-?[Pp]ack\w*)(?=\b)|\b(\d+|" + _ZWR + r")[\s-]*(?:teilig\w*|-?er[- ]Set)\b|\bSet\s+(?:aus|mit|enth[äa]lt|besteht)\b", re.I)
SET_BELEG = re.compile(r"\b(set|sets|kit|suit|suite|pcs|pieces?|pairs?|pack|combo|bundle|\d+\s*in\s*1|件套|套装|套|组合)\b|\d+\s*(?:pcs|pc|pieces?|pairs?|件|只|个|对)|\*\s*[2-9]\d*\b", re.I)
ANSPRUCH = re.compile(r"\b(luftdicht|wasserdicht|wasserabweisend|sp[üu]lmaschinen\w*|waschmaschinen\w*|bruchsicher|rostfrei|hitzebest[äa]ndig|BPA\w*|"
                      r"allergiker\w*|nickelfrei|hypoallergen|antibakteriell|lebensmittelecht|kratzfest|stossfest|sto[ßs]fest|leicht zu reinigen|"
                      r"einfach zu reinigen|pflegeleicht|waschbar|b[üu]gelfrei|atmungsaktiv|rutschfest|auslaufsicher|ergonomisch|faltbar|zusammenklappbar|"
                      r"verstellbar|abnehmbar|wiederverwendbar|recycl\w*|vegan|bio|handgefertigt|handgemacht|Standard-?\w*|universell|kompatibel\w*|passt (?:auf|zu|in) \w+|"
                      r"wetterbest[äa]ndig|witterungsbest[äa]ndig|stabil\w*|Messungen|frostsicher|UV-?best[äa]ndig|schwer entflammbar)\b", re.I)
# Stichprobe 10 vom Scharflauf (05.10. 00:00): «aus Rubber gefertigt», «als Studs konzipiert», «Wallet», «Stroller», «casuales» —
# englische Restwörter aus Import-Text und CJ-Daten → Liste erweitert; «passend für.» als Satzende → Tor SATZENDE.
ENGLISCH = re.compile(r"\b(the|and|with|for|your|of|is|are|this|that|high|quality|made|from|free|rubber|steel|plated|cotton|leather|wood|silver|"
                      r"zinc|alloy|stainless|plastic|studs?|strap|casual\w*|wallet|stroller|cloth|fabric|size|color|colour|style|pattern|"
                      r"light|night|fast|charging|pair|pcs|set of|bag|case|cover|holder|shaped|crushed|inlaid|encrusted|top-?grain|cowhide|"
                      r"fashion|design\s+style|open-?end|plug\s*in|charge)\b", re.I)
# 05.10.: «hängst … auf.», «stellst … ein.», «spülst … aus.» sind trennbare Verben, kein Satzbruch → Partikel aus der Liste
SATZENDE = re.compile(r"\b(f[üu]r|und|oder|zum|zur|von|der|die|das|den|dem|des|eine|einen|einem|einer|sowie|als|wie|"
                      r"durch|ohne|gegen|leicht|gut|sehr)[.!?]?$", re.I)
# 05.10.: Prüferbefunde — Wahl-Wörter bei Einzelvariante, Edelstein-Täuschung, Zielgruppenfeld, unpersönliche Form, erfundene Einheit
WAHL_EINZELN = re.compile(r"\b(erh[äa]ltlich|lieferbar|verf[üu]gbar|Ausf[üu]hrung\w*|w[äa]hl\w*|Auswahl|Variante\w*|Farbvariante\w*|"
                          r"Farbausf[üu]hrung\w*|in (?:den|verschiedenen|mehreren) (?:Farben|Gr[öo]ssen)|(?-i:Gr[öo]ssen?)\s+\d|(?-i:Gr[öo]ssen)\b|"
                          r"L[äa]ngen? (?:von|zwischen)|Stilvariante\w*)\b", re.I)
WAHL_LISTE = re.compile(r"\b(?:in (?:den|folgenden|diesen|verschiedenen|mehreren)\s+(?:\w+-)?(?:Farben|Gr[öo]ssen|Ausf[üu]hrungen|Varianten|Modellen|Designs)|"
                        r"(?:Farben|Gr[öo]ssen|Ausf[üu]hrungen|Varianten):)\s*(?:erh[äa]ltlich\s*)?:?\s*([^.;]+)", re.I)
EDELSTEIN = re.compile(r"\b(Diamant\w*|Brillant\w*|Saphir\w*|Rubin\w*|Smaragd\w*|Echtgold|Echtsilber|925e?r?|Sterling\w*|Goldkarat|"
                       r"\d+\s*Karat|Massivgold)\b", re.I)
ECHT_BELEG = re.compile(r"\b(925|sterling|echtschmuck|echtes? (?:gold|silber)|moissanit|lab.?grown|natural diamond|solid gold)\b", re.I)
ZIELGRUPPE = re.compile(r"\b\d{1,2}\s*(?:bis|–|-)\s*\d{1,3}\s*Jahr\w*|\bErwachsene\s+(?:von|ab)\s+\d", re.I)
MAN_KANN = re.compile(r"\b[Mm]an\s+(kann|k[öo]nnte|sollte|muss|darf|nutzt|verwendet|tr[äa]gt|stellt|legt)\b")
EINHEIT_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(mm|cm|m|g|kg|ml|l|w|v|ah|a|zoll|inch|oz|stunden?|h|st[üu]ck|teil\w*|led\w*)\b", re.I)
EINHEIT_NORM = {"inch": "zoll", "stunde": "stunden", "h": "stunden", "teil": "teile", "teilen": "teile", "teilig": "teile", "stück": "stueck",
                "stueck": "stueck", "led": "led", "leds": "led"}
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
_KURZ = [m for m in MATERIALIEN if len(m) <= 3 and m.isupper()]               # PU, PP, PVC, ABS, TPU, EVA — exakt, sonst traf «PU» «Pullover» (05.10.)
_LANG = [m for m in MATERIALIEN if m not in _KURZ]
MAT_RE = re.compile(r"\b(?:(" + "|".join(sorted(map(re.escape, _LANG), key=len, reverse=True)) + r")\w*|(" + "|".join(_KURZ) + r")\b)")
MAT_RE_I = re.compile(r"\b(" + "|".join(sorted(map(re.escape, _LANG), key=len, reverse=True)) + r")\w*", re.I)
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

Q = """query($h:String!){ productByIdentifier(identifier:{handle:$h}){ id handle title status tags descriptionHtml seo{title description}
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


def muellname(name):
    """05.10.: CJ productNameEn «12» (Laufschuh) wurde als «Grösse 12» übernommen — nur Ziffern/Zeichen oder ≤ 3 Zeichen = keine Quelle."""
    n = str(name or "").strip()
    return len(n) <= 3 or re.fullmatch(r"[\d\s.,;:/+*#()-]+", n) is not None


def mat_familien(text):
    """Materialwörter eines Texts als Familien (leder, kunststoff, metall, stoff, glas, holz, keramik, silikon, gummi …)."""
    t = (text or "").lower()
    fam = set()
    for k, fs in (("leder|cowhide|rindleder|rindsleder|genuine leather|top.?grain", "leder"), ("kunstleder|pu-leder|pu leather|\\bpu\\b", "kunstleder"),
                  ("kunststoff|plastic|plastik|\\babs\\b|\\bpp\\b|\\bpvc\\b|\\bpet\\b|\\btpu\\b|acryl|resin|harz|polypropylen", "kunststoff"),
                  ("metall|metal|stahl|steel|alloy|legierung|kupfer|copper|messing|brass|zink|zinc|eisen|iron|aluminium|aluminum|titan|titanium", "metall"),
                  # 05.10.: «kleinen» traf «leinen», «wollen» träfe «wolle», «gesamt» «samt» → Wortanfang-Grenze für diese drei (Hausregel 9b)
                  ("stoff|cloth|fabric|polyester|baumwolle|cotton|nylon|canvas|(?<![a-z])leinen|(?<![a-z])linen|(?<![a-z])samt\\b|velvet|velours|plüsch|plush|(?<![a-z])wolle(?!n)|wool|seide|silk|chiffon|strick|knitted|filz|felt|mesh|spandex|elasthan|oxford|flanell|fleece|mikrofaser|microfiber|lycra|dacron|vinylon|viskose", "stoff"),
                  (r"(?<![a-z])glas\\b|(?<![a-z])glass\\b", "glas"), ("holz|wood|bambus|bamboo", "holz"), ("keramik|ceramic|porzellan", "keramik"), ("silikon|silicone|silica gel", "silikon"),
                  ("gummi|rubber|latex", "gummi"), ("papier|paper", "papier"), ("stein|stone|marmor|marble|granit", "stein")):
        if re.search(k, t):
            fam.add(fs)
    return fam


def material_konflikt(name_en, mats):
    """CJ-Name nennt ein Material (Leather/Cowhide), materialNameEn ein anderes (Plastic/Cloth) → beschreibender Satz statt Zeile."""
    a, b = mat_familien(name_en), mat_familien(" ".join(mats or []))
    if a and b and not (a & b):
        return f"Name sagt {'/'.join(sorted(a))}, Materialfeld sagt {'/'.join(sorted(b))}"
    return ""


def cj_fakten(d):
    """Belegte Werte aus CJ: Material (nur übersetzt), Gewicht, «key: value»-Zeilen mit Ziffer, Varianten-Schlüssel, Packung."""
    f, rows = [], []
    if not isinstance(d, dict):
        return f, rows
    name_en = str(d.get("productNameEn") or "").strip()
    if name_en and not muellname(name_en):
        f.append("CJ-Produktname (englisch): " + name_en[:120])
    mats = [MAT_DE.get(str(m).lower().strip()) for m in (d.get("materialNameEnSet") or d.get("materialNameEn") or [])]
    mats = [m for m in mats if m]
    konflikt = material_konflikt(name_en, mats)
    if mats and konflikt:
        f.append(f"Material: WIDERSPRÜCHLICH bei CJ ({konflikt}) — nenne KEIN Material")
    elif mats:
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
        m = re.match(r"^([A-Za-z][A-Za-z /-]{2,28})\s*[:：]\s*(.{2,120})$", z)
        # 05.10.: vorher nur Zeilen mit Ziffer — «Material: Canvas», «Outsole material: Rubber» fehlten dann als Quelle
        if m and not re.search(r"[一-鿿]", z) and not re.match(r"(?i)note|overview|tips?|features?|advantages?|product image|packing|package", m.group(1)):
            f.append("CJ-Beschreibung: " + z[:160])
    keys = [str(v.get("variantKey") or "") for v in (d.get("variants") or [])][:12]
    keys = [k for k in keys if k and not re.search(r"[一-鿿]", k)]
    if keys:
        f.append("CJ-Varianten: " + " | ".join(dict.fromkeys(keys)))
    # 05.10. Prüferbefund: Lieferumfang («Packing list: Accessories*1», «Hairpin*3pcs») und Stückzahl aus dem chinesischen Namen
    # («创意尼龙6件套» = 6-teilig) sind die Quelle für Set-/Stückzahl-Wörter — vorher wurden packing-Zeilen bewusst übersprungen.
    for z in desc.split("\n"):
        m = re.match(r"^\s*(?:packing|package)\s*(?:list|content|includes?)?\s*[:：]\s*(.{1,120})$", re.sub(r"\s+", " ", z).strip(), re.I)
        if m and not re.search(r"[一-鿿]", m.group(1)):
            f.append("Lieferumfang (CJ): " + m.group(1).strip())
            break
    namen = d.get("productName")
    namen = namen if isinstance(namen, list) else [namen] if namen else []
    for nm in map(str, namen):
        m = re.search(r"(\d{1,3})\s*(?:件套|件|只装|个装|对装|套装|支装|片装)", nm)
        if m:
            f.append(f"CJ-Stückzahl: {m.group(1)} (aus «{nm[:40]}»)"); break
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
    # 05.10. Prüferbefund: 1 Bild allein zählte ein Familienfoto (4 Spangen, geliefert wird 1) → bis 3 Bilder à 384 px; anzahl_teile nur,
    # wenn alle Bilder dieselbe Zahl zeigen, sonst null. (qwen ist das Bestell-Bildvergleich-Modell — Kontingent bleibt knapp.)
    bilder = [b for b in (bild_bytes(u) for u in urls[:3]) if b]
    if not bilder:
        return None
    prompt = (f"{len(bilder)} Produktbild(er) eines Online-Shop-Artikels mit dem Titel «{titel}». Beschreibe NUR, was sichtbar ist. "
              "Antworte als JSON: {\"objekt\": \"<was zu sehen ist, 3–8 Wörter, deutsch>\", \"farben\": [\"…\"], "
              "\"merkmale\": [\"<nur sichtbare Merkmale: Form, Teile, Verschluss, Aufdruck, Muster, Anzahl — max. 6, deutsch>\"], "
              "\"anzahl_teile\": <Zahl oder null>, \"passt_zum_titel\": true/false, \"grund\": \"<ein Satz>\"}. "
              "anzahl_teile = Zahl der Teile, die der Kunde erhält: NUR wenn alle Bilder dieselbe Zahl zeigen; zeigt ein Bild ein Einzelteil "
              "und ein anderes mehrere (Familienfoto, Farbübersicht), dann null. Keine Materialien raten, keine Masse schätzen, keine Werbung.")
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
        if re.fullmatch(r"\d+\s+(?!(?:cm|mm|m|g|kg|ml|l|Zoll|St[üu]ck|Teile?|Paar|Stunden|Watt|Volt)\b)\w+", s):
            continue                                   # «12 Grösse» (Laufschuh, 05.10.) — Zahl + ein Wort ohne Einheit = Müll
        f.append("Alter Text: " + s[:200])
    return f, rows


def titel_negativ(handle, titel):
    """05.10.: Titel per Kontaktbogen korrigiert → Wörter des ALTEN Titels, die im neuen nicht vorkommen, sind im Text verboten."""
    pfad = os.path.join(REPO, "dropship", "_duenne_texte_titel_ledger.tsv")
    if not os.path.exists(pfad):
        return []
    neu = (titel or "").lower()
    out = []                                           # 05.10.: ALLE alten Titel des Handles (Haarspange wurde zweimal korrigiert), nicht nur der erste
    for z in open(pfad):
        t = z.rstrip("\n").split("\t")
        if len(t) >= 5 and t[1] == handle:
            alt = t[2].strip('"')
            out += [w for w in re.split(r"[\s\-/,·]+", alt) if len(w) >= 4 and w.lower()[:4] not in neu and not re.search(r"\d", w)
                    and not MAT_RE_I.fullmatch(w) and w.lower() not in ("aus", "mit", "für", "fuer", "und", "oder", "frauen", "damen", "herren", "kinder")
                    and w not in out]
    return out


def optionswerte(p):
    """Alle Shopify-Optionswerte (normalisiert) — nur diese dürfen als Wahlwerte im Text stehen."""
    w = set()
    for o in p["options"]:
        if o["name"] != "Title":
            for v in o["values"]:
                for teil in re.split(r"\s*[-/]\s*", str(v)):
                    teil = norm(teil)
                    if teil and teil not in ("default title",):
                        w.add(teil)
    return w


def norm(s):
    return re.sub(r"\s+", " ", str(s).lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")).strip()


FARBE_DE_EN = {"schwarz": "black", "weiss": "white", "grau": "gray grey", "blau": "blue", "rot": "red", "gruen": "green", "gelb": "yellow",
               "rosa": "pink", "pink": "pink", "violett": "purple", "lila": "purple", "braun": "brown", "beige": "beige", "khaki": "khaki",
               "gold": "gold golden", "silber": "silver", "orange": "orange", "dunkelblau": "dark blue navy", "hellblau": "light blue", "rosegold": "rose gold"}


def produkt_quellen(p, cjd, urteil):
    f, rows = [], []
    f.append("Titel: " + p["title"])
    for w in titel_negativ(p["handle"], p["title"]):
        f.append(f"NICHT verwenden (alter Titel war falsch): {w}")
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


def stueckzahl_beleg(quellen):
    """Belegte Stückzahlen aus den Quellen (ohne Titel!): CJ-Lieferumfang/-Name/-Stückzahl, Optionswerte, alter Text; Bild-Urteil
    nur, wenn CJ keine Zahl nennt (05.10.: das Bild-Urteil zählte ein Familienfoto). Rückgabe (Zahlen, set_belegt, cj_vorhanden)."""
    zahlen, set_ok, cj = set(), False, False
    cj_zahlen, bild_n = set(), 0
    for q in quellen:
        if q.startswith("Titel:") or q.startswith("NICHT verwenden"):
            continue
        ist_cj = q.startswith(("CJ-", "Lieferumfang (CJ)", "Material (CJ)"))
        cj |= ist_cj
        if SET_BELEG.search(q) and not q.startswith("Bild zeigt"):
            set_ok = True
        for m in re.finditer(r"(?<![\d,.])(\d{1,3})\s*(?:pcs|pc|pieces?|pairs?|pack|-?piece|in\s*1|件套|件|只|个|对|St[üu]ck|Stk|Teile?|teilig|Paar|x\b|×)|(?:set of|pack of|\*)\s*(\d{1,3})\b|\bStückzahl:\s*(\d{1,3})", q, re.I):
            n = int(next(g for g in m.groups() if g))
            (cj_zahlen if ist_cj else zahlen).add(n)
        if q.startswith("Anzahl Teile im Bild:"):
            try:
                bild_n = int(q.split(":")[1]); zahlen.add(bild_n)
            except ValueError:
                pass
    if cj_zahlen:                                      # CJ nennt eine Zahl → sie gilt, Bild/alter Text zählen nicht dagegen
        zahlen = cj_zahlen | {n for n in zahlen if n in cj_zahlen}
        set_ok = set_ok or max(cj_zahlen) >= 2
    elif cj and not set_ok:                            # CJ-Daten da, aber weder Set-Wort noch Zahl ≥ 2 → Bild-Zahl ist kein Beleg für ein Set
        zahlen = {n for n in zahlen if n < 2}
    elif not cj and bild_n >= 2:                       # ohne CJ-Daten ist der Kontaktbogen die einzige Quelle
        set_ok = True
    return zahlen, set_ok, cj


def stueckzahl_pruefen(t, titel, quellen):
    """Stückzahl-/Set-Tor über Text UND Titel."""
    fehler = []
    zahlen, set_ok, cj = stueckzahl_beleg(quellen)
    voll = f"{titel or ''} {t}"
    for m in STUECK_CLAIM.finditer(voll):
        z = (m.group(1) or m.group(2) or "").lower()
        n = int(z) if z.isdigit() else _ZW.get(z.replace("ü", "ue").replace("ö", "oe"), _ZW.get(z))
        if not n or n < 2:
            continue
        # Gesamtangabe («3 Stück», «6-teilig», «enthält vier», «Geliefert werden zwei») muss genau belegt sein;
        # Teilangabe («Zwei Spangen tragen einen Stern» im 3er-Set) darf die belegte Zahl nur nicht übersteigen
        gesamt = bool(m.group(2)) or bool(re.search(r"teilig|St[üu]ck|Stk|Teile|Set\b", m.group(0), re.I))
        ok = (n in zahlen) if gesamt else (bool(zahlen) and n <= max(zahlen))
        if not ok:
            fehler.append(f"Stückzahl «{m.group(0).strip()}» ohne Beleg (belegt: {sorted(zahlen) or 'keine'}; Quelle = CJ-Lieferumfang/-Name, Option, Bild nur ohne CJ-Zahl)")
            break
    if SET_WORT.search(voll) and not set_ok:
        fehler.append(f"Set-Wort «{SET_WORT.search(voll).group(0).strip()}» ohne Beleg — CJ-Lieferumfang/-Name/Option nennt kein Set und keine Stückzahl ≥ 2")
    return fehler


def pruefen(absaetze, quellen, rauch, einzeln=False, optionen=None, rows=None, min_w=None, titel=""):
    t = " ".join(absaetze)
    fehler = []
    min_w = min_w or MIN_W
    optionen = optionen or set()
    # 05.10. VARIANTEN-Tor: Wahlwerte nur aus Shopify-Optionen
    if einzeln and WAHL_EINZELN.search(t):
        fehler.append("Einzelvariante — kein Wahl-/Verfügbarkeitswort: " + ", ".join(dict.fromkeys(m.group(0) for m in WAHL_EINZELN.finditer(t))))
    elif not einzeln:
        for m in WAHL_LISTE.finditer(t):
            werte = [w.strip(" .,") for w in re.split(r"\s*,\s*|\s+und\s+|\s+oder\s+|\s+sowie\s+", m.group(1)) if w.strip(" .,")]
            for w in werte[:12]:
                wn = norm(re.sub(r"^(?:in|die|der|den|das|wie|z\.\s*B\.|zum Beispiel|von|bis|sind|ist|angeboten|werden|erhältlich)\s+", "", w)).strip()
                wn = re.sub(r"\s+(?:erhaeltlich|angeboten|verfuegbar|lieferbar|waehlbar).*$", "", wn)
                if not wn or len(wn) < 2 or re.fullmatch(r"[a-z]{1,2}", wn):
                    continue
                kand = {wn} | set(FARBE_DE_EN.get(wn, "").split())
                if not any(k and (k in o or o in k) for o in optionen for k in kand):
                    fehler.append(f"Wahlwert «{w.strip()}» steht in keiner Shopify-Option (nur: {', '.join(sorted(optionen))[:120]})")
                    break
    # 05.10. EDELSTEIN-Sperre (auch Titel): nur bei belegtem Echtschmuck
    qtext = " ".join(quellen)
    for m in EDELSTEIN.finditer(t + " " + (titel or "")):
        if not ECHT_BELEG.search(qtext):
            fehler.append(f"Edelstein-/Echtschmuck-Wort «{m.group(0)}» ohne Beleg (Strass/Zirkonia nie als Diamant)"); break
    if ZIELGRUPPE.search(t):
        fehler.append("CJ-Zielgruppenfeld ist kein Produktfakt: " + ZIELGRUPPE.search(t).group(0))
    if MAN_KANN.search(t):
        fehler.append("unpersönliche Form (du-Anrede!): " + MAN_KANN.search(t).group(0))
    for q in quellen:                                   # Negativquelle: Wörter des alten, falschen Titels
        if q.startswith("NICHT verwenden"):
            w = q.split(":", 1)[1].strip()
            if re.search(r"\b" + re.escape(w[:-1] if len(w) > 5 else w), t, re.I):   # ganzes Wort minus Endung («Schut» traf «Schutzhülle», 05.10.)
                fehler.append(f"Wort des alten (falschen) Titels im Text: {w}")
    # 05.10. MATERIAL-Widerspruch Fliesstext ↔ Faktenblock
    blk = [v for k, v in (rows or []) if k == "Material"]
    if blk:
        ft, fb = mat_familien(t), mat_familien(blk[0])
        if ft and fb and not (ft & fb):
            fehler.append(f"Material im Text ({'/'.join(sorted(ft))}) widerspricht dem Faktenblock ({blk[0]})")
    if any(q.startswith("Material: WIDERSPR") for q in quellen) and mat_familien(t):
        fehler.append("Material bei CJ widersprüchlich — kein Materialwort im Text")
    fehler += stueckzahl_pruefen(t, titel, quellen)
    if EDEL.search(t):
        fehler.append("Floskel: " + EDEL.search(t).group(0))
    if META.search(t):
        fehler.append("Meta-Wort (nicht über Bild/Quelle/Kategorie schreiben): " + ", ".join(dict.fromkeys(m.group(0) for m in META.finditer(t))))
    if einzeln and WAHL.search(t):
        fehler.append("es gibt keine Auswahl — kein Satz über Wahl/Varianten/Ausführung: " + WAHL.search(t).group(0))
    n = len(t.split())
    if n < min_w:
        fehler.append(f"nur {n} Wörter — schreibe mindestens {max(min_w + 10, 80)} Wörter (zwei Absätze à 40–60 Wörter)")
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
    # 05.10. EINHEIT-Tor: Zahl + Einheit nur, wenn die Quelle dieselbe Einheit trägt («3 color 32» wurde «32 mm»)
    qe = set()
    _SEP = r"\s*(?:[x×*+–/-]|bis|to|or)\s*"
    for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*(?:(?:cm|mm|zoll|inch)?" + _SEP + r"(\d+(?:[.,]\d+)?))?\s*(?:" + _SEP + r"(\d+(?:[.,]\d+)?))?\s*(mm|cm|m|g|kg|ml|l|w|v|ah|a|zoll|inch|oz|stunden?|h|st[üu]ck|teil\w*|led\w*)\b", q, re.I):
        u = EINHEIT_NORM.get(m.group(4).lower(), m.group(4).lower())
        for z in (m.group(1), m.group(2), m.group(3)):
            if z:
                qe.add((z.replace(",", "."), u))
    for m in EINHEIT_RE.finditer(t):
        u = EINHEIT_NORM.get(m.group(2).lower(), m.group(2).lower())
        if (m.group(1).replace(",", "."), u) not in qe and u not in ("teile", "stueck"):
            fehler.append(f"Einheit erfunden: «{m.group(0)}» steht so in keiner Quelle")
    for m in MAT_RE_I.finditer(t):
        stamm = m.group(1).lower()
        if stamm not in q and stamm.rstrip("e") not in q:
            fehler.append(f"Material «{m.group(0)}» nicht in den Quellen")
    for m in re.finditer(r"\b(" + "|".join(_KURZ) + r")\b", t):
        if m.group(1).lower() not in q:
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
        regeln += (" Es gibt KEINE Auswahl (eine Ausführung) — schreibe nichts über Wahl, Varianten, Ausführungen, Farben zur Auswahl, "
                   "Grössen oder Verfügbarkeit (auch nicht «erhältlich»).")
    else:
        regeln += " Nenne NUR die Werte aus den Zeilen «Option …» als Auswahl, sachlich in Absatz 2 — keine Werte aus CJ-Zeilen."
    regeln += (" Nie Diamant/Brillant/Saphir/Rubin/925 — Glitzersteine heissen Zirkonia oder Strass, nur wenn eine Quelle sie nennt. "
               "Zahlen mit Einheit nur, wenn die Quelle dieselbe Einheit nennt. Altersangaben, «Man kann», englische Wörter: nie. "
               "Steht «NICHT verwenden» in den Quellen, kommt dieses Wort nicht vor. Steht «Material: WIDERSPRÜCHLICH», nenne kein Material.")
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
    if os.path.exists(TITEL_PRUEFEN):                 # 05.10.: Relaunch-Schleife hängte «Spiral-Armband» bei jedem Lauf erneut an
        erledigt |= {z.split("\t")[1] for z in open(TITEL_PRUEFEN) if z.count("\t") >= 2}
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
            fehler = pruefen(abs_, quellen, rauch, einzeln, optionswerte(p), rows, 70 if len(quellen) < 6 else MIN_W, p["title"]) if abs_ else ["leere Antwort"]
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


def live_prosa(html_):
    """Fliesstext-Absätze der Live-Beschreibung: <p> ohne Klasse, ohne 📦-Zeile, vor/neben dem Faktenblock."""
    out = []
    for m in re.finditer(r"<p(?![^>]*class=)[^>]*>(?!📦)((?:(?!</p>).)*)</p>", html_ or "", flags=re.S):
        a = strip(m.group(1))
        if a and len(a.split()) >= 4:
            out.append(a)
    return out


def live_rows(html_):
    m = re.search(r'<div class="ls-produktdetails">(.*?)</ul>\s*</div>', html_ or "", flags=re.S)
    rows = []
    for li in re.findall(r"<li>(.*?)</li>", m.group(1) if m else "", flags=re.S):
        kv = strip(li).split(":", 1)
        if len(kv) == 2:
            rows.append((kv[0].strip(), kv[1].strip()))
    return rows


def nachpruefen():
    """Alle Ledger-Handles live durch die Tore — schreibt nichts, CJ nur aus dem Cache. Rückgabe: Anzahl Handles mit Treffern."""
    hs = []
    for pfad in (LEDGER, os.path.join(REPO, "dropship", "_duenne_texte_titel_ledger.tsv")):
        if os.path.exists(pfad):
            for z in open(pfad):
                t = z.rstrip("\n").split("\t")
                if len(t) >= 4 and t[0] != "zeit" and not t[0].startswith("gid") and t[1] not in hs:
                    hs.append(t[1])
    cache = json.load(open(CJ_CACHE)) if os.path.exists(CJ_CACHE) else {}
    alt_html = {}                                     # Import-Text aus dem Ledger: seine Fakten bleiben Quelle, auch wenn er live ersetzt ist
    if os.path.exists(LEDGER):
        for z in open(LEDGER):
            t = z.rstrip("\n").split("\t")
            if len(t) >= 7 and t[0] != "zeit" and t[1] not in alt_html:
                try:
                    alt_html[t[1]] = json.loads(t[5])
                except ValueError:
                    pass
    treffer, gelesen, duenn = 0, 0, 0
    for h in hs:
        p = gql(Q, {"h": h})["productByIdentifier"]
        if not p:
            print(f"? {h}: nicht gefunden", flush=True); continue
        gelesen += 1
        sku = (p["variants"]["nodes"][0]["sku"] or "") if p["variants"]["nodes"] else ""
        cjd = cache.get(sku) or {"code": 0, "data": None}
        quellen, rows, rauch = produkt_quellen(dict(p, descriptionHtml=alt_html.get(h, p["descriptionHtml"])), cjd.get("data"), URTEILE.get(h))
        rows = live_rows(p["descriptionHtml"]) or rows
        vs = p["variants"]["nodes"]
        einzeln = len(vs) == 1 and vs[0]["title"] == "Default Title"
        absaetze = live_prosa(p["descriptionHtml"])
        fehler = []
        if absaetze and p["status"] == "ACTIVE" and len(" ".join(absaetze).split()) >= 40:
            fehler = pruefen(absaetze, quellen, rauch, einzeln, optionswerte(p), rows, 70 if len(quellen) < 6 else MIN_W, p["title"])
        elif p["status"] == "ACTIVE" and len(strip(p["descriptionHtml"]).split()) < 40:
            duenn += 1
            # 05.10. Prüferbefund: zwei Pantoletten mit «Grössen 36-43» bei Einzelvariante galten als «noch dünn», nicht als Treffer →
            # Varianten- und Stückzahl-Tor laufen auch über den alten Import-Text (ganzer Text inkl. <li>, ohne Sorglos-Block)
            kurz = strip(re.sub(r'<div[^>]*>.*?</div>|<p class="ls-liefer".*?</p>|<p>📦.*?</p>', " ", p["descriptionHtml"] or "", flags=re.S))
            if einzeln and WAHL_EINZELN.search(kurz):
                fehler.append("Einzelvariante — Import-Text verspricht Wahl: " + ", ".join(dict.fromkeys(m.group(0) for m in WAHL_EINZELN.finditer(kurz))))
            fehler += stueckzahl_pruefen(kurz, p["title"], quellen)
            if not fehler:
                print(f"○ {h}: noch dünn (< 40 Wörter) — Sache des Tageslaufs, kein Tor-Treffer", flush=True)
        seo_t = ((p.get("seo") or {}).get("title") or p["title"])      # Shopify speichert seo.title == Titel als null
        if p["status"] == "ACTIVE" and not seo_t.lower().startswith(p["title"].lower()[:40]):
            fehler.append(f"SEO-Titel alt: «{seo_t[:60]}» ≠ «{p['title'][:60]}»")
        if fehler:
            treffer += 1
            print(f"✗ {h} [{p['status']}]: " + " | ".join(fehler)[:400], flush=True)
        else:
            print(f"✓ {h} [{p['status']}]", flush=True)
    print(f"NACHPRUEFEN: {gelesen} gelesen · {treffer} mit Tor-Treffern · {duenn} noch dünn (Tageslauf)", flush=True)
    return treffer


def selbsttest():
    """Kanarienvögel der Tore vom 05.10. — ohne Shopify/CJ/Groq."""
    faelle = [
        ("Diamant-Satz", ["Das Herz ist mit mehreren Reihen kleiner Diamanten besetzt."], ["Titel: Herz-Kette", "CJ-Produktname (englisch): Diamond-Inlaid Cuban Link"], True, set(), [], "Herz-Kette", "Edelstein"),
        ("Diamant im Titel", ["Die Ohrringe sind goldfarben und tragen bunte Glassteine."], ["Titel: Diamant-Tropfen"], True, set(), [], "Diamant-Tropfen", "Edelstein"),
        ("925 belegt", ["Der Anhänger ist aus 925er Silber."], ["Titel: Anhänger", "Material (CJ): 925er Silber", "sterling silver"], True, set(), [], "Anhänger", None),
        ("Wahl bei Einzelvariante", ["Erhältlich in den Farben schwarz, pink und weiss."], ["Titel: Flipflops"], True, set(), [], "Flipflops", "Einzelvariante"),
        ("Wahl ohne Option", ["Die Tasche gibt es in den Farben Weiss, Grau und Kaffee."], ["Titel: Tasche", "Option Farbe: Schwarz, Blau"], False, {"schwarz", "blau"}, [], "Tasche", "Wahlwert"),
        ("Wahl aus Option", ["Die Tasche gibt es in den Farben Schwarz und Blau."], ["Titel: Tasche", "Option Farbe: Schwarz, Blau"], False, {"schwarz", "blau"}, [], "Tasche", None),
        ("Material-Widerspruch", ["Die Tote ist aus Rindleder gefertigt."], ["Titel: Tote", "Alter Text: Rindleder"], True, set(), [("Material", "Kunststoff")], "Tote", "widerspricht"),
        ("Material passt", ["Die Tote ist aus Kunststoff gefertigt."], ["Titel: Tote", "Material (CJ): Kunststoff"], True, set(), [("Material", "Kunststoff")], "Tote", None),
        ("Einheit erfunden", ["Es gibt Modelle mit 32 mm Lichtfläche."], ["Titel: Maske", "Option Ausführung: 3 color 32"], False, {"3 color 32"}, [], "Maske", "Einheit erfunden"),
        ("Einheit belegt", ["Der Bezug misst 45 cm im Quadrat."], ["Titel: Bezug", "Masse: 45 x 45 cm"], True, set(), [], "Bezug", None),
        ("Zielgruppe", ["Das Modell richtet sich an Erwachsene von 18 bis 59 Jahren."], ["Titel: Schuh"], True, set(), [], "Schuh", "Zielgruppe"),
        ("Man kann", ["Man kann das Set zu Kleidern tragen."], ["Titel: Set"], True, set(), [], "Set", "unpersönliche"),
        ("Negativquelle", ["Eine Spange zeigt eine Tierfigur im Frosch-Design."], ["Titel: Haarspangen-Set mit Schleife", "NICHT verwenden (alter Titel war falsch): Frosch"], True, set(), [], "Haarspangen-Set mit Schleife", "alten (falschen) Titels"),
        ("Titanlegierung ok", ["Das Inlay ist aus Titanlegierung."], ["Titel: Spange", "CJ-Beschreibung: Inlay material: Titanium alloy"], True, set(), [], "Spange", None),
        # 05.10. Prüferbefunde Stückzahl/Set
        ("Set bei Accessories*1", ["Das Set enthält vier goldfarbene Haarspangen."], ["Titel: Haarspangen-Set goldfarben", "CJ-Produktname (englisch): Starfish And Shell Hair Clip", "Lieferumfang (CJ): Accessories*1", "Anzahl Teile im Bild: 4"], True, set(), [], "Haarspangen-Set goldfarben", "ohne Beleg"),
        ("fünf statt sechs", ["Das Küchenhelfer-Set besteht aus fünf schwarzen Teilen."], ["Titel: Küchenhelfer-Set · 5-teilig", "CJ-Produktname (englisch): Kitchen Utensils Spoon Set", "Lieferumfang (CJ): Kitchen set", "CJ-Stückzahl: 6 (aus «创意尼龙6件套»)", "Anzahl Teile im Bild: 5"], True, set(), [], "Küchenhelfer-Set · 5-teilig", "Stückzahl"),
        ("sechs belegt", ["Das Küchenhelfer-Set besteht aus sechs schwarzen Teilen."], ["Titel: Küchenhelfer-Set · 6-teilig", "CJ-Produktname (englisch): Kitchen Utensils Spoon Set", "Lieferumfang (CJ): Kitchen set", "CJ-Stückzahl: 6 (aus «创意尼龙6件套»)"], True, set(), [], "Küchenhelfer-Set · 6-teilig", None),
        ("3 Stück aus Packing", ["Geliefert werden drei Spangen mit Strass-Sternen."], ["Titel: Haarspangen-Set · 3 Stück", "Lieferumfang (CJ): Hairpin*3pcs"], True, set(), [], "Haarspangen-Set · 3 Stück", None),
        ("Set ohne CJ, Bild 4", ["Das Set besteht aus vier Tassen."], ["Titel: Tassen-Set", "Alter Text: Tassen", "Anzahl Teile im Bild: 4"], True, set(), [], "Tassen-Set", None),
        ("Masse sind keine Stückzahl", ["Die Spange misst 5,6 × 3,3 cm. Geliefert wird eine Spange."], ["Titel: Haarspange", "Lieferumfang (CJ): Accessories*1", "Sichtbare Merkmale: Massangabe im Bild 5,6 × 3,3 cm"], True, set(), [], "Haarspange", None),
        ("Headset ist kein Set", ["Das Headset hat ein Mikrofon."], ["Titel: Headset mit Mikrofon", "CJ-Produktname (englisch): Gaming Headset"], True, set(), [], "Headset mit Mikrofon", None),
        ("grossen ist keine Grösse", ["Die Bluse hat einen grossen Rüschenkragen."], ["Titel: Bluse"], True, set(), [], "Bluse", None),
        ("kleinen ist kein Leinen", ["Die Kette hat kleinen Glieder und einen Karabiner."], ["Titel: Kette", "Material (CJ): Zinklegierung"], True, set(), [("Material", "Zinklegierung")], "Kette", None),
        ("Grössen bei Einzelvariante", ["Die Bluse gibt es in den Grössen 36 bis 42."], ["Titel: Bluse"], True, set(), [], "Bluse", "Einzelvariante"),
        ("Teilangabe im Set", ["Das Set enthält drei Spangen. Zwei Spangen tragen einen Stern."], ["Titel: Haarspangen-Set · 3 Stück", "Lieferumfang (CJ): Hairpin*3pcs"], True, set(), [], "Haarspangen-Set · 3 Stück", None),
    ]
    ok = 0
    for name, abs_, quellen, einzeln, opt, rows, titel, erwartet in faelle:
        f = pruefen(abs_, quellen, False, einzeln, opt, rows, 1, titel)
        f = [x for x in f if not x.startswith("nur ") and "endet nicht" not in x]          # Länge/Satzende sind hier nicht Gegenstand
        passt = (erwartet is None and not f) or (erwartet and any(erwartet in x for x in f))
        ok += bool(passt)
        print(("✓" if passt else "✗") + f" {name}: {f or 'keine Treffer'}")
    print(f"Selbsttest: {ok}/{len(faelle)} richtig")
    print("muellname:", muellname("12"), muellname("A1"), not muellname("Beer Cold Cup"))
    print("konflikt:", bool(material_konflikt("Top Layer Cowhide Bag", ["Kunststoff"])), not material_konflikt("Canvas Shoe", ["Canvas", "Kunststoff"]))
    return ok == len(faelle)


if __name__ == "__main__":
    if "--test" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if os.environ.get("NACHPRUEFEN") == "1":
        sys.exit(1 if nachpruefen() else 0)
    try:
        main()
    except zm.TagesKontingentLeer as e:
        print(f"⏸ Groq-Tageskontingent leer — Lauf endet ohne weitere Quittung: {str(e)[:160]}", flush=True)
