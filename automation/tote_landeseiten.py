#!/usr/bin/env python3
"""Rankende Seiten, die ins Leere führen — täglich statt einmalig.

ANLASS (28.08.2026): Von 60 Produkt-URLs, für die der Shop bei Google rankt, waren **17
gedraftet** — für Besucherinnen ein 404. Zusammen 12'320 Suchen im Monat, angeführt von einem
Produkt mit 3'600. Alle 17 waren ZU RECHT gedraftet (keine Lieferanten-SKU, nicht in die CH
lieferbar, ausverkauft, verdeckte Überwachung); veröffentlichen wäre falsch. Richtig sind
Weiterleitungen auf kaufbare Ware.

WARUM ES WIEDERKOMMT: Die täglichen Wächter draften laufend Ware (Viability, Dubletten,
Medizinprodukte, Merchant-Sperre). Jeder dieser Läufe kann eine Seite erwischen, die Besucher
hat — und keiner von ihnen weiss davon.

WAS DIESER LAUF TUT
 1. Holt aus Shopifys eigenen Sitzungsdaten (ShopifyQL) die Produkt-Landeseiten der letzten
    60 Tage — also die Seiten, auf denen tatsächlich Menschen ankamen.
 2. Prüft jede gegen den LIVE-Status.
 3. Ist sie nicht mehr kaufbar und hat noch keine Weiterleitung: legt eine an, WENN ein
    eindeutig gleichartiges aktives Produkt existiert. Sonst nur melden.

⚠️ NIE veröffentlichen. Ein Draft hat einen Grund im Tag; ein 404 ist ärgerlich, eine
unlieferbare Bestellung teuer (Lehre 20.08.).
⚠️ NIE auf eine fremde Marke umleiten. Wer «cerave» sucht und auf einer No-Name-Creme landet,
erlebt einen Köderwechsel. Markenanfragen bleiben dem Menschen überlassen.

  DRY=1  nur zeigen (Standard)   FIX=1  Weiterleitungen anlegen
  GSC=1  zusätzlich die Search Console lesen (dropship/_gsc_seiten.json, Schnappschuss ≤ 3 T alt)
  --kanarien  Zielwahl gegen feste Titel prüfen (live, 0 Fehler Pflicht vor FIX)

SEARCH CONSOLE ALS ZWEITE QUELLE (13.10.2026, Messrunde Richter Platz 1): Shopify zählt Landungen auf einer 404-Seite
NICHT als Sitzung. Seiten, die schon tot waren, als Google-Besucher kamen, sah dieser Wächter deshalb nie. GEMESSEN
(Skeptiker, 1 Woche GSC 04.–10.10.): 133 tote /products/-Seiten ohne 301 mit 332–364 Impressionen/Woche, nur 2 davon mit
einer ShopifyQL-Sitzung; 3–4 echte 404-Klicks/Woche. Für GSC-Funde gilt eine STRENGERE Zielwahl: Zwilling nur über
ersatz() (≥ 0,70, kein neues langes Wort), Kategorie nur über TITEL_ZIEL und nur, wenn die Zielkollektion ≤ 3'000 aktive
Produkte hat — grobe Tag-/Typ-Rückfälle gehen in den Bericht. Höchstens GSC_MAX (50) neue Weiterleitungen je Lauf.
Erwartung ehrlich: Hygiene am einzigen Kanal mit Käufen, ≈ 0 Käufe in 6 Wochen (VERMUTUNG).
"""
import json, os, re, subprocess, sys, time, urllib.parse

SHOP = "au3j0y-hq.myshopify.com"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, "dropship", "TOTE-LANDESEITEN.md")
LEDGER = os.path.join(REPO, "dropship", "_tote_landeseiten.txt")
FIX = os.environ.get("FIX") == "1"
TAGE = os.environ.get("TAGE", "60")
GSC = os.environ.get("GSC") == "1"
GSC_DATEI = os.path.join(REPO, "dropship", "_gsc_seiten.json")
GSC_STAND = os.path.join(REPO, "dropship", "_gsc_tot_stand.json")
GSC_MAX = int(os.environ.get("GSC_MAX", "50"))
ONLINE_STORE = "gid://shopify/Publication/301970915713"
GSC_KOLL_MAX = 3000     # grössere Kategorien sind für eine Google-Landung zu grob (sub-haustier 3'704, damen-mode 10'344)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:   # 13.10.2026: Eimer-Etikette (Regel «helfer-ohne-eimer») — der Helfer hatte keine
    from eimer_etikette import nachlauf as _nachlauf
except Exception:  # pragma: no cover
    def _nachlauf(d):
        return 0
from bestandteil_regel import fehlt as bestandteil_fehlt   # 13.10.2026: Set → Einzelteil (Klasse 18)
GEMELDET = []   # (Quelltitel, Kandidaten-Handle, fehlende Bestandteile) — ersatz() hat diesen Zwilling verworfen
try:
    from klingenregel import ist_handklinge
except Exception:  # pragma: no cover
    def ist_handklinge(t):
        return False

# Tags, die ein Ziel disqualifizieren — ein Ersatz darf nicht dasselbe Problem haben.
RISIKO = {"verdeckte-ueberwachung", "abhoergeraet-pruefen", "nicht-bewerben",
          "medizinprodukt-pruefen", "waffengesetz-verboten", "nur-onlineshop", "18plus",
          "raucher", "duplikat-auto-draft", "keine-lieferanten-ref"}
# Wörter, die für die Ähnlichkeit nichts aussagen.
STOPP = {"der", "die", "das", "und", "mit", "fuer", "für", "aus", "im", "in", "von", "zum",
         "zur", "premium", "set", "neu", "cm", "ml", "stk", "stück", "damen", "herren"}


def token():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(REPO, "automation", "shop_token_refresh.sh")],
                       capture_output=True)
    return open(p).read().strip()


TOK = token()


