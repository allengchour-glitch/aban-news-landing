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
import json, re, os, sys, time, urllib.request, urllib.error

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
# 05.10.2026 (Pruefer-Befund 9, «fix 12 h»): ATTRAPPE=1 = Trockenlauf OHNE einen einzigen CJ-Aufruf. Der Pruefer konnte
# die Logik nur nachbauen, weil jeder echte Lauf CJ-Punkte kostet und der Tagesvorrat um 02:00 weg war. Mit der Attrappe
# antwortet «CJ» immer «16 Optionen» — damit lassen sich Pflichtliste, Ledger-Filter, Reihenfolge und Schlusszeilen
# pruefen. ⚠️ Attrappen-Urteile landen NIE im Ledger (ledger_schreiben prueft ATTRAPPE) und nie im Register (DRY Pflicht).
ATTRAPPE = os.environ.get("ATTRAPPE") == "1"
if ATTRAPPE:
    def versandfaehig(sku):                                   # noqa: D103
        return True, (f"ATTRAPPE: 16 Optionen, ab USD 9.99 ({sku})", 9.99)

    def cj(pfad, body=None):                                  # noqa: D103
        return 200, [{"logisticPrice": "9.99"}] * 16, "ATTRAPPE"
else:
    from cj_versand_ch_guard import versandfaehig, cj        # noqa: E402


def ch_optionen_vid(vid):
    """Nur fuer den Kanarienvogel — der braucht eine vid, keine SKU."""
    code, opts, msg = cj("/logistic/freightCalculate",
                         {"startCountryCode": "CN", "endCountryCode": "CH",
                          "products": [{"quantity": 1, "vid": vid}]})
    if code != 200:
        return None, f"CJ code {code}: {str(msg)[:80]}"
    return len(opts or []), None


PUNKTE_RESERVE = int(os.environ.get("PUNKTE_RESERVE", "2000"))


def punkte_sonde():
    """CJ-Punktestand VOR dem Lauf — ueber den GRATIS-Endpunkt productComments (kostet 0 Punkte, Lehre 28.08.;
    `cj_versand_ch_sichtbar.warte_auf_punkte` nutzt denselben). Gibt {rest,total,used,code,msg} zurueck.

    WARUM (Pruefer-Befund 9, 05.10.2026): Lauf 1 (~305 Aufrufe) lief in genau der Stunde, in der der CJ-Rest von 44'061
    auf 5'219 fiel; danach antworteten ALLE CJ-Waechter (Bestell-Ampel, Kanarienvoegel, Grind) bis 16:00 UTC mit 16900500.
    Ein Waechter, der den letzten Rest aufbraucht, nimmt dem Bestell-Motor die Punkte. Unter PUNKTE_RESERVE: PAUSE.
    ⚠️ `remaining` ist laut cj_kosten_backfill.mjs (23.08.) zeitweise ein nachfliessender Eimer (~300–570), nicht total−used;
    am 05.10. zeigte er 44'061 → 5'219 → 0 wie ein Tagesvorrat. Beide Lesarten fuehren hier zum selben Schluss: unter der
    Reserve wird heute nicht gefragt, der Aufseher versucht es spaeter (PAUSE-Zeile)."""
    if ATTRAPPE:
        return {"rest": 99999, "total": 99999, "used": 0, "code": 200, "msg": "ATTRAPPE"}
    import subprocess
    try:
        from cj_takt import takt, frei
        from cj_versand_ch_guard import CJT
    except Exception as e:                                     # noqa: BLE001
        return {"rest": None, "total": None, "used": None, "code": 0, "msg": f"Sonde nicht ladbar: {e}"}
    cmd = ["curl", "-s", "--max-time", "40",
           "https://developers.cjdropshipping.com/api2.0/v1/product/productComments?pid=2064920992690323457&pageNum=1&pageSize=1",
           "-H", "CJ-Access-Token: " + CJT]
    for _ in range(3):
        takt()
        out = subprocess.run(cmd, capture_output=True, text=True).stdout
        frei()
        try:
            d = json.loads(out or "{}")
        except Exception:                                      # noqa: BLE001
            time.sleep(3); continue
        code = int(d.get("code") or 0)
        if code == 1600200:
            time.sleep(3); continue
        pi = d.get("pointsInfo") or {}
        msg = str(d.get("message") or "")
        rest = pi.get("remaining")
        if rest is None and code == 16900500:
            m = re.search(r"Remaining:\s*(\d+)", msg)
            rest = int(m.group(1)) if m else 0
        return {"rest": rest, "total": pi.get("total"), "used": pi.get("usedToday"), "code": code, "msg": msg[:100]}
    return {"rest": None, "total": None, "used": None, "code": 0, "msg": "keine Antwort"}


