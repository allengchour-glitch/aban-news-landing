#!/usr/bin/env python3
"""Prüft AUSSCHLIESSLICH die Produktseiten, die wirklich Besucher bekommen, auf CH-Lieferbarkeit.

WARUM DIESES SKRIPT NEBEN cj_verfuegbarkeit.py EXISTIERT (18.09.2026):
Der bestehende Wächter läuft über ALLE 51'338 Produkte, braucht dafür Tage und steht seit dem
16.09. auf einem Cursor fest. Diese Datei stellt die andere Frage: von den ~40 Seiten, auf denen
in den letzten 60 Tagen überhaupt ein Mensch gelandet ist — welche verkaufen Ware, die nicht in
die Schweiz kommt? Das sind die einzigen, bei denen ein Fehlurteil heute Geld kostet.

ANLASS: Die meistbesuchte Suchseite des Shops (Rizinusöl-Wickel-Set, 18 Sitzungen/30 T, 55/90 T,
2 Warenkörbe) hat Bestand NUR im US-Lager und freightCalculate CN→CH liefert 0 Optionen.
Gemessen 18.09.2026. Fünf von neun externen Bestellungen wurden erstattet, weil der Lieferant
nicht liefern konnte — das ist dieselbe Klasse.

⚠️ KANARIENVOGEL (die wichtigste Zeile im Skript). Drosselt CJ oder ist der Token alt, liefert
freightCalculate für JEDES Produkt 0 Optionen — ein Lauf würde dann den gesamten Verkehr des
Shops als «nicht lieferbar» verurteilen. Deshalb wird ZUERST ein Artikel gefragt, von dem
BELEGT ist, dass er in die Schweiz geliefert wurde (#1018, am 17.09. in Zürich eingetroffen,
gemessen 16 Optionen). Antwortet der Kanarienvogel mit 0, bricht der Lauf ab und urteilt über
gar nichts. Eine Null ist erst eine Aussage, wenn das Werkzeug beweisen kann, dass es auch
einen Treffer findet.

⚠️ Dieses Skript ÄNDERT von sich aus NICHTS. Es berichtet. Ein Urteil, das niemand vollstreckt,
ist keine Sicherung (16.09.) — aber ein Urteil, das ein Automat ungeprüft vollstreckt, ist
schlimmer. Das Draften entscheidet die Session nach dem Lesen des Berichts.
"""
import json, os, sys, time, urllib.request, urllib.error

# #1018: E-Scooter-Ladegeraet, am 17.09.2026 in der Schweiz zugestellt. 6018 Stueck CN-Lager.
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KANARIENVOGEL_VID = "2608150717551606700"
PAUSE = 1.2          # CJ zaehlt 1 Anfrage/s ueber ALLE Prozesse gemeinsam
VERSUCHE = 3


# ⚠️ SELBSTKORREKTUR 18.09.2026, ERSTER LAUF. Dieses Skript hatte einen EIGENEN SKU-Parser
# mit `sku.startswith("CJ-")`. Ergebnis: 33 von 35 besuchten Seiten galten als «keine CJ-SKU»
# und damit als nicht beurteilbar — obwohl `CJLY291609201AZ`, `CJNS292524101AZ`, `CJSL291618301AZ`
# allesamt CJ-VARIANTEN-SKUs sind. Genau diese zu enge Pruefung hat am 11.08.2026 schon einmal
# 845 von 919 Fehlalarmen erzeugt und steht seither als Lehre im Gedaechtnis.
# Die Reparatur ist nicht, den Parser zu flicken, sondern ihn zu LOESCHEN: `versandfaehig()` im
# Bestands-Waechter kennt alle drei SKU-Formen (numerische pid, Varianten-SKU mit Anhang
# «zwei Ziffern + zwei Grossbuchstaben», UUID-pid), unterscheidet «ausgelistet» (1602002) von
# «transient nicht abrufbar» und gibt None zurueck, wo es nichts zu entscheiden gibt.
# Wer eine Logik baut, sucht zuerst ihren Zwilling.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from cj_versand_ch_guard import versandfaehig, cj            # noqa: E402


def ch_optionen_vid(vid):
    """Nur fuer den Kanarienvogel — der braucht eine vid, keine SKU."""
    code, opts, msg = cj("/logistic/freightCalculate",
                         {"startCountryCode": "CN", "endCountryCode": "CH",
                          "products": [{"quantity": 1, "vid": vid}]})
    if code != 200:
        return None, f"CJ code {code}: {str(msg)[:80]}"
    return len(opts or []), None


