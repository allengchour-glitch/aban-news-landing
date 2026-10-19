#!/usr/bin/env python3
"""ratgeber_links_reparieren.py — tote (404) und umgeleitete (301) interne Links in Ratgeber-/Magazin-Artikeln auf lebende Ziele setzen.

ANLASS (19.10.2026, Betreiber «verbessere mehr sichtbarkeit», Freigabe «Beides»): 16 × 404-Produktlinks, 4 × 301-Produktlinks und
18 × 301-Kollektionslinks in 63 Artikeln (GEMESSEN 19.10. 21:25 UTC, curl ohne/mit Redirect-Folge + Admin-API, beide Wege deckungsgleich).
Googlebot und Leserinnen laufen in 404 bzw. in einen Umweg; interne Linkkraft verpufft. `blog_linkziele_wache.py` meldet seither
tote UND umgeleitete Ziele (Ampel «RATGEBER-LINKS: …»); dieses Werkzeug schreibt die Reparatur.

WAS ES TUT — und was nicht
  · ändert AUSSCHLIESSLICH href-Werte (kein Text, kein Preis, keine Umformatierung, keine Entity-Änderung). Vor jedem Schreiben wird geprüft:
    maske(alt) == maske(neu), wobei maske() alle href-Werte leert. Weicht ein Zeichen ausserhalb der href-Werte ab, bricht der Artikel ab.
  · Ersatz kommt aus einer Handliste (TSV: alt, neu, artikel, art, grund) — den Ersatz wählt ein Mensch bzw. die Session, nie das Skript.
    Vorgabe: 301 → Endziel; 404-Produkt → aktiver ZWILLING (alle Aussagen im Text bleiben wahr) ODER die passende Kollektion.
  · prüft jedes Ziel vor dem Schreiben am Ursprung (Admin-API): Produkt ACTIVE + im Online Store + nicht in der Werbetest-Sperre + ohne
    Risiko-Tags (Klinge/Tabak/Kostüm/ausverkauft/nicht-versendbar/auswahl-offen); Kollektion veröffentlicht + ≥ 5 Produkte. Keine Ketten
    (ein Ziel darf nicht selbst als «alt» in der Liste stehen).
  · Standard = TROCKENLAUF (Tabelle alt → neu je Artikel, schreibt NICHTS). Unbekannte Schalter brechen mit Exit 2 ab (argparse) — nie ein echter Lauf.

ZWILLINGS-REGEL v2 (19.10.2026 abends, nach Prüfer-Befunden zu den ersten 7 Zwillingen — 3 × mittel):
  Ein Produkt-Ersatz («Zwilling») ist nur erlaubt, wenn der TEXT UM DEN LINK auf der Zielseite wahr bleibt. v1 prüfte «5-teilig»/«aktiv»,
  nicht die Aussagen: Schlaufen-Set (keine Enden) für «Bicep Curls: beide Enden in die Hände», «mit 20 W» ohne Wattangabe auf der Zielseite,
  «30'000 mAh»-Satz auf eine 10'000-mAh-Seite, Fremdmarke («WACACO minipresso») im HAUPTBILD, Prosa-Preis «— CHF 24.90» (der Preisjob
  `blog_preise_aktualisieren.py` zieht NUR «(CHF x)» direkt hinter dem Link und Kartenpreise nach). Die Prüfung ist jetzt im Werkzeug:
    ZAHL   jede «Zahl + Einheit» (mAh, W, Wh [aus mAh abgeleitet ok], Teile/Stück/Set of N, cm, mm, ml, kg, g, lbs, Stufen …) in Anker + Umfeld
           muss in Titel/Beschreibung/Auswahl der Zielseite vorkommen, sonst Befund;
    PREIS  genannter Preis ≠ Live-Preis UND nicht vom Preisjob erfasst (Prosa) = Befund; erfasst (Klammer/Karte) = nur Hinweis;
    AUSWAHL/HAUPTBILD werden zur Sichtprüfung ausgegeben (Fremdmarke im Hauptbild bleibt ein MENSCHEN-/Vision-Urteil: Kontaktbogen ansehen).
  Befund bei ZAHL/PREIS → `--scharf` bricht mit Exit 3 ab (nur `--trotz-befund` schreibt trotzdem). Kollektion statt Produkt hat diese Befunde nicht.
  Nur prüfen, nichts schreiben:  `--pruefen [--quelle SICHERUNG.json]`  (mit der Sicherung der Vorher-Texte prüft es auch bereits erledigte Listen nach).
  Kanarienvogel: `--selbsttest` (offline, 6 Fälle) läuft vor jeder Zwillings-Prüfung; fällt er durch → «unklar», nie «0 Befunde».

AUFRUF
  python3 automation/ratgeber_links_reparieren.py                          # trocken, Standardliste
  python3 automation/ratgeber_links_reparieren.py --ersatz DATEI.tsv       # andere Liste
  python3 automation/ratgeber_links_reparieren.py --vorschlag              # Zeilen-Vorschlag aus /tmp/blog_linkziele.json (Wache), schreibt nichts
  bash automation/shopify_schranke.sh python3 automation/ratgeber_links_reparieren.py --scharf
                                                                           # scharf: nimmt den Blog-Lock SELBST (wartet bis 5 min), articleUpdate je Artikel, Rücklesen, Ledger
  python3 automation/ratgeber_links_reparieren.py --zurueck [--scharf]     # RÜCKWEG: Originaltexte aus der Sicherung (nur wenn seither nur href geändert)

SICHERUNG vor dem ersten Schreiben: dropship/_ratgeber_links_vorher_2026-10-19.json (id, handle, body — vorhandene Einträge werden NIE überschrieben).
Ledger: dropship/_ratgeber_links_ledger.tsv. Schreibt nur unter dem Blog-Lock /tmp/lock_blog_preise.lock, den das Werkzeug selbst nimmt (articleUpdate ersetzt den ganzen Body; kein äusserer flock — gleiche Datei = Selbst-Deadlock).
Danach: `python3 automation/blog_linkziele_wache.py` → «RATGEBER-LINKS: 0 tot · 0 umgeleitet».

SICHTBARER TEXT BLEIBT STEHEN (Freigabe = nur href): Karten, deren Zielprodukt gewechselt hat, behalten Namen/Preis des alten Produkts. Preise an
Produktlinks gleicht `blog_preise_aktualisieren.py` täglich an den Live-Preis an; bei Kollektions-Ersatz bleibt der alte Preis im Text stehen
(Bericht dropship/RATGEBER-LINKS-2026-10-19.md, Abschnitt «Text-Reste»).
"""
import argparse
import datetime
import fcntl
import json
import os
import re
import sys
import time
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402  (Eimer-Etikette inklusive)

