"""Bringt alle Lieferzeit- und Liefergebiets-Aussagen im Shop auf EINE Wahrheit.

BEFUND (14.08.2026, live gegengeprueft)
=======================================
Der Shop machte VIER sich widersprechende Zusagen fuer dieselbe Ware, und 1'037 aktive
Produkte bewarben Lieferzeiten in die EU und in die USA:

  Versandrichtlinie  «Schweiz: in der Regel 5-12 Werktage»
  Startseite         «Blitzversand-Artikel ... oft schon am naechsten Tag, alle anderen
                      Produkte in 2-14 Tagen»
  Produkt-Kopfblock  «📦 Lieferzeit (je nach Land): 🇨🇭 CH / 🇪🇺 EU: 10-18 Tage ·
                      🇺🇸 USA: 12-22 Tage» (1'004 Produkte, 3 Stufen)
  Produkt-Trustzeile «🚚 Lieferung ca. 10-20 Tage» (27'276 Produkte)

Auf ein und derselben Seite standen beide Produktangaben gleichzeitig (live geprueft an
15411554910593 «Aromadiffusor Holzmaserung»: Kopfblock 10-18 Werktage, Trustzeile 10-20 Tage).

DIE WAHRHEIT, HERGELEITET (nicht erfunden)
==========================================
Liefergebiet — aus dem Versandprofil und den Markets, nicht aus dem Text:
  * Shopify-Markets: EIN aktiver Markt «Switzerland», Regionen exakt ['CH'].
    Es kann ueberhaupt niemand ausserhalb der Schweiz auschecken.
  * Versandrichtlinie: «Wir liefern ausschliesslich in die Schweiz und nach Liechtenstein.
    Ein Versand in andere Laender (z. B. in die EU oder in die USA) ist derzeit nicht moeglich.»
  * Das Standardprofil hat zwar noch eine Zone «International / Rest of World» (CHF 15,
    aktiv) — sie ist wirkungslos, weil kein Markt sie freischaltet. Sie wurde NICHT
    angefasst: eine Zone zu loeschen ist eine Betreiber-Entscheidung, kein Textfehler.
  => Jede EU- und USA-Lieferzusage ist falsch und muss weg.

Lieferzeit — je Bezugsweg, abgeleitet aus den Lieferanten-Tags. Die Zahlen sind NICHT neu
erfunden, sondern die bereits vorhandenen, spezifischsten Werte des Shops selbst
(data-tier im Kopfblock bzw. Metafeld custom.lieferzeit), nur ohne die EU/USA-Spalten:

  ch      CH-Lager (Fortura, Tags ch-lager/fortura/schweiz-versand)   1-3 Werktage
  eu      EU-Lager (Tag eu-lager)                                     5-10 Werktage
  pod     Druck auf Bestellung (printful/prodigi/fertig-*/pod-*)      7-14 Werktage
  direkt  Direktversand ab Herstellerlager (Rest, CJ)                10-18 Werktage

Gegenprobe der Einstufung: die 1'004 Produkte mit vorhandenem data-tier stimmen zu
1'004/1'004 mit dieser Tag-Einstufung ueberein (488 pod=eu-druck, 449+66 direkt=china/
standard, 1 pod stand faelschlich auf «standard»).

FEHLTREFFER AUS DEM PROBELAUF (nicht angefasst)
===============================================
Der erste Entwurf suchte schlicht nach «USA» bzw. «EU». Das traf Aussagen, die voellig
korrekt sind und mit Lieferung nichts zu tun haben:
  * «75 % recycelter Polyester ... (Produktion in den USA/Mexiko)»  — HERKUNFT, kein Ziel
  * «Rohprodukte aus den USA und China bezogen»                     — Herkunft
  * «Verfuegt ueber Steckdosen fuer USA, Europa, Grossbritannien»   — Produkteigenschaft
  * «Stromversorgung fuer Europa (220V) und USA (110V) kompatibel»  — Produkteigenschaft
  * «Asiatische Groessen sind 1-2 Groessen kleiner als in Europa/USA» — Groessenhinweis
  * «Hut Zylinder USA», «Muetze USA Sparkle»                        — Produktname
  * «Versand aus EU-Produktion · Lieferung CH ca. 5-10 Werktage»    — EU ist hier der
    PRODUKTIONSORT, das Ziel ist korrekt CH. Nur die Zahl wird angeglichen, das «aus
    EU-Produktion» bleibt stehen.
Darum greift dieses Skript ausschliesslich ueber benannte, vollstaendig ausformulierte
Bausteine — nie ueber ein blosses Landeswort.

ENTSCHEIDUNG
============
  * Nichts wird geloescht, nur Text ersetzt. Kein Produkt wechselt den Status.
  * Die Zone «International» im Versandprofil bleibt (Betreiber-Entscheidung).
  * Die Versandrichtlinie wird auf die vier Bezugswege erweitert. Richtung der Korrektur:
    von «max. 12 Werktage» auf «bis 18 Werktage bei Direktversand» — also eine LAENGERE,
    ehrliche Zusage. Eine zu kurze Zusage macht jede Bestellung ab Werktag 13 zum
    Ruecktrittsfall; das ist der teurere Fehler.
  * Quelle mitrepariert (Regel 7): automation/delivery_block.mjs erzeugte den EU/USA-Block
    und haette ihn beim naechsten Lauf neu geschrieben; cj_category_fill.mjs,
    cj_trending_import.mjs und cj_gaps_import.mjs schrieben die widersprechenden
    Trustzeilen fuer JEDES neue Produkt.

BEDIENUNG
  DRY=1 python3 automation/versandaussagen_wahrheit.py        # zeigt nur
  python3 automation/versandaussagen_wahrheit.py              # schreibt
  PHASE=produkte|richtlinie|metafeld|alle
Ledger dropship/_versandaussagen_wahrheit.txt, Zeile fuer Zeile mit flush (Regel 5).
Eine gescheiterte Anfrage kommt NICHT ins Ledger (Regel 6) und wird beim naechsten Lauf
erneut versucht.
"""
import json, os, re, sys, time, urllib.request, html as _html
import threading
from concurrent.futures import ThreadPoolExecutor

