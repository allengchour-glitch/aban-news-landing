"""Zieht die Gratis-Versand-Schwelle in Blogartikeln und Kollektionen auf CHF 50 nach.

BEFUND (14.08.2026, live per Admin-GraphQL über ALLE 312 Artikel + 506 Kollektionen):
    100 Textstellen an 95 Objekten nennen weiterhin CHF 65 —
        30 Blogartikel   (19x body, 11x SEO-Beschreibung)
        65 Kollektionen  (61x descriptionHtml, 9x SEO-Beschreibung; 5 Objekte in beiden)
    Auf schuhe/herren-uhren/fur-ihn steht CHF 65 im Kollektionstext direkt unter der
    Theme-Leiste, die CHF 50 verspricht — zwei Zahlen auf einer Seite.

DIE WAHRHEIT, zweifach geprüft statt geglaubt (das war die ausdrückliche Auflage):
  1. Versandprofil «General profile», Zone Domestic/CH — drei aktive Tarife:
       Standard              CHF 7.00   ohne Bedingung
       Kostenloser Versand   CHF 0.00   ab TOTAL_PRICE >= 50.00
       Standard              CHF 0.00   ab TOTAL_PRICE >= 65.00   (wirkungslose Altregel)
  2. ECHTE Checkout-Raten über /cart/shipping_rates.json, CH/8001 Zürich:
       Warenkorb CHF 59.90 (1 Artikel, kein Rabatt) -> «Kostenloser Versand CHF 0.00» wird
         angeboten. 59.90 liegt UNTER 65 — also kann nur die 50er-Regel gegriffen haben.
       Warenkorb CHF 49.90 -> nur «Standard CHF 7.00».
    Die Schwelle ist damit belegt CHF 50, nicht bloss aus der Konfiguration gelesen.

WARUM DER VORGÄNGER NICHT REICHTE — das ist der eigentliche Fund:
    automation/versandschwelle_ueberall.py (13.08.) wollte genau das erledigen und hat
    45 Objekte geschafft. Sein Muster endet auf `(?![0-9.,])`. Gemeint war: «CHF 653» und
    «CHF 65.90» nicht anfassen. Tatsächlich verwirft die Klasse [0-9.,] auch den SATZPUNKT
    und das KOMMA — und fast jede Fundstelle lautet «... ab CHF 65.» oder «... ab CHF 65,
    30 Tage Rückgabe». Getroffen wurden nur die seltenen Fälle, in denen hinter der Zahl ein
    Leerzeichen folgt («gratis Versand ab CHF 50 und ...» bei michael-kors/casio/police —
    live gegengeprüft, die stehen korrekt auf 50). Alle 100 offenen Stellen scheitern an
    diesem einen Zeichen; 0 von 100 hätte der Vorgänger erwischt (nachgemessen).
    Zweiter, kleinerer Defekt derselben Zeile: die Wortliste verlangt hinter «Gratis» ein
    «Versand». Die Marken-Kollektionen (festina, loreal, weleda, lorus, tom-hope, fila,
    superdry) schreiben aber «🇨🇭 Gratis ab CHF 65 ·» — ohne das Wort Versand.
    LEHRE: Ein Ausschluss, der Dezimaltrennzeichen meint, darf nicht dieselbe Zeichenklasse
    benutzen wie die Satzzeichen. Ein Reiniger, der «45 erledigt» meldet, ist damit noch
    lange nicht fertig — hier waren es 31 % der Arbeit.

TRENNSCHARFE: Ersetzt wird nur die ZAHL, der umgebende Text bleibt Zeichen für Zeichen
stehen (aus «ab CHF 65,» wird «ab CHF 50,» — kein verlorenes Komma wie beim Lauf vom
10.08., der «ab CHF 65, 30 Tage» zu «ab CHF 50 30 Tage» verstümmelt hat).
Bedingung für einen Treffer: ein Versand-Wort steht im GLEICHEN Satzglied, höchstens 45
Zeichen davor bzw. 60 dahinter, ohne dass Satzzeichen oder ein HTML-Tag dazwischenliegen.

FEHLTREFFER AUS DEM PROBELAUF (deshalb die enge Fassung):
  - /pages/geschenkideen-muttertag-2026: «LuxeStyle Geschenkkarte ab CHF 65.» Das ist ein
    PRODUKTPREIS, keine Versandschwelle. Kein Versandwort im Satz -> korrekt übersprungen.
    (Ein Muster, das nur nach «ab CHF 65» sucht, hätte den Preis der Geschenkkarte gesenkt.)
  - «CHF 65.90» / «CHF 653» werden von `(?![0-9])(?![.,][0-9])` ausgeschlossen, ohne dass
    dabei Satzpunkt und Komma mitverboten werden — genau der Fehler des Vorgängers.
  - Artikel «weihnachtsgeschenke-2026»: «bei einer gemeinsamen Bestellung ab CHF 65
    entfallen die Versandkosten» — Werbewort steht HINTER der Zahl, deshalb die zweite
    Bauform. Sie verlangt «Versandkosten/liefern wir/...» im selben Satz.
  - Zahlen wie «112 x 65 x 40 cm» oder «65 %» tragen kein CHF und werden nie gesehen.

BEWUSST NICHT ANGEFASST:
  - /pages/agb §3 («Gratis-Versand erfolgt ab einem Bestellwert von CHF 65») — Vertragstext,
    in der Fehlersuche vom 14.08. ausdrücklich als «kein Mangel» eingestuft (bei CHF 65 ist
    der Versand tatsächlich gratis, die Aussage ist wahr, nur zu hoch angesetzt). Eine
    Änderung an AGB gehört dem Betreiber, nicht einem Reiniger. Bleibt offen und gemeldet.
  - Produkte: dort ist die Schwelle bereits auf 50 (Stichprobe: die Beschreibung von
    boho-jacke-fiore sagt live «🇨🇭 Gratis-Versand ab CHF 50»).

QUELLE MIT REPARIERT (Regel: zu jedem Nachfüllen gehört, wer das Feld beim NÄCHSTEN Objekt
schreibt) — vier Generatoren legten weiterhin CHF 65 an:
    automation/autopilot/shop_seo_guides.mjs   Kollektions-Intro (schreibt genau die hier
                                               geputzten Texte neu)
    automation/gemini_ad_copy.mjs              EN-Anzeigentext (DE stand schon auf 50 —
                                               halb korrigiert, die englische Zeile blieb)
    automation/local/ig-dm-browser.mjs         Standardantwort auf Versandfragen im DM
    automation/pod_translate_page.mjs          EN-Vertrauensleiste + FAQ der POD-Seite
Ohne diese vier hätte der nächste Kollektions-Lauf die Zahl wieder eingesetzt.

DRY=1 meldet nur. Ledger wird nach JEDER Zeile geflusht.
"""
import json, os, re, subprocess, sys, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
API = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
DRY = os.environ.get("DRY") == "1"
LEDGER = "dropship/_versandschwelle_blog_kollektion.txt"