try:
    from werbetest_sperre import gesperrt  # noqa: E402
except Exception:  # pragma: no cover
    def gesperrt(_x):
        return False

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ONLINE_STORE = "gid://shopify/Publication/301970915713"
HEUTE = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
ERSATZ_STD = f"{REPO}/dropship/_ratgeber_links_ersatz_2026-10-19.tsv"
VORHER_STD = f"{REPO}/dropship/_ratgeber_links_vorher_2026-10-19.json"
LEDGER = f"{REPO}/dropship/_ratgeber_links_ledger.tsv"
WACHE_JSON = os.environ.get("WACHE_JSON", "/tmp/blog_linkziele.json")
BLOG_LOCK = "/tmp/lock_blog_preise.lock"
RISIKO_TAGS = ("klinge", "tabak", "kostuem", "kostüm", "ausverkauft-lieferant", "cj-nicht-versendbar-ch", "auswahl-offen",
               "duplikat-auto-draft", "nicht-lieferbar-ch", "keine-lieferanten-ref", "waffe", "messer")
MIN_KOLL = 5

HREF = re.compile(r'(href\s*=\s*)(["\'])(.*?)\2', re.S | re.I)
HOST = re.compile(r'^((?:https?:)?//(?:www\.)?luxestyle\.ch)(?=/|$|[?#])', re.I)


def pfad_teile(wert):
    """href-Wert → (host_praefix, pfad, rest) für interne Links, sonst None. rest = «?…»/«#…» (bleibt beim Ersetzen erhalten)."""
    w = wert.strip()
    m = HOST.match(w)
    pre = ""
    if m:
        pre, w = m.group(1), w[m.end():] or "/"
    elif not w.startswith("/") or w.startswith("//"):
        return None
    k = re.search(r"[?#]", w)
    pfad, rest = (w[:k.start()], w[k.start():]) if k else (w, "")
    return pre, pfad, rest