TOK = open("/tmp/cj_shop_token.txt").read().strip()
SHOP = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
DRY = os.environ.get("DRY") == "1"
PHASE = os.environ.get("PHASE", "alle")
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_versandaussagen_wahrheit.txt"
LIMIT = int(os.environ.get("LIMIT", "0"))  # 0 = alle; >0 nur fuer den Probelauf

# ---------------------------------------------------------------- Wahrheit
# ⚠️ DIE ZAHLEN SIND NICHT VON MIR. Sie stehen bereits als entschiedene Wahrheit im Shop —
# ein anderer Reiniger (automation/seiten_versandtext.py) hat die Shop-Seiten am 12.08. genau
# darauf vereinheitlicht, und die Startseite trägt dieselbe Aussage. Wer hier eine EIGENE
# Zahl erfindet, erzeugt die fünfte widersprechende Zusage statt die vier aufzulösen.
#   /pages/versand-lieferung (live):  «🇨🇭 Blitzversand-Artikel ab CH-Lager: 1–2 Werktage ·
#     übrige Lagerartikel: 2-7 Werktage · 📦 Bestell- / Print-on-Demand- & Übersee-Artikel:
#     10-20 Werktage (Maximum-Zeiten)»
#   2'593 CH-Lager-Produktseiten (live): «Versand aus der Schweiz – Lieferung in nur 1–2
#     Werktagen (DPD)» — deshalb wird an diesen Seiten NICHTS geändert, sie sind schon wahr.
# pod = 7–14 liegt innerhalb der auf der Seite genannten Maximal-Spanne 10–20 für Bestell-/
# POD-Ware und entspricht der bereits im Shop stehenden Stufe «eu-druck» — eine präzisere
# Angabe unter demselben Dach ist kein Widerspruch.
SPANNE = {"ch": "1–2", "eu": "2–7", "pod": "7–14", "direkt": "10–20"}
WEGNAME = {
    "ch": "ab Schweizer Lager",
    "eu": "ab EU-Lager",
    "pod": "Druck auf Bestellung",
    "direkt": "Direktversand ab Herstellerlager",
}
POD_TAGS = {"printful_personalized_product", "prodigi_personalized_product", "selbst-gestalten"}
CH_TAGS = {"ch-lager", "fortura", "schweiz-versand"}


def weg(tags):
    T = {str(t).lower() for t in (tags or [])}
    if T & CH_TAGS:
        return "ch"
    if T & POD_TAGS or any(t.startswith("pod-") or t.startswith("fertig-") for t in T):
        return "pod"
    if "eu-lager" in T:
        return "eu"
    return "direkt"