def gql(q, v=None):
    b = {"query": q}
    if v:
        b["variables"] = v
    for _ in range(10):
        r = subprocess.run(["curl", "-s", "--max-time", "45",
                            f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "-d", json.dumps(b)], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            time.sleep(3); continue
        # Eine Drosselung ist kein Abbruchgrund — sie sagt nur, wie lange zu warten ist.
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in (d.get("errors") or [])):
            k = (d.get("extensions") or {}).get("cost") or {}
            ts = k.get("throttleStatus") or {}
            time.sleep(min(20, max(2, (k.get("requestedQueryCost", 100) - ts.get("currentlyAvailable", 0))
                                   / (ts.get("restoreRate") or 100) + 1)))
            continue
        _nachlauf(d)
        return d
    return {"errors": [{"message": "aufgegeben"}]}


def worte(t):
    return {w for w in re.findall(r"[a-zäöüß0-9]{4,}", (t or "").lower()) if w not in STOPP}


# ⚠️ 22.09.2026 — DER STILLE DECKEL. Hier stand `LIMIT 250`. Gemessen an diesem Tag:
# 60 Tage haben 1'094 Landeseiten, davon 953 Produktseiten; die obersten 250 enden bei
# 2 Sitzungen. Der Wächter sah also 221 von 953 Produktseiten (23 %) und meldete täglich
# «FERTIG». Neun besuchte Seiten mit je 1–2 Sitzungen lagen gedraftet ohne Weiterleitung
# darunter — jede ein 404 für einen Menschen, den Google geschickt hat. Ein Deckel, der
# nicht gemeldet wird, ist ein Blindfleck, der wie Vollständigkeit aussieht.
DECKEL = int(os.environ.get("DECKEL", "2000"))


def landeseiten():
    q = (f"FROM sessions SHOW sessions GROUP BY landing_page_path "
         f"SINCE -{TAGE}d UNTIL today ORDER BY sessions DESC LIMIT {DECKEL}")
    d = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}', {"q": q})
    t = (d.get("data") or {}).get("shopifyqlQuery") or {}
    if t.get("parseErrors"):
        print("ShopifyQL:", str(t["parseErrors"])[:180]); return None
    rows = (t.get("tableData") or {}).get("rows") or []
    if len(rows) >= DECKEL:
        print(f"⚠️ DECKEL {DECKEL} erreicht — Landeseiten mit wenigen Sitzungen bleiben UNGESEHEN "
              f"(DECKEL=… erhöhen). Letzte Zeile hat {rows[-1].get('sessions')} Sitzungen.")
    else:
        print(f"Landeseiten gesamt ({TAGE} T): {len(rows)} — unter dem Deckel {DECKEL}, vollständig gelesen")
    aus = []
    for r in rows:
        p = r.get("landing_page_path") or ""
        if p.startswith("/products/"):
            # ⚠️ 22.09.2026: ShopifyQL liefert den Pfad URL-KODIERT («…-%E2%98%80%EF%B8%8F»).
            # Mit dem kodierten Handle fand `handle:` nichts, und SIEBEN aktive Produkte
            # (Emoji-/®-Handles der Editor-Ware) standen als «(gelöscht)» im Bericht —
            # dieselbe Falle wie `menue_links.py` am 15.09. Erst entschlüsseln, dann fragen.
            aus.append((urllib.parse.unquote(p.split("/")[-1].split("?")[0]), int(r.get("sessions") or 0)))
    return aus


def handle_kern(handle):
    """«kiss-cut-aufkleber-selbst-gestalten–10»: der Besucher kam mit einem Anhängsel
    (Gedankenstrich + Zahl, oder Zeichenmüll am Ende) — das Produkt ohne Anhängsel lebt.
    Gibt den bereinigten Handle zurück, wenn er sich unterscheidet, sonst None."""
    k = re.sub(r"[–—]\d+$", "", handle)   # nur Gedanken-/Geviertstrich — «-382081» ist ein echter CJ-Suffix
    k = re.sub(r"[^a-z0-9äöüß]+$", "", k)
    return k if k and k != handle else None


def produkt(handle):
    d = gql('query($q:String!){products(first:1,query:$q){nodes{id title status productType tags}}}',
            {"q": "handle:" + handle})
    n = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    return n[0] if n else None


def hat_weiterleitung(pfad):
    """⚠️ 22.09.2026: Shopify speichert Pfade mit Emoji/®/Gedankenstrich KODIERT. Mit dem
    entschlüsselten Pfad fand die Suche nichts, `urlRedirectCreate` antwortete dann
    «Path has already been taken» (3× am ersten vollen Lauf). Beide Formen fragen."""
    for q in {pfad, urllib.parse.quote(pfad, safe="/-_.~")}:
        d = gql('query($q:String!){urlRedirects(first:2,query:$q){nodes{target}}}', {"q": "path:" + q})
        if ((d.get("data") or {}).get("urlRedirects") or {}).get("nodes"):
            return True
    return False


