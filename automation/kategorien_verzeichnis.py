#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""kategorien_verzeichnis.py — baut die Seite «Alle Kategorien» aus den LIVE-Kollektionen.

WARUM: Im Onlineshop sind 348 Kollektionen mit Ware veröffentlicht, das Hauptmenü zeigt
davon rund 80. Über 260 Kategorien sind damit nur über die Suche oder Zufall erreichbar —
und für Google praktisch unsichtbar, weil auf sie KEIN interner Link zeigt. Eine einzige
Verzeichnisseite behebt beides: Besucherinnen sehen die ganze Breite auf einen Blick, und
jede Kollektion bekommt einen Link von einer veröffentlichten Seite.

⚠️ OHNE STÜCKZAHLEN. `productsCount` einer Kollektion zählt ENTWÜRFE MIT — «Geschenke unter
CHF 100» meldet 64'661, der ganze aktive Katalog hat aber nur 45'833 Produkte. Eine Zahl auf
der Seite wäre also eine Falschaussage. Sie wird nur intern zum Sortieren benutzt.

⚠️ DOPPELGÄNGER werden zusammengelegt. Es gibt Paare wie «Camping» / «Camping & Outdoor»
(beide 233) und «Garten» / «Garten & Balkon» (beide 286) — dieselbe Ware unter zwei Namen.
Als Dublette gilt nur: gleiche Produktzahl UND der eine Titel beginnt mit dem anderen.
Das ist bewusst eng — sonst verschwinden echte Unterkategorien.

DRY=1 zeigt die Gruppierung zum Lesen, ohne die Seite anzufassen.