SHOP = "au3j0y-hq.myshopify.com"


def shopify(query):
    """Dieselbe Bauart wie in den uebrigen Waechtern (klinge_ch_wache.py:67).

    ⚠️ Kein stilles `except: pass` — am 17.09. verschluckten 102 Kopien dieses Helfers
    den Grund, und 15 Waechter meldeten nur noch «Shopify antwortet nicht». Bei THROTTLED
    wird laenger gewartet, weil sich Shopifys Eimer mit restoreRate fuellt.
    """
    letzte = "unbekannt"
    for i in range(6):
        req = urllib.request.Request(
            f"https://{SHOP}/admin/api/2026-01/graphql.json",
            data=json.dumps({"query": query}).encode(),
            headers={"X-Shopify-Access-Token": open("/tmp/cj_shop_token.txt").read().strip(),
                     "Content-Type": "application/json"})
        try:
            d = json.loads(urllib.request.urlopen(req, timeout=60).read())
        except Exception as e:                        # noqa: BLE001
            letzte = f"{type(e).__name__}: {str(e)[:90]}"
            time.sleep(2 + i * 2)
            continue
        if d.get("errors"):
            letzte = str(d["errors"])[:140]
            if any("THROTTLED" in str(x) for x in d["errors"]):
                time.sleep(4 + i * 4)               # Vierfache Wartezeit, Lehre 17.09.
                continue
        if d.get("data") is None:
            raise RuntimeError(f"GraphQL ohne data: {json.dumps(d)[:200]}")
        return d
    raise RuntimeError(f"Shopify antwortet nicht ({i + 1} Versuche). Letzter Grund: {letzte}")


TAGE = int(os.environ.get("TAGE", "60"))
MAX_SEITEN = int(os.environ.get("MAX_SEITEN", "45"))


def besuchte_produkt_handles():
    """Holt die Liste selbst — ein Waechter, der auf eine Handreichung wartet, laeuft nie.

    GEMESSEN 18.09.2026: die Admin-API kann ShopifyQL (`shopifyqlQuery`), Felder heissen
    `tableData { rows columns { name } }` — NICHT `rowData`/`unformattedData`, die gibt es in
    2024-10 nicht. Erst das Schema fragen, dann die Abfrage schreiben; geraten kostete hier
    vier Fehlversuche.
    """
    q = ('{ shopifyqlQuery(query: "FROM sessions SHOW sessions GROUP BY landing_page_path '
         "WHERE human_or_bot_session = 'human' SINCE -%dd ORDER BY sessions DESC LIMIT 250\") "
         '{ parseErrors tableData { rows } } }' % TAGE)
    d = shopify(q)["data"]["shopifyqlQuery"]
    if d.get("parseErrors"):
        raise RuntimeError(f"ShopifyQL abgelehnt: {d['parseErrors']}")
    rows = (d.get("tableData") or {}).get("rows") or []
    handles = []
    for r in rows:
        pfad = (r.get("landing_page_path") or "").split("?")[0]
        if "/products/" not in pfad:
            continue
        h = pfad.rsplit("/products/", 1)[1].strip("/")
        if h and h not in handles:
            handles.append(h)
    if not handles:
        # Eine leere Liste ist hier NIE ein Ergebnis: es gibt immer besuchte Produktseiten.
        # Sie waere das Zeichen, dass die Abfrage oder die Berechtigung kaputt ist — und ein
        # Waechter, der dann "0 Befunde" meldet, ist die stille Null aus Lehre 18.09.
        raise RuntimeError(f"ShopifyQL lieferte {len(rows)} Zeilen, aber KEINE Produktseite — "
                           "Abfrage oder Berechtigung pruefen, es wird nichts geurteilt.")
    return handles[:MAX_SEITEN]