def ersatz(titel, typ):
    """Eindeutig gleichartiges aktives Produkt — oder None. Lieber nichts als das Falsche."""
    kern = sorted(worte(titel), key=len, reverse=True)[:3]
    if not kern:
        return None
    d = gql('query($q:String!){products(first:8,query:$q){nodes{handle title status productType tags '
            'variants(first:1){nodes{availableForSale}}}}}',
            # ⚠️ 08.09.2026: Hier stand `title:<wort>` OHNE Stern. Gemessen ist `title:` NICHT
            # stumm, sondern ein EXAKTER Token-Vergleich — und deutsche Titel tragen das Suchwort
            # fast immer als Teil einer Zusammensetzung («Katzentrinkbrunnen»). Zahlen:
            #   title:Trinkbrunnen  -> 0   ·  title:Trinkbrunnen*  -> 21  ·  Freitext -> 24
            #   title:Faszienrolle  -> 0   ·  title:Faszienrolle*  ->  7
            # Bei MEHREREN Kernwoertern fiel es nie auf, weil nur das erste Wort an `title:` bindet
            # und der Rest als Freitext lief; bei EINEM Kernwort war der Lauf blind und nahm die
            # gröbere Kategorie. Der Stern behebt genau das.
            # ⚠️ NICHT auf reinen Freitext umgestellt, obwohl der noch mehr faende: Freitext sucht
            # auch in Beschreibung und Tags, und die Schwelle 0.70 unten ist am ENGEN Kandidatensatz
            # geeicht. Im Test hob Freitext ausgerechnet das dokumentierte Koederwechsel-Paar
            # «Smaragd-Anhänger Halskette» → «Leopard Anhänger Halskette mit Smaragd» auf 0.75 und
            # damit UEBER die Schwelle. Wer die Suche verbreitert, muss die Schwelle neu eichen —
            # zwei Beispiele reichen dafuer nicht.
            {"q": "status:active AND title:" + "* title:".join(kern) + "*"})
    n = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    beste, bester_wert = None, 0.0
    for p in n:
        if set(p["tags"]) & RISIKO:
            continue
        v = (p["variants"]["nodes"] or [{}])[0]
        if not v.get("availableForSale"):
            continue
        a, b = worte(titel), worte(p["title"])
        if not a or not b:
            continue
        # ⚠️ 08.09.2026: Die Schwelle allein reicht NICHT. Gemessen kommt das im Kommentar unten
        # ausdruecklich als Koederwechsel verworfene Paar «Smaragd-Anhänger Halskette» →
        # «Leopard Anhänger Halskette mit Smaragd» heute auf 0.75 und damit UEBER die 0.70 —
        # der Wert ist seit dem Probelauf gestiegen, weil `worte()` seither Fuellwoerter entfernt
        # und die Vereinigungsmenge kleiner wurde. **Eine Schwelle altert mit der Funktion, die
        # sie fuettert.** Deshalb zusaetzlich die Regel, die der Kommentar selbst nennt: «ein Wort
        # im Ziel verschiebt die Ware». Bringt der Kandidat ein LANGES Wort mit, das der Quelltitel
        # nicht hat, ist er nicht mehr «eindeutig gleichartig» und geht in den Bericht.
        # In beide Richtungen geprueft: leopard/edelstahl/kurzarm/blumenprint gesperrt,
        # identischer Titel (kein neues Wort) geht durch.
        if {w for w in b - a if len(w) >= 5}:
            continue
        # 13.10.2026 (Kauf-Strecke Klasse 18): Set → Einzelteil ist ein Köderwechsel. STOPP oben streicht «set»,
        # «stk», «stück» und «mit» — darum eigene Regel (automation/bestandteil_regel.py): fehlt im Kandidaten ein Set-,
        # Stück- oder «mit X»-Wort der Quelle, wird er NICHT genommen, sondern in GEMELDET gemerkt (Bericht).
        fehlend = bestandteil_fehlt(titel, f"{p['title']} {p.get('handle', '')}")
        if fehlend:
            GEMELDET.append((titel, p.get("handle", ""), ", ".join(fehlend)))
            continue
        wert = len(a & b) / len(a | b)
        if typ and p.get("productType") == typ:
            wert += 0.15
        if wert > bester_wert:
            beste, bester_wert = p, wert
    # ⚠️ Schwelle bewusst SEHR hoch (Probelauf 28.08.). Bei 0.45 schlug der Lauf vor:
    #   «Smaragd-Anhänger Halskette» → «LEOPARD-Anhänger Halskette mit Smaragd» (0.50)
    #   «Herren Piqué-Poloshirt» → «KURZARM-Poloshirt» (0.48)
    # Beides sind andere Produkte; ein Wort im Ziel verschiebt die Ware. Bei 0.70 bleiben nur
    # Fälle wie «Tennis-Armband Zirkonia» → «Tennis-Armband aus Edelstahl mit Zirkonia» (0.80).
    # Alles darunter geht in den Bericht: ein halbwegs passender Ersatz ist ein Köderwechsel,
    # und der ist schlimmer als der 404, den er ersetzt.
    return (beste, bester_wert) if beste and bester_wert >= 0.70 else None