SHOP = "au3j0y-hq.myshopify.com"


def shopify(query, variables=None):
    """Dieselbe Bauart wie in den uebrigen Waechtern (klinge_ch_wache.py:67).

    ⚠️ Kein stilles `except: pass` — am 17.09. verschluckten 102 Kopien dieses Helfers
    den Grund, und 15 Waechter meldeten nur noch «Shopify antwortet nicht». Bei THROTTLED
    wird laenger gewartet, weil sich Shopifys Eimer mit restoreRate fuellt.
    """
    letzte = "unbekannt"
    for i in range(6):
        req = urllib.request.Request(
            f"https://{SHOP}/admin/api/2026-01/graphql.json",
            data=json.dumps({"query": query, "variables": variables or {}}).encode(),
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
# ⚠️ 05.10.2026 (Betreiber «fix 12 h lang alles», Bereich Lieferbarkeit CH) — GEMESSEN:
# 329 aktive CJ-Produkte hatten in 30 Tagen menschliche Besucher (ShopifyQL landing_page_path),
# 209 davon (303 Sitzungen, darunter der Bestseller «Leinen-Set Provence», 42 Sitzungen, verkauft)
# hatten NIE eine CH-Versandpruefung — in keinem der vier Ledger. Dieser Waechter fragte nur die
# Top-45 und kam seit dem 27.09. in 2 von 8 Laeufen durch (Container startet ~stuendlich neu; die
# geteilte CJ-Uhr gibt ihm neben 4 Grind-Runnern + 3 Waechtern einen Platz alle ~15 s, 45 Seiten
# x 3 Aufrufe = ~35 min). Ein gestorbener Lauf hinterliess NICHTS: kein Ledger, nur die NEIN-Datei.
# Darum jetzt: (1) ALLE Produkt-Landeseiten (MAX_SEITEN 400), (2) Ledger je Handle SOFORT nach
# dem Urteil — ein «ja» gilt FRIST_JA_TAGE, danach wird neu gefragt; NEIN/unklar werden im
# naechsten Lauf wieder gefragt (Zwei-Laeufe-Regel unten bleibt), (3) hoechstens MAX_PRODUKTE je
# Lauf (~3 CJ-Aufrufe je Produkt → ~300 Aufrufe, der Rest kommt im naechsten Lauf dran).
# ⚠️ PRUEFER-BEFUND 9 (05.10.2026, 03:xx): «MAX_SEITEN 400 der 60-T-Liste» deckte die Klasse NIE ab — die 60-T-Abfrage
# lieferte 880 Produkt-Handles (LIMIT 1000 erreicht, Liste abgeschnitten), [:400] nahm ab Platz ~300 nur noch 1-Sitzungs-
# Seiten in zufaelliger Reihenfolge; 178 der 387 30-T-Landeseiten und 4 der 5 verkauften ACTIVE-Produkte (Cargo-Hose «Trail»
# = hoechster Umsatz 90 T, Gemueseschneider, Blumenkleid, Midikleid) standen NICHT in den 400, die der Waechter je fragte.
# Darum jetzt PFLICHTLISTE (pflichtliste()): (1) verkaufte Produkte 90 T zuerst, (2) ALLE Landeseiten 30 T, (3) Landeseiten
# 30–150 T in Zeitfenstern, die so lange halbiert werden, bis keines mehr das LIMIT 1000 erreicht (gemessen 05.10.: 30-T-
# Fenster -90..-60 und -120..-90 liefen je ins LIMIT; 2'753 Handles ueber 150 T, 388 in 30 T). MAX_SEITEN kappt nur noch
# als Notbremse. Frist fuer ein «ja»: 14 T fuer heisse Seiten (verkauft oder 30 T besucht), 60 T fuer die aelteren —
# sonst waeren es ~600 CJ-Aufrufe/Tag auf der EINEN geteilten CJ-Uhr (Plan Punkt 12: «nicht mehr Waechter dazubauen»).
MAX_SEITEN = int(os.environ.get("MAX_SEITEN", "5000"))
MAX_PRODUKTE = int(os.environ.get("MAX_PRODUKTE", "100"))
FRIST_JA_TAGE = float(os.environ.get("FRIST_JA_TAGE", "14"))
FRIST_JA_ALT_TAGE = float(os.environ.get("FRIST_JA_ALT_TAGE", "60"))
# NUR_NEIN=1 bestaetigt NEIN-Urteile erst nach MIN_ABSTAND_H Stunden: am 05.10. lagen zwischen «erstes NEIN» (01:57) und
# «zweites NEIN» (01:58) 60 Sekunden — das waren zwei Laeufe, aber keine zwei unabhaengigen Messungen (ein CJ-Aussetzer
# dauert laenger als eine Minute). DRAFT setzt vollstrecken() nur, wenn das vorige NEIN im Ledger ≥ MIN_ABSTAND_H alt ist.
MIN_ABSTAND_H = float(os.environ.get("MIN_ABSTAND_H", "12"))
DRY = os.environ.get("DRY") == "1"
if ATTRAPPE and not DRY:
    sys.exit("ATTRAPPE=1 verlangt DRY=1 — Attrappen-Urteile duerfen weder Register noch Shop beruehren.")
LEDGER = os.path.join(REPO, "dropship", "_besuchte_seiten_geprueft.tsv")   # handle · epoche · ja/NEIN/unklar · grund · sku


def ledger_lesen():
    """Juengstes Urteil je Handle: {handle: (epoche, urteil, grund)}. Fehlt die Datei: leer."""
    aus = {}
    if not os.path.exists(LEDGER):
        return aus
    for z in open(LEDGER, encoding="utf-8"):
        t = z.rstrip("\n").split("\t")
        if len(t) < 3:
            continue
        try:
            ts = float(t[1])
        except ValueError:
            continue
        if t[0] not in aus or aus[t[0]][0] < ts:
            aus[t[0]] = (ts, t[2], t[3] if len(t) > 3 else "")
    return aus


def ledger_schreiben(handle, urteil, grund, sku):
    if ATTRAPPE:
        return                       # Attrappen-Antworten sind keine Messung — nie ins Ledger
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(f"{handle}\t{time.time():.0f}\t{urteil}\t{(grund or '').replace(chr(9), ' ')[:120]}\t{sku}\n")


def shopifyql(abfrage):
    """GEMESSEN 18.09.2026: die Admin-API kann ShopifyQL (`shopifyqlQuery`), Felder heissen
    `tableData { rows columns { name } }` — NICHT `rowData`/`unformattedData`, die gibt es in
    2024-10 nicht. Erst das Schema fragen, dann die Abfrage schreiben; geraten kostete hier
    vier Fehlversuche."""
    d = shopify('{ shopifyqlQuery(query: %s) { parseErrors tableData { rows } } }' % json.dumps(abfrage))
    d = d["data"]["shopifyqlQuery"]
    if d.get("parseErrors"):
        raise RuntimeError(f"ShopifyQL abgelehnt: {d['parseErrors']} — {abfrage[:120]}")
    return (d.get("tableData") or {}).get("rows") or []


QL_LIMIT = 1000


def _handles_aus_zeilen(rows):
    aus = {}
    for r in rows:
        pfad = (r.get("landing_page_path") or "").split("?")[0]
        if "/products/" not in pfad:
            continue
        h = pfad.rsplit("/products/", 1)[1].strip("/")
        if h:
            aus[h] = aus.get(h, 0) + int(float(r.get("sessions") or 0))
    return aus


def landeseiten(von_tagen, bis_tagen=0, _tiefe=0):
    """Produkt-Landeseiten mit menschlichen Sitzungen im Fenster [-von_tagen, -bis_tagen] → {handle: sitzungen}.

    Erreicht ein Fenster das LIMIT 1000, ist die Liste abgeschnitten (Pruefer 05.10.: 60-T-Abfrage = 1000 Zeilen,
    880 Produkt-Handles, Rest unsichtbar). Dann wird das Fenster halbiert und beide Haelften einzeln geholt —
    bis keine mehr ans LIMIT stoesst oder das Fenster nur noch 2 Tage breit ist (dann bleibt es abgeschnitten
    und wird als solches gemeldet). ShopifyQL kennt `SINCE -Nd UNTIL -Md` (gemessen 05.10., parseErrors leer)."""
    q = ("FROM sessions SHOW sessions GROUP BY landing_page_path WHERE human_or_bot_session = 'human' "
         f"AND landing_page_type = 'Product' SINCE -{von_tagen}d"
         + (f" UNTIL -{bis_tagen}d" if bis_tagen else "") + f" ORDER BY sessions DESC LIMIT {QL_LIMIT}")
    rows = shopifyql(q)
    if len(rows) >= QL_LIMIT and von_tagen - bis_tagen > 2 and _tiefe < 6:
        mitte = (von_tagen + bis_tagen) // 2
        a = landeseiten(von_tagen, mitte, _tiefe + 1)
        b = landeseiten(mitte, bis_tagen, _tiefe + 1)
        for h, n in b.items():
            a[h] = a.get(h, 0) + n
        return a
    if len(rows) >= QL_LIMIT:
        print(f"⚠️ Fenster -{von_tagen}d..-{bis_tagen}d bleibt am LIMIT {QL_LIMIT} (nicht weiter teilbar) — Liste dort abgeschnitten",
              flush=True)
    return _handles_aus_zeilen(rows)


def verkaufte_handles(tage=90):
    """Verkaufte Produkte (FROM sales, 90 T) als Handles, hoechster Umsatz zuerst. Verkauft = bewiesen, dass die Seite
    Geld bringt; ein NEIN hier ist die #1016/#1017-Klasse (bezahlt, nicht lieferbar, erstattet). Gibt [] zurueck,
    wenn Shopify nichts liefert — das ist bei 18 Verkaeufen in 90 T plausibel leer NUR fuer kurze Fenster, darum
    wird die Zahl im Log genannt."""
    rows = shopifyql(f"FROM sales SHOW net_sales GROUP BY product_id SINCE -{tage}d ORDER BY net_sales DESC LIMIT 250")
    ids = [f"gid://shopify/Product/{r['product_id']}" for r in rows if r.get("product_id")]
    aus = []
    for i in range(0, len(ids), 50):
        d = shopify("query($ids:[ID!]!){nodes(ids:$ids){... on Product{handle}}}", {"ids": ids[i:i + 50]})
        for n in d["data"]["nodes"]:
            if n and n.get("handle") and n["handle"] not in aus:
                aus.append(n["handle"])
    return aus


def pflichtliste():
    """Reihenfolge = Schaden pro Fehlurteil: verkaufte 90 T → Landeseiten 30 T (alle, nach Sitzungen) →
    Landeseiten 30–TAGE_ALT T (nach Sitzungen). Gibt (handles, heiss) zurueck; heiss = verkauft ∪ 30 T (14-T-Frist)."""
    verkauft = verkaufte_handles(90)
    l30 = landeseiten(30, 0)
    l_alt = landeseiten(TAGE_ALT, 30) if TAGE_ALT > 30 else {}
    handles = list(verkauft)
    for h, _ in sorted(l30.items(), key=lambda kv: -kv[1]):
        if h not in handles:
            handles.append(h)
    n_heiss = len(handles)
    for h, _ in sorted(l_alt.items(), key=lambda kv: -kv[1]):
        if h not in handles:
            handles.append(h)
    print(f"Pflichtliste: {len(verkauft)} verkaufte Produkte (90 T) · {len(l30)} Landeseiten 30 T ({sum(l30.values())} Sitzungen) · "
          f"{len(l_alt)} Landeseiten 30–{TAGE_ALT} T ({sum(l_alt.values())} Sitzungen) → {len(handles)} eindeutige Handles, "
          f"davon {n_heiss} heiss (Frist {FRIST_JA_TAGE:.0f} T), Rest Frist {FRIST_JA_ALT_TAGE:.0f} T", flush=True)
    if not l30:
        # Eine leere 30-T-Liste ist hier NIE ein Ergebnis: es gibt immer besuchte Produktseiten.
        # Sie waere das Zeichen, dass die Abfrage oder die Berechtigung kaputt ist — und ein
        # Waechter, der dann "0 Befunde" meldet, ist die stille Null aus Lehre 18.09.
        raise RuntimeError("ShopifyQL lieferte KEINE Produkt-Landeseite der letzten 30 Tage — "
                           "Abfrage oder Berechtigung pruefen, es wird nichts geurteilt.")
    if len(handles) > MAX_SEITEN:
        print(f"⚠️ Pflichtliste auf MAX_SEITEN={MAX_SEITEN} gekappt ({len(handles) - MAX_SEITEN} aelteste Seiten fallen weg)", flush=True)
    return handles[:MAX_SEITEN], set(handles[:n_heiss])


TAGE_ALT = int(os.environ.get("TAGE_ALT", "150"))


def main():
    # «START » als ERSTE Zeile (Aufseher-Konvention 29.09.: still_gestorben() zaehlt nur Zeilen danach).
    print(f"START {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} besuchte_seiten_lieferbar "
          f"DRY={DRY} MAX_SEITEN={MAX_SEITEN} MAX_PRODUKTE={MAX_PRODUKTE}", flush=True)
    handles = [] if sys.stdin.isatty() else [h.strip() for h in sys.stdin if h.strip()]
    if not handles:
        handles = besuchte_produkt_handles()
        print(f"{len(handles)} besuchte Produktseiten der letzten {TAGE} Tage (selbst geholt)\n",
              flush=True)

    # ── Ledger: frische «ja» ueberspringen, Rest nach Sitzungen (Reihenfolge der Liste) ──
    led = ledger_lesen()
    jetzt = time.time()
    frisch_ja = [h for h in handles
                 if led.get(h, (0, "", ""))[1] == "ja" and jetzt - led[h][0] < FRIST_JA_TAGE * 86400]
    offen = [h for h in handles if h not in set(frisch_ja)]
    if os.environ.get("NUR_NEIN") == "1":
        # Bestaetigungslauf (05.10.): nur Handles, deren juengstes Ledger-Urteil NEIN ist — das zweite,
        # unabhaengige NEIN fuer die Vollstreckung, ohne den geteilten CJ-Eimer fuer frische Fragen zu belasten.
        offen = [h for h in offen if led.get(h, (0, "", ""))[1] == "NEIN"]
    handles = offen[:MAX_PRODUKTE]
    rest = len(offen) - len(handles)
    print(f"Ledger: {len(frisch_ja)} mit frischem «ja» (< {FRIST_JA_TAGE:.0f} T) uebersprungen · "
          f"{len(offen)} offen · dieser Lauf fragt {len(handles)} · {rest} bleiben fuer den naechsten Lauf",
          flush=True)
    if not handles:
        print("LIEFERBAR: 0 · NICHT IN DIE CH: 0 · NICHT BEURTEILBAR: 0  (nichts offen — alles frisch im Ledger)")
        print("FERTIG: nichts zu fragen", flush=True)
        return

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
    uebersprungen = set()          # nicht ACTIVE → nicht beurteilt → Register-Eintrag bleibt
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
        if p["status"] != "ACTIVE":
            # 05.10.: Entwuerfe kosten keine Kundin Geld — kein CJ-Aufruf dafuer (der Eimer ist geteilt).
            # Ihr Register-Eintrag bleibt stehen (nicht «gefragt» — sonst verschwand er, 1. Lauf 05.10.: 3 Zeilen weg, vereinigt).
            print(f"{h[:58]:58} {p['status']:7} {'-':>11}  nicht ACTIVE, nicht bei CJ gefragt", flush=True)
            uebersprungen.add(h)
            continue
        sku = (p["variants"]["nodes"] or [{}])[0].get("sku") or ""
        # 22.09.2026: Nicht-CJ-Ware (Printful-POD «9000001_4011», Fortura CH-Lager, eigene
        # Buendel LX-) hat keine CJ-Frage zu beantworten — vorher landete «shirt-eidgenoss»
        # als «unklar (1602001 Product not found)» im Bericht: eine Absage von der falschen
        # Adresse (Lehre 09.08./21.09.). Diese Ware gilt hier als lieferbar (CH-Lager/POD).
        if re.fullmatch(r"\d{6,8}_\d{4,6}", sku) or sku.startswith(("fortura-", "LX-", "lx-")) or not sku.upper().startswith("CJ"):   # 05.10.: alle drei CJ-SKU-Formen beginnen mit «CJ» (CJ-pid, CJ-UUID, CJxx…); Prodigi «GLOBAL-FAP-A4» landete sonst als «unklar»   # 05.10.: Printful «9000001_10163» hat 5 Stellen nach dem Strich — galt als CJ und wurde «unklar»
            print(f"{h[:58]:58} {p['status']:7} {'ja':>11}  kein CJ-Artikel (POD/CH-Lager), nicht bei CJ gefragt", flush=True)
            ok += 1
            ledger_schreiben(h, "ja", "kein CJ-Artikel (POD/CH-Lager)", sku)
            continue
        urteil, grund = versandfaehig(sku)
        if isinstance(grund, tuple):          # versandfaehig gibt bei «ja» (Text, Fracht-USD)
            grund = grund[0]
        if urteil is False and "KEINE Versandoption" in str(grund):
            # 05.10.: Ein einzelnes NEIN kann ein CJ-Aussetzer in genau dieser Sekunde sein. Eine zweite
            # Messung 15 s spaeter kostet einen Aufruf und trennt «widerspruechlich» (→ unklar, kein Befund)
            # von einem belastbaren NEIN. Die Zwei-Laeufe-Regel der Vollstreckung bleibt zusaetzlich bestehen.
            time.sleep(15)
            urteil2, grund2 = versandfaehig(sku)
            if urteil2 is True:
                urteil, grund = None, f"widerspruechlich: 1. Messung {grund} / 2. Messung {grund2[0] if isinstance(grund2, tuple) else grund2}"
            elif urteil2 is False:
                grund = f"{grund} · 2. Messung bestaetigt"
        zeichen = {True: "ja", False: "NEIN", None: "unklar"}[urteil]
        print(f"{h[:58]:58} {p['status']:7} {zeichen:>11}  {grund}", flush=True)
        ledger_schreiben(h, zeichen, grund, sku)       # SOFORT — ein sterbender Lauf verliert nur ein Produkt
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
    vorher = set(alt_zeilen)               # Urteile frueherer Laeufe (fuer die Zwei-Laeufe-Regel der Vollstreckung)
    gefragt = {h for h in handles} - uebersprungen
    for h in gefragt:                      # dieser Lauf hat geurteilt: alter Eintrag faellt
        alt_zeilen.pop(h, None)
    for h, st, g, sku in befunde:          # … und wird durch das neue Urteil ersetzt
        alt_zeilen[h] = [h, st, g, sku]
    if DRY:
        print("\nDRY=1 — Register dropship/_besuchte_seiten_nicht_lieferbar.txt NICHT geschrieben (ein Probelauf zaehlt nicht als Lauf)")
    else:
      with open(reg, "w") as f:
        for teile in sorted(alt_zeilen.values()):
            f.write("\t".join(teile) + "\n")
    print(f"\n→ dropship/_besuchte_seiten_nicht_lieferbar.txt "
          f"({len(alt_zeilen)} Zeilen gesamt, davon {len(befunde)} aus diesem Lauf)")
    vollstrecken(befunde, vorher)
    if DRY:
        print("DRY=1 — Politur (Faktenblock-Prio, du-Form) uebersprungen")
    else:
        politur(handles)
    # Schlusszeile fuer still_gestorben(): fehlt sie, holt der Aufseher den Lauf nach (bis 3x/Tag).
    print(f"FERTIG: {len(handles)} gefragt · lieferbar {ok} · NEIN {len(befunde)} · unklar {len(unklar)} · "
          f"{rest} offen fuer den naechsten Lauf", flush=True)


TAG_KEINE_CH = "cj-keine-ch-versandoption"
BERICHT = os.path.join(REPO, "dropship", "BESUCHTE-SEITEN-NICHT-LIEFERBAR.md")


def vollstrecken(befunde, vorher):
    """22.09.2026 (Verbesserungsrunde): der Wächter meldete «KEINE Versandoption» nur — der Gesundheits-Tracker-Ring
    stand seit dem 18.09. ACTIVE im Register, wurde besucht und kommt nicht in die Schweiz (die #1016/#1017-Klasse).
    Ein Urteil, das niemand vollstreckt, ist keine Sicherung. Regel: ein ACTIVES Produkt wird auf DRAFT gesetzt,
    wenn ZWEI unabhängige Läufe NEIN sagen (heute UND schon im Register vom letzten Lauf) — ein einzelnes NEIN kann
    ein CJ-Aussetzer sein; der Kanarienvogel (#1018) schützt nur vor dem globalen Ausfall. Tag `cj-keine-ch-versandoption`,
    Notiz mit Grund, Rücklesen; Bericht in dropship/BESUCHTE-SEITEN-NICHT-LIEFERBAR.md. Rückholbar: Tag entfernen + ACTIVE."""
    heute = time.strftime("%Y-%m-%d")
    zeilen, n_draft, n_warte = [], 0, 0
    for h, st, g, sku in befunde:
        if st != "ACTIVE":
            continue
        if h not in vorher:
            n_warte += 1
            zeilen.append(f"| `{h}` | ⏳ erstes NEIN ({heute}) — Draft beim nächsten NEIN | {g} | `{sku}` |")
            continue
        if DRY:
            n_warte += 1
            print(f"   DRY: wuerde DRAFT setzen: /products/{h} ({g})", flush=True)
            continue
        q = '{products(first:1, query:"handle:%s"){nodes{id status tags}}}' % h
        try:
            p = shopify(q)["data"]["products"]["nodes"][0]
            tags = sorted(set((p.get("tags") or []) + [TAG_KEINE_CH]))
            r = shopify('mutation($i:ProductInput!){productUpdate(input:$i){product{status tags} userErrors{message}}}',
                        {"i": {"id": p["id"], "status": "DRAFT", "tags": tags}})
            pu = (r.get("data") or {}).get("productUpdate") or {}
            back = pu.get("product") or {}
            if pu.get("userErrors") or back.get("status") != "DRAFT" or TAG_KEINE_CH not in (back.get("tags") or []):
                zeilen.append(f"| `{h}` | ❌ Draft FEHLGESCHLAGEN: {pu.get('userErrors')} | {g} | `{sku}` |")
                continue
            n_draft += 1
            zeilen.append(f"| `{h}` | ✅ DRAFT gesetzt {heute} (zweites NEIN) | {g} | `{sku}` |")
            print(f"   → DRAFT: /products/{h} ({g})", flush=True)
        except Exception as e:  # noqa: BLE001
            zeilen.append(f"| `{h}` | ❌ Fehler {type(e).__name__}: {str(e)[:80]} | {g} | `{sku}` |")
    if befunde and not DRY:
        neu = not os.path.exists(BERICHT)
        with open(BERICHT, "a") as f:
            if neu:
                f.write("# Besuchte Seiten ohne CH-Versandoption — Vollstreckung\n\nQuelle: `automation/besuchte_seiten_lieferbar.py`. "
                        "DRAFT erst nach zwei unabhängigen NEIN (zwei Läufe). Rückholen: Tag `cj-keine-ch-versandoption` entfernen, ACTIVE setzen.\n\n"
                        "| Handle | Stand | Grund | SKU |\n|---|---|---|---|\n")
            for z in zeilen:
                f.write(z + "\n")
    print(f"VOLLSTRECKUNG: {n_draft} auf DRAFT · {n_warte} warten auf das zweite NEIN")


SIE = re.compile(r"\b(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b")
FAKT = re.compile(r'class="(ls-produktdetails|ls-feed-details|gmc-details)"|<h4>Details</h4>')


def politur(handles):
    """Was eine besuchte Seite sonst noch braucht — ohne dass eine Session es von Hand tut.

    22.09.2026: Drei Runden «mach alles besser» haben dieselben zwei Handgriffe an besuchten
    Seiten wiederholt: Faktenblock nachtragen (Prio-Liste fuer cj_specs_backfill.mjs, laeuft
    taeglich) und Sie-Form auf du (Regelwerk `um()` aus kollektionstexte_du_form). Beides
    ist deterministisch — also gehoert es in DIESEN Waechter, der die besuchten Seiten ohnehin
    jeden Tag holt. Schreiben nur unter /tmp/lock_produkttext.lock, Ruecklesen, nie still.
    """
    try:
        sys.path.insert(0, os.path.join(REPO, "automation"))
        from kollektionstexte_du_form import um
    except Exception as e:                                        # noqa: BLE001
        print(f"\nPolitur uebersprungen — um() nicht ladbar: {e}"); return
    prio = os.path.join(REPO, "dropship", "_cj_specs_prio.txt")
    done = os.path.join(REPO, "dropship", "_cj_specs_done.txt")
    bekannt = set()
    for pf in (prio, done):
        if os.path.exists(pf):
            bekannt |= {z.split("\t")[0] for z in open(pf) if z.strip()}
    heute = time.strftime("%Y-%m-%d")
    fakt_neu, du_neu, fehler = 0, 0, 0
    import fcntl
    with open("/tmp/lock_produkttext.lock", "w") as lk:
        try:
            fcntl.flock(lk, fcntl.LOCK_EX)
        except Exception as e:                                    # noqa: BLE001
            print(f"\nPolitur uebersprungen — Textlock nicht zu bekommen: {e}"); return
        for h in handles:
            try:
                q = ('{products(first:1, query:"handle:%s"){nodes{id status descriptionHtml '
                     'variants(first:1){nodes{sku}}}}}' % h)
                nodes = shopify(q)["data"]["products"]["nodes"]
                if not nodes or nodes[0]["status"] != "ACTIVE":
                    continue
                p = nodes[0]; html = p["descriptionHtml"] or ""
                sku = (p["variants"]["nodes"] or [{}])[0].get("sku") or ""
                if sku.upper().startswith("CJ") and h not in bekannt and not FAKT.search(html):
                    with open(prio, "a") as f:
                        f.write(f"{h}\tbesucht-{heute}\n")
                    bekannt.add(h); fakt_neu += 1
                if SIE.search(re.sub(r"<[^>]+>", " ", html)):
                    neu = um(html)
                    if neu != html:
                        r = shopify('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}',
                                    {"i": {"id": p["id"], "descriptionHtml": neu}})
                        pu = (r.get("data") or {}).get("productUpdate") or {}
                        if pu.get("userErrors") or (pu.get("product") or {}).get("descriptionHtml") != neu:
                            fehler += 1; print(f"   Politur {h}: du-Form NICHT geschrieben {pu.get('userErrors')}")
                        else:
                            du_neu += 1
            except Exception as e:                                # noqa: BLE001
                fehler += 1; print(f"   Politur {h}: {type(e).__name__}: {str(e)[:80]}")
            time.sleep(0.3)
    print(f"\nPOLITUR: {fakt_neu} in die Faktenblock-Prio, {du_neu} auf du, {fehler} Fehler")


if __name__ == "__main__":
    main()