# Ein Versand-Wort. «Gratis» darf allein stehen (Marken-Kollektionen: «🇨🇭 Gratis ab CHF 65»).
WORT = (r"(?:[Gg]ratis(?:[- ]?[Vv]ersand)?|GRATIS|[Gg]ratisversand"
        r"|[Vv]ersandkostenfrei|[Kk]ostenlose[rmnsz]?\s+[Vv]ersand"
        r"|[Vv]ersandfrei|[Pp]ortofrei)")
# Wort DANACH — für «Bestellung ab CHF 65 entfallen die Versandkosten».
WORT_NACH = WORT + r"|[Vv]ersandkosten|liefern wir|versenden wir"
# Der Betrag. Satzpunkt und Komma sind ERLAUBT (der Fehler des Vorgängers), eine Ziffer
# direkt dahinter oder ein echter Dezimalteil nicht: «CHF 653», «CHF 65.90» bleiben stehen.
BETRAG = r"(CHF\s*)65((?:[.,](?:00|-{1,2}))?)(?![0-9])(?![.,][0-9])"
# Zwischen Werbewort und Betrag darf kein Satzende und kein HTML-Tag liegen.
LUECKE = r"[^<>.!?]{0,45}?"

VOR = re.compile(WORT + LUECKE + BETRAG)
NACH = re.compile(BETRAG + r"(?=[^<>.!?]{0,60}?(?:" + WORT_NACH + r"))")


def berichtigen(text):
    """Ersetzt ausschliesslich die Zahl 65 durch 50 und lässt alles andere unberührt."""
    if not text:
        return text
    neu = VOR.sub(lambda m: m.group(0)[: m.start(1) - m.start(0)] + m.group(1) + "50" + m.group(2), text)
    neu = NACH.sub(lambda m: m.group(1) + "50" + m.group(2), neu)
    return neu


def gql(q, v=None):
    """Eine gescheiterte Anfrage ist kein Ergebnis: es wird wiederholt, sonst None."""
    with open("/tmp/_vbk.json", "w") as f:
        json.dump({"query": q, "variables": v or {}}, f)
    for versuch in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60", API,
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_vbk.json"],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(3 + versuch * 3)
    return None