# ── KATEGORIE ALS ZWEITE WAHL (04.09.2026) ──────────────────────────────────────────────
# Bisher endete jeder Fall ohne eindeutigen Ersatz im Bericht — «hier entscheidet ein Mensch».
# Das stimmt fuer den ERSATZ (ein halbwegs passendes Produkt ist ein Koederwechsel), nicht
# fuer die KATEGORIE: Wer auf einem toten Kuechenhelfer landet und in der Kuechen-Abteilung
# ankommt, bekommt genau das, wonach er gesucht hat — nur breiter. Hausregel 29.08.:
# Markenanfragen gehen auf die Kategorie, nie auf eine fremde Marke.
# ⚠️ Die Zuordnung kommt aus dem PRODUKT selbst (Tag zuerst, dann Warengruppe), nicht aus
# einer Aehnlichkeit. Jedes Ziel wird LIVE geprueft: im Onlineshop, mit aktiver Ware und
# nicht selbst eine Weiterleitung (Shopify lehnt eine Weiterleitung auf eine ab, Lehre 21.08.).
# ⚠️ DER TITEL IST GENAUER ALS DER TAG. Der Trockenlauf schickte einen «Quallen-Diffuser»
# auf Wohnen & Dekoration (Tag `deko`) und einen 4-l-Luftbefeuchter in die Kueche (Tag
# `haushalt`) — beides nicht falsch, aber unnoetig grob. Ein eindeutiges Warenwort im Titel
# entscheidet deshalb zuerst; die Woerter sind bewusst lang und gebunden (Substring-Familie).
TITEL_ZIEL = [
    # 22.09.2026 — aus den 27 «Mensch entscheidet» des ersten vollständigen Laufs (Deckel weg):
    # Reihenfolge zählt (erster Treffer gewinnt): «Ohrringe» vor «ring», «Damenuhr» vor «damen».
    ("ohrstecker", "sub-ohrringe"), ("creolen", "sub-ohrringe"), ("ohrringe", "sub-ohrringe"),
    ("halskette", "sub-halsketten"), ("stacking-ring", "sub-ringe"), ("ring ·", "sub-ringe"),
    ("damenuhr", "uhren"), ("herrenuhr", "uhren"), ("armbanduhr", "uhren"),
    ("augenbrauenstift", "beauty-pflege"), ("lipgloss", "beauty-pflege"), ("eyeliner", "beauty-pflege"),
    ("lidschatten", "beauty-pflege"), ("mascara", "beauty-pflege"), ("massagegerät", "wellness-massage"),
    ("gaming-tastatur", "gaming"), ("tastatur", "gaming"), ("mauspad", "gaming"), ("maus-pad", "gaming"),
    ("sprühmatte", "spielzeug"), ("planschbecken", "spielzeug"),
    ("kuschelkissen", "kissen-wohntextilien"), ("strandtuch", "sommer"),
    ("wandlampe", "lampen-leuchten"), ("nachtlicht", "lampen-leuchten"), ("tischlampe", "lampen-leuchten"),
    # 13.10.2026: feinere Ziele vor dem groben «hunde/katzen» — Leitfall «katzenfutter automat» (GSC Pos. 18–24)
    ("pilzsammel", "outdoor-garten"),     # 13.10.: Tag «haushalt» schickte das Pilzsammel-Taschen-Set auf Haushaltsgeräte
    # 13.10.2026 abends: eigene Suchbegriff-Kollektionen (suchbegriff_kollektionen.json) statt 413 gemischter Näpfe;
    # «futterspender» allein bleibt beim Napf-Ziel (Spielzeug- und Schwerkraftspender)
    ("automatischer futterspender", "futterautomaten"),
    ("futterspender", "haustier-napf-futter"), ("futterautomat", "futterautomaten"),
    ("trinkbrunnen", "trinkbrunnen-katzen"), ("heizdecke", "kuschel-heizdecken"),
    ("hunde", "sub-haustier"), ("katzen", "sub-haustier"), ("leggings", "damen-mode"),
    ("klemmbaustein", "klemmbausteine-bausaetze"), ("bausteine-set", "klemmbausteine-bausaetze"),
    ("diffuser", "sub-aroma-diffuser"), ("luftbefeuchter", "haushaltsgeraete"),
    ("luftreiniger", "haushaltsgeraete"), ("ventilator", "haushaltsgeraete"),
    ("smartwatch", "smartwatches-wearables"), ("kopfhörer", "kopfhoerer-audio"),
    # 13.10.: «ladegeraete-powerbanks» gibt es nicht; «handy-powerbanks» gibt es, ist aber NICHT im Onlineshop
    # veröffentlicht (gefunden von weiterleitung_ziel_wache.py) → «Ladegeräte & Powerbanks» (elektronik-laden, Tag kat-laden)
    ("dashcam", "auto-kfz-zubehoer"), ("powerbank", "elektronik-laden"),
    ("kulturbeutel", "sub-reise"), ("koffer", "sub-reise"),
    ("wolldecke", "kissen-wohntextilien"), ("kuscheldecke", "kissen-wohntextilien"),
    # 14.10.2026: Stiefel fielen über den Typ «Damenschuhe» auf Sneaker («Winter Mid-Calf Stiefel aus Faux-Fell» → Sneaker &
    # Sportschuhe). Ziel ist die Endadresse (schuhe-stiefel ist selbst eine 301; Shopify lehnt eine Weiterleitung darauf ab).
    ("stiefel", "sub-stiefel-boots"),
    # ganz zuletzt, weil grob: Geschlechtswort im Titel → Modekategorie
    ("damen", "damen-mode"), ("herren", "fur-ihn"),
]
TAG_ZIEL = [
    ("klemmbaustein", "klemmbausteine-bausaetze"), ("bausteine", "klemmbausteine-bausaetze"),
    ("haustier", "sub-haustier"), ("hund", "sub-haustier"), ("katze", "sub-haustier"),
    ("aroma", "sub-aroma-diffuser"), ("diffuser", "sub-aroma-diffuser"),
    ("kueche", "sub-kueche"), ("haushalt", "haushaltsgeraete"),
    ("reise", "sub-reise"), ("outdoor", "sub-reise"), ("camping", "sub-reise"),
    ("auto", "auto-kfz-zubehoer"), ("kinder", "spielzeug"), ("spielzeug", "spielzeug"),
    ("schmuck", "schmuck-uhren"), ("uhren", "uhren"),   # 13.10.: Kollektion «schmuck» gibt es nicht (still übersprungen) ("beauty", "beauty-pflege"),
    ("elektronik", "elektronik-technik"), ("gadget", "trends-gadgets"),
    ("wohnen", "wohnen-dekoration"), ("deko", "wohnen-dekoration"),
    ("sport", "sub-yoga-fitness"), ("fitness", "sub-yoga-fitness"),
    ("taschen", "sub-taschen"), ("schuhe", "sneaker-sportschuhe"),
]
# ⚠️ 22.09.2026: `kinderspielzeug` ist selbst eine 301 auf `spielzeug` — kollektion_taugt() lehnte
# das Ziel darum still ab, und JEDES Kinder-/Spielzeug-Produkt fiel auf «Mensch entscheidet»
# (Sprühmatte, 1 Sitzung). Ein Ziel in der Tabelle muss die ENDADRESSE sein, nicht ein Alias.
TYP_ZIEL = {
    "elektronik": "elektronik-technik", "küche & haushalt": "sub-kueche",
    "baby & kinder": "spielzeug", "reise & outdoor": "sub-reise",
    "haustier": "sub-haustier", "wellness": "wellness-massage",
    "wellness & haushalt": "haushaltsgeraete", "wohnen": "wohnen-dekoration",
    # productType heisst «Damenmode»/«Herrenmode» (ohne Bindestrich) — die alten Schluessel
    # «damen-mode»/«herren-mode» trafen nie, und «herren-mode» als Kollektion gibt es nicht.
    "damenmode": "damen-mode", "herrenmode": "fur-ihn",
    "damenschuhe": "sneaker-sportschuhe", "herrenschuhe": "herren-schuhe",   # 13.10.: schuhe-sneaker trägt eine (wirkungslose) Weiterleitung → kein Ziel
}
_koll_ok = {}


