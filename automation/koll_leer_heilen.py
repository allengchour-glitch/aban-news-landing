#!/usr/bin/env python3
"""koll_leer_heilen.py — leere veröffentlichte Kollektionen selbst aus dem Onlineshop nehmen (19.10.2026, Spähtrupp koll K1/K3/K4).

ANLASS: Am 18.10. 18:57:21–18:57:47 UTC stellte der eigene Admin-API-Client («autopilot2») 64 Kollektionen in 26 s in den Onlineshop — 52 davon ohne
EINE kaufbare Ware (Markenregale Casio/Michael Kors/Nike …, am 15.09. bewusst nicht angemeldet). kollektion_leer.py sah es am Abend (Log: «LEER 52»), schrieb es
in /tmp und endete mit Exit 0; kein Leser, keine Ampelzeile — bis 19.10. 11:40 stand eine Kundenseite «Keine Produkte gefunden» in Sitemap und Google. Die 21.08.-Lehre
im Kopf von kollektion_leer.py («Klick verpufft») wiederholte sich vierfach. Wer die 64 Kollektionen veröffentlicht hat, ist NICHT belegt (kein Commit, kein Log; Shopify-Ereignis
nennt nur die App) — darum zeichnet dieses Modul jetzt auf, WANN und DURCH WEN (appTitle) veröffentlicht wird, und heilt, ohne den Täter zu kennen.

REGEL (15.09. «leer = abmelden, nie löschen», LEERE-KOLLEKTIONEN-2026-09-15.md): zuerst 301 auf eine GEFÜLLTE Nachbar-Kollektion, dann publishableUnpublish in allen 6 Kanälen.
Reihenfolge ist Pflicht (ohne 301 wird aus der leeren Seite ein 404). Zurückholen: Weiterleitung löschen + publishablePublish (Zeile im Ledger zeigt das Ziel).

SCHRITTE je leerer Kollektion (exakt aktiv == 0, Lesefehler zählen nie als leer — das macht kollektion_leer.aktive()):
  1. nicht in dropship/_koll_leer_behalten.txt (Betreiber-Ausnahmeliste, ein Handle je Zeile) und nicht im Menü (sonst nur melden),
  2. Ziel = ZIEL[handle] (Handtabelle unten) oder FALLBACK; Ziel muss selbst im Onlineshop stehen und ≥ MIND_ZIEL aktive Produkte haben,
  3. vorhandene Weiterleitung /collections/<h> bleibt (nichts überschreiben), sonst urlRedirectCreate, userErrors → diese Kollektion bleibt unberührt,
  4. unpublish in allen 6 Kanälen, Zurücklesen: im Onlineshop nicht mehr veröffentlicht, sonst Fehler im Stand,
  5. Ledger dropship/_tote_colls_entfernt.txt (gemeinsam mit tote_collections_aufraeumen.py): Handle<TAB>unpublished<TAB>Titel<TAB>leer-auto <ISO><TAB>301:<Ziel>.
Nur mit SCHARF=1 (aus kollektion_leer.py im Aufseher); sonst DRY-Ausgabe. Höchstens MAX_LAUF Kollektionen je Lauf (ein Ausreisser darf nicht den halben Shop abräumen).

Stand: dropship/_koll_leer_stand.json (Ampel «LEERE-KOLLEKTIONEN» liest nur diese Datei).
    python3 automation/koll_leer_heilen.py --selbsttest
"""
import datetime as dt
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PUBS = ["301970915713", "301971014017", "302032716161", "302566834561", "302872297857", "302994456961"]   # wie tote_collections_aufraeumen.py
ONLINE_STORE = "301970915713"
LEDGER = "dropship/_tote_colls_entfernt.txt"
BEHALTEN = "dropship/_koll_leer_behalten.txt"
STAND = "dropship/_koll_leer_stand.json"
MIND_ZIEL = 10
MAX_LAUF = int(os.environ.get("KOLL_LEER_MAX", "80"))
FALLBACK = "bestseller"