⚠️ RÜCKGANG-SPERRE (13.10.2026, SEO-Sofort ON-M5). Seit dem 13.10. läuft das Verzeichnis TÄGLICH im Aufseher
(vorher rief es kein Runner — die Seite stand vom 10.10. bis 13.10. still, drei neue Kollektionen mit gemessener
Nachfrage — gps-tracker, futterautomaten, trinkbrunnen-katzen — fehlten). Ein Tageslauf darf aber nicht still
Kategorien verlieren: liefert Shopify eine halbe Kollektionsliste oder fallen viele Kollektionen unter 3 aktive,
wäre die Seite danach dünner und niemand merkt es. Darum wird VOR dem Schreiben die Linkzahl der LIVE-Seite
gelesen. Fällt die neue Zahl um mehr als RUECKGANG_MAX (5), schreibt der Lauf NICHT und meldet
«VERZEICHNIS: ⚠️ Rückgang n» (Aufseher-Zeile + dropship/_kategorien_verzeichnis_stand.json). Ist der Rückgang
gewollt (Saisonende), einmal von Hand: ERZWINGEN=1 python3 automation/kategorien_verzeichnis.py
Altwert: dropship/_kategorien_verzeichnis_alt.html (der Seitentext VOR dem letzten Schreiben);
Rückweg: python3 automation/kategorien_verzeichnis.py --zurueck
Unverändert → kein Schreibzugriff.
"""
import html, json, os, re, subprocess, sys, time, urllib.parse

try:  # Eimer-Etikette (Regel «helfer-ohne-eimer»): nach jeder Antwort den throttleStatus lesen
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from eimer_etikette import nachlauf
except Exception:  # pragma: no cover
    def nachlauf(d):
        return 0

SHOP = "au3j0y-hq.myshopify.com"
TOK = open("/tmp/cj_shop_token.txt").read().strip()
QUELLE = os.environ.get("QUELLE", "/tmp/kollektionen.json")
HANDLE = "alle-kategorien"
DRY = os.environ.get("DRY") == "1"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(REPO, "dropship", "_kategorien_verzeichnis_stand.json")
ALT = os.path.join(REPO, "dropship", "_kategorien_verzeichnis_alt.html")
RUECKGANG_MAX = int(os.environ.get("RUECKGANG_MAX", "5"))
ERZWINGEN = os.environ.get("ERZWINGEN") == "1"
VLINK_RE = re.compile(r'href="/collections/([^"#?]+)"')

# Interne Kuratier-Hilfen, keine Kundenkategorien.
RAUS = {"home-page", "hero-favoriten", "im-video-vorgestellt", "frauen-favoriten",
        "bestseller-lieblinge", "highlights-schmuck-mode"}
RAUS_MUSTER = re.compile(r"getaggt|\(intern\)|^test", re.I)

# Reihenfolge zählt: das ERSTE passende Gebiet gewinnt. Deshalb stehen enge Begriffe oben
# (Kostüm vor Damen-Mode, sonst landet «Damenkostüme» in der Mode).
# Reihenfolge zählt: das ERSTE passende Gebiet gewinnt. Der Probelauf hat drei Fehlgriffe
# gezeigt, die alle aus der Reihenfolge kamen — sie ist deshalb bewusst gesetzt:
#   · «Herren-Pullover & Strick» landete unter DAMENMODE, weil dort `strick` steht.
#     → Herrenmode kommt VOR Damenmode.
#   · «Garten-Werkzeug & Pflege» landete unter BEAUTY, weil dort `pflege` steht.
#     → Garten und Auto kommen VOR Beauty.
#   · «Leinen, Geschirre & Tierkleidung» landete unter WOHNEN, weil dort `geschirr` steht.
#     → Haustiere kommt VOR Wohnen.
# ⚠️ Und zwei Muster-Fallen, beide hier schon einmal teuer bezahlt:
#   · `led` steckt in «**Led**er & Accessoires» — dieselbe Falle wie «IPL» in «L-IPL-iner».
#     Kurze Abkürzungen brauchen eine Grenze: `led-` / `\bled\b`.
#     Zwei weitere im zweiten Probelauf: `ski` steckt in «**Ski**ncare» (Hautpflege
#     landete im Sport) und `auto` in «**Auto**matik» (Chronographen landeten beim
#     Auto-Zubehör). Drei Substring-Fallen in EINER Datei — bei kurzen Wörtern ist
#     die Wortgrenze die Regel, nicht die Ausnahme.
#   · Der Umlaut-Plural frisst den Treffer: «Armbänder» passt NICHT auf `armband`,
#     «Rucksäcke» nicht auf `rucksack`. Beide Formen gehören ins Muster.
GEBIETE = [
    ("🎭 Kostüme & Fasnacht",  r"kost[üu]m|fasnacht|halloween|per[üu]cke|verkleid"),
    ("🎁 Geschenke & Anlässe", r"geschenk|mitbringsel|hochzeit|weihnacht|christmas|advent|"
                               r"muttertag|vatertag|valentin|abschluss|berufseinstieg"),
    ("🐾 Haustiere",           r"haustier|hunde|hund\b|katze|napf|näpfe|pet\b|aquari|nager|"
                               r"vogel|tierkleidung|tierspielzeug|leinen, geschirre"),
    ("🏋️ Sport & Fitness",     r"sport|fitness|yoga|pilates|home-gym|lauf-|fussball|fanshop|"
                               r"fanartikel|velo|radsport|\bski\b|snowboard|wandern|trekking"),
    ("🌿 Garten & Outdoor",    r"garten|balkon|camping|outdoor|grill|bbq|pool|strand|angeln|"
                               r"solar|pflanzgef|blument[öo]pfe|zelte|schlafs[aä]ck|picknick|"
                               r"wasserspass"),
    ("🚗 Auto & Werkzeug",     r"\bauto\b|auto-|autos|kfz|werkzeug|maschinen|bohren|"
                               r"s[äa]gen|schrauben|handwerk"),
    ("👔 Herrenmode",          r"^herren|grooming|bart"),
    ("👗 Damenmode",           r"^damen|^für sie|kleider|blusen|r[öo]cke|jumpsuit|bademode|"
                               r"abend-look|loungewear|shapewear|strick|dessous"),
    ("👕 Mode & Bekleidung",   r"t-shirt|\btops\b|jeans|denim|westen|gilets|hoodie|"
                               r"pullover|hosen|hemden|jacken|bekleidung|unterw|socken|"
                               r"nachtw|pyjama"),
    ("☀️ Saison",              r"sommer|winter|herbst|fr[üu]hling|saison|k[äa]lte|"
                               r"1\.?\s*august|schweizer edition"),
    ("👟 Schuhe",              r"schuh|sneaker|ballerina|heels|pumps|sandale|loafer|"
                               r"stiefel|boots|slipper"),
    ("👜 Taschen & Accessoires", r"tasche|rucks[aä]ck|geldb|portemonnaie|wallet|g[üu]rtel|"
                                 r"caps|h[üu]te|kopfbedeckung|schals|m[üu]tzen|stirnband|"
                                 r"handschuh|sonnenbrille|brillen|kleinleder|leder & access"),
    ("💎 Schmuck & Uhren",     r"schmuck|uhren|uhr\b|armb[aä]nd|halskette|ohrring|ringe|"
                               r"anh[äa]nger|chronograph|piercing|moissanit"),
    ("💄 Beauty & Pflege",     r"beauty|pflege|haar|nagel|n[äa]gel|manik|make|kosmetik|parfum|"
                               r"duft|d[üu]fte|skincare|ipl|gesichts|rasur|zahn|self.?care|wellness|"
                               r"\bspa\b|gesundheit"),
    ("🎮 Gaming",              r"gaming|controller|gamepad|konsole|handheld|xbox|"
                               r"playstation|nintendo"),
    ("📱 Technik & Elektronik", r"elektronik|technik|handy|smartphone|tablet|laptop|computer|"
                                r"kabel|adapter|ladeger|powerbank|kopfh[öo]rer|audio|"
                                r"lautsprecher|kamera|drohne|beamer|heimkino|smartwatch|"
                                r"wearable|gadget|hightech|halterung|magsafe|foto & video|"
                                r"3d-druck|3d-filament|3d-drucker|homeoffice|vr, ai"),
    ("🏠 Wohnen & Küche",      r"wohn|deko|kissen|textil|k[üu]che|kochen|backen|geschirr|"
                               r"gl[äa]ser|aufbewahrung|ordnung|badezimmer|beleuchtung|lampe|"
                               r"leuchte|led-|\bled\b|kerzen|aroma|diffuser|haushalt|"
                               r"heizdecke|kaffee|cocktail|shaker|m[öo]bel|teppich|vasen|pfannen|"
                               r"t[öo]pfe|w[äa]rme & komfort"),
    ("🧸 Kinder & Baby",       r"kinder|baby|kleinkind|spielzeug|pl[üu]sch|kuscheltier|schul|"
                               r"basteln|kneten|bruder|rc-|ferngesteuert|modellauto|lernspiel"),
    ("💼 Büro & Schreibwaren", r"b[üu]ro|home.?office|schreibwaren|desk|papeterie"),
    ("⚡ Neu, Trends & Angebote", r"^neu|neuheit|trend|hype|bestseller|topseller|angebot|deal|"
                                  r"sale\b|blitz|lager|express|schnell geliefert|premium|"
                                  r"viral|impulse|unter chf"),
]
UEBRIG = "🔎 Weitere Kategorien"


def gql(q, v=None):
    p = json.dumps({"query": q, "variables": v or {}})
    for i in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json", "-d", p],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            nachlauf(d)
            if d.get("data"):
                return d
            if "THROTTL" in json.dumps(d.get("errors") or "").upper():
                time.sleep(4 + i * 3); continue
            if d.get("errors"):
                print("  GraphQL-Fehler:", json.dumps(d["errors"])[:180]); return None
        except Exception:
            pass
        time.sleep(3 + i * 2)
    return None


def entdoppeln(koll):
    """Entfernt Doppelgänger: gleiche Produktzahl UND ein Titel ist Präfix des anderen."""
    nach_zahl = {}
    for k in koll:
        nach_zahl.setdefault(k[2], []).append(k)
    weg = set()
    for gruppe in nach_zahl.values():
        if len(gruppe) < 2:
            continue
        for a in gruppe:
            for b in gruppe:
                if a is b or a[0] in weg or b[0] in weg:
                    continue
                ta, tb = a[1].lower(), b[1].lower()
                # Der KÜRZERE Titel fliegt raus — «Camping & Outdoor» sagt mehr als «Camping».
                if len(ta) < len(tb) and tb.startswith(ta):
                    weg.add(a[0])
    return [k for k in koll if k[0] not in weg], weg


def gebiet(titel):
    t = titel.lower()
    for name, muster in GEBIETE:
        if re.search(muster, t):
            return name
    return UEBRIG


def quelle_bauen():
    """Baut /tmp/kollektionen.json live neu — die Datei ist ein Wipe-Opfer (31.08.):
    ohne diesen Rueckfall stirbt der Lauf an FileNotFoundError und das Verzeichnis
    veraltet still. Format: [handle, titel, productsCount, None]."""
    aus, cur = [], None
    while True:
        d = gql('query($c:String){collections(first:100,after:$c){pageInfo{hasNextPage endCursor}'
                ' nodes{id handle title productsCount{count}'
                ' p:publishedOnPublication(publicationId:"gid://shopify/Publication/301970915713")}}}',
                {"c": cur})
        pg = (d.get("data") or {}).get("collections")
        if not pg:
            raise SystemExit("Quelle nicht baubar — Shopify blieb stumm (KEIN leeres Verzeichnis schreiben)")
        for n in pg["nodes"]:
            if n["p"]:
                aus.append([n["handle"], n["title"], n["productsCount"]["count"],
                            n["id"].split("/")[-1]])
        if not pg["pageInfo"]["hasNextPage"]:
            break
        cur = pg["pageInfo"]["endCursor"]
    json.dump(aus, open(QUELLE, "w"))
    return aus


MINDEST_AKTIV = int(os.environ.get("MINDEST_AKTIV", "3"))


def aktive_filtern(koll):
    """Verlinkt nur, was fuer Kundinnen wirklich etwas hergibt.

    ⚠️ `productsCount` zaehlt ENTWUERFE MIT — «Angebote & Deals» meldet 351 und hat
    GENAU EIN aktives Produkt (die konstruierten Streichpreise wurden am 24.08.
    entfernt, die Smart-Regel IS_PRICE_REDUCED findet seither fast nichts). Eine
    Kachel oder ein Verzeichniseintrag auf so eine Kollektion ist eine Sackgasse
    mit Beschriftung. Gezaehlt wird deshalb mit `status:active` je Kollektion,
    gebuendelt ueber Aliase (20 je Anfrage, ~1 Punkt pro Zaehler).
    Die Kollektion bleibt veroeffentlicht — sie heilt sich selbst, sobald es
    wieder Ware gibt; falsch waere nur, sie zu BEWERBEN.
    """
    mit_id = [k for k in koll if len(k) > 3 and k[3]]
    if not mit_id:
        return koll, []
    aktiv = {}
    for i in range(0, len(mit_id), 20):
        teil = mit_id[i:i + 20]
        felder = " ".join(
            f'a{j}: productsCount(query: "collection_id:{k[3]} AND status:active"){{count}}'
            for j, k in enumerate(teil))
        d = gql("query{" + felder + "}")
        dat = d.get("data") or {}
        if not dat:
            return koll, []          # stumme Antwort ist kein Befund → nichts wegwerfen
        for j, k in enumerate(teil):
            v = dat.get(f"a{j}")
            if v is not None:
                aktiv[k[0]] = v["count"]
    behalten = [k for k in koll if aktiv.get(k[0], MINDEST_AKTIV) >= MINDEST_AKTIV]
    duenn = [(k[0], k[1], aktiv[k[0]]) for k in koll
             if k[0] in aktiv and aktiv[k[0]] < MINDEST_AKTIV]
    return behalten, duenn


def main():
    # ⚠️ Die Quelle wird bei JEDEM Lauf live neu gebaut. Bis 03.09. galt
    # «nur bauen, wenn die Datei fehlt» — /tmp ueberlebt aber Container-Neustarts,
    # und der Cache stand drei Tage still: der Lauf meldete taeglich «aktualisiert»
    # und schrieb dabei den Stand vom 31.08. zurueck (16 neue Kategorien fehlten).
    # Ein Cache ohne Verfallsdatum ist ein Zeugnis ueber die Vergangenheit.
    # Nur ein ausdruecklich per Env gesetzter QUELLE-Pfad wird noch gelesen.
    if os.environ.get("QUELLE"):
        if not os.path.exists(QUELLE):
            quelle_bauen()
    else:
        quelle_bauen()
    koll = [k for k in json.load(open(QUELLE))
            if k[0] not in RAUS and not RAUS_MUSTER.search(k[1])]
    koll, weg = entdoppeln(koll)
    print(f"{len(koll)} Kategorien · {len(weg)} Doppelgänger zusammengelegt")
    koll, duenn = aktive_filtern(koll)
    if duenn:
        print(f"⚠️ {len(duenn)} ohne kaufbare Ware — NICHT verlinkt: "
              + ", ".join(f"{t} ({n})" for _, t, n in duenn[:12]))

    gruppen = {}
    for h, t, n, _ in koll:
        gruppen.setdefault(gebiet(t), []).append((t, h, n))
    reihen = [(name, sorted(gruppen[name], key=lambda x: -x[2]))
              for name, _ in GEBIETE if name in gruppen]
    if UEBRIG in gruppen:
        reihen.append((UEBRIG, sorted(gruppen[UEBRIG], key=lambda x: -x[2])))

    for name, eintraege in ([] if os.environ.get("AUFSEHER") == "1" else reihen):   # Aufseher-Log: nur Ergebniszeilen
        print(f"\n{name}  ({len(eintraege)})")
        print("   " + " · ".join(t for t, _, _ in eintraege[:14])
              + (" …" if len(eintraege) > 14 else ""))

    teile = ['<div class="lux-kat">',
             '<p class="lux-kat-lead">Der ganze Shop auf einen Blick — '
             f'{len(koll)} Kategorien. Was du suchst, ist meist zwei Klicks entfernt.</p>']
    for name, eintraege in reihen:
        teile.append(f'<h2 class="lux-kat-h">{html.escape(name, quote=False)}</h2><ul class="lux-kat-l">')
        for t, h, _ in eintraege:
            # Emoji-Handles prozent-kodiert (so stand die Live-Seite am 13.10. — ein roher Emoji-Pfad ist kein gültiger URL-Pfad)
            teile.append(f'<li><a href="/collections/{urllib.parse.quote(h, safe="-_.")}">{html.escape(t, quote=False)}</a></li>')
        teile.append('</ul>')
    teile.append('</div>')
    teile.append(
        '<style>'
        '.lux-kat-lead{font-size:1.05rem;opacity:.85;margin:0 0 2rem}'
        '.lux-kat-h{margin:2.2rem 0 .8rem;font-size:1.25rem;border-bottom:1px solid rgba(128,128,128,.25);'
        'padding-bottom:.4rem}'
        '.lux-kat-l{list-style:none;padding:0;margin:0;display:grid;gap:.35rem .9rem;'
        'grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}'
        '.lux-kat-l a{text-decoration:none;display:block;padding:.3rem 0;line-height:1.35}'
        '.lux-kat-l a:hover{text-decoration:underline}'
        '</style>')
    body = "\n".join(teile)

    # ⚠️ `pageByHandle` gibt es in 2024-10 nicht mehr ("Field doesn't exist on QueryRoot").
    # Gesucht wird über die Seitenliste mit Handle-Filter.
    vorhanden = seite_lesen()
    if vorhanden == "PAUSE":
        print("PAUSE (Shopify antwortet nicht) — Seite unveraendert")
        return
    titel = "Alle Kategorien — der ganze Shop auf einen Blick"
    alt_links = verzeichnis_links(vorhanden["body"]) if vorhanden else []
    neu_links = verzeichnis_links(body)
    weg = sorted(set(alt_links) - set(neu_links))
    dazu = sorted(set(neu_links) - set(alt_links))
    rueckgang = len(set(alt_links)) - len(set(neu_links))
    stand = {"stand": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "links_alt": len(set(alt_links)),
             "links_neu": len(set(neu_links)), "rueckgang": max(rueckgang, 0), "neu": dazu[:40], "weg": weg[:40]}
    if DRY:
        print(f"\n(DRY=1 — Seite nicht angefasst) VERZEICHNIS trocken: {len(set(neu_links))} Links (live {len(set(alt_links))}) · "
              f"neu {len(dazu)}: {', '.join(dazu)} · weg {len(weg)}: {', '.join(weg)} · "
              f"{'⚠️ Sperre würde greifen' if vorhanden and rueckgang > RUECKGANG_MAX else 'Sperre greift nicht'}")
        return
    if vorhanden and rueckgang > RUECKGANG_MAX and not ERZWINGEN:
        stand["geschrieben"] = False
        stand_schreiben(stand)
        print(f"VERZEICHNIS: ⚠️ Rückgang {rueckgang} ({len(set(alt_links))} → {len(set(neu_links))} Links) — NICHT geschrieben · "
              f"fehlen: {', '.join(weg[:12])}{' …' if len(weg) > 12 else ''} · gewollt? ERZWINGEN=1")
        print("Verzeichnis gesperrt — Lauf ohne Schreiben beendet")
        return
    if vorhanden and gleich(vorhanden["body"], body) and vorhanden["title"] == titel:
        stand["geschrieben"] = False
        stand_schreiben(stand)
        print(f"VERZEICHNIS: unverändert · {len(set(neu_links))} Links")
        print("Verzeichnis fertig")
        return
    if vorhanden:
        with open(ALT, "w", encoding="utf-8") as f:       # Altwert VOR dem Schreiben (Rückweg --zurueck)
            f.write(vorhanden["body"] or "")
        r = gql('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p)'
                '{userErrors{message}}}',
                {"id": vorhanden["id"], "p": {"title": titel, "body": body}})
        art = "aktualisiert"
    else:
        r = gql('mutation($p:PageCreateInput!){pageCreate(page:$p){page{id handle}'
                'userErrors{message}}}',
                {"p": {"title": titel, "handle": HANDLE, "body": body,
                       "isPublished": True}})
        art = "angelegt"
    if r is None:
        print("PAUSE (Shopify antwortet nicht)"); return
    fehler = (list((r.get("data") or {}).values()) or [{}])[0].get("userErrors")
    if fehler:
        print("  ⚠️", json.dumps(fehler)[:200]); return
    zurueck = seite_lesen()
    ok = isinstance(zurueck, dict) and gleich(zurueck["body"], body)
    stand["geschrieben"] = ok
    stand_schreiben(stand)
    print(f"Seite /pages/{HANDLE} {art} — {len(koll)} Kategorien verlinkt · zurückgelesen {'ok' if ok else 'ABWEICHUNG'}")
    print(f"VERZEICHNIS: {len(set(neu_links))} Links (vorher {len(set(alt_links))})"
          + (f" · neu: {', '.join(dazu[:10])}{' …' if len(dazu) > 10 else ''}" if dazu else "")
          + (f" · weg: {', '.join(weg[:10])}" if weg else "")
          + ("" if ok else " · ⚠️ Zurücklesen weicht ab"))
    print("Verzeichnis fertig")


def seite_lesen():
    """Die Verzeichnisseite live (id, title, body) · None = gibt es nicht · "PAUSE" = Shopify stumm."""
    d = gql('query($q:String!){pages(first:5,query:$q){nodes{id handle title body}}}',
            {"q": f"handle:{HANDLE}"})
    if d is None:
        return "PAUSE"
    treffer = [n for n in ((d.get("data") or {}).get("pages") or {}).get("nodes", [])
               if n["handle"] == HANDLE]
    return treffer[0] if treffer else None


def gleich(a, b):
    """Inhaltsgleich trotz Shopify-Umformung: Shopify setzt «&» als «&amp;» und bricht zwischen Tags um (gemessen
    13.10.: 229× &amp;, «</h2>\n<ul»). Verglichen wird ohne Leerraum zwischen Tags und mit aufgelösten Entitäten."""
    n = lambda s: re.sub(r">\s+<", "><", html.unescape(s or "")).strip()
    return n(a) == n(b)


def verzeichnis_links(body):
    """Kollektions-Handles, auf die der Seitentext verlinkt (Reihenfolge wie im Text), dekodiert — «%F0%9F%8E%81-…» und
    «🎁-…» sind derselbe Link."""
    return [urllib.parse.unquote(h) for h in VLINK_RE.findall(body or "")]


def stand_schreiben(stand):
    try:
        with open(STAND, "w", encoding="utf-8") as f:
            json.dump(stand, f, ensure_ascii=False, indent=1)
    except OSError as e:
        print("  Stand nicht schreibbar:", e)


def zurueck():
    """Rückweg: schreibt den Seitentext aus dropship/_kategorien_verzeichnis_alt.html zurück (liest live zurück)."""
    if not os.path.exists(ALT):
        print("kein Altwert", ALT); return
    alt = open(ALT, encoding="utf-8").read()
    v = seite_lesen()
    if not isinstance(v, dict):
        print("Seite nicht lesbar/vorhanden — nichts zurückgestellt"); return
    r = gql('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p){userErrors{message}}}',
            {"id": v["id"], "p": {"body": alt}})
    z = seite_lesen()
    print("zurückgestellt" if isinstance(z, dict) and gleich(z["body"], alt) else f"FEHLER {json.dumps(r)[:200]}",
          f"· {len(set(verzeichnis_links(alt)))} Links")

if __name__ == "__main__":
    if "--zurueck" in sys.argv:
        zurueck()
    else:
        main()
