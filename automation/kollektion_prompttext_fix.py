"""Ersetzt den unfertigen KI-ARBEITSAUFTRAG, der in drei Kollektionen als Kundentext live steht.

BEFUND (14.08.2026, live gegengeprüft, nicht aus dem Export):
Drei veröffentlichte Kollektionen tragen statt eines Textes den englischen Prompt, mit dem der
Text hätte erzeugt werden sollen. Er steht dort, wo ihn jeder sieht:
  • premium-marken-lager «Premium & Marken» (ID 689837736321)
      SEO-Beschreibung = «1 meta description max 150 characters, with category +
      Switzerland/Blitzversand (flash shipping)» → live in <meta name="description">,
      og:description und twitter:description, also im Google-Snippet und in jeder
      WhatsApp-/Facebook-Vorschau.
  • ft-kostuem-hut «Hüte & Kopfbedeckung» (ID 690576982401) — derselbe Prompt in der
      SEO-Beschreibung. Zusätzlich fand dieser Lauf, was die Fehlersuche nicht sah: der
      SICHTBARE Fliesstext bricht mitten im Wort ab («…entdecken Sie Kopfbedeck»).
  • ft-ballone «Ballone & Deko» (ID 690577244545) — Prompt in der SEO-Beschreibung UND als
      sichtbarer Fliesstext auf der Seite: «2 sales-strong sentences in High German
      (Hochdeutsch) for the category page, with Swiss reference, no invented facts».
Das ist die in CLAUDE.md dokumentierte Kimi-k3-Falle (liefert bei strukturierten Prompts den
Denk-/Auftragstext statt der Copy) — sie war nie ganz aufgeräumt.

ZAHL: 3 Kollektionen. Der Probelauf hat NICHT nur diese drei gesucht, sondern alle 506
Kollektionen des Shops gegen 18 Prompt-Muster geprüft (auch die harmlos klingenden wie
«characters», «sentences», «write», «prompt»). Ergebnis: genau diese 3, kein weiterer Fall.

FEHLTREFFER AUS DEM PROBELAUF: keine — die breiten englischen Muster («write», «prompt»,
«sentences») trafen in 506 deutschen Kollektionstexten nichts anderes. Genau deshalb sind sie
drin geblieben: ein enges Muster hätte nur die drei bekannten Fälle gefunden und einen vierten,
anders formulierten Prompt übersehen.

ENTSCHEIDUNG (was hier bewusst NICHT passiert):
1. Nur belegte Aussagen. Erlaubt sind «Gratis-Versand ab CHF 50» und «30 Tage Rückgabe» (beides
   live in der Ankündigungsleiste und im Versandtext des Shops).
2. «Blitzversand / Lieferung in 1–2 Werktagen» NUR für CH-Lager-Ware. Das Skript prüft das
   selbst: der Satz wird nur geschrieben, wenn ALLE aktiven Produkte der Kollektion den Tag
   `ch-lager` tragen (ft-ballone 35/35, ft-kostuem-hut 165/165 — geprüft). Fehlt einer, bricht
   der Lauf für diese Kollektion ab, statt eine Lieferzeit zu erfinden. Das ist dieselbe Falle,
   die am 12.08. fünf Kollektionen zu Unrecht Blitzversand versprechen liess.
3. Der Text beschreibt, was WIRKLICH drin liegt, nicht was der Kollektionsname verspricht:
   ft-kostuem-hut ist Fasnachts-/Party-Kopfbedeckung (Zylinder, Cowboy-, Hexenhüte, Helme), nicht
   «warme Mütze für kühle Tage in den Schweizer Bergen», wie der abgebrochene Alttext behauptete.
4. premium-marken-lager bekommt KEINE Sortiments- oder Auswahl-Aussage. Grund: die 7'496
   Produkte der Kollektion sind live durchgezählt 7'452 DRAFT und 44 ARCHIVED — AKTIV ist
   keines. Es ist der BigBuy-Bestand, der am 10.07. gesperrt wurde («active ≠ lagernd»,
   78 % ausverkauft). Ein Text, der «grosse Auswahl» verspricht, wäre die nächste
   Falschaussage; auch «Lieferung aus EU-Lager» aus dem Alttext fällt weg — für 7'496 Artikel
   nicht nachprüfbar. Die Fehlersuche zählte hier «7'496 Produkte»: das ist die Admin-Zahl
   INKLUSIVE Entwürfe, die bekannte Falle aus CLAUDE.md. Dass eine leere Kategorieseite
   veröffentlicht ist und in Google steht, ist ein eigener Befund für den Betreiber
   (depublizieren ODER Ware reaktivieren) — hier wird er gemeldet, nicht stillschweigend
   geheilt, weil beides eine Sortimentsentscheidung ist.
5. Der SEO-TITEL bleibt bei allen drei leer (Shopify-Vorgabe «Kollektionstitel – LuxeStyle»).
   CLAUDE.md: ein selbstgebauter Titel ist meist schlechter, und er war hier nicht kaputt.
6. Nichts wird gelöscht, nichts depubliziert.

QUELLE (Regel 7): Der Generator, der den Prompt ins Feld geschrieben hat, existiert im Repo
nicht mehr — er lief nur in /tmp (bekanntes Muster: «Was nur in /tmp lebt, ist verloren»).
Reparierbar ist also nicht der Schreiber, sondern die Kontrolle: `--pruefen` prüft alle
Kollektionen auf Prompt-Reste und endet mit Exit-Code 1, wenn wieder einer auftaucht. Damit
lässt sich der Lauf in jede Wartungsroutine hängen, egal welches Modell den Text nächstes Mal
schreibt.

AUFRUF:
  python3 automation/kollektion_prompttext_fix.py            # DRY: zeigt nur, ändert nichts
  SCHARF=1 python3 automation/kollektion_prompttext_fix.py   # schreibt
  python3 automation/kollektion_prompttext_fix.py --pruefen  # Wächter, Exit 1 bei Fund
"""
import json
import os
import re
import subprocess
import sys
import time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
URL = "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json"
SCHARF = os.environ.get("SCHARF") == "1"
LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "..", "dropship", "_kollektion_prompttext_fix.txt")
ONLINE_STORE = "gid://shopify/Publication/301970915713"