# Handtabelle: leere Marken-/Nischenregale → gefüllte Nachbarn (15.09. bestseller/viral-hits als Muster). Jedes Ziel wird zur Laufzeit gegen
# «im Onlineshop + ≥ MIND_ZIEL aktiv» geprüft; fällt es durch, gilt FALLBACK. Neue leere Handles ohne Eintrag landen auf FALLBACK (Bericht nennt sie).
ZIEL = {
    # Uhrenmarken
    "casio": "uhren", "citizen": "uhren", "festina": "uhren", "lorus": "uhren", "lotus-uhren": "uhren", "morellato": "uhren",
    "olivia-burton": "uhren", "paul-hewitt": "uhren", "tom-hope": "uhren", "police": "uhren",
    # Düfte / Kosmetik
    "herren-duefte": "parfum-duefte", "lancome": "parfum-duefte", "elie-saab": "parfum-duefte", "dolce-gabbana": "parfum-duefte",
    "kenzo": "parfum-duefte", "yves-saint-laurent": "parfum-duefte", "marke-chanel": "parfum-duefte",
    "marke-artdeco": "beauty-makeup", "weleda": "beauty-pflege", "self-care-wellness-1": "wellness-selfcare",
    # Mode-/Sportmarken
    "calvin-klein": "fur-ihn", "hugo-boss": "fur-ihn", "tommy-hilfiger": "fur-ihn", "pierre-cardin": "fur-ihn", "superdry": "fur-ihn",
    "guess": "damen-mode", "mode-marken": "damen-mode", "michael-kors": "handtaschen-umhaengetaschen",
    "marke-nike": "sneaker-sportschuhe", "fila": "sneaker-sportschuhe", "marke-hi-tec": "sneaker-sportschuhe",
    "marke-champion": "sport-outdoor", "marke-new-era": "sport-outdoor", "marken-sport": "sport-outdoor", "e-scooter-trottinett": "sport-outdoor",
    # Haushalt / Technik / Werkzeug / Garten
    "marke-quid": "sub-kueche", "marke-versa": "wohnen-dekoration", "kueche-organisation": "sub-kueche", "kaffee-maschinen": "haushaltsgeraete",
    "marke-startech": "elektronik-technik", "tech-marken": "elektronik-technik", "refurbished": "elektronik-technik",
    "maker-elektronik": "elektronik-kleinteile", "beamer-projektoren": "beamer-heimkino", "elektriker-werkzeug": "werkzeug-maschinen",
    "indoor-grow": "outdoor-garten", "haustier-kuehlung": "sub-haustier", "arbeitskleidung": "sub-wander-arbeitsschuhe", "reise-outdoor": "sub-reise",
    # Fan-Artikel (WM 2026 vorbei bzw. ohne Ware)
    "fan-zone-schweiz": "fussball-fanshop", "vereins-fanartikel": "fussball-fanshop", "wm-fussball-2026": "fussball-fanshop",
}


def jetzt_iso():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ziel_waehlen(handle, ok_ziel):
    """→ (Ziel-Handle, aus_tabelle). `ok_ziel(handle) -> bool` prüft «im Onlineshop und ≥ MIND_ZIEL aktiv». Nie das Handle selbst."""
    kand = []
    if ZIEL.get(handle):
        kand.append((ZIEL[handle], True))
    kand.append((FALLBACK, False))
    for z, aus_tab in kand:
        if z != handle and ok_ziel(z):
            return z, aus_tab
    return None, False


def ledger_zeilen():
    try:
        return [l.rstrip("\n").split("\t") for l in open(LEDGER, encoding="utf-8") if l.strip()]
    except OSError:
        return []


def behalten_liste():
    try:
        return {l.strip() for l in open(BEHALTEN, encoding="utf-8") if l.strip() and not l.startswith("#")}
    except OSError:
        return set()


