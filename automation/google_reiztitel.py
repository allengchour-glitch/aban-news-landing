#!/usr/bin/env python3
"""google_reiztitel.py — Reizwörter aus Produkttiteln im Google-Kanal nehmen (04.10.2026, «fix 12 h lang alles»).

GEMESSEN 04.10. 22:25 UTC (productsCount, status:active AND publication_ids:302872297857):
  «Sexy» im Titel 44 · «Spicy Girl» 6 · «verführerisch» 1 — davon 7 im Google-Blocker «Restricted adult content» /
  «Personalized advertising: Sexual interests» (299 Produkte, dieselbe Menge in beiden Klassen).
Der Google-Klassifikator liest Titel UND Bild; «Sexy» im Titel trägt nichts zum Verkauf bei (03.10. gemessen: 0×
«Inappropriate title»), aber es ist das billigste Signal, das wir Google geben. Ein sachlicher Titel verliert nichts.

REGELN (nur ganze Wörter, deutsch gedacht — «Sexy» steckt in keinem Kompositum, «Hot» bleibt: Hot Wheels):
  «Sexy & Cool» → weg · «, sexy» → weg · «Sexy & X» → «X» · «Sexy X» → «X» · «X Sexy Y» → «X Y»
  «Spicy Girl» / «Spicy-Girl» (auch in «…») → weg · «verführerisch\\w*» → weg (Komma davor mit)
  danach: doppelte Leerzeichen, hängende «&,–-·» an Anfang/Ende weg, erster Buchstabe gross. Ergebnis < 8 Zeichen → übersprungen.
SEO-Titel (seo.title) wird gleich behandelt, wenn er ein Reizwort trägt. Ledger dropship/_google_reiztitel.tsv (alt → neu,
Rückweg = alt). Ohne SCHARF=1 nur Anzeige. --kanarienvogel prüft die Regeln an festen Fällen.
"""
import os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship/_google_reiztitel.tsv")
GOOGLE = "302872297857"
SCHARF = os.environ.get("SCHARF") == "1"

REGELN = [
    (re.compile(r"\s*[,–-]?\s*\bSexy\s*&\s*Cool\b", re.I), ""),
    (re.compile(r",\s*sexy\b", re.I), ""),
    (re.compile(r"\bSexy\s*&\s*", re.I), ""),
    (re.compile(r"\s*&\s*Sexy\b", re.I), ""),
    (re.compile(r"[«»\"']?\bSpicy[- ]Girl\b[«»\"']?", re.I), ""),
    (re.compile(r",?\s*\bverführerisch\w*", re.I), ""),
    (re.compile(r"\bSexy\b", re.I), ""),
]
REIZ = re.compile(r"\bSexy\b|\bSpicy[- ]Girl\b|\bverführerisch", re.I)