def schluessel(pfad):
    return urllib.parse.unquote(pfad).rstrip("/").lower()


def maske(body):
    """Body ohne href-Werte — Gleichheit zweier Masken heisst: ausserhalb der href-Werte ist kein Zeichen verschieden."""
    return HREF.sub(lambda m: m.group(1) + m.group(2) + m.group(2), body or "")


def lade_artikel():
    q = """query($c:String){articles(first:50,after:$c){pageInfo{hasNextPage endCursor}
           nodes{id handle title body isPublished blog{handle}}}}"""
    out, c = [], None
    while True:
        d = gql(q, {"c": c})["articles"]
        out += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            return out
        c = d["pageInfo"]["endCursor"]


def lies_ersatz(datei):
    zeilen = []
    for n, roh in enumerate(open(datei, encoding="utf-8"), 1):
        if not roh.strip() or roh.startswith("#"):
            continue
        t = roh.rstrip("\n").split("\t")
        if len(t) < 3:
            sys.exit(f"{datei}:{n}: mindestens alt<TAB>neu<TAB>artikel erwartet")
        alt, neu, art = t[0].strip(), t[1].strip(), t[2].strip()
        for x in (alt, neu):
            if not re.match(r"^/(products|collections)/[^\s?#]+$", x):
                sys.exit(f"{datei}:{n}: «{x}» ist kein /products/… oder /collections/…-Pfad")
        if schluessel(alt) == schluessel(neu):
            sys.exit(f"{datei}:{n}: alt == neu")
        zeilen.append({"alt": alt, "neu": neu, "artikel": art, "art": t[3] if len(t) > 3 else "", "grund": t[4] if len(t) > 4 else ""})
    alts = {schluessel(z["alt"]) for z in zeilen}
    for z in zeilen:
        if schluessel(z["neu"]) in alts:
            sys.exit(f"Kette: Ziel {z['neu']} steht selbst als «alt» in der Liste")
    return zeilen


def ziele_pruefen(pfade):
    """Pfad → (ok, Grund). Wahrheit am Ursprung (Admin), nicht am Bot-Cache."""
    aus = {}
    for p in sorted(set(pfade)):
        if p.startswith("/products/"):
            h = urllib.parse.unquote(p.split("/products/")[1])
            d = gql("query($h:String!,$p:ID!){productByIdentifier(identifier:{handle:$h}){status tags onlineStoreUrl publishedOnPublication(publicationId:$p)}}",
                    {"h": h, "p": ONLINE_STORE})["productByIdentifier"]
            if not d:
                aus[p] = (False, "Produkt fehlt")
            elif d["status"] != "ACTIVE" or not d["publishedOnPublication"] or not d["onlineStoreUrl"]:
                aus[p] = (False, f"nicht kaufbar ({d['status']}, publiziert={bool(d['publishedOnPublication'])})")
            elif gesperrt(h):
                aus[p] = (False, "Werbetest-Sperre")
            else:
                schlecht = [t for t in d["tags"] if any(b in t.lower() for b in RISIKO_TAGS)]
                aus[p] = (not schlecht, "ok" if not schlecht else f"Risiko-Tags {schlecht}")
        else:
            h = urllib.parse.unquote(p.split("/collections/")[1])
            d = gql("query($h:String!,$p:ID!){collectionByHandle(handle:$h){productsCount{count} publishedOnPublication(publicationId:$p)}}",
                    {"h": h, "p": ONLINE_STORE})["collectionByHandle"]
            if not d:
                aus[p] = (False, "Kollektion fehlt")
            elif not d["publishedOnPublication"]:
                aus[p] = (False, "Kollektion nicht veröffentlicht")
            elif d["productsCount"]["count"] < MIN_KOLL:
                aus[p] = (False, f"nur {d['productsCount']['count']} Produkte")
            else:
                aus[p] = (True, f"ok ({d['productsCount']['count']})")
    return aus