def ereignisse(kl, stunden=48):
    """Veröffentlichungs-Ereignisse für Kollektionen der letzten `stunden` h → {app: n} und (erste, letzte) Zeit; Forensik für «wer war das»."""
    seit = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=stunden)).strftime("%Y-%m-%dT%H:%M:%SZ")
    q = ('query($q:String!){ events(first:250, query:$q, sortKey:CREATED_AT, reverse:true){ nodes{ ... on BasicEvent{ action createdAt appTitle } } } }')
    try:
        d = kl.gql(q, {"q": "subject_type:COLLECTION AND created_at:>=" + seit})
    except Exception:  # noqa: BLE001
        return None
    ns = ((d.get("events") or {}).get("nodes")) or []
    apps, zeiten = {}, []
    for n in ns:
        if n.get("action") == "published":
            a = n.get("appTitle") or "?"
            apps[a] = apps.get(a, 0) + 1
            zeiten.append(n["createdAt"])
    return {"apps": apps, "von": min(zeiten) if zeiten else None, "bis": max(zeiten) if zeiten else None, "gesamt": sum(apps.values())}


def menue_handles(kl):
    d = kl.gql('{menus(first:10){nodes{items{url items{url items{url}}}}}}')
    out = set()

    def walk(it):
        u = (it.get("url") or "")
        if "/collections/" in u:
            out.add(u.split("/collections/", 1)[1].split("?")[0].strip("/"))
        for c in it.get("items") or []:
            walk(c)
    for m in ((d.get("menus") or {}).get("nodes")) or []:
        for it in m.get("items") or []:
            walk(it)
    return out


def heilen(kl, leer, duenn, scharf):
    """leer = [(node, aktiv)] aus kollektion_leer.main(); schreibt den Stand, handelt nur bei scharf. → Zahl der Kollektionen, die NACH dem Lauf noch leer veröffentlicht sind."""
    behalten, menue = behalten_liste(), None
    try:
        menue = menue_handles(kl)
    except Exception:  # noqa: BLE001
        menue = None           # unbekannt → im Zweifel nichts abmelden, was im Menü stehen könnte
    frueher = {}
    for z in ledger_zeilen():
        if len(z) >= 2 and z[1] == "unpublished":
            frueher[z[0]] = frueher.get(z[0], 0) + 1
    ziel_cache = {}

    def ok_ziel(h):
        if h in ziel_cache:
            return ziel_cache[h]
        ok = False
        d = kl.gql('query($h:String!){collectionByHandle(handle:$h){id resourcePublicationsV2(first:15){nodes{publication{name} isPublished}}}}', {"h": h})
        c = d.get("collectionByHandle")
        if c and kl.im_onlineshop_liste(c["resourcePublicationsV2"]["nodes"]):
            a = kl.aktive(c["id"])
            ok = a is not None and a >= MIND_ZIEL
        ziel_cache[h] = ok
        return ok

    getan, uebersprungen, fehler, wiederholt, ohne_tab = [], [], [], [], []
    for n, _a in leer:
        h = n["handle"]
        if h in behalten:
            uebersprungen.append((h, "Betreiber-Ausnahme")); continue
        if menue is None or h in menue:
            uebersprungen.append((h, "im Menü oder Menü unlesbar")); continue
        if len(getan) >= MAX_LAUF:
            uebersprungen.append((h, "MAX_LAUF")); continue
        if frueher.get(h):
            wiederholt.append(h)
        ziel, aus_tab = ziel_waehlen(h, ok_ziel)
        if not ziel:
            fehler.append((h, "kein gefülltes Ziel")); continue
        if not aus_tab:
            ohne_tab.append(h)
        if not scharf:
            print(f"  [DRY] /collections/{h}  → 301 /collections/{ziel}{'' if aus_tab else ' (FALLBACK)'} → aus {len(PUBS)} Kanälen nehmen", flush=True)
            continue
        r = kl.gql('query($q:String!){urlRedirects(first:1, query:$q){nodes{id path target}}}', {"q": "path:/collections/" + h})
        vorh = (((r.get("urlRedirects") or {}).get("nodes")) or [None])[0]
        if not vorh:
            m = kl.gql('mutation($i:UrlRedirectInput!){urlRedirectCreate(urlRedirect:$i){urlRedirect{id} userErrors{field message}}}',
                       {"i": {"path": "/collections/" + h, "target": "/collections/" + ziel}})
            ue = ((m.get("urlRedirectCreate") or {}).get("userErrors")) or []
            if ue or not ((m.get("urlRedirectCreate") or {}).get("urlRedirect")):
                fehler.append((h, "301: " + str(ue)[:80])); continue
        for pub in PUBS:
            kl.gql('mutation($id:ID!,$p:[PublicationInput!]!){publishableUnpublish(id:$id,input:$p){userErrors{message}}}',
                   {"id": n["id"], "p": [{"publicationId": "gid://shopify/Publication/" + pub}]})
            time.sleep(0.1)
        rb = kl.gql('query($id:ID!){collection(id:$id){resourcePublicationsV2(first:15){nodes{publication{name} isPublished}}}}', {"id": n["id"]})
        noch = kl.im_onlineshop_liste(((rb.get("collection") or {}).get("resourcePublicationsV2") or {}).get("nodes") or [])
        if noch:
            fehler.append((h, "nach unpublish noch im Onlineshop")); continue
        with open(LEDGER, "a", encoding="utf-8") as f:
            f.write(f"{h}\tunpublished\t{n['title']}\tleer-auto {jetzt_iso()}\t301:{vorh['target'] if vorh else '/collections/' + ziel}\n")
        getan.append(h)
        print(f"  ⛔ /collections/{h} → 301 {vorh['target'] if vorh else '/collections/' + ziel}, aus allen Kanälen genommen", flush=True)
    rest = len(leer) - len(getan) if scharf else len(leer)
    ev = ereignisse(kl)
    stand = {
        "stand": jetzt_iso(), "scharf": bool(scharf), "leer_gefunden": len(leer), "duenn": len(duenn), "abgemeldet": len(getan),
        "leer_nach_lauf": rest, "wiederholt": wiederholt, "ohne_tabelle": ohne_tab,
        "uebersprungen": [list(x) for x in uebersprungen], "fehler": [list(x) for x in fehler], "veroeffentlicht_48h": ev,
    }
    try:
        with open(STAND, "w", encoding="utf-8") as f:
            json.dump(stand, f, ensure_ascii=False, indent=1)
    except OSError as e:
        print("Stand nicht schreibbar:", e, file=sys.stderr)
    print(f"KOLL-LEER: {len(leer)} leer gefunden · {len(getan)} abgemeldet · {rest} leer danach · {len(duenn)} dünn · "
          f"fremd veröffentlicht 48 h: {ev['apps'] if ev else 'unlesbar'} · Stand {stand['stand']}" + ("" if scharf else " (DRY)"), flush=True)
    return rest