# 05.10.2026 (Prüfer): der Lauf nahm das Reizwort nur aus Titel + SEO-Titel. Gemessen im Google-Kanal: 17 Meta-
# Beschreibungen, 50 Alt-Texte («Sexy Jumpsuit · Damen – Bild 3»), 175 Beschreibungstexte («Der Sexy Jumpsuit ist …»,
# «sportlich-sexy und») trugen es weiter — Google liest alle drei. Regeln für LAUFTEXT (Bindewörter mitnehmen, damit kein
# «eleganten und  Handschuhe» bleibt): «sportlich-sexy» → «sportlich» · «sexy, leicht» → «leicht» · «elegant und sexy» →
# «elegant» · «sexy und elegant» → «elegant» · «verführerisch(e/en/es)» ebenso · «Spicy Girl» weg. Rückweg: alter Text in
# dropship/_google_reiztitel_texte.jsonl (handle, id, seo_desc, body, alts).
REIZWORT = r"(?:sexy|verf[üu]hrerisch\w*|spicy[- ]girl)"
_UND = r"(?:\s+und\s+|,\s*|\s*(?:&amp;|&)\s*)"       # Bindewörter — «&amp;» ist im HTML das «&» (sonst bleibt «amp;»)
_ANF = r"[«»\"'„“”]"
TEXT_REGELN = [
    (re.compile(r"\s*[,–-]?\s*\bSexy\s*(?:&amp;|&)\s*Cool\b", re.I), ""),
    # «im „Spicy-Girl“-Stil», «im sexy und verführerischen Stil» → ganz weg
    (re.compile(r"\s+im\s+(?:" + _ANF + r"*" + REIZWORT + _ANF + r"*" + _UND + r"?)+-?\s*Stil\b", re.I), ""),
    (re.compile(r"\s*" + _ANF + r"\s*\bSpicy[- ]Girl\b\s*" + _ANF, re.I), ""),
    (re.compile(_UND + r"?\s*zugleich\s+" + REIZWORT + r"\b", re.I), "\x00"),           # elegant und zugleich sexy → elegant
    (re.compile(r"[-–]" + REIZWORT + r"\b", re.I), "\x00"),                              # sportlich-sexy → sportlich
    (re.compile(_UND + REIZWORT + r"\b", re.I), "\x00"),                                  # elegant und sexy → elegant
    (re.compile(r"\b" + REIZWORT + r"\b" + _UND, re.I), "\x00"),                         # sexy und elegant → elegant
    # «eine sexy Note», «einen sexy Look» → «eine modische Note» (Attribut ersetzen statt Lücke lassen); nur Klein-
    # schreibung «sexy» = Lauftext — «Der Sexy Jumpsuit» ist der alte Titel und wird gelöscht
    (re.compile(r"\b([Ee]inen)\s+sexy\s+(?=[A-ZÄÖÜ])"), r"\1 modischen "),
    (re.compile(r"\b([Ee]ine|[Ss]eine|[Ii]hre|[Dd]ie|[Dd]er)\s+sexy\s+(?=[A-ZÄÖÜ])"), r"\1 modische "),
    (re.compile(r"\b" + REIZWORT + r"\b", re.I), "\x00"),
]
TEXTE_MAX = int(os.environ.get("TEXTE_MAX", "300"))
TEXTE_LEDGER = os.path.join(REPO, "dropship/_google_reiztitel_texte.jsonl")


def sachlich_text(t):
    """Reizwort aus Lauftext/HTML nehmen; Satzzeichen und Leerzeichen danach glätten. Das Sentinel \x00 markiert die
    Stelle, damit nur DORT ein Satzanfang gross geschrieben wird (nicht nach jedem Tag)."""
    neu = t
    for rx, ersatz in TEXT_REGELN:
        neu = rx.sub(ersatz, neu)
    # Satzanfang: Sentinel steht am Textanfang, nach «. », nach «>» → nächster Buchstabe gross
    neu = re.sub(r"(^|[.!?]\s+|>)\s*\x00\s*(\S)", lambda m: m.group(1) + m.group(2).upper(), neu)
    neu = neu.replace("\x00", "")
    neu = re.sub(r"[ \t]{2,}", " ", neu)
    neu = re.sub(r" ([,.;:!?])", r"\1", neu)
    neu = re.sub(r"(>|^)\s+([,.;:])", r"\1\2", neu)
    neu = re.sub(r"\(\s*\)", "", neu)
    return neu if t.startswith("<") else neu.strip()