def plane(artikel, ersatz):
    """→ [(artikel, neuer_body, [(alt, neu, n)])] nur für Artikel mit Treffern."""
    je_alt = {}
    for z in ersatz:
        je_alt.setdefault(schluessel(z["alt"]), []).append(z)
    plan, benutzt = [], set()
    for a in artikel:
        body = a.get("body") or ""
        aend = {}

        def ers(m):
            t = pfad_teile(m.group(3))
            if not t:
                return m.group(0)
            pre, pfad, rest = t
            for z in je_alt.get(schluessel(pfad), []):
                if z["artikel"] in ("*", a["handle"]):
                    aend[(z["alt"], z["neu"])] = aend.get((z["alt"], z["neu"]), 0) + 1
                    benutzt.add((z["alt"], z["neu"], z["artikel"]))
                    return m.group(1) + m.group(2) + pre + z["neu"] + rest + m.group(2)
            return m.group(0)

        neu = HREF.sub(ers, body)
        if neu != body:
            if maske(neu) != maske(body):
                sys.exit(f"ABBRUCH {a['handle']}: Änderung ausserhalb der href-Werte (Programmfehler)")
            plan.append((a, neu, [(k[0], k[1], n) for k, n in sorted(aend.items())]))
    ungenutzt = [z for z in ersatz if (z["alt"], z["neu"], z["artikel"]) not in benutzt]
    return plan, ungenutzt


# ───────────────────────── Zwillings-Prüfung (Regel v2, 19.10.2026) ─────────────────────────
CLAIM_RE = re.compile(
    r"(?<![\d.,’'])(\d{1,3}(?:[’']\d{3})+|\d+(?:[.,]\d+)?)\s*[-–]?\s*"
    r"(mAh|Wh|Watt|W|Teilig|Teilen|Teile|Teil|Stück|Stk\.?|Pcs|Pieces|Piece|ml|cm|mm|kg|g|Pfund|lbs|Stufen|Fächer|Farben)(?![A-Za-zäöüÄÖÜ])", re.I)
SET_OF_RE = re.compile(r"\b(?:set|pack)\s+of\s+(\d+)\b", re.I)
PREIS_ANGABE = re.compile(r"CHF\s*(\d+\.\d\d)")
BLOCK_GRENZE = ("<li", "<p", "<div", "</p>", "</li>", "</div>", "<h2", "<h3", "<td", "<tr")
NACH_ENDE = re.compile(r'<a\s[^>]*href\s*=\s*["\']/products/|</li>|<h2|<h3|</ul>|</ol>', re.I)
EINHEIT = {"watt": "w", "teilig": "teile", "teilen": "teile", "teile": "teile", "teil": "teile", "stück": "teile", "stk": "teile", "stk.": "teile",
           "pcs": "teile", "pieces": "teile", "piece": "teile"}


def _klartext(html_text):
    import html as _h
    return re.sub(r"\s+", " ", _h.unescape(re.sub(r"<[^>]+>", " ", html_text or ""))).strip()


def behauptungen(text):
    """Text → {(Zahl, Einheit)} aus «Zahl + Einheit»; «Set of N» zählt als N Teile; Zahlen ohne Einheit (Preise) zählen nicht."""
    aus = set()
    for m in CLAIM_RE.finditer(text or ""):
        roh = m.group(1)
        zahl = float(re.sub(r"[’']", "", roh)) if re.search(r"[’']", roh) else float(roh.replace(",", "."))
        e = m.group(2).lower()
        aus.add((zahl, EINHEIT.get(e, e)))
    for m in SET_OF_RE.finditer(text or ""):
        aus.add((float(m.group(1)), "teile"))
    return aus


def unbelegt(behauptet, belegt):
    """Behauptete (Zahl, Einheit)-Paare, die die Zielseite nicht trägt. Wh gilt als belegt, wenn es sich aus einer mAh-Angabe (3,7 V) ergibt."""
    fehlt = []
    for zahl, einheit in sorted(behauptet):
        if (zahl, einheit) in belegt:
            continue
        if einheit == "wh" and any(e == "mah" and abs(z * 3.7 / 1000 - zahl) <= 1.0 for z, e in belegt):
            continue
        fehlt.append((zahl, einheit))
    return fehlt