def kollektion_taugt(handle):
    """Veroeffentlicht, mit aktiver Ware, und selbst keine Weiterleitung.
    ⚠️ 13.10.2026: «veröffentlicht» stand nur im Docstring — geprüft wurden Existenz, aktive Ware und Weiterleitung.
    `handy-powerbanks` (347 Produkte, NICHT im Onlineshop) galt deshalb als taugliches Ziel; die erste Weiterleitung
    dorthin (Solar-Powerbank) führte in eine 404. Jetzt fragt die Abfrage die Onlineshop-Veröffentlichung mit."""
    if handle in _koll_ok:
        return _koll_ok[handle]
    d = gql('query($q:String!,$p:ID!){collections(first:1,query:$q){nodes{id handle publishedOnPublication(publicationId:$p)}}}',
            {"q": "handle:" + handle, "p": ONLINE_STORE})
    n = ((d.get("data") or {}).get("collections") or {}).get("nodes") or []
    if not n or n[0]["handle"] != handle or not n[0].get("publishedOnPublication"):
        _koll_ok[handle] = False; return False
    kid = n[0]["id"].split("/")[-1]
    d2 = gql('query($q:String!){products(first:1,query:$q){nodes{id}}}',
             {"q": f"collection_id:{kid} AND status:active"})
    aktiv = bool(((d2.get("data") or {}).get("products") or {}).get("nodes"))
    _koll_ok[handle] = aktiv and not hat_weiterleitung("/collections/" + handle)
    return _koll_ok[handle]


# 13.10.2026 (Prüfung wf_1c367cd7-abd, Befund bestätigt): `wort in titel` traf WORTTEILE, und der erste Listentreffer
# entschied. Am Bestand: «Hundehalskette» → Halsketten (Damenschmuck), «Alu-Werkzeugkoffer» und «Kofferraum-Organizer»
# → Reise, «Solar Helm mit Ventilator» → Haushaltsgeräte — Lehre 9b/16d (Hunde**geschirr** ≠ Geschirr) zum dritten Mal.
# Jetzt (titel_ziel): (1) «für Hunde/Katzen/Haustiere» → Haustier; (2) nur der Hauptteil vor «mit/inkl./+» zählt;
# (3) ein Warenwort zählt nur als KOPF des Wortes (Wortende, ggf. Plural) — «Kofferraum» ist kein Koffer; (4) steht
# davor ein Bestimmungswort, das die Abteilung wechselt (Hunde-, Katzen-, Werkzeug-, Auto-), gewinnt dieses;
# (5) «hunde/katzen/damen/herren» sind selbst Bestimmungswörter und dürfen ein Wort BEGINNEN. Wörter mit Bindestrich,
# Leerzeichen oder «·» in der Tabelle bleiben wörtliche Teilstrings (wie bisher).
TIER_FUER = re.compile(r"\bf(?:ü|ue|u)r\s+(?:deinen\s+|deine\s+|den\s+|die\s+|ihren\s+)?(?:hunde?|katzen?|haustiere?|welpen)\b")
PRAEFIX_ZIEL = [(re.compile(r"(?:hunde?|katzen?|haustier|tier)$"), "sub-haustier"),
                (re.compile(r"werkzeug$"), "werkzeug-maschinen"),
                (re.compile(r"(?:auto|kfz)$"), "auto-kfz-zubehoer")]
ANFANG_WORT = {"hunde", "katzen", "damen", "herren"}
# 13.10.2026: Tier-Ziele — «für Katzen» oder «Katzen-…» wechselt hier die Abteilung NICHT (sonst landete
# «Automatischer Futterspender für Katzen» auf sub-haustier mit 3'704 Produkten statt auf futterautomaten).
TIER_ZIELE = ("sub-haustier", "haustier-napf-futter", "futterautomaten", "trinkbrunnen-katzen")


def titel_ziel(text, ohne=()):
    """→ Kollektions-Handle aus Titel- oder Handle-Text (ohne Tauglichkeitsprüfung) oder None."""
    t = (text or "").lower()
    z = _tabelle(re.split(r"\s(?:mit|inkl\.?|inklusive|plus|\+)\s", t, maxsplit=1)[0], ohne)
    if TIER_FUER.search(t) and z not in TIER_ZIELE:
        return "sub-haustier"             # «Kuscheldecke für Hunde»; ein genaueres Tierziel («Futterspender») bleibt
    return z


def _tabelle(haupt, ohne=()):
    for wort, ziel in TITEL_ZIEL:
        if wort in ohne:
            continue
        if not re.fullmatch(r"[a-zäöüß]+", wort):
            if wort in haupt or wort.replace("-", " ") in haupt:
                return ziel
            continue
        for m in re.finditer(re.escape(wort), haupt):
            vor = re.search(r"([a-zäöüß]+)-?$", haupt[:m.start()])
            praefix = vor.group(1) if vor and (m.start() == 0 or haupt[m.start() - 1] in "abcdefghijklmnopqrstuvwxyzäöüß-") else ""
            if haupt[m.start() - 1:m.start()] == "-" and not vor:
                praefix = ""
            if wort in ANFANG_WORT:
                if not (m.start() == 0 or not haupt[m.start() - 1].isalpha()):
                    continue
                return ziel
            if not re.match(r"(?:n|en|e|s|es|er)?(?![a-zäöüß])", haupt[m.end():]):
                continue                      # Wortteil vorne («kofferraum»), nicht Kopf des Wortes
            for rx, z in PRAEFIX_ZIEL:
                if praefix and rx.search(praefix):
                    return ziel if (z == "sub-haustier" and ziel in TIER_ZIELE) else z   # «Katzen-Trinkbrunnen»
            return ziel
    return None


def kategorie_ziel(p, handle=""):
    """⚠️ Auch fuer GELOESCHTE Produkte: dort gibt es weder Titel noch Tags — die Warenart
    steht dann nur noch im HANDLE (Lehre 29.08.: wenn der Titel schweigt, reden productType,
    Beschreibung und Handle). Der Handle ist der slugifizierte Titel, die Titelwoerter greifen
    also unveraendert; Bindestriche werden dafuer zu Leerzeichen."""
    if not p:
        z = titel_ziel(handle.replace("-", " "))
        return ("/collections/" + z) if z and kollektion_taugt(z) else None
    z = titel_ziel(p.get("title") or "")
    if z and kollektion_taugt(z):
        return "/collections/" + z
    tags = [t.lower() for t in (p.get("tags") or [])]
    # ⚠️ EXAKT vergleichen, nicht als Teilstring (13.09.): `any(wort in t)` machte aus dem
    # Draft-Marker «auto-entwurf-0926» ein «auto» — ein Herren-Rollkragen bekam eine 301 auf
    # Auto & KFZ-Zubehoer. Die Tags aus cat_tags sind ohnehin ganze Woerter (auto, hund, kueche).
    for wort, ziel in TAG_ZIEL:
        if wort in tags and kollektion_taugt(ziel):
            return "/collections/" + ziel
    ziel = TYP_ZIEL.get((p.get("productType") or "").strip().lower())
    if ziel and kollektion_taugt(ziel):
        return "/collections/" + ziel
    return None