def kanarienvogel_text():
    faelle = [("Zweiteiliger Badeanzug mit Front-Zip – sportlich-sexy und leicht.", "Zweiteiliger Badeanzug mit Front-Zip – sportlich und leicht."),
              ("Sommerliches Träger-Kleid mit Print – sexy, leicht und ideal für den Sommer.", "Sommerliches Träger-Kleid mit Print – leicht und ideal für den Sommer."),
              ("Diese eleganten und verführerischen Handschuhe sind das perfekte Accessoire.", "Diese eleganten Handschuhe sind das perfekte Accessoire."),
              ("<p>Der Sexy Jumpsuit ist ein elegantes Teil.</p>", "<p>Der Jumpsuit ist ein elegantes Teil.</p>"),
              ("Sexy Jumpsuit · Damen – Bild 3", "Jumpsuit · Damen – Bild 3"),
              ("Ein Kleid, das sexy und elegant wirkt.", "Ein Kleid, das elegant wirkt."),
              ("Minikleid «Spicy Girl» im Bodycon-Stil, verführerisch geschnitten.", "Minikleid im Bodycon-Stil geschnitten."),
              ("Hot Wheels Drift Board für Kinder.", "Hot Wheels Drift Board für Kinder."),
              ("Sexysmart Hülle fürs Handy.", "Sexysmart Hülle fürs Handy."),
              ("Anlass: Scherz &amp; Sexy &amp; Derbes Lieferumfang", "Anlass: Scherz &amp; Derbes Lieferumfang"),
              ("Dieses trendige Crop-Top im „Spicy-Girl“-Stil ist ein Must-have.", "Dieses trendige Crop-Top ist ein Must-have."),
              ("Diese Weste aus Chenille im sexy und verführerischen Stil ist ein Hingucker.", "Diese Weste aus Chenille ist ein Hingucker."),
              ("<ul><li>luftiger Stoff</li><li>sexy Schnitt</li></ul>", "<ul><li>luftiger Stoff</li><li>Schnitt</li></ul>"),
              ("Das verleiht dem Kleid eine sexy Note, während die Falten fallen.", "Das verleiht dem Kleid eine modische Note, während die Falten fallen."),
              ("Frauen, die einen sexy und stilvollen Look schätzen.", "Frauen, die einen stilvollen Look schätzen."),
              ("Ein Hauch Sexyness bleibt.", "Ein Hauch Sexyness bleibt."),
              ("Stil: Spicy Girl, schlicht Inhalt: 1", "Stil: schlicht Inhalt: 1"),
              ("eine elegante und zugleich sexy Ausstrahlung. Ideal", "eine elegante Ausstrahlung. Ideal")]
    ok = 0
    for alt, soll in faelle:
        ist = sachlich_text(alt)
        ok += ist == soll
        print(f"{'✓' if ist == soll else '✗'} {alt!r} → {ist!r}" + ("" if ist == soll else f"  (soll {soll!r})"))
    print(f"Kanarienvögel Text {ok}/{len(faelle)}")
    return ok == len(faelle)


