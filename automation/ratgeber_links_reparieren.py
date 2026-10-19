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
    a = ap.parse_args()
    if a.vorschlag:
        return vorschlag()
    if a.zurueck:
        return zurueck(a.vorher, a.scharf)
    ersatz = lies_ersatz(a.ersatz)
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