def kontext_um_link(body, m):
    """href-Treffer m → (anker_text, umfeld_text): Ankertext, dazu Text davor (bis zur Blockgrenze, max 160 Z.) und danach (bis nächster Produktlink/Listenende, max 420 Z.)."""
    a0 = body.rfind("<a", 0, m.start())
    t_ende = body.find(">", m.end())
    a_ende = body.find("</a>", t_ende)
    if a0 < 0 or t_ende < 0 or a_ende < 0:
        return "", ""
    anker = body[t_ende + 1:a_ende]
    davor = body[max(0, a0 - 160):a0]
    k = max((davor.rfind(g) for g in BLOCK_GRENZE), default=-1)
    davor = davor[k:] if k >= 0 else davor
    danach = body[a_ende + 4:a_ende + 4 + 420]
    n = NACH_ENDE.search(danach)
    danach = danach[:n.start()] if n else danach
    return _klartext(anker), _klartext(davor + " " + danach)


def produkt_fakten(handles):
    f = {}
    for h in sorted(set(handles)):
        d = gql("""query($h:String!){productByIdentifier(identifier:{handle:$h}){title descriptionHtml tags
                   options{name values} priceRangeV2{minVariantPrice{amount}} featuredMedia{preview{image{url}}}}}""", {"h": h})["productByIdentifier"]
        if d:
            f[h] = d
    return f


def zwilling_selbsttest():
    """Offline-Kanarienvogel mit den Fällen vom 19.10. Gibt (ok, [Fehlermeldungen]) zurück."""
    from blog_preise_aktualisieren import fundstellen
    fehler = []
    ziel = lambda t: behauptungen(t)
    # A «mit 20 W» + «10’000-mAh» gegen Seite ohne Wattangabe → 20 W unbelegt, 10000 mAh belegt
    beh = behauptungen("magnetische 10’000-mAh-Powerbank mit 20 W (CHF 27.90) lädt kabellos")
    bel = ziel("Ultradünne MagSafe Powerbank 10'000 mAh Masse: 100 x 66 x 7.1 mm Eingangsspannung: 220V")
    if unbelegt(beh, bel) != [(20.0, "w")]:
        fehler.append(f"A: erwartet [(20.0,'w')], bekam {unbelegt(beh, bel)}")
    # B «5-teilig» gegen «Loop Set Of 5» → belegt (Set-of-Synonym)
    if unbelegt(behauptungen("Resistance Bands Set 5-teilig"), ziel("Resistance Bands Loop Set Of 5 Exercise")):
        fehler.append("B: 5-teilig gegen «Set Of 5» müsste belegt sein")
    # C «30'000 mAh» gegen 10'000-mAh-Seite → unbelegt
    if unbelegt(behauptungen("Karte behauptet 30'000 mAh = 111 Wh"), ziel("Powerbank 10000 mAh integriertes Kabel")) != [(111.0, "wh"), (30000.0, "mah")]:
        fehler.append(f"C: {unbelegt(behauptungen('Karte behauptet 30’000 mAh = 111 Wh'), ziel('Powerbank 10000 mAh integriertes Kabel'))}")
    # D Wh aus mAh abgeleitet → 10'000 mAh ≈ 37 Wh belegt
    if unbelegt(behauptungen("10'000 mAh (≈ 37 Wh)"), ziel("Powerbank 10000 mAh")):
        fehler.append("D: 37 Wh aus 10000 mAh abgeleitet müsste belegt sein")
    # E Preisjob erfasst «(CHF x)» hinter dem Link, NICHT «— CHF x» in Prosa
    if not [x for x in fundstellen('<p><a href="/products/p1">Name</a> (CHF 31.90) text</p>') if x[0] == "p1"]:
        fehler.append("E1: Klammerpreis müsste vom Preisjob erfasst sein")
    if [x for x in fundstellen('<ul><li><a href="/products/p1">Name</a> — CHF 24.90</li></ul>') if x[0] == "p1"]:
        fehler.append("E2: Prosa-Preis nach «—» darf NICHT erfasst sein (Annahme des Prüfers 19.10.)")
    # F Kontext: Listenpunkt endet am </li>, nächster Punkt zählt nicht mit
    body = '<ul><li><a href="/products/p1">Name</a> — CHF 24.90</li><li><a href="/products/p2">Zwei 99 W</a> — CHF 5.00</li></ul>'
    m = next(HREF.finditer(body))
    a, u = kontext_um_link(body, m)
    if "99" in u or "24.90" not in u:
        fehler.append(f"F: Kontext falsch geschnitten: {u!r}")
    return (not fehler), fehler