# Muster, an denen man einen stehengebliebenen Arbeitsauftrag erkennt. Bewusst breit: lieber ein
# Fehltreffer, den ich von Hand verwerfe, als ein vierter Prompt, den niemand sieht.
PROMPT_MUSTER = re.compile(
    r"meta description|max\s*\d+\s*character|High German|Hochdeutsch\)|no invented facts|"
    r"sales-strong|flash shipping|\bcharacters\b|\bsentences\b|\bwrite\b|\bplease\b|"
    r"as an AI|reasoning|\bprompt\b|\bbullet points?\b|\btone of voice\b", re.I)

SCHLUSS = "Gratis-Versand ab CHF 50, 30 Tage Rückgabe."
CH_SATZ = "Lieferung in 1–2 Werktagen"   # nur für 100 % CH-Lager erlaubt

TEXTE = {
    "premium-marken-lager": {
        "body": "<p>Markenartikel aus dem Sortiment von luxestyle.ch – Originalware bekannter "
                "Hersteller, keine Nachahmungen.</p>"
                "<p>🚚 Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe</p>",
        "seo": "Markenartikel bei luxestyle.ch – Originalware bekannter Hersteller. "
               "Gratis-Versand ab CHF 50, 30 Tage Rückgabe.",
        "ch_lager": False,
    },
    "ft-kostuem-hut": {
        "body": "<p>Zylinder, Cowboy- und Hexenhüte, Helme, Kappen und Plüschmützen für "
                "Fasnacht, Halloween und Motto-Partys – von der Waggis-Zipfelmütze bis zum "
                "Piratenhut.</p>"
                "<p>Alle Artikel liegen im Schweizer Lager: Lieferung in 1–2 Werktagen. "
                "Gratis-Versand ab CHF 50, 30 Tage Rückgabe.</p>",
        "seo": "Kostümhüte & Kopfbedeckungen: Zylinder, Cowboy- und Hexenhüte, Helme & Kappen "
               "ab Schweizer Lager, Lieferung in 1–2 Werktagen.",
        "ch_lager": True,
    },
    "ft-ballone": {
        "body": "<p>Luftballons im 100er-Pack, Folienballons und fertige Ballongirlanden für "
                "Geburtstag, Hochzeit und jedes Fest.</p>"
                "<p>Alles liegt im Schweizer Lager: Lieferung in 1–2 Werktagen. "
                "Gratis-Versand ab CHF 50, 30 Tage Rückgabe.</p>",
        "seo": "Luftballons im 100er-Pack, Folienballons & Ballongirlanden ab Schweizer Lager – "
               "Lieferung in 1–2 Werktagen, gratis ab CHF 50.",
        "ch_lager": True,
    },
}


