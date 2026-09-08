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
"""
import json, os, re, subprocess, sys, time

SHOP = "au3j0y-hq.myshopify.com"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, "dropship", "TOTE-LANDESEITEN.md")
LEDGER = os.path.join(REPO, "dropship", "_tote_landeseiten.txt")
FIX = os.environ.get("FIX") == "1"
TAGE = os.environ.get("TAGE", "60")

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
                            f"https://{SHOP}/admin/api/2024-10/graphql.json",
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
        return d
    return {"errors": [{"message": "aufgegeben"}]}


def worte(t):
    return {w for w in re.findall(r"[a-zäöüß0-9]{4,}", (t or "").lower()) if w not in STOPP}


def landeseiten():
    q = (f"FROM sessions SHOW sessions GROUP BY landing_page_path "
         f"SINCE -{TAGE}d UNTIL today ORDER BY sessions DESC LIMIT 250")
    d = gql('query($q:String!){shopifyqlQuery(query:$q){tableData{rows} parseErrors}}', {"q": q})
    t = (d.get("data") or {}).get("shopifyqlQuery") or {}
    if t.get("parseErrors"):
        print("ShopifyQL:", str(t["parseErrors"])[:180]); return None
    rows = (t.get("tableData") or {}).get("rows") or []
    aus = []
    for r in rows:
        p = r.get("landing_page_path") or ""
        if p.startswith("/products/"):
            aus.append((p.split("/")[-1].split("?")[0], int(r.get("sessions") or 0)))
    return aus


def produkt(handle):
    d = gql('query($q:String!){products(first:1,query:$q){nodes{id title status productType tags}}}',
            {"q": "handle:" + handle})
    n = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    return n[0] if n else None


def hat_weiterleitung(pfad):
    d = gql('query($q:String!){urlRedirects(first:2,query:$q){nodes{target}}}', {"q": "path:" + pfad})
    return bool(((d.get("data") or {}).get("urlRedirects") or {}).get("nodes"))


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
    ("klemmbaustein", "klemmbausteine-bausaetze"), ("bausteine-set", "klemmbausteine-bausaetze"),
    ("diffuser", "sub-aroma-diffuser"), ("luftbefeuchter", "haushaltsgeraete"),
    ("luftreiniger", "haushaltsgeraete"), ("ventilator", "haushaltsgeraete"),
    ("smartwatch", "smartwatches-wearables"), ("kopfhörer", "kopfhoerer-audio"),
    ("dashcam", "auto-kfz-zubehoer"), ("powerbank", "ladegeraete-powerbanks"),
    ("kulturbeutel", "sub-reise"), ("koffer", "sub-reise"),
    ("wolldecke", "kissen-wohntextilien"), ("kuscheldecke", "kissen-wohntextilien"),
]
TAG_ZIEL = [
    ("klemmbaustein", "klemmbausteine-bausaetze"), ("bausteine", "klemmbausteine-bausaetze"),
    ("haustier", "sub-haustier"), ("hund", "sub-haustier"), ("katze", "sub-haustier"),
    ("aroma", "sub-aroma-diffuser"), ("diffuser", "sub-aroma-diffuser"),
    ("kueche", "sub-kueche"), ("haushalt", "haushaltsgeraete"),
    ("reise", "sub-reise"), ("outdoor", "sub-reise"), ("camping", "sub-reise"),
    ("auto", "auto-kfz-zubehoer"), ("kinder", "kinderspielzeug"), ("spielzeug", "kinderspielzeug"),
    ("schmuck", "schmuck"), ("uhren", "uhren"), ("beauty", "beauty-pflege"),
    ("elektronik", "elektronik-technik"), ("gadget", "trends-gadgets"),
    ("wohnen", "wohnen-dekoration"), ("deko", "wohnen-dekoration"),
    ("sport", "sub-yoga-fitness"), ("fitness", "sub-yoga-fitness"),
    ("taschen", "sub-taschen"), ("schuhe", "schuhe-sneaker"),
]
TYP_ZIEL = {
    "elektronik": "elektronik-technik", "küche & haushalt": "sub-kueche",
    "baby & kinder": "kinderspielzeug", "reise & outdoor": "sub-reise",
    "haustier": "sub-haustier", "wellness": "wellness-massage",
    "wellness & haushalt": "haushaltsgeraete", "wohnen": "wohnen-dekoration",
    "damen-mode": "damen-mode", "herren-mode": "herren-mode",
}
_koll_ok = {}


def kollektion_taugt(handle):
    """Veroeffentlicht, mit aktiver Ware, und selbst keine Weiterleitung."""
    if handle in _koll_ok:
        return _koll_ok[handle]
    d = gql('query($q:String!){collections(first:1,query:$q){nodes{id handle}}}',
            {"q": "handle:" + handle})
    n = ((d.get("data") or {}).get("collections") or {}).get("nodes") or []
    if not n:
        _koll_ok[handle] = False; return False
    kid = n[0]["id"].split("/")[-1]
    d2 = gql('query($q:String!){products(first:1,query:$q){nodes{id}}}',
             {"q": f"collection_id:{kid} AND status:active"})
    aktiv = bool(((d2.get("data") or {}).get("products") or {}).get("nodes"))
    _koll_ok[handle] = aktiv and not hat_weiterleitung("/collections/" + handle)
    return _koll_ok[handle]


def kategorie_ziel(p, handle=""):
    """⚠️ Auch fuer GELOESCHTE Produkte: dort gibt es weder Titel noch Tags — die Warenart
    steht dann nur noch im HANDLE (Lehre 29.08.: wenn der Titel schweigt, reden productType,
    Beschreibung und Handle). Der Handle ist der slugifizierte Titel, die Titelwoerter greifen
    also unveraendert; Bindestriche werden dafuer zu Leerzeichen."""
    if not p:
        aus_handle = handle.replace("-", " ").lower()
        for wort, ziel in TITEL_ZIEL:
            if wort.replace("-", " ") in aus_handle and kollektion_taugt(ziel):
                return "/collections/" + ziel
        return None
    titel = (p.get("title") or "").lower()
    for wort, ziel in TITEL_ZIEL:
        if wort in titel and kollektion_taugt(ziel):
            return "/collections/" + ziel
    tags = [t.lower() for t in (p.get("tags") or [])]
    for wort, ziel in TAG_ZIEL:
        if any(wort in t for t in tags) and kollektion_taugt(ziel):
            return "/collections/" + ziel
    ziel = TYP_ZIEL.get((p.get("productType") or "").strip().lower())
    if ziel and kollektion_taugt(ziel):
        return "/collections/" + ziel
    return None


def main():
    seiten = landeseiten()
    if seiten is None:
        print("PAUSE (Sitzungsdaten nicht lesbar)"); return 1
    erledigt = set()
    if os.path.exists(LEDGER):
        erledigt = {z.strip() for z in open(LEDGER) if z.strip()}

    tot, gesetzt, offen = [], 0, []
    for handle, sitzungen in seiten:
        if handle in erledigt:
            continue
        p = produkt(handle)
        if p and p["status"] == "ACTIVE":
            continue
        pfad = "/products/" + handle
        if hat_weiterleitung(pfad):
            with open(LEDGER, "a") as f:
                f.write(handle + "\n")
            continue
        grund = ",".join(t for t in (p["tags"] if p else []) if t in RISIKO or t.startswith("google-kanal")) or "kein Grund-Tag"
        tot.append((handle, sitzungen, (p or {}).get("title", "(gelöscht)"), (p or {}).get("status", "WEG"), grund))
        z = ersatz((p or {}).get("title", ""), (p or {}).get("productType")) if p else None
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
                wie = f"Ähnlichkeit {z[1]:.2f}" if z else "Kategorie"
                print(f"  → {handle[:44]:46s} → {ziel[:44]} ({wie})")
        elif z or kat:
            ziel = ("/products/" + z[0]["handle"]) if z else kat
            wie = f"Ähnlichkeit {z[1]:.2f}" if z else "Kategorie"
            print(f"  [DRY] {handle[:42]:44s} → {ziel[:42]} ({wie})")
        else:
            offen.append((handle, sitzungen, (p or {}).get("title", "(gelöscht)")))

    print(f"Landeseiten mit Verkehr: {len(seiten)} | nicht mehr kaufbar und ohne Weiterleitung: {len(tot)}")
    print(f"  {'gesetzt' if FIX else 'setzbar'}: {gesetzt if FIX else len(tot) - len(offen)} | "
          f"ohne eindeutigen Ersatz (Mensch entscheidet): {len(offen)}")

    if offen:
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