def seiten(query, feld):
    cur, raus = None, []
    while True:
        d = gql(query, {"c": cur})
        if d is None:
            print(f"  ABBRUCH: {feld} unvollständig geladen — kein Schreiben.", flush=True)
            sys.exit(1)          # lieber gar nichts als auf halber Liste schreiben
        pg = d["data"][feld]
        raus += pg["nodes"]
        if not pg["pageInfo"]["hasNextPage"]:
            return raus
        cur = pg["pageInfo"]["endCursor"]


ARTIKEL_Q = """query($c:String){ articles(first:50, after:$c){
  pageInfo{hasNextPage endCursor}
  nodes{ id title handle body
    seoDesc: metafield(namespace:"global", key:"description_tag"){ id value } } } }"""

KOLL_Q = """query($c:String){ collections(first:50, after:$c){
  pageInfo{hasNextPage endCursor}
  nodes{ id title handle descriptionHtml seo{ description } } } }"""


def main():
    aufgaben = []

    for a in seiten(ARTIKEL_Q, "articles"):
        alt_body = a.get("body") or ""
        md = a.get("seoDesc") or {}
        alt_seo = md.get("value") or ""
        neu_body, neu_seo = berichtigen(alt_body), berichtigen(alt_seo)
        if neu_body != alt_body or neu_seo != alt_seo:
            aufgaben.append(("artikel", a["id"], a["handle"],
                             {"body": (alt_body, neu_body), "seo": (alt_seo, neu_seo)}))

    for c in seiten(KOLL_Q, "collections"):
        alt_html = c.get("descriptionHtml") or ""
        alt_seo = (c.get("seo") or {}).get("description") or ""
        neu_html, neu_seo = berichtigen(alt_html), berichtigen(alt_seo)
        if neu_html != alt_html or neu_seo != alt_seo:
            aufgaben.append(("kollektion", c["id"], c["handle"],
                             {"body": (alt_html, neu_html), "seo": (alt_seo, neu_seo)}))

    stellen = sum(sum(1 for f in t[3].values() if f[0] != f[1]) for t in aufgaben)
    print(f"Objekte: {len(aufgaben)}  Textstellen: {stellen}", flush=True)
    for art in ("artikel", "kollektion"):
        n = [t for t in aufgaben if t[0] == art]
        print(f"   {art}: {len(n)}", flush=True)
    if DRY:
        for t in aufgaben:
            for name, (alt, neu) in t[3].items():
                if alt == neu:
                    continue
                for m in re.finditer(r"CHF\s*50", neu):
                    print(f"   [{t[0]}/{name}] {t[2]}\n"
                          f"       …{re.sub(chr(92)+'s+', ' ', neu[max(0,m.start()-70):m.end()+40])}…",
                          flush=True)
        return
    if not aufgaben:
        return

    f = open(LEDGER, "a")
    n = 0
    for art, gid, handle, felder in aufgaben:
        body_neu, seo_neu = felder["body"][1], felder["seo"][1]
        if art == "artikel":
            eingabe = {"body": body_neu}
            if felder["seo"][0] != seo_neu:
                eingabe["metafields"] = [{"namespace": "global", "key": "description_tag",
                                          "type": "single_line_text_field", "value": seo_neu}]
            r = gql("mutation($id:ID!,$a:ArticleUpdateInput!){articleUpdate(id:$id,article:$a)"
                    "{userErrors{field message}}}", {"id": gid, "a": eingabe})
            fehler = (((r or {}).get("data") or {}).get("articleUpdate") or {}).get("userErrors")
        else:
            eingabe = {"id": gid, "descriptionHtml": body_neu}
            if felder["seo"][0] != seo_neu:
                eingabe["seo"] = {"description": seo_neu}
            r = gql("mutation($i:CollectionInput!){collectionUpdate(input:$i)"
                    "{userErrors{field message}}}", {"i": eingabe})
            fehler = (((r or {}).get("data") or {}).get("collectionUpdate") or {}).get("userErrors")
        if r is None or fehler:
            grund = fehler[0]["message"][:70] if fehler else "keine Antwort"
            print(f"  OFFEN {art} {handle}: {grund}", flush=True)
            continue          # offen lassen, nicht ins Ledger — nächster Lauf holt es nach
        n += 1
        f.write(f"{gid}\t{art}\t{handle}\n")
        f.flush()
        os.fsync(f.fileno())
        time.sleep(0.25)
    print(f"FERTIG: {n} von {len(aufgaben)} Objekten berichtigt", flush=True)


if __name__ == "__main__":
    main()