def gql(q, v=None):
    """Fünf Versuche. Eine gescheiterte Anfrage gibt {} zurück und gilt NICHT als Ergebnis."""
    payload = json.dumps({"query": q, "variables": v or {}})
    with open("/tmp/_kpt.json", "w") as f:
        f.write(payload)
    for _ in range(5):
        r = subprocess.run(["curl", "-s", "--max-time", "60", URL,
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_kpt.json"],
                           capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data"):
                return d
            if d.get("errors"):
                print("   API:", str(d["errors"])[:120], flush=True)
        except Exception:
            pass
        time.sleep(4)
    return {}


def alle_kollektionen():
    q = ('query($c:String){collections(first:250,after:$c){pageInfo{hasNextPage endCursor}'
         'nodes{id handle title descriptionHtml productsCount{count} seo{title description}}}}')
    cur, out = None, []
    while True:
        d = gql(q, {"c": cur})
        if not d:
            raise SystemExit("Kollektionen nicht ladbar — Lauf gilt als offen, nichts geschrieben.")
        c = d["data"]["collections"]
        out += c["nodes"]
        if not c["pageInfo"]["hasNextPage"]:
            return out
        cur = c["pageInfo"]["endCursor"]


def pruefen(colls):
    """Wächter: meldet jeden Kollektionstext, der wie ein Arbeitsauftrag aussieht."""
    treffer = []
    for x in colls:
        felder = {"Fliesstext": x["descriptionHtml"] or "",
                  "SEO-Beschreibung": (x["seo"] or {}).get("description") or "",
                  "SEO-Titel": (x["seo"] or {}).get("title") or ""}
        wo = [k for k, v in felder.items() if PROMPT_MUSTER.search(v)]
        if wo:
            treffer.append((x, wo, felder))
    for x, wo, felder in treffer:
        print(f"  ⚠️ {x['handle']} ({x['productsCount']['count']} Produkte) → {', '.join(wo)}")
        for k in wo:
            print(f"       {k}: «{felder[k][:150]}»")
    print(f"  {len(treffer)} Kollektion(en) mit Prompt-Verdacht von {len(colls)} geprüft")
    return treffer


def ch_lager_anteil(cid):
    """Wie viele AKTIVE Produkte der Kollektion liegen im CH-Lager? (aktiv, mit_tag)"""
    q = ('query($id:ID!,$c:String){collection(id:$id){products(first:250,after:$c){'
         'pageInfo{hasNextPage endCursor}nodes{status tags}}}}')
    cur, aktiv, ch = None, 0, 0
    while True:
        d = gql(q, {"id": cid, "c": cur})
        if not d:
            return None, None          # keine Antwort ist kein Ergebnis
        p = d["data"]["collection"]["products"]
        for n in p["nodes"]:
            if n["status"] == "ACTIVE":
                aktiv += 1
                if "ch-lager" in n["tags"]:
                    ch += 1
        if not p["pageInfo"]["hasNextPage"]:
            return aktiv, ch
        cur = p["pageInfo"]["endCursor"]


def main():
    colls = alle_kollektionen()

    print("── Prüfung aller Kollektionen auf stehengebliebene Arbeitsaufträge ──")
    treffer = pruefen(colls)
    if "--pruefen" in sys.argv:
        raise SystemExit(1 if treffer else 0)

    nach_handle = {x["handle"]: x for x in colls}
    geschrieben = 0
    led = open(LEDGER, "a", buffering=1)

    for handle, t in TEXTE.items():
        c = nach_handle.get(handle)
        if not c:
            print(f"  ⚠️ {handle}: gibt es nicht mehr — übersprungen")
            continue

        d = gql('query($id:ID!){collection(id:$id){publishedOnPublication(publicationId:"%s")}}'
                % ONLINE_STORE, {"id": c["id"]})
        if not d:
            print(f"  ⚠️ {handle}: Publikationsstatus nicht abrufbar — bleibt offen")
            continue
        if not d["data"]["collection"]["publishedOnPublication"]:
            print(f"  ⏭️ {handle}: nicht im Onlineshop veröffentlicht — kein Kundentext nötig")
            continue

        aktiv, ch = ch_lager_anteil(c["id"])
        if aktiv is None:
            print(f"  ⚠️ {handle}: Produktliste nicht abrufbar — bleibt offen")
            continue

        # Der Blitzversand-Riegel: die Lieferzeit-Aussage nur bei lückenlosem CH-Lager.
        verspricht_ch = CH_SATZ in t["body"] or CH_SATZ in t["seo"]
        if verspricht_ch and (aktiv == 0 or ch != aktiv):
            print(f"  ⛔ {handle}: Text verspricht «{CH_SATZ}», aber nur {ch} von {aktiv} "
                  f"aktiven Produkten sind CH-Lager → NICHT geschrieben")
            continue
        if t["ch_lager"] != verspricht_ch:
            print(f"  ⛔ {handle}: Text und Absicht widersprechen sich → NICHT geschrieben")
            continue
        if len(t["seo"]) > 165:
            print(f"  ⛔ {handle}: SEO-Beschreibung {len(t['seo'])} Zeichen — zu lang")
            continue
        if PROMPT_MUSTER.search(t["body"]) or PROMPT_MUSTER.search(t["seo"]):
            print(f"  ⛔ {handle}: eigener Ersatztext sieht selbst wie ein Prompt aus")
            continue

        print(f"\n  {handle} ({aktiv} aktiv, davon {ch} CH-Lager)")
        print(f"    ALT Fliesstext : «{(c['descriptionHtml'] or '')[:120]}»")
        print(f"    NEU Fliesstext : «{t['body'][:120]}»")
        print(f"    ALT SEO        : «{((c['seo'] or {}).get('description') or '')[:120]}»")
        print(f"    NEU SEO ({len(t['seo']):>3}) : «{t['seo']}»")
        if not SCHARF:
            continue

        r = gql('mutation($i:CollectionInput!){collectionUpdate(input:$i){'
                'collection{id} userErrors{field message}}}',
                {"i": {"id": c["id"], "descriptionHtml": t["body"],
                       "seo": {"description": t["seo"]}}})
        cu = ((r.get("data") or {}).get("collectionUpdate") or {})
        if not r or cu.get("userErrors"):
            print(f"    ⚠️ nicht geschrieben: {str(cu.get('userErrors'))[:120]} — bleibt offen")
            continue
        led.write(f"{time.strftime('%Y-%m-%d %H:%M')}\t{handle}\t{c['id']}\tText+SEO ersetzt\n")
        led.flush()
        os.fsync(led.fileno())
        geschrieben += 1
        time.sleep(0.4)

    led.close()
    print(f"\n{'' if SCHARF else '(DRY) '}FERTIG: {geschrieben} Kollektionstexte ersetzt")


if __name__ == "__main__":
    main()