def zwilling_pruefung(plan, ersatz):
    """Prüft jeden Produkt→Produkt-Ersatz des Plans. → (befunde_hart, zeilen). Hart = ZAHL oder PREIS (Prosa). Schreibt nichts."""
    from blog_preise_aktualisieren import fundstellen
    je_alt = {}
    for z in ersatz:
        if z["neu"].startswith("/products/"):
            je_alt.setdefault(schluessel(z["alt"]), []).append(z)
    if not je_alt:
        return 0, ["ZWILLINGS-PRÜFUNG: kein Produkt-Ersatz in der Liste (nur Kollektionen) — nichts zu prüfen"]
    ok, fehler = zwilling_selbsttest()
    if not ok:
        return 1, [f"ZWILLINGS-PRÜFUNG: unklar (Kanarienvogel fiel durch: {'; '.join(fehler)})"]
    neu_handles = {urllib.parse.unquote(z["neu"].split("/products/")[1]) for zs in je_alt.values() for z in zs}
    fakten = produkt_fakten(neu_handles)
    zeilen, hart = [], 0
    for a, neu_body, aend in plan:
        erfasst = {}
        for h, _s, _e, _ab, preis, _art in fundstellen(neu_body):
            erfasst.setdefault(h, []).append(preis)
        for m in HREF.finditer(a.get("body") or ""):
            t = pfad_teile(m.group(3))
            if not t:
                continue
            for z in je_alt.get(schluessel(t[1]), []):
                if z["artikel"] not in ("*", a["handle"]):
                    continue
                h = urllib.parse.unquote(z["neu"].split("/products/")[1])
                f = fakten.get(h)
                kopf = f"ZWILLING {a['handle'][:48]} · {z['alt'].split('/')[-1][:34]} → {h[:40]}"
                if not f:
                    zeilen.append(kopf + " · ⚠️ Zielprodukt nicht lesbar"); hart += 1
                    continue
                anker, umfeld = kontext_um_link(a["body"], m)
                ziel_text = _klartext(f["title"] + " " + f["descriptionHtml"] + " " + " ".join(v for o in f["options"] for v in o["values"]))
                fehlt = unbelegt(behauptungen(anker + " " + umfeld), behauptungen(ziel_text))
                live = float(f["priceRangeV2"]["minVariantPrice"]["amount"])
                meldungen = []
                if fehlt:
                    meldungen.append("ZAHL nicht auf Zielseite: " + ", ".join(f"{int(x) if x == int(x) else x} {e}" for x, e in fehlt))
                for p in sorted(set(float(x) for x in PREIS_ANGABE.findall(anker + " " + umfeld))):
                    if abs(p - live) > 0.05:
                        if any(abs(p - e) < 0.005 for e in erfasst.get(h, [])):
                            meldungen.append(f"hinweis: Preis {p:.2f} → live {live:.2f}, Preisjob zieht nach")
                        else:
                            meldungen.append(f"PREIS {p:.2f} im Text, live {live:.2f} — Preisjob erfasst NUR «(CHF x)» hinter dem Link/Karten")
                opt = "; ".join(f"{o['name']}:{len(o['values'])}" for o in f["options"])
                bild = (((f.get("featuredMedia") or {}).get("preview") or {}).get("image") or {}).get("url", "?")
                hart_hier = any(x.startswith(("ZAHL", "PREIS")) for x in meldungen)
                hart += 1 if hart_hier else 0
                zeilen.append(f"{kopf} · {'⚠️ ' if hart_hier else 'ok '}{' | '.join(meldungen) or 'Aussagen belegt'} · Auswahl {opt} · Hauptbild ansehen: {bild}")
    return hart, zeilen


def sicherung(plan, datei):
    alt = json.load(open(datei, encoding="utf-8")) if os.path.exists(datei) else []
    vorhanden = {e["id"] for e in alt}
    neu = [{"id": a["id"], "handle": a["handle"], "blog": (a.get("blog") or {}).get("handle"), "body": a["body"], "gesichert": HEUTE}
           for a, _, _ in plan if a["id"] not in vorhanden]
    if neu:
        tmp = datei + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(alt + neu, f, ensure_ascii=False, indent=1)
        os.replace(tmp, datei)
    return len(neu), len(alt)