def texte(handles_bekannt=()):
    """Meta-Beschreibung, Alt-Texte und Beschreibungstext im Google-Kanal vom Reizwort befreien (SCHARF=1 schreibt)."""
    import json
    q = f"status:active AND publication_ids:{GOOGLE} AND (Sexy OR \"Spicy Girl\" OR verführerisch*)"
    nodes, cursor = [], None
    while True:
        d = gql("query($q:String,$c:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} "
                "nodes{id handle title seo{title description} descriptionHtml media(first:12){nodes{id alt}}}}}", {"q": q, "c": cursor})
        pg = d["products"]; nodes += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cursor = pg["pageInfo"]["endCursor"]
    z = {"geprueft": len(nodes), "seo_desc": 0, "body": 0, "alt": 0, "geaendert": 0, "fehler": 0, "uebersprungen": 0}
    led = open(TEXTE_LEDGER, "a", encoding="utf-8") if SCHARF else None
    getan = 0
    for n in nodes:
        if getan >= TEXTE_MAX:
            z["uebersprungen"] += 1; continue
        sd_alt = n["seo"].get("description") or ""
        body_alt = n["descriptionHtml"] or ""
        alts = [(m["id"], m.get("alt") or "") for m in n["media"]["nodes"]]
        sd_neu = sachlich_text(sd_alt) if REIZ.search(sd_alt) else sd_alt
        body_neu = sachlich_text(body_alt) if REIZ.search(body_alt) else body_alt
        alts_neu = [(mid, sachlich_text(a) if REIZ.search(a) else a) for mid, a in alts]
        alt_diff = [(mid, a, b) for (mid, a), (_, b) in zip(alts, alts_neu) if a != b]
        if sd_neu == sd_alt and body_neu == body_alt and not alt_diff:
            continue
        z["seo_desc"] += sd_neu != sd_alt; z["body"] += body_neu != body_alt; z["alt"] += bool(alt_diff)
        print(f"  {n['handle'][:48]:48} " + " · ".join(x for x in [
            f"META {sd_alt[:60]!r}→{sd_neu[:60]!r}" if sd_neu != sd_alt else "",
            f"TEXT {len(re.findall(REIZWORT, body_alt, re.I))}×" if body_neu != body_alt else "",
            f"ALT {len(alt_diff)}× {alt_diff[0][1][:40]!r}→{alt_diff[0][2][:40]!r}" if alt_diff else ""] if x), flush=True)
        if not SCHARF:
            continue
        getan += 1
        fehler = []
        if sd_neu != sd_alt or body_neu != body_alt:
            eingabe = {"id": n["id"]}
            if body_neu != body_alt:
                eingabe["descriptionHtml"] = body_neu
            if sd_neu != sd_alt:
                eingabe["seo"] = {"title": n["seo"].get("title") or "", "description": sd_neu}   # SEOInput ersetzt beide Felder
            r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){userErrors{message}}}", {"p": eingabe})
            fehler += r["productUpdate"]["userErrors"]
        if alt_diff:
            r = gql("mutation($f:[FileUpdateInput!]!){fileUpdate(files:$f){userErrors{message}}}",
                    {"f": [{"id": mid, "alt": b} for mid, a, b in alt_diff]})
            fehler += r["fileUpdate"]["userErrors"]
        if fehler:
            z["fehler"] += 1; print(f"    ⚠️ {fehler}", flush=True); continue
        z["geaendert"] += 1
        led.write(json.dumps({"zeit": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "handle": n["handle"], "id": n["id"],
                              "seo_desc": sd_alt if sd_neu != sd_alt else None, "body": body_alt if body_neu != body_alt else None,
                              "alts": [(mid, a) for mid, a, b in alt_diff]}, ensure_ascii=False) + "\n"); led.flush()
        time.sleep(0.4)
    print("FERTIG TEXTE: " + " · ".join(f"{k} {v}" for k, v in z.items()) + ("" if SCHARF else " (TROCKEN)"), flush=True)
    return z


def sachlich(t):
    neu = t
    for rx, ersatz in REGELN:
        neu = rx.sub(ersatz, neu)
    neu = re.sub(r"\s{2,}", " ", neu).strip()
    neu = re.sub(r"^[\s&,–\-·]+|[\s&,–\-·]+$", "", neu).strip()
    neu = re.sub(r"\s+,", ",", neu)
    if neu:
        neu = neu[0].upper() + neu[1:]
    return neu


def kanarienvogel():
    faelle = [("Hot Wheels Drift Board Skateboard", "Hot Wheels Drift Board Skateboard"),
              ("Sexy & Vielseitiger Spitzen-Rock mit hoher Taille", "Vielseitiger Spitzen-Rock mit hoher Taille"),
              ("Damen Denim Rock Midi Sexy & Cool", "Damen Denim Rock Midi"),
              ("Traglose, rueckenfreie, sexy Figurkleid in Gelb/Weiss", "Traglose, rueckenfreie Figurkleid in Gelb/Weiss"),
              ("Süsses, verführerisches Rüschenkleid", "Süsses Rüschenkleid"),
              ("Spicy Girl Mini-Kleid mit Schnürung", "Mini-Kleid mit Schnürung"),
              ("Minikleid «Spicy-Girl» im Bodycon-Stil", "Minikleid im Bodycon-Stil"),
              ("Sexy Jumpsuit · Damen", "Jumpsuit · Damen"),
              ("Elegante Träger Sexy Damenkleid", "Elegante Träger Damenkleid"),
              ("Sexysmart Hülle", "Sexysmart Hülle")]
    ok = 0
    for alt, soll in faelle:
        ist = sachlich(alt)
        ok += ist == soll
        print(f"{'✓' if ist == soll else '✗'} {alt!r} → {ist!r}" + ("" if ist == soll else f"  (soll {soll!r})"))
    print(f"Kanarienvögel {ok}/{len(faelle)}")
    return ok == len(faelle)