def selbsttest():
    fehler = []

    def pr(name, bed):
        if not bed:
            fehler.append(name)
    pr("Tabelle: kein Handle zeigt auf sich selbst", all(h != z for h, z in ZIEL.items()))
    pr("Tabelle: keine Ziele, die selbst Schlüssel (leere Regale) sind", not (set(ZIEL.values()) & set(ZIEL)))
    z, tab = ziel_waehlen("casio", lambda h: True)
    pr("Tabellenziel wird genommen", z == "uhren" and tab)
    z, tab = ziel_waehlen("casio", lambda h: h == FALLBACK)
    pr("Ziel fällt durch → Fallback", z == FALLBACK and not tab)
    z, tab = ziel_waehlen("unbekannt-xyz", lambda h: True)
    pr("ohne Eintrag → Fallback", z == FALLBACK and not tab)
    z, _ = ziel_waehlen("bestseller", lambda h: True)
    pr("Fallback nie auf sich selbst", z is None)
    z, _ = ziel_waehlen("casio", lambda h: False)
    pr("nichts gefüllt → kein Ziel (Kollektion bleibt unberührt)", z is None)
    pr("alle 6 Kanäle", len(PUBS) == 6 and ONLINE_STORE in PUBS)
    print(f"koll_leer_heilen Selbsttest: {8 - len(fehler)}/8")
    for f in fehler:
        print("  FAIL", f)
    return not fehler


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    print(__doc__)
