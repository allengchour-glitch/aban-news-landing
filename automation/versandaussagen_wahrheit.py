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
    r.append((re.compile(r'Versand:\s*🇨🇭\s*CH/EU\s*ca\.\s*\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage'
                         r'(\s*·\s*inkl\.\s*Produktion)?'),
              f'Versand: 🇨🇭 Schweiz · Lieferung {s} Werktage'))
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
    r.append((re.compile(r'Versand:\s*aus EU-Lager\s*·\s*\d{1,2}\s*[–-]\s*\d{1,2}\s*Tage'),
              f'Versand: ab EU-Lager · Lieferung {SPANNE["eu"]} Werktage'))
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
    todo = []
    for line in open(EXPORT):
        d = json.loads(line)
        if d.get("status") != "ACTIVE":
            continue
        h = d.get("descriptionHtml") or ""
        w = weg(d.get("tags"))
        neu, n = umschreiben(h, w)
        if n and neu != h:
            todo.append((d["id"], d.get("title", ""), w, n, neu, h))
    return todo


def main():
    if PHASE in ("alle", "produkte"):
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
    if os.path.exists(LEDGER):
        fertig = {l.split("\t")[0] for l in open(LEDGER) if l.strip()}
    offen = [t for t in todo if t[0] not in fertig]
    print(f"Schon quittiert: {len(fertig)} · noch zu schreiben: {len(offen)}")
    M = ("mutation($p:ProductInput!){ productUpdate(input:$p){ product{ id } "
         "userErrors{ field message } } }")
    led = open(LEDGER, "a")
    sperre = threading.Lock()
    zaehler = {"ok": 0, "fehler": 0}

    def einer(t):
        pid, tit, w, n, neu_html, alt_html = t
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
    print(f"Produkte geschrieben: {zaehler['ok']}, offen geblieben: {zaehler['fehler']}")


if __name__ == "__main__":
    main()