_koll_n = {}


def koll_groesse(handle):
    if handle not in _koll_n:
        d = gql('query($q:String!){collections(first:1,query:$q){nodes{id}}}', {"q": "handle:" + handle})
        n = ((d.get("data") or {}).get("collections") or {}).get("nodes") or []
        if not n:
            _koll_n[handle] = 10 ** 9
        else:
            c = gql('query($q:String!){productsCount(query:$q,limit:null){count}}',
                    {"q": f"collection_id:{n[0]['id'].split('/')[-1]} status:active"})
            _koll_n[handle] = ((c.get("data") or {}).get("productsCount") or {}).get("count", 10 ** 9)
    return _koll_n[handle]


def kategorie_ziel_gsc(p, handle=""):
    """Strenge Kategorie für Google-Landungen: nur ein Warenwort aus TITEL_ZIEL (ohne die groben Geschlechtswörter),
    der ERSTE Treffer entscheidet, und die Zielkollektion hat höchstens GSC_KOLL_MAX aktive Produkte — sonst None."""
    text = (p.get("title") or "") if p else handle.replace("-", " ")
    ziel = titel_ziel(text, ohne=("damen", "herren"))
    if ziel and kollektion_taugt(ziel) and koll_groesse(ziel) <= GSC_KOLL_MAX:
        return "/collections/" + ziel
    return None


def gsc_seiten():
    """→ ({handle: (klicks, impressionen)}, alter_tage) aus dem Schnappschuss; ({}, alter) wenn zu alt/fehlt."""
    if not os.path.exists(GSC_DATEI):
        print("⚠️ GSC-STAND FEHLT (dropship/_gsc_seiten.json) — GSC-Teil übersprungen")
        return {}, None
    d = json.load(open(GSC_DATEI, encoding="utf-8"))
    import datetime as _dt
    alter = (_dt.datetime.utcnow() - _dt.datetime.strptime(d["stand"], "%Y-%m-%dT%H:%MZ")).days
    if alter > 3:
        print(f"⚠️ GSC-STAND ALT ({alter} T) — GSC-Teil übersprungen")
        return {}, alter
    tage = max(1, int(d.get("tage") or 28))
    aus = {}
    for z in d.get("zeilen") or []:
        pfad = urllib.parse.urlparse(z.get("page") or "").path
        m = re.match(r"^(?:/fr)?/products/([^/?#]+)/?$", pfad)
        if not m:
            continue
        h = urllib.parse.unquote(m.group(1))
        if (z.get("clicks") or 0) >= 1 or (z.get("impressions") or 0) * 7 / tage >= 3:
            k, i = aus.get(h, (0, 0))
            aus[h] = (k + (z.get("clicks") or 0), i + round((z.get("impressions") or 0) * 7 / tage))
    print(f"GSC: {len(aus)} Produktseiten mit Signal (≥ 1 Klick oder ≥ 3 Impr./Woche, Stand {alter} T, {tage} T Daten)")
    return aus, alter


def status_viele(handles, nur_gefundene=False):
    """{handle: produkt|None} — in Paketen statt je Handle eine Abfrage (GSC liefert ~900 Seiten).

    nur_gefundene=True (14.10.2026, Hauptschleife): nur Handles, die eine Antwort WIRKLICH enthielt. Ein gescheitertes
    Paket oder ein fehlender Handle heisst dann «unbekannt», nicht «gelöscht» — der Aufrufer fragt einzeln nach. Sonst
    würde ein Netzfehler ein aktives Produkt als tot melden und mit FIX=1 eine Weiterleitung darüberlegen."""
    aus = {}
    hs = list(handles)
    for i in range(0, len(hs), 40):
        teil = hs[i:i + 40]
        q = " OR ".join('handle:"%s"' % h.replace('"', "") for h in teil)
        d = gql('query($q:String!){products(first:100,query:$q){nodes{id handle title status productType tags}}}', {"q": q})
        for n in ((d.get("data") or {}).get("products") or {}).get("nodes") or []:
            aus[n["handle"]] = n
    if nur_gefundene:
        return {h: aus[h] for h in hs if h in aus}
    return {h: aus.get(h) for h in hs}


KANARIEN = [   # (Titel, verbotenes Wort im Ziel oder None, erlaubte Kategorie oder None = nur «offen» erlaubt)
    ("Automatischer Futterspender für Katzen & Hunde", "trinkbrunnen", "/collections/futterautomaten"),
    ("Mini Heizlüfter", "luftbefeuchter", None),
    ("Smart Anti-Bell Halsband", None, None),
    ("Damast Küchenmesser", "", None),           # "" = gar kein Zwilling erlaubt (Klinge)
    ("Smaragd-Anhänger Halskette", "leopard", "/collections/sub-halsketten"),
    ("Titan-Wok", "pfanne", None),
    ("Aromadiffuser mit Bluetooth-Lautsprecher", "uhr", "/collections/sub-aroma-diffuser"),   # Diffusor-Kategorie ist richtig, verboten nur der Uhr-Lautsprecher
    ("Planeten-Schaukelstuhl", None, None),
    ("USB-Heizdecke", None, "/collections/kuschel-heizdecken"),
    # 13.10. Prüfung: Wortteile/Komposita (Lehre 9b/16d)
    ("Hundehalskette aus Edelstahl mit Dornen", None, "/collections/sub-haustier"),
    ("Alu-Werkzeugkoffer 176 Teile für jeden Einsatz", "reise", "/collections/werkzeug-maschinen"),
    ("Kofferraum-Organizer: Nie wieder Chaos im Auto", None, None),
    ("Bluetooth Aroma Diffuser mit Musik & Nachtlicht", "lampe", "/collections/sub-aroma-diffuser"),
    ("Solar Helm mit Ventilator", None, None),
    ("Kuscheldecke für Hunde", None, "/collections/sub-haustier"),
    ("Winter Mid-Calf Stiefel aus Faux-Fell", "sneaker", "/collections/sub-stiefel-boots"),   # 14.10.: vorher Sneaker
]