M_UPD = "mutation($id:ID!,$b:HTML!){articleUpdate(id:$id,article:{body:$b}){userErrors{field message} article{id}}}"


def schreibe(plan, vorher_datei):
    n_neu, n_alt = sicherung(plan, vorher_datei)
    print(f"Sicherung {os.path.relpath(vorher_datei, REPO)}: +{n_neu} neu, {n_alt} vorhanden")
    ok = 0
    for a, neu, aend in plan:
        r = gql(M_UPD, {"id": a["id"], "b": neu})["articleUpdate"]
        if r["userErrors"]:
            print("  FEHLER", a["handle"], r["userErrors"])
            continue
        z = gql("query($i:ID!){article(id:$i){body}}", {"i": a["id"]})["article"]["body"]
        if z == neu:
            stand = "identisch"
        elif maske(z) == maske(a["body"]):
            stand = "nur href verschieden (Shopify normalisiert href nicht weiter)"
        else:
            print(f"  ⚠️ RÜCKLESEN ABWEICHEND {a['handle']}: Shopify hat ausserhalb der href-Werte etwas verändert — Rückweg: --zurueck")
            continue
        if z != neu and any(schluessel(x[1]) not in schluessel(z) for x in aend):
            print(f"  ⚠️ RÜCKLESEN: neues Ziel fehlt im Text von {a['handle']}")
            continue
        ok += 1
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{a['id']}\t{a['handle']}\t" + ";".join(f"{x}=>{y} x{n}" for x, y, n in aend) + f"\t{HEUTE}\n")
        print(f"  geschrieben {a['handle'][:62]:62} Rücklesen {stand}")
        time.sleep(0.5)
    return ok


def zurueck(vorher_datei, scharf):
    arts = {a["id"]: a for a in json.load(open(vorher_datei, encoding="utf-8"))}
    ok = 0
    for aid, s in arts.items():
        z = gql("query($i:ID!){article(id:$i){body handle}}", {"i": aid})["article"]
        if not z:
            print("  fehlt:", s["handle"]); continue
        if z["body"] == s["body"]:
            print("  schon Original:", s["handle"]); continue
        if maske(z["body"]) != maske(s["body"]):
            print(f"  ⚠️ NICHT zurückgespielt {s['handle']}: seit der Reparatur wurde auch Text geändert — von Hand prüfen"); continue
        print(("  zurück " if scharf else "  (trocken) zurück ") + s["handle"])
        if scharf:
            r = gql(M_UPD, {"id": aid, "b": s["body"]})["articleUpdate"]
            if r["userErrors"]:
                print("  FEHLER", r["userErrors"]); continue
            ok += 1
            time.sleep(0.5)
    print("FERTIG", "SCHARF" if scharf else "TROCKEN", ok, "zurückgespielt")


def vorschlag():
    d = json.load(open(WACHE_JSON, encoding="utf-8"))
    print("# alt\tneu\tartikel\tart\tgrund   (VORSCHLAG aus", WACHE_JSON, d.get("stand"), "— prüfen, nicht blind übernehmen)")
    for p, v in sorted((d.get("mit_redirect") or {}).items()):
        ziel = urllib.parse.urlparse(v.get("redirect") or "").path or v.get("redirect") or "?"
        print(f"{p}\t{ziel}\t*\t301\tEndziel der Weiterleitung (Zwilling/passendere Kollektion prüfen)")
    for p, v in sorted((d.get("tote") or {}).items()):
        k = (v.get("kollektionen") or [{}])[0].get("handle")
        print(f"{p}\t{('/collections/' + k) if k else '/collections/?'}\t*\t{v.get('zustand', 'tot')}\tZwilling suchen (aktiv, gleiche Aussagen) oder Kollektion; Artikel: {','.join(v.get('artikel', [])[:3])}")