def gql(query, variables=None, versuche=5):
    """Regel 6: gibt nur bei ECHTER Antwort etwas zurueck, sonst None."""
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    for i in range(versuche):
        try:
            rq = urllib.request.Request(
                SHOP, data=body,
                headers={"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(rq, timeout=60) as r:
                d = json.loads(r.read())
            if d.get("errors"):
                msg = json.dumps(d["errors"])
                if "THROTTLED" in msg or "Throttled" in msg:
                    time.sleep(3 + 2 * i)
                    continue
                sys.stderr.write("GraphQL-Fehler: " + msg[:300] + "\n")
                return None
            return d.get("data")
        except Exception as e:  # Netz/Proxy-Blip: erneut versuchen, nie als Ergebnis werten
            time.sleep(2 + 2 * i)
    return None


# ---------------------------------------------------------------- Textregeln
# Jede Regel ist ein vollstaendig ausformulierter Baustein. Kein blosses Landeswort.
BLOCK_RE = re.compile(r'<p class="ls-liefer"[^>]*>.*?</p>\s*', re.S)
STIL = ('style="background:#f4f6fb;border:1px solid #dde3ef;border-radius:10px;'
        'padding:10px 14px;font-size:13px;margin:0 0 14px;"')


def kopfblock(w):
    return (f'<p class="ls-liefer" data-tier="{w}" {STIL}>📦 <strong>Lieferzeit</strong> '
            f'Schweiz: <strong>{SPANNE[w]} Werktage</strong> '
            f'<span style="opacity:.7;">· {WEGNAME[w]} · Versand nur in die Schweiz und '
            f'nach Liechtenstein</span></p>\n')


def regeln(w):
    s = SPANNE[w]
    r = []
    # 1) Trustzeile der CJ-Importer (27'276x)
    r.append((re.compile(r'🚚 Lieferung ca\.\s*10\s*[–-]\s*20\s*Tage'),
              f'🚚 Lieferung {s} Werktage'))
    # 2) Produktdetails-Zeile «Versand: 🇨🇭 CH/EU ca. 10–20 Tage · inkl. Produktion»
    # ⚠️ 20.08.2026: «Versand:» und der Rest sind durch ein </strong> GETRENNT
    # («<strong>Versand:</strong> 🇨🇭 CH/EU ca. 10–20 Tage»). Ohne das optionale Tag
    # traf diese Regel KEINES der 176 betroffenen Produkte — sie standen trotzdem als
    # erledigt im Ledger. Ein «0 Treffer» aus einem zu engen Muster sieht aus wie Erfolg.
    r.append((re.compile(r'Versand:\s*(?:</strong>)?\s*🇨🇭\s*CH/EU\s*ca\.\s*'
                         r'\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage'
                         r'(\s*·\s*inkl\.\s*Produktion)?'),
              f'Versand:</strong> 🇨🇭 Schweiz · Lieferung {s} Werktage'))
    # 3) «📦 Lieferzeit: 🇨🇭 CH/EU ca. 10–20 Tage (inkl. Prüfung & Versand)»
    r.append((re.compile(r'Lieferzeit:\s*🇨🇭\s*CH/EU\s*ca\.\s*\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage'),
              f'Lieferzeit Schweiz: {s} Werktage'))
    # 4) siehe ABSATZ_USA weiter unten — dieser Baustein steht mit <strong>/<span>
    #    durchsetzt im Text; er wird als GANZER Absatz getauscht, sonst bliebe ein
    #    halbes <strong> ohne Gegenstueck stehen und das Markup waere kaputt.
    # 5) «📦 Lieferung CH/EU 6–12 Tage» / «Lieferung CH/EU 3–7 Tage»
    r.append((re.compile(r'Lieferung\s*CH/EU\s*\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage'),
              f'Lieferung Schweiz {s} Werktage'))
    # 6) «Versand & Rückgabe? 🇨🇭 CH/EU 8–14 Werktage inkl. Produktion»
    r.append((re.compile(r'🇨🇭\s*CH/EU\s*\d{1,2}\s*[–-]\s*\d{1,2}\s*Werktage'
                         r'(\s*inkl\.\s*Produktion)?'),
              f'🇨🇭 Schweiz {s} Werktage'))
    # 7) POD-Zeile: «Versand aus EU-Produktion · Lieferung CH ca. 5–10 Werktage».
    #    EU ist hier der PRODUKTIONSORT und bleibt stehen — das Ziel ist korrekt die Schweiz.
    #    Die Spanne kommt hier aus dem SATZ (Druck auf Bestellung), nicht aus den Tags: der
    #    Satz belegt den Bezugsweg besser als ein fehlender Tag (35 solcher Produkte tragen
    #    keinen POD-Tag, sind aber offensichtlich Druckware).
    r.append((re.compile(r'(Versand aus EU-Produktion\s*·\s*Lieferung )CH(\s*ca\.\s*)'
                         r'\d{1,2}\s*[–-]\s*\d{1,2}\s*Werktage'),
              lambda m, _s=SPANNE["pod"]: f'{m.group(1)}Schweiz{m.group(2)}{_s} Werktage'))
    # 8) «Versand: aus EU-Lager · 3–7 Tage · gratis ab CHF 50» (9x, BigBuy-Markenware mit EAN:
    #    Swatch, Folli Follie, Thomas Sabo, Bombata — das EU-Lager ist belegt, nur die
    #    Zeitspanne war zu optimistisch). Spanne aus dem Satz (EU-Lager), nicht aus den Tags.
    # ⚠️ Auch hier trennt ein </strong> die beiden Wortteile (6 BigBuy-Produkte blieben
    # deshalb 6 Tage lang stehen). Die Spanne kommt aus dem TAG-Bezugsweg, nicht pauschal
    # aus «EU-Lager»: bei BigBuy-Ware mit Tag `nicht-verifiziert-lieferbar` ist der
    # EU-Bestand gerade NICHT belegt, und die längere Zusage ist der günstigere Fehler.
    r.append((re.compile(r'Versand:\s*(?:</strong>)?\s*aus EU-Lager\s*·\s*'
                         r'\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage'),
              f'Versand:</strong> ab EU-Lager · Lieferung {s} Werktage'))
    # 11) POD-Zeile «<strong>Versand:</strong> on-demand in Europa · 3–7 Tage».
    #     «in Europa» ist der PRODUKTIONSORT und bleibt stehen (vgl. Regel 7).
    r.append((re.compile(r'Versand:\s*(?:</strong>)?\s*on-demand in Europa\s*·\s*'
                         r'\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage'),
              f'Versand:</strong> on-demand in Europa · Lieferung {s} Werktage'))
    # 12) Hand-kuratierte Alt-Produkte: «<small>Versand aus Belp · 7–12 Werktage ·
    #     Tracking inklusive</small>». NUR die Zahl wird gezogen — «aus Belp» ist eine
    #     Standort-/Herkunftsaussage, ihre Richtigkeit ist eine Betreiber-Frage.
    r.append((re.compile(r'(<small>Versand(?: aus Belp)?\s*·\s*)\d{1,2}\s*[–-]\s*\d{1,2}'
                         r'(\s*Werktage\s*·\s*Tracking inklusive</small>)'),
              lambda m, _s=s: f'{m.group(1)}{_s}{m.group(2)}'))
    # 9) «🚚 EU-Lager – Lieferung ca. 3–7 Tage»
    r.append((re.compile(r'🚚 EU-Lager\s*–\s*Lieferung ca\.\s*\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage'),
              f'🚚 Lieferung {SPANNE["eu"]} Werktage'))
    # 10) «🚚 Versand 7–14 Tage» (die Negativ-Vorschau schuetzt «30 Tage Rückgabe»)
    r.append((re.compile(r'🚚 Versand\s*\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage(?!\s*Rückgabe)'),
              f'🚚 Lieferung {s} Werktage'))
    return r


# Absatz-Ersetzung fuer den Kopfbaustein OHNE ls-liefer-Huelle. Drei Bedingungen muessen
# gleichzeitig zutreffen, damit ein Absatz getauscht wird — sonst traefe es Saetze wie
# «(Produktion in den USA/Mexiko)» oder «Steckdosen fuer USA, Europa»:
#   a) der Absatz nennt Lieferzeit/Lieferung/Versand,
#   b) er nennt eine Zeitspanne «N–M Tage»,
#   c) er nennt EU oder USA als ZIEL (Flagge oder «CH / EU»).
ABSATZ_USA = re.compile(r'<p\b[^>]*>(?:(?!</p>).)*?</p>', re.S)


def absatz_tauschen(h, w):
    n = 0
    out = []
    letzte = 0
    for m in ABSATZ_USA.finditer(h):
        seg = m.group(0)
        roh = re.sub(r'<[^>]+>', '', seg)
        if not re.search(r'Lieferzeit|Lieferung', roh):
            continue
        if not re.search(r'\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage', roh):
            continue
        if not re.search(r'(?:🇪🇺|🇺🇸)|CH\s*/\s*EU', roh):
            continue
        out.append(h[letzte:m.start()])
        out.append(f'<p>📦 <strong>Lieferzeit Schweiz:</strong> {SPANNE[w]} Werktage</p>')
        letzte = m.end()
        n += 1
    out.append(h[letzte:])
    return "".join(out), n


def umschreiben(h, w):
    """Gibt (neuer_text, anzahl_treffer) zurueck."""
    n = 0
    hat_block = bool(BLOCK_RE.search(h))
    if hat_block:
        h = BLOCK_RE.sub("", h)
        h = kopfblock(w) + h
        n += 1
    # ERST die punktgenauen Textregeln — sie ersetzen nur die Lieferaussage und lassen
    # richtige Nachbarinformation («Gratis-Versand ab CHF 50 · 30 Tage Rückgabe») stehen.
    # DANN erst der Absatz-Tausch als Auffangnetz fuer die Bausteine, die mit <strong>/<span>
    # durchsetzt sind. Diese Reihenfolge ist wichtig: umgekehrt haette der Absatz-Tausch bei
    # 2 Produkten die Gratis-Versand- und Rückgabe-Zusage im selben Absatz mitgerissen.
    for pat, rep in regeln(w):
        h, k = pat.subn(rep, h)
        n += k
    h, k = absatz_tauschen(h, w)
    n += k
    return h, n


# Kontrollmuster: bleibt danach IRGENDWO noch eine Lieferzeit mit EU/USA als ZIEL stehen?
REST_RE = re.compile(
    r'(?:Lieferzeit|Lieferung|Versand)[^.<]{0,60}?(?:🇪🇺|🇺🇸|\bEU\b|\bUSA\b)[^.<]{0,60}?'
    r'\d{1,2}\s*[–-]\s*\d{1,2}\s*(?:Werk)?[Tt]ag'
    r'|\d{1,2}\s*[–-]\s*\d{1,2}\s*(?:Werk)?[Tt]age?[^.<]{0,40}?(?:🇺🇸|\bUSA\b)')


def produkte():
    """Sammelt die zu korrigierenden Produkte.

    QUELLE=live liest per Admin-API statt aus dem Export-Schnappschuss. Das ist kein Luxus:
    Der Export vom 12.08. kennt 31'398 aktive Produkte, live sind es 34'590 — der CJ-Grind
    legt taeglich neue an. Ein Lauf, der nur den Schnappschuss abarbeitet, laesst die
    juengsten Produkte mit der falschen Aussage stehen und sieht trotzdem nach «fertig» aus.
    Nach dem Export-Lauf gehoert deshalb IMMER ein Live-Lauf hinterher.
    """
    todo = []
    if os.environ.get("QUELLE") == "live":
        Q = """query($after:String){ products(first:100, after:$after, query:"status:active"){
                 pageInfo{ hasNextPage endCursor }
                 nodes{ id title tags descriptionHtml } } }"""
        after = None
        while True:
            d = gql(Q, {"after": after})
            if d is None:
                sys.stderr.write("Seite nicht lesbar — Abbruch statt stiller Luecke.\n")
                break
            conn = d["products"]
            for p in conn["nodes"]:
                h = p.get("descriptionHtml") or ""
                w = weg(p.get("tags"))
                neu_h, n = umschreiben(h, w)
                if n and neu_h != h:
                    todo.append((p["id"], p.get("title", ""), w, n, neu_h, h))
            if not conn["pageInfo"]["hasNextPage"]:
                break
            after = conn["pageInfo"]["endCursor"]
        return todo
    for line in open(EXPORT):
        d = json.loads(line)
        if d.get("status") != "ACTIVE":
            continue
        h = d.get("descriptionHtml") or ""
        w = weg(d.get("tags"))
        neu_h, n = umschreiben(h, w)
        if n and neu_h != h:
            todo.append((d["id"], d.get("title", ""), w, n, neu_h, h))
    return todo


def main():
    if True:
        todo = produkte()
        print(f"Produkte mit zu korrigierender Versandaussage: {len(todo)}")
        from collections import Counter
        c = Counter(t[2] for t in todo)
        for k, v in c.most_common():
            print(f"   {v:>6}  {k:<7} → {SPANNE[k]} Werktage ({WEGNAME[k]})")
        rest = [t for t in todo if REST_RE.search(t[4])]
        print(f"Nach der Umschreibung noch EU/USA-Lieferzusage: {len(rest)}")
        for t in rest[:10]:
            m = REST_RE.search(t[4])
            print("   REST", t[0].split("/")[-1], "|", m.group(0)[:100])
        if LIMIT:
            todo = todo[:LIMIT]
            print(f"LIMIT={LIMIT} → nur die ersten {len(todo)} werden geschrieben")
        if DRY:
            print("\n--- 6 Beispiele vorher/nachher ---")
            gezeigt = set()
            for pid, tit, w, n, neu, alt in todo:
                if w in gezeigt and len(gezeigt) >= 4:
                    continue
                gezeigt.add(w)
                for pat, _ in [(BLOCK_RE, 0)] + [(p, 0) for p, _ in regeln(w)]:
                    ma = pat.search(alt)
                    if ma:
                        print(f"\n[{w}] {tit[:55]}")
                        print("  ALT:", re.sub(r'<[^>]+>', '', ma.group(0))[:150].strip())
                        break
                mb = re.search(r'(Lieferzeit|Lieferung)[^<]{0,60}Werktage', re.sub(r'<[^>]+>', '', neu))
                if mb:
                    print("  NEU:", mb.group(0)[:150].strip())
                if len(gezeigt) >= 4 and n:
                    pass
            return todo
        schreiben(todo)
    return None


def schreiben(todo):
    """Schreibt parallel, quittiert aber streng seriell.

    Shopify erlaubt 2'000 Punkte mit 100 Punkten/s Nachfuellung; ein productUpdate kostet
    rund 10 Punkte, also sind ~10 Schreibvorgaenge pro Sekunde tragbar. Einzeln gemessen
    dauerte ein Schreibvorgang 1,08 s — 28'000 Produkte waeren 8,5 Stunden gewesen. Mit
    8 Arbeitern liegt die Rate bei etwa 8/s und damit knapp unter dem Limit; gql() faengt
    eine Drosselung ohnehin mit Wartezeit ab.
    Das Ledger schreibt nur EIN Thread-Lock-geschuetzter Pfad, Zeile fuer Zeile mit flush
    und fsync (Regel 5) — der Prozess darf jederzeit sterben, ohne Quittungen zu verlieren.
    """
    fertig = set()
    # IGNORIERE_LEDGER=1: fuer die Zombie-Kontrolle (17.08.). Ein Massen-Schreiber hatte
    # 4'356 bereits quittierte Produkte mit alter Basis ueberschrieben — die Kandidaten
    # kommen ohnehin per INHALTS-Match, eine alte Quittung darf sie dann nicht schuetzen.
    if os.path.exists(LEDGER) and not os.environ.get("IGNORIERE_LEDGER"):
        fertig = {l.split("\t")[0] for l in open(LEDGER) if l.strip()}
    offen = [t for t in todo if t[0] not in fertig]
    print(f"Schon quittiert: {len(fertig)} · noch zu schreiben: {len(offen)}")
    M = ("mutation($p:ProductInput!){ productUpdate(input:$p){ product{ id } "
         "userErrors{ field message } } }")
    led = open(LEDGER, "a")
    sperre = threading.Lock()
    zaehler = {"ok": 0, "fehler": 0}

    # ⚠️ URSACHE DES ZOMBIE-MUSTERS, geschlossen 20.08.2026.
    # produkte() sammelt Kandidaten SAMT fertig gerechnetem neu_html; geschrieben wird erst
    # Stunden spaeter aus 8 Arbeitern. Wer in diesem Fenster (oder davor, aus einer aelteren
    # Quelle) repariert wurde, bekam die ALTE Basis zurueckgeschrieben — so hat dieser Lauf am
    # 14.08. bei 150 Produkten den vom Dedup-Lauf entfernten zweiten «Produktdetails»-Block
    # wiederbelebt. Deshalb wird der Text UNMITTELBAR vor dem Schreiben frisch geholt und die
    # Regel auf dem frischen Text neu angewandt. Hat sich in der Zwischenzeit nichts mehr zu
    # korrigieren gefunden, wird NICHT geschrieben.
    FRISCH = "query($id:ID!){ product(id:$id){ descriptionHtml } }"

    def einer(t):
        pid, tit, w, n, neu_html, alt_html = t
        f = gql(FRISCH, {"id": pid})
        if f is None:                        # Regel 6: keine Antwort ist kein Ergebnis
            with sperre:
                zaehler["fehler"] += 1
            return
        jetzt = ((f.get("product") or {}).get("descriptionHtml")) or ""
        if jetzt != alt_html:
            neu_html, n2 = umschreiben(jetzt, w)
            if not n2 or neu_html == jetzt:
                with sperre:                 # inzwischen von anderer Hand repariert
                    zaehler["uebersprungen"] = zaehler.get("uebersprungen", 0) + 1
                return
        d = gql(M, {"p": {"id": pid, "descriptionHtml": neu_html}})
        if d is None:                        # Regel 6: keine Antwort ist kein Ergebnis
            with sperre:
                zaehler["fehler"] += 1
            return
        ue = (d.get("productUpdate") or {}).get("userErrors") or []
        if ue:
            with sperre:
                zaehler["fehler"] += 1
                sys.stderr.write(f"✗ {pid}: {json.dumps(ue)[:160]}\n")
            return
        with sperre:
            led.write(f"{pid}\t{w}\t{n}\t{tit[:70]}\n")
            led.flush()
            os.fsync(led.fileno())
            zaehler["ok"] += 1
            if zaehler["ok"] % 500 == 0:
                print(f"   … {zaehler['ok']} geschrieben ({zaehler['fehler']} offen)", flush=True)

    with ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(einer, offen))
    led.close()
    print(f"Produkte geschrieben: {zaehler['ok']}, offen geblieben: {zaehler['fehler']}, "
          f"inzwischen anderweitig repariert: {zaehler.get('uebersprungen', 0)}")





# ---------------------------------------------------------------- Metafeld-Phase
# Das Produkt-Metafeld custom.lieferzeit (json) speicherte {"ch_eu":"10–18","us":"12–22",
# "tier":"china"} — also die Auslandszusage als DATEN. Sichtbar war sie dort zuletzt nicht
# (das Theme-Snippet ls-lieferzeit.liquid ist im Live-Theme nicht eingebunden, live geprueft:
# 0 Vorkommen von «ls-lieferzeit» im ausgelieferten HTML), aber sie war eine gestellte Falle:
# wer das Snippet je einbindet, zeigt sofort wieder USA-Lieferzeiten an. Deshalb wird der
# Wert auf {"ch":…, "tier":…, "weg":…} umgestellt.
# ⚠️ NUR wo das Feld schon existiert und die alte Form traegt. Produkten ohne Feld wird
# keines angelegt — sonst faende sich der naechste Reiniger vor 31'398 frisch angefassten
# Produkten und wuesste nicht, warum.
def metafeld():
    Q = """query($after:String){ products(first:100, after:$after, query:"status:active"){
             pageInfo{ hasNextPage endCursor }
             nodes{ id title tags metafield(namespace:"custom",key:"lieferzeit"){ value } } } }"""
    MS = ("mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ "
          "userErrors{ field message } } }")
    after = None
    gelesen = alt_form = geschrieben = fehler = 0
    stapel = []

    def stapel_schreiben(st):
        nonlocal geschrieben, fehler
        if not st:
            return
        d = gql(MS, {"mf": st})
        if d is None or ((d.get("metafieldsSet") or {}).get("userErrors")):
            fehler += len(st)            # Regel 6: nicht als erledigt werten
            return
        geschrieben += len(st)

    while True:
        d = gql(Q, {"after": after})
        if d is None:
            sys.stderr.write("Seite konnte nicht gelesen werden — Abbruch statt Luecke.\n")
            break
        conn = d["products"]
        for p in conn["nodes"]:
            gelesen += 1
            mf = p.get("metafield")
            if not mf or not mf.get("value"):
                continue
            if '"ch_eu"' not in mf["value"] and '"us"' not in mf["value"]:
                continue                  # schon neue Form
            alt_form += 1
            w = weg(p.get("tags"))
            wert = json.dumps({"ch": SPANNE[w], "tier": w, "weg": WEGNAME[w]},
                              ensure_ascii=False)
            if DRY:
                if alt_form <= 5:
                    print("DRY", p["title"][:45], mf["value"], "→", wert)
                continue
            stapel.append({"ownerId": p["id"], "namespace": "custom", "key": "lieferzeit",
                           "type": "json", "value": wert})
            if len(stapel) == 25:
                stapel_schreiben(stapel)
                stapel = []
        if not conn["pageInfo"]["hasNextPage"]:
            break
        after = conn["pageInfo"]["endCursor"]
    stapel_schreiben(stapel)
    print(f"Metafeld: {gelesen} aktive Produkte gelesen, {alt_form} trugen die alte "
          f"EU/USA-Form, {geschrieben} umgestellt, {fehler} offen geblieben.")





# ---------------------------------------------------------------- Seiten-Phase
# Der Produktlauf allein hätte den Widerspruch nur verschoben: 11 VERÖFFENTLICHTE Shop-Seiten
# nennen eigene Lieferzeiten, darunter die beiden AGB-Seiten. Gefunden wurden sie erst, als
# ich nicht nach meinen eigenen Bausteinen suchte, sondern nach dem, was die Kundin liest —
# jede Zeitspanne auf jeder veröffentlichten Seite, und dann von Hand geprüft.
#
# ⚠️ EIN ZEITRAUM IST NICHT AUTOMATISCH EINE LIEFERZEIT. Dieselbe Falle, vor der schon
# automation/seiten_versandtext.py warnt. Auf denselben Seiten stehen völlig richtige
# Zeitangaben, die NICHT angefasst werden dürfen:
#   • «Dauer: 4-5 Tage» (Mehrtageswanderung auf /pages/wanderziele-schweiz-2026)
#   • «Bearbeitungszeit: 1-3 Tage» beim Fulfillment-Partner (/pages/tracking)
#   • «Feiertage — eventuelle Verzögerung 1–2 Tage» (Antwortzeit, /pages/kontakt-support)
#   • «Bei "in transit" · noch 5-7 Tage geduldig sein» (Rat, keine Zusage)
# Darum wird hier NICHT gemustert, sondern jede Stelle einzeln und vollständig ausgeschrieben
# ersetzt; jede Vorlage muss GENAU EINMAL vorkommen, sonst bricht der Lauf ab.
#
# Sachfehler, der dabei auffiel: /pages/faq stellte «Übersee-Artikel ca. 7–14 Werktage» den
# «10–20 Werktagen» als SCHNELLERE Ausnahme gegenüber — Übersee ist der langsamste Weg, nicht
# der schnellste. Die Reihenfolge war schlicht vertauscht.
SEITEN = {
    697899352449: [(  # agb — rechtlich bindend
        '<p>Die Lieferung erfolgt direkt vom Hersteller (Versand ab Werk). Die Lieferzeit '
        'beträgt 10–20 Werktage. Bei Lieferungen ins Ausland können Zölle und Einfuhrabgaben '
        'anfallen, die vom Kunden zu tragen sind.</p>',
        '<p>Wir liefern ausschliesslich in die Schweiz und nach Liechtenstein; ein Versand in '
        'andere Länder ist nicht möglich. Ein grosser Teil der Ware wird direkt ab dem Lager '
        'des Herstellers versendet. Die Lieferzeit hängt vom Bezugsweg ab: ab Schweizer Lager '
        '1–2 Werktage, ab EU-Lager 2–7 Werktage, bei Druck auf Bestellung 7–14 Werktage, im '
        'Direktversand ab Herstellerlager 10–20 Werktage. Massgeblich ist die Angabe auf der '
        'jeweiligen Produktseite. Zoll- oder Einfuhrabgaben fallen für Lieferungen in die '
        'Schweiz und nach Liechtenstein nicht zusätzlich an.</p>')],
    698055360897: [(  # agb-luxestyle — rechtlich bindend
        '<p>Lieferzeit: <strong>7-14 Werktage</strong> ab Zahlungseingang, innerhalb der '
        'Schweiz (inkl. Liechtenstein).</p>',
        '<p>Lieferzeit ab Zahlungseingang, innerhalb der Schweiz (inkl. Liechtenstein): ab '
        'Schweizer Lager <strong>1–2 Werktage</strong>, ab EU-Lager <strong>2–7 Werktage</strong>, '
        'bei Druck auf Bestellung <strong>7–14 Werktage</strong>, im Direktversand ab '
        'Herstellerlager <strong>10–20 Werktage</strong>. Massgeblich ist die Angabe auf der '
        'Produktseite. Ein Versand in andere Länder ist nicht möglich.</p>')],
    697899516289: [  # faq — widersprach sich auf EINER Seite selbst
        ('🇨🇭 Blitzversand-Artikel kommen in 1–3 Werktagen aus dem Schweizer Lager, '
         'EU-Lager-Artikel in 3–7 Tagen, international versendete Artikel in 7–14 Tagen.',
         '🇨🇭 Blitzversand-Artikel kommen in 1–2 Werktagen aus dem Schweizer Lager, Ware ab '
         'EU-Lager in 2–7 Werktagen, Druck-auf-Bestellung-Artikel in 7–14 Werktagen und Ware '
         'im Direktversand ab Herstellerlager in 10–20 Werktagen. Geliefert wird ausschliesslich '
         'in die Schweiz und nach Liechtenstein.'),
        ('Lieferzeit je nach Produkt in der Regel ca. 10–20 Werktage '
         '(personalisierte/Print-on-Demand- und Übersee-Artikel ca. 7–14 Werktage).',
         'Lieferzeit je nach Bezugsweg: ab Schweizer Lager 1–2 Werktage, ab EU-Lager 2–7 '
         'Werktage, bei Druck auf Bestellung 7–14 Werktage, im Direktversand ab Herstellerlager '
         '10–20 Werktage.')],
    698006208897: [(  # schweizer-vs-deutsche-marken — bewarb Lieferung nach Deutschland
        '<li>🇩🇪 Versand auch nach DE (8-14 Tage)</li>',
        '<li>🇨🇭 Versand in die ganze Schweiz und nach Liechtenstein</li>')],
    698444710273: [(  # selbst-gestalten — Einheit angleichen (Tage → Werktage)
        'in der Regel <strong>ca. 7–14 Tage</strong>',
        'in der Regel <strong>ca. 7–14 Werktage</strong>')],
    697996640641: [(  # vatertag-geschenkideen-2026
        '7-12 Werktagen', '10–20 Werktagen')],
    # Fünf Ratgeber-/Landingseiten mit der alten Richtlinien-Zahl «5–12 Werktage».
    # personalisierte-geschenke-fuer-sie bekommt 7–14 (Druck auf Bestellung), die übrigen
    # 10–20 (Schmuck/Taschen aus dem Direktversand).
    699143258497: [('Lieferzeit von 5–12 Werktagen', 'Lieferzeit von 10–20 Werktagen'),
                   ('innerhalb der Schweiz in 5–12 Werktagen',
                    'innerhalb der Schweiz in 10–20 Werktagen')],
    699143324033: [('Lieferzeit 5–12 Werktage', 'Lieferzeit 10–20 Werktage')],
    699143389569: [('In der Regel 5–12 Werktage, schweizweit.',
                    'In der Regel 10–20 Werktage, schweizweit.'),
                   ('in der Regel 5–12 Werktage ·', 'in der Regel 10–20 Werktage ·')],
    699143291265: [('innerhalb von 5–12 Werktagen in die ganze Schweiz',
                    'innerhalb von 7–14 Werktagen in die ganze Schweiz'),
                   ('Lieferung in der Regel 5–12 Werktage ·',
                    'Lieferung in der Regel 7–14 Werktage ·')],
    699143356801: [('innerhalb von 5–12 Werktagen.', 'innerhalb von 10–20 Werktagen.')],
    # --- Zweite Fundwelle. Sie kam erst zustande, als ich NICHT nach meinen eigenen
    # Bausteinen suchte, sondern jede Zeitspanne auf allen 132 veröffentlichten Seiten
    # ausdruckte und von Hand las. Elf weitere Seiten nannten 7-12 bzw. 7-14 Werktage —
    # Zahlen, die es im Sortiment gar nicht gibt.
    699143225729: [('Lieferung innerhalb der Schweiz in 5–12 Werktagen.',
                    'Lieferung innerhalb der Schweiz in 10–20 Werktagen.')],
    698019381633: [('✅ Versand 7-12 Werktage (direkt ab Werk)',
                    '✅ Versand 10–20 Werktage (direkt ab Werk)')],
    698063389057: [('✅ Versand 7-14 Werktage', '✅ Versand 10–20 Werktage')],
    698000015745: [('✅ Versand 7-12 Werktage – direkt ab Werk',
                    '✅ Versand 10–20 Werktage – direkt ab Werk')],
    698063487361: [('Versand 7-14 Werktage.', 'Versand 10–20 Werktage.')],
    698059325825: [('Versand 7-14 Tage.', 'Versand 10–20 Werktage.')],
    698060996993: [('Versand 7-14 Tage.', 'Versand 10–20 Werktage.')],
    698029965697: [('<p>7-12 Werktage — ehrlich gesagt. Keine Lügen. Versand direkt ab Werk '
                    'damit dein Preis stimmt.</p>',
                    '<p>10–20 Werktage im Direktversand ab Herstellerlager, ab Schweizer Lager '
                    '1–2 Werktage — ehrlich gesagt. Keine Lügen. Die Angabe für den einzelnen '
                    'Artikel steht auf der Produktseite.</p>'),
                   ('7-12 Werktage CH', '10–20 Werktage CH')],
    # ueber-uns nennt bereits die richtige Staffel, nur in «Tage» statt «Werktage».
    697899549057: [('· 2-7 Tage Lagerartikel · einige Artikel 10-20 Tage ·',
                    '· 1–2 Werktage ab Schweizer Lager · 2–7 Werktage ab EU-Lager · '
                    'übrige Artikel 10–20 Werktage ·')],
    # ⚠️ Diese Weihnachtsseite versprach «Express-Bundles» mit 7-10 Tagen. Eine Express-
    # Versandart gibt es im Versandprofil überhaupt nicht (nur Standard CHF 7.00 und
    # Gratisversand ab Schwelle) — die Zusage war doppelt falsch. Die Lieferaussage wird
    # korrigiert; dass die «Last-Minute am 23. Dezember»-Aufmachung bei 10–20 Werktagen
    # nicht mehr trägt, ist eine Betreiber-Entscheidung und wird gemeldet, nicht hier
    # nebenbei umgeschrieben.
    698005782913: [('<h2>Express-Bundles (Lieferung 7-10 Tage)</h2>',
                    '<h2>Premium-Bundles (Lieferung 10–20 Werktage)</h2>'),
                   ('<p>Keine Sorge. Diese Premium-Bundles kommen rechtzeitig — und sehen aus '
                    'wie 4-Wochen-Planung.</p>',
                    '<p>Damit das Geschenk sicher rechtzeitig da ist, bestell am besten bis '
                    'Ende November: der Direktversand ab Herstellerlager braucht 10–20 '
                    'Werktage. Diese Premium-Bundles sehen aus wie 4-Wochen-Planung.</p>')],
}


def seiten():
    import urllib.request as _u
    basis = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/pages"
    kopf = {"X-Shopify-Access-Token": TOK, "Content-Type": "application/json"}
    geaendert = fehler = schon = 0
    for pid, paare in SEITEN.items():
        try:
            with _u.urlopen(_u.Request(f"{basis}/{pid}.json", headers=kopf), timeout=60) as r:
                seite = json.loads(r.read())["page"]
        except Exception as e:
            sys.stderr.write(f"✗ {pid} nicht lesbar ({e}) — bleibt offen\n")
            fehler += 1
            continue
        b = seite.get("body_html") or ""
        # Schon erledigt? Dann ist das KEIN Fehler — der Lauf ist wiederholbar.
        if all(a not in b and e in b for a, e in paare):
            schon += 1
            continue
        neu = b
        for a, ersatz in paare:
            n = neu.count(a)
            if n != 1:
                sys.stderr.write(f"✗ {seite['handle']}: Vorlage {n}x statt 1x gefunden — "
                                 f"KEINE Änderung an dieser Seite\n  {a[:90]}\n")
                neu = None
                break
            neu = neu.replace(a, ersatz)
        if neu is None:
            fehler += 1
            continue
        if neu == b:
            continue
        if DRY:
            print(f"DRY {seite['handle']}: {len(paare)} Stelle(n)")
            for a, ersatz in paare:
                print("   ALT:", re.sub(r'<[^>]+>', '', a)[:130])
                print("   NEU:", re.sub(r'<[^>]+>', '', ersatz)[:130])
            geaendert += 1
            continue
        payload = json.dumps({"page": {"id": pid, "body_html": neu}}).encode()
        try:
            rq = _u.Request(f"{basis}/{pid}.json", data=payload, headers=kopf, method="PUT")
            with _u.urlopen(rq, timeout=60) as r:
                r.read()
        except Exception as e:
            sys.stderr.write(f"✗ {seite['handle']} nicht schreibbar ({e})\n")
            fehler += 1
            continue
        # Regel 6: erst die Live-Gegenprobe entscheidet, ob es geklappt hat. Ein stummes PUT
        # hat bei der Versandrichtlinie genau so ausgesehen wie ein Erfolg (siehe CLAUDE.md).
        try:
            with _u.urlopen(_u.Request(f"{basis}/{pid}.json", headers=kopf), timeout=60) as r:
                jetzt = json.loads(r.read())["page"].get("body_html") or ""
        except Exception:
            jetzt = ""
        if all(a not in jetzt for a, _ in paare):
            geaendert += 1
            print(f"   ✓ {seite['handle']}")
        else:
            fehler += 1
            sys.stderr.write(f"✗ {seite['handle']}: Änderung nicht angekommen\n")
    print(f"Seiten geändert: {geaendert}, schon erledigt: {schon}, "
          f"offen geblieben: {fehler}")


if __name__ == "__main__":
    if PHASE in ("alle", "produkte"):
        main()
    if PHASE in ("alle", "metafeld"):
        metafeld()
    if PHASE in ("alle", "seiten"):
        seiten()