def main():
    handles = [] if sys.stdin.isatty() else [h.strip() for h in sys.stdin if h.strip()]
    if not handles:
        handles = besuchte_produkt_handles()
        print(f"{len(handles)} besuchte Produktseiten der letzten {TAGE} Tage (selbst geholt)\n",
              flush=True)

    # ── Kanarienvogel ────────────────────────────────────────────────────────
    n, grund = ch_optionen_vid(KANARIENVOGEL_VID)
    if n is None:
        sys.exit(f"ABBRUCH — Kanarienvogel nicht erreichbar ({grund}). Es wird ueber NICHTS geurteilt.")
    if n == 0:
        sys.exit("ABBRUCH — der Kanarienvogel (#1018, nachweislich in die CH geliefert) meldet 0 "
                 "Versandoptionen. Damit wuerde jedes Produkt faelschlich als nicht lieferbar gelten. "
                 "Es wird ueber NICHTS geurteilt.")
    print(f"Kanarienvogel ok: {n} CH-Optionen fuer den nachweislich gelieferten Artikel\n", flush=True)
    time.sleep(PAUSE)

    print(f"{'handle':58} {'status':7} {'CH-Versand':>11}  Grund")
    print("-" * 110)
    befunde, unklar, ok = [], [], 0
    for h in handles:
        q = ('{products(first:1, query:"handle:%s"){nodes{handle status '
             'variants(first:1){nodes{sku}}}}}' % h)
        try:
            nodes = shopify(q)["data"]["products"]["nodes"]
        except Exception as e:                        # noqa: BLE001
            unklar.append((h, f"Shopify-Antwort unlesbar: {type(e).__name__}: {str(e)[:70]}"))
            continue
        if not nodes:
            unklar.append((h, "Produkt existiert nicht mehr"))
            continue
        p = nodes[0]
        sku = (p["variants"]["nodes"] or [{}])[0].get("sku") or ""
        urteil, grund = versandfaehig(sku)
        zeichen = {True: "ja", False: "NEIN", None: "unklar"}[urteil]
        print(f"{h[:58]:58} {p['status']:7} {zeichen:>11}  {grund}", flush=True)
        if urteil is False:
            befunde.append((h, p["status"], grund, sku))
        elif urteil is True:
            ok += 1
        else:
            unklar.append((h, grund))
        time.sleep(PAUSE)

    print("\n" + "=" * 110)
    print(f"LIEFERBAR: {ok} · NICHT IN DIE CH: {len(befunde)} · NICHT BEURTEILBAR: {len(unklar)}")
    if befunde:
        print("\n⚠️ Diese BESUCHTEN Seiten verkaufen Ware, die nicht in die Schweiz kommt:")
        for h, st, g, sku in befunde:
            print(f"   {st:7} /products/{h}\n           {g} · SKU {sku}")
    if unklar:
        print("\nNicht beurteilbar (mit Grund — nie stillschweigend uebergangen):")
        for h, g in unklar:
            print(f"   {h}: {g}")
    # Ein Urteil, das niemand vollstreckt, ist keine Sicherung (16.09.) — deshalb wandert der
    # Befund in eine Datei, die die naechste Session zwingend sieht, statt nur auf die Konsole.
    # ⚠️ SELBSTKORREKTUR 18.09.2026, WENIGE MINUTEN NACH DEM ERSTEN LAUF: hier stand `open(…, "w")`.
    # Ein TEILLAUF ueber vier Handles hat damit die Befunde des Volllaufs ueber 35 Handles
    # geloescht — drei echte Treffer verschwanden lautlos, weil sie in diesem Lauf gar nicht
    # gefragt worden waren. Eine Ergebnisdatei, die bei jedem Lauf ueberschrieben wird, ist kein
    # Register, sondern die Meinung des letzten Aufrufs. Richtig ist: dieser Lauf hat GENAU ueber
    # die Handles seiner Eingabe geurteilt; fuer die gilt sein Urteil, alles andere bleibt stehen.
    reg = os.path.join(REPO, "dropship", "_besuchte_seiten_nicht_lieferbar.txt")
    alt_zeilen = {}
    if os.path.exists(reg):
        for z in open(reg):
            teile = z.rstrip("\n").split("\t")
            if teile and teile[0]:
                alt_zeilen[teile[0]] = teile
    gefragt = {h for h in handles}
    for h in gefragt:                      # dieser Lauf hat geurteilt: alter Eintrag faellt
        alt_zeilen.pop(h, None)
    for h, st, g, sku in befunde:          # … und wird durch das neue Urteil ersetzt
        alt_zeilen[h] = [h, st, g, sku]
    with open(reg, "w") as f:
        for teile in sorted(alt_zeilen.values()):
            f.write("\t".join(teile) + "\n")
    print(f"\n→ dropship/_besuchte_seiten_nicht_lieferbar.txt "
          f"({len(alt_zeilen)} Zeilen gesamt, davon {len(befunde)} aus diesem Lauf)")


if __name__ == "__main__":
    main()