def main():
    ap = argparse.ArgumentParser(description="Ratgeber-Links reparieren (nur href). Standard = Trockenlauf.")
    ap.add_argument("--scharf", action="store_true", help="wirklich schreiben (sonst Trockenlauf)")
    ap.add_argument("--ersatz", default=ERSATZ_STD, help="TSV alt<TAB>neu<TAB>artikel<TAB>art<TAB>grund")
    ap.add_argument("--vorher", default=VORHER_STD, help="Sicherungsdatei (JSON)")
    ap.add_argument("--zurueck", action="store_true", help="Rückweg aus der Sicherung")
    ap.add_argument("--vorschlag", action="store_true", help="Listenzeilen aus der Wache ausgeben")
    ap.add_argument("--pruefen", action="store_true", help="nur die Zwillings-Pruefung (Regel v2) ausgeben, nichts schreiben")
    ap.add_argument("--quelle", default=None, help="mit --pruefen: Sicherungs-JSON (id, handle, body) statt der Live-Artikel lesen")
    ap.add_argument("--trotz-befund", action="store_true", help="--scharf schreibt auch bei Befunden der Zwillings-Pruefung (bewusste Ausnahme)")
    ap.add_argument("--selbsttest", action="store_true", help="Kanarienvogel der Zwillings-Pruefung (offline), kein Lauf")
    a = ap.parse_args()
    if a.selbsttest:
        ok, fehler = zwilling_selbsttest()
        print("RATGEBER-ZWILLING-SELBSTTEST:", "ok (6 Faelle)" if ok else "FEHLER " + "; ".join(fehler))
        sys.exit(0 if ok else 1)
    if a.vorschlag:
        return vorschlag()
    if a.zurueck:
        return zurueck(a.vorher, a.scharf)
    ersatz = lies_ersatz(a.ersatz)
    if a.pruefen:
        arts = json.load(open(a.quelle, encoding="utf-8")) if a.quelle else lade_artikel()
        plan, _ungenutzt = plane(arts, ersatz)
        hart, zeilen = zwilling_pruefung(plan, ersatz)
        print("\n".join(zeilen))
        print(f"ZWILLINGS-PRUEFUNG: {hart} Befund(e) in {len(plan)} Artikeln (nichts geschrieben)")
        return
    pruef = ziele_pruefen([z["neu"] for z in ersatz])
    schlecht = {p: g for p, (ok, g) in pruef.items() if not ok}
    for p, (ok, g) in sorted(pruef.items()):
        print(("  ok " if ok else "  !! ") + p + "  " + g)
    if schlecht:
        sys.exit(f"ABBRUCH: {len(schlecht)} Ersatzziele nicht tauglich: {schlecht}")
    arts = lade_artikel()
    plan, ungenutzt = plane(arts, ersatz)
    n_links = sum(n for _, _, ae in plan for _, _, n in ae)
    print(f"\n{len(plan)} Artikel · {n_links} Link-Vorkommen · {len(ersatz)} Listenzeilen · {len(arts)} Artikel gelesen")
    for art, _, aend in plan:
        for x, y, n in aend:
            print(f"  {art['handle'][:58]:58} {x}  →  {y}  (x{n})")
    for z in ungenutzt:
        print(f"  (ohne Treffer) {z['alt']} → {z['neu']} [{z['artikel']}]")
    hart, zeilen = zwilling_pruefung(plan, ersatz)
    print("\n" + "\n".join(zeilen))
    if hart and a.scharf and not a.trotz_befund:
        print(f"ABBRUCH (Exit 3): {hart} Befund(e) der Zwillings-Pruefung (Regel v2) — Ersatz aendern (Kollektion statt Produkt) oder bewusst --trotz-befund.")
        sys.exit(3)
    if not a.scharf:
        print("FERTIG TROCKEN — nichts geschrieben")
        return
    lock = open(BLOG_LOCK, "w")
    t0 = time.time()
    while True:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            break
        except OSError:
            if time.time() - t0 > 300:
                print("Blog-Lock 5 min belegt — nichts geschrieben (Exit 75). Hinweis: NICHT zusätzlich mit äusserem flock auf derselben Datei aufrufen.")
                sys.exit(75)
            time.sleep(5)
    if time.time() - t0 > 6:      # gewartet → ein Fremdschreiber (blog_preise_aktualisieren) kann dazwischen gewesen sein: neu lesen
        arts = lade_artikel()
        plan, ungenutzt = plane(arts, ersatz)
    ok = schreibe(plan, a.vorher)
    print(f"FERTIG SCHARF {ok}/{len(plan)} Artikel geschrieben")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print(f"RATGEBER-LINKS-REPARATUR: unklar ({type(e).__name__}: {str(e)[:160]})")
        sys.exit(1)