def main():
    if "--kanarienvogel" in sys.argv:
        sys.exit(0 if (kanarienvogel() and kanarienvogel_text()) else 1)
    if not (kanarienvogel() and kanarienvogel_text()):
        sys.exit("ABBRUCH: Kanarienvögel schlagen fehl")
    if "--texte" in sys.argv:
        texte(); return
    q = f"status:active AND publication_ids:{GOOGLE} AND (title:Sexy OR title:\"Spicy Girl\" OR title:verführerisch*)"
    nodes, cursor = [], None
    while True:
        d = gql("query($q:String,$c:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} "
                "nodes{id handle title seo{title description}}}}", {"q": q, "c": cursor})
        pg = d["products"]; nodes += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cursor = pg["pageInfo"]["endCursor"]
    treffer = [n for n in nodes if REIZ.search(n["title"]) or REIZ.search(n["seo"].get("title") or "")]
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {len(nodes)} Suchtreffer · {len(treffer)} mit Reizwort · "
          f"{'SCHARF' if SCHARF else 'TROCKEN'}", flush=True)
    ok = uebersprungen = fehler = 0
    led = open(LEDGER, "a", encoding="utf-8") if SCHARF else None
    for n in treffer:
        alt, neu = n["title"], sachlich(n["title"])
        seo_alt = n["seo"].get("title") or ""
        seo_neu = sachlich(seo_alt) if REIZ.search(seo_alt) else seo_alt
        if len(neu) < 8 or (neu == alt and seo_neu == seo_alt):
            uebersprungen += 1; print(f"  übersprungen {n['handle'][:50]}: {alt!r} → {neu!r}"); continue
        print(f"  {n['handle'][:50]:50} {alt!r} → {neu!r}" + (f"  SEO {seo_alt!r} → {seo_neu!r}" if seo_neu != seo_alt else ""), flush=True)
        if not SCHARF:
            continue
        eingabe = {"id": n["id"], "title": neu}
        if seo_neu != seo_alt:
            # 05.10.2026 (Prüfer): SEOInput ERSETZT title UND description — {"title": …} allein löschte bei 17 Produkten die
            # Meta-Beschreibung. Immer beide Felder senden, Reizwort auch aus der Beschreibung.
            eingabe["seo"] = {"title": seo_neu, "description": sachlich(n["seo"].get("description") or "")}
        r = gql("mutation($p:ProductUpdateInput!){productUpdate(product:$p){product{title seo{title}} userErrors{message}}}", {"p": eingabe})
        err = r["productUpdate"]["userErrors"]
        ist = (r["productUpdate"]["product"] or {}).get("title")
        if err or ist != neu:
            fehler += 1; print(f"    ⚠️ {err or ist}", flush=True); continue
        ok += 1
        led.write(f"{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{n['handle']}\t{n['id']}\t{alt}\t{neu}\t{seo_alt}\t{seo_neu}\n"); led.flush()
        time.sleep(0.4)
    print(f"FERTIG: {ok} umbenannt · {uebersprungen} übersprungen · {fehler} Fehler" + ("" if SCHARF else " (TROCKEN)"))
    # 05.10.2026: nach den Titeln die Texte (Meta-Beschreibung, Alt-Texte, Beschreibung) — Google liest sie mit.
    texte()


if __name__ == "__main__":
    main()