def zielwahl_gsc(p, handle):
    """→ (ziel, wie) oder (None, grund) — die GSC-Zielwahl (Zwilling streng, Kategorie streng)."""
    titel = (p or {}).get("title", "")
    if titel and ist_handklinge(titel):
        return None, "Klinge — nie umleiten"
    z = ersatz(titel, (p or {}).get("productType")) if p else None
    if z:
        return "/products/" + z[0]["handle"], f"Ähnlichkeit {z[1]:.2f}"
    if not p:
        kern = handle_kern(handle)
        pk = produkt(kern) if kern else None
        if pk and pk["status"] == "ACTIVE":
            return "/products/" + kern, "Handle-Kern"
    kat = kategorie_ziel_gsc(p, handle)
    return (kat, "Kategorie (streng)") if kat else (None, "kein strenges Ziel")


def kanarien():
    fehler = 0
    for titel, verboten, kat_ok in KANARIEN:
        ziel, wie = zielwahl_gsc({"title": titel, "productType": "", "tags": []}, "")
        gut = True
        if ziel and ziel.startswith("/products/"):
            if verboten == "" or (verboten and verboten in ziel.lower()):
                gut = False
        elif ziel and ziel.startswith("/collections/"):
            gut = (ziel == kat_ok)
        print(f"  {'✓' if gut else '✗'} {titel[:44]:46} → {ziel or 'offen'} ({wie})")
        fehler += not gut
    # 13.10.2026: jedes Tabellenziel muss taugen — sonst wird der Eintrag STILL übersprungen («schmuck» gab es nie,
    # «handy-powerbanks» ist nicht veröffentlicht). Ein Ziel, das nicht taugt, ist ein Kanarienfehler.
    for z in sorted({z for _, z in TITEL_ZIEL} | {z for _, z in TAG_ZIEL} | set(TYP_ZIEL.values())):
        if not kollektion_taugt(z):
            print(f"  ✗ Tabellenziel /collections/{z} taugt nicht (fehlt, nicht veröffentlicht, leer oder Weiterleitung)")
            fehler += 1
    from bestandteil_regel import selbsttest as _bt_selbsttest
    if not _bt_selbsttest(leise=True):
        print("  ✗ bestandteil_regel: Selbsttest rot (Set → Einzelteil)")
        fehler += 1
    print(f"KANARIEN {'OK' if not fehler else f'{fehler} FEHLER'} ({len(KANARIEN)} Titel + Tabellenziele + Bestandteil-Regel)")
    return fehler == 0


def main():
    if "--kanarien" in sys.argv:
        return 0 if kanarien() else 1
    seiten = landeseiten()
    if seiten is None:
        print("PAUSE (Sitzungsdaten nicht lesbar)"); return 1
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.strip() for z in open(LEDGER) if z.strip()}
    herkunft = {h: "shopifyql" for h, _ in seiten}
    gsc_signal, gsc_alter = {}, None
    if GSC:
        gsc_signal, gsc_alter = gsc_seiten()
        neu = [h for h in gsc_signal if h not in herkunft and h not in erledigt]
        st = status_viele(neu)
        dazu = 0
        for h in neu:
            if st[h] and st[h]["status"] == "ACTIVE":
                continue
            seiten.append((h, 0)); herkunft[h] = "gsc"; dazu += 1
        print(f"GSC: {dazu} tote Kandidaten, die Shopify nicht als Sitzung sieht")
    gsc_gesetzt, gsc_offen, gsc_kand = 0, [], 0

    tot, gesetzt, offen = [], 0, []
    nur_gsc = os.environ.get("NUR_GSC") == "1"   # Einzeltest: nur GSC-Funde schreiben
    # 14.10.2026: Hier stand je Landeseite EINE Abfrage (~1'150 nacheinander). Seit dem 13.10. endeten alle Läufe nach der
    # Zeile «GSC: n tote Kandidaten» ohne Schlusszeile — der Container startet etwa stündlich neu und nahm den Lauf mit;
    # der Aufseher holt nur Abstürze mit Traceback nach, also lag die Prüfung bis zum nächsten Tag still. Jetzt Pakete à 40;
    # einzeln nur noch, was ein Paket nicht sicher beantwortet hat.
    vorab = status_viele([h for h, _ in seiten if h not in erledigt], nur_gefundene=True)
    einzeln = 0
    for handle, sitzungen in seiten:
        if handle in erledigt or (nur_gsc and herkunft.get(handle) != "gsc"):
            continue
        if handle in vorab:
            p = vorab[handle]
        else:
            p = produkt(handle); einzeln += 1
        if p and p["status"] == "ACTIVE":
            continue
        pfad = "/products/" + handle
        if hat_weiterleitung(pfad):
            with open(LEDGER, "a") as f:
                f.write(handle + "\n")
            continue
        grund = ",".join(t for t in (p["tags"] if p else []) if t in RISIKO or t.startswith("google-kanal")) or "kein Grund-Tag"
        tot.append((handle, sitzungen, (p or {}).get("title", "(gelöscht)"), (p or {}).get("status", "WEG"), grund))
        if herkunft.get(handle) == "gsc":
            gsc_kand += 1
            kl, im = gsc_signal.get(handle, (0, 0))
            ziel, wie = zielwahl_gsc(p, handle)
            if not ziel:
                gsc_offen.append((handle, kl, im, (p or {}).get("title", "(gelöscht)"), wie)); continue
            if not FIX:
                print(f"  [DRY GSC] {handle[:40]:42s} → {ziel[:42]} ({wie}; {kl} Kl., {im} Impr./W.)"); continue
            if gsc_gesetzt >= GSC_MAX:
                gsc_offen.append((handle, kl, im, (p or {}).get("title", "(gelöscht)"), f"GSC_MAX {GSC_MAX} erreicht")); continue
            r = gql('mutation($in:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$in){userErrors{message}}}',
                    {"in": {"path": pfad, "target": ziel}})
            ue = ((r.get("data") or {}).get("urlRedirectCreate") or {}).get("userErrors") or []
            if ue or "errors" in r:
                print("  FEHLER", handle, str(ue or r["errors"])[:100]); continue
            gsc_gesetzt += 1; gesetzt += 1
            with open(LEDGER, "a") as f:
                f.write(handle + "\n")
            print(f"  → GSC {handle[:40]:42s} → {ziel[:42]} ({wie}; {kl} Kl., {im} Impr./W.)")
            continue
        z = ersatz((p or {}).get("title", ""), (p or {}).get("productType")) if p else None
        if not p and not z:
            kern = handle_kern(handle)
            pk = produkt(kern) if kern else None
            if pk and pk["status"] == "ACTIVE":
                z = ({"handle": kern}, 9.99)   # 9.99 = «Handle-Kern», kein Ähnlichkeitsmass
        kat = None if z else kategorie_ziel(p, handle)
        if (z or kat) and FIX:
            ziel = ("/products/" + z[0]["handle"]) if z else kat
            r = gql('mutation($in:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$in){userErrors{message}}}',
                    {"in": {"path": pfad, "target": ziel}})
            ue = ((r.get("data") or {}).get("urlRedirectCreate") or {}).get("userErrors") or []
            if ue or "errors" in r:
                print("  FEHLER", handle, str(ue or r["errors"])[:100])
            else:
                gesetzt += 1
                with open(LEDGER, "a") as f:
                    f.write(handle + "\n")
                wie = ("Handle-Kern" if z and z[1] == 9.99 else f"Ähnlichkeit {z[1]:.2f}") if z else "Kategorie"
                print(f"  → {handle[:44]:46s} → {ziel[:44]} ({wie})")
        elif z or kat:
            ziel = ("/products/" + z[0]["handle"]) if z else kat
            wie = f"Ähnlichkeit {z[1]:.2f}" if z else "Kategorie"
            print(f"  [DRY] {handle[:42]:44s} → {ziel[:42]} ({wie})")
        else:
            offen.append((handle, sitzungen, (p or {}).get("title", "(gelöscht)")))

    if GSC:
        stand = {"stand": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "gsc_alter_tage": gsc_alter,
                 "kandidaten": gsc_kand, "gesetzt": gsc_gesetzt, "offen": len(gsc_offen),
                 "impr_woche_offen": sum(x[2] for x in gsc_offen), "klicks_offen": sum(x[1] for x in gsc_offen),
                 "fix": FIX}
        json.dump(stand, open(GSC_STAND, "w"), ensure_ascii=False, indent=1)
        print(f"GSC-TOT: {gsc_kand} Kandidaten · {'gesetzt' if FIX else 'setzbar'} "
              f"{gsc_gesetzt if FIX else gsc_kand - len(gsc_offen)} · offen {len(gsc_offen)} "
              f"({stand['impr_woche_offen']} Impr./Woche, {stand['klicks_offen']} Klicks)")
        offen += [(h, 0, f"{t[:50]} [GSC {kl} Kl./{im} Impr./W. — {w}]") for h, kl, im, t, w in gsc_offen]
    print(f"Abfragen: {len(vorab)} aus Paketen à 40, {einzeln} einzeln (nicht im Paket gefunden)")
    print(f"Landeseiten mit Verkehr: {len(seiten)} | nicht mehr kaufbar und ohne Weiterleitung: {len(tot)}")
    print(f"  {'gesetzt' if FIX else 'setzbar'}: {gesetzt if FIX else len(tot) - len(offen)} | "
          f"ohne eindeutigen Ersatz (Mensch entscheidet): {len(offen)}")

    if GEMELDET:
        print(f"BESTANDTEIL: {len(GEMELDET)} Zwilling(e) verworfen — Set/Stück/«mit X» fehlt im Ziel (melden, nicht drehen)")
        for q, h, w in GEMELDET[:10]:
            print(f"  ⚠️ {q[:44]} ↛ /products/{h[:44]} (fehlt: {w})")
    if offen or GEMELDET:
        with open(BERICHT, "w") as f:
            f.write("# Rankende Seiten ohne kaufbares Ziel\n\n")
            f.write("Diese Seiten hatten in den letzten Tagen Besucher, sind aber nicht mehr kaufbar\n")
            f.write("und haben keine Weiterleitung. Ein eindeutig gleichartiges aktives Produkt gibt es\n")
            f.write("nicht — hier entscheidet ein Mensch, ob eine Kategorie das richtige Ziel ist.\n")
            f.write("⚠️ NICHT einfach veröffentlichen: jedes Draft hat einen Grund im Tag.\n")
            f.write("⚠️ Markenanfragen NIE auf eine fremde Marke umleiten — das ist ein Köderwechsel.\n\n")
            f.write("| Sitzungen | Titel | Handle |\n|---:|---|---|\n")
            for h, s, t in sorted(offen, key=lambda x: -x[1]):
                f.write(f"| {s} | {t[:60]} | `{h}` |\n")
            if GEMELDET:
                f.write("\n## Zwilling verworfen: Set/Stück/«mit X» fehlt im Ziel (automation/bestandteil_regel.py)\n\n")
                f.write("Ein Set darf nicht auf ein Einzelteil weiterleiten — hier entscheidet ein Mensch.\n\n")
                f.write("| Quelle (Titel) | verworfener Zwilling | fehlt |\n|---|---|---|\n")
                for q, h, w in GEMELDET:
                    f.write(f"| {q[:60]} | `{h}` | {w} |\n")
        print(f"  Bericht: {BERICHT}")
    elif os.path.exists(BERICHT):
        # Ein Bericht ohne Befund wird nicht gelesen — er wird gelöscht (Lehre 21.08.).
        os.remove(BERICHT)

    # FERTIG hängt an den ÄNDERUNGEN, nicht an den Meldungen (Lehre 21.08.).
    if not tot or (FIX and gesetzt == 0):
        print("FERTIG")
    return 0


if __name__ == "__main__":
    sys.exit(main())
