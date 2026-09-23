#!/usr/bin/env python3
"""judgeme_fake_wache.py — taeglicher LESE-Waechter gegen unechte Bewertungen bei Judge.me.

WARUM (22.09.2026): Die Gegenpruefung fand Judge.me-Bewertung 1335720164 — 5 Sterne, Name «Test»,
Text «Probelauf», Shop-Ebene (product_external_id 0), created 14.09. 20:06Z — VEROEFFENTLICHT und
als einzige Shop-Bewertung des Kontos in der Startseiten-Zahl mitgezaehlt. Angelegt hatte sie eine
fremde Session mit dem OEFFENTLICHEN Token (POST 201; derselbe Token liest nicht: GET 403).
Hausregel: NIE Fake-Reviews (UWG Art. 3). Ein Treffer ohne Waechter ist ein Treffer fuer eine Woche.

GEMESSEN 22.09.2026 (Judge.me API v1, privater Token):
  · /reviews/count → 10'381; /reviews liefert hoechstens per_page=100 (500 angefragt → 100) UND klemmt
    `page` bei 100 fest (Seite 103/104/105/200 liefern identisch current_page 100) → ueber die reine
    Liste sind nur 10'000 Bewertungen erreichbar. Deshalb wird je `rating` (1..5) paginiert — jede
    Teilmenge liegt unter 10'000 (5★ = 9'356); ist eine Teilmenge groesser, meldet die Wache
    «unvollstaendig» statt Vollstaendigkeit vorzutaeuschen.
  · Die API kennt KEIN DELETE (docs.yaml: /reviews/{id} nur GET, reviews/{id} nur PUT {curated};
    DELETE-Gegenprobe → HTTP 404 «page not found»). «Loeschen» heisst per API: PUT curated=spam
    (= Judge.me «Hide»); danach published=false. Endgueltig loeschen kann nur der Betreiber im
    Judge.me-Admin (Reviews → Papierkorb).
  · Stichprobe 400 Bewertungen (4 Seiten): 399 Adressen @luxestyle.ch — das sind die SYNTHETISCHEN
    Adressen unserer Importer (`cj-import@luxestyle.ch`, `importiert+xxxx@luxestyle.ch`). Das
    Adress-Kriterium muss sie ausnehmen, sonst zaehlt die Wache den ganzen Bestand als verdaechtig.
    397 Namen sind maskiert («C***t»), 3 nicht («Test», zwei CJ-Nutzernamen wie «UKStyleStore»).

REGELN (nur lesen, nichts schreiben — Befund gehoert vor einen Menschen):
  HART (zaehlt in der Ampel-Zeile, nur veroeffentlichte):
    · product_external_id 0/leer  → Shop-Bewertung; wir sammeln keine, echte Kunden schreiben Produkte
    · Titel oder Text ist ein Testwort (Test, Probelauf, asdf, Lorem …) oder beginnt mit «Lorem ipsum»
    · Absenderadresse = Betreiber (ENV JUDGEME_BETREIBER_MAILS, kommagetrennt, NIE im Repo),
      oder eine @luxestyle.ch-Adresse, die NICHT dem Importer-Muster entspricht, oder eine
      Beispiel-/Testdomain (example.*, *.invalid, *.test, *.local, localhost)
  WEICH (eigene Zahl, nur Bericht): Reviewer-Name unmaskiert (kein «*», nicht «Verifizierter Kaeufer»)
    — das sind CJ-Nutzernamen, die der Importer nicht maskiert hat; die API kann Texte/Namen
    «for authenticity reason» nicht aendern, nur ausblenden. Entscheid = Mensch.
  FREIGABE: dropship/_judgeme_freigabe.txt (eine ID je Zeile, Rest der Zeile = Grund) — von einem
    Menschen geprueft, wird nicht mehr gezaehlt, bleibt aber im Bericht sichtbar.
AUSGABE: Bericht dropship/JUDGEME-WACHE.md, eine Ampel-Zeile «JUDGEME: N verdaechtig …», FERTIG-Zeile.
Bei Fehlern «JUDGEME: unklar (…)» — nie «0 verdaechtig» aus einer Nicht-Messung. Exit immer 0.
ENV: PER_PAGE (100) · CAP_SEITEN (400) · JUDGEME_ENV (/tmp/judgeme.env) · JUDGEME_BETREIBER_MAILS
"""
import datetime, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, "dropship", "JUDGEME-WACHE.md")
FREIGABE = os.path.join(REPO, "dropship", "_judgeme_freigabe.txt")
ENV_DATEI = os.environ.get("JUDGEME_ENV", "/tmp/judgeme.env")
API = "https://judge.me/api/v1"
PER_PAGE = int(os.environ.get("PER_PAGE", "100"))
CAP_SEITEN = int(os.environ.get("CAP_SEITEN", "400"))
SHOP = "au3j0y-hq.myshopify.com"
TOKPFAD = "/tmp/cj_shop_token.txt"

TESTWORTE = {"test", "testbewertung", "testreview", "probelauf", "probe", "asdf", "asdfasdf", "lorem",
             "lorem ipsum", "qwertz", "qwerty", "1234", "12345", "abc", "xyz", "hallo test", "test test"}
# GEMESSEN 23.09.: der CJ-Importer schreibt `cj-import@` UND `cj-import+<zufall>@` (Plus-Suffix je Reviewer);
# das erste Muster kannte nur die nackte Form → 1'331 Fehlalarme im ersten Lauf.
IMPORT_ADRESSE = re.compile(r"^(cj-import(\+[a-z0-9]+)?|importiert\+[a-z0-9]+)@luxestyle\.ch$", re.I)
TESTDOMAIN = re.compile(r"(^|\.)(example\.(com|org|net|invalid)|invalid|test|local|localhost)$", re.I)
NAME_OK = {"verifizierter käufer", "verifizierter kaeufer", "verified buyer", "anonym", "anonymous"}

VORGANG = """## Vorgang 22.09.2026 — die Testbewertung

| Feld | Wert (GET mit privatem Token, 22.09. 23:52Z) |
|---|---|
| ID | 1335720164 |
| rating / title / body | 5 / `null` / «Probelauf» |
| reviewer | name «Test», E-Mail auf `example.invalid`, source `web`, verified `nothing` |
| product_external_id | 0 (= Shop-Bewertung, «Judge.me Shop Reviews») |
| created / updated | 2026-09-14T20:06:17Z / 20:30:34Z |
| VORHER | published `true`, curated `ok`, hidden `false` |
| DELETE-Versuch | HTTP 404 «page not found» — die API bietet kein DELETE (docs.yaml) |
| Massnahme | PUT `reviews/1335720164` `{"curated":"spam"}` → 200 «Action performed successful» |
| NACHHER (frischer GET 23:55Z) | published **false**, curated **spam**, hidden false |

Shopify-Metafelder `judgeme` VOR der Massnahme (23:50Z): `shop_reviews_count` **1** (updatedAt 14.09. 20:30:36Z),
`shop_reviews_rating` 5.00, `all_reviews_count` **10'375**, `reviews_grid.metafield_updated_at` 22.09.
Judge.me schreibt sie zeitverzoegert; der Waechter unten liest sie bei jedem Lauf mit — sobald
`shop_reviews_count` auf 0 steht, ist die Zahl auf der Startseite bereinigt.
**Endgueltig loeschen** (Papierkorb) geht nur im Judge.me-Admin — Betreiber-Klick, kein API-Weg.
"""


def lade_env():
    """Liest `export K=V`-Zeilen aus /tmp/judgeme.env; die Prozessumgebung gewinnt."""
    werte = {}
    try:
        for zeile in open(ENV_DATEI, encoding="utf-8"):
            zeile = zeile.strip()
            if not zeile or zeile.startswith("#"):
                continue
            zeile = re.sub(r"^export\s+", "", zeile)
            k, _, v = zeile.partition("=")
            werte[k.strip()] = v.strip().strip("'\"")
    except OSError:
        pass
    werte.update({k: v for k, v in os.environ.items() if k.startswith("JUDGEME_")})
    return werte


def hole(url, versuche=4):
    """GET mit Wartezeit bei 429/5xx/Netzfehler; wirft nach dem letzten Versuch."""
    letzter = None
    for i in range(versuche):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "luxestyle-judgeme-wache/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            letzter = e
            if e.code in (401, 403, 404):
                raise
        except Exception as e:                      # Netz/Timeout/JSON
            letzter = e
        time.sleep(3 * (i + 1))
    raise RuntimeError(f"Judge.me antwortet nicht: {letzter}")


def norm(s):
    s = (s or "").strip().lower()
    s = re.sub(r"[^\w\s]", " ", s, flags=re.U)
    return re.sub(r"\s+", " ", s).strip()


def maskiere_mail(em):
    lok, _, dom = (em or "").partition("@")
    if not dom:
        return "(leer)" if not em else "(ohne @)"
    return f"{lok[:2]}…@{dom}"


def lade_freigabe():
    frei = {}
    try:
        for zeile in open(FREIGABE, encoding="utf-8"):
            zeile = zeile.strip()
            if not zeile or zeile.startswith("#"):
                continue
            teile = zeile.split(None, 1)
            if teile[0].isdigit():
                frei[teile[0]] = teile[1] if len(teile) > 1 else ""
    except OSError:
        pass
    return frei


def pruefe(r, betreiber):
    """Gibt (harte_gruende, weiche_gruende) fuer eine Bewertung zurueck."""
    hart, weich = [], []
    rv = r.get("reviewer") or {}
    name = (rv.get("name") or "").strip()
    mail = (rv.get("email") or "").strip().lower()
    pid = r.get("product_external_id")
    if pid in (0, "0", None, ""):
        hart.append("ohne Produkt (Shop-Bewertung)")
    for feld in ("title", "body"):
        n = norm(r.get(feld))
        if n and (n in TESTWORTE or n.startswith("lorem ipsum")):
            hart.append(f"{feld} = Testwort «{(r.get(feld) or '').strip()[:30]}»")
    if norm(name) in TESTWORTE:
        hart.append(f"Name = Testwort «{name[:30]}»")
    if mail:
        lok, _, dom = mail.partition("@")
        if mail in betreiber:
            hart.append("Absender = Betreiber-Adresse")
        elif dom == "luxestyle.ch" and not IMPORT_ADRESSE.match(mail):
            hart.append(f"Hausadresse {maskiere_mail(mail)} (kein Importer-Muster)")
        elif dom and TESTDOMAIN.search(dom):
            hart.append(f"Testdomain {dom}")
    if name and "*" not in name and norm(name) not in NAME_OK and norm(name) not in TESTWORTE:
        weich.append(f"Name unmaskiert «{name[:30]}»")
    return hart, weich


def shopify_judgeme_metafelder():
    """Best-effort: die Zahlen, die Judge.me in den Shop schreibt (was die Startseite zeigt)."""
    try:
        tok = open(TOKPFAD).read().strip()
        q = '{ shop { metafields(namespace:"judgeme", first:50){ nodes{ key value updatedAt } } } }'
        req = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
                                     data=json.dumps({"query": q}).encode(),
                                     headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=40) as r:
            d = json.loads(r.read())
        aus = {}
        for n in d["data"]["shop"]["metafields"]["nodes"]:
            if n["key"] in ("shop_reviews_count", "shop_reviews_rating", "all_reviews_count", "all_reviews_rating"):
                aus[n["key"]] = (n["value"], n["updatedAt"])
            if n["key"] == "reviews_grid":
                try:
                    aus["reviews_grid.metafield_updated_at"] = (json.loads(n["value"]).get("metafield_updated_at"), n["updatedAt"])
                except Exception:
                    pass
        return aus
    except Exception as e:
        return {"fehler": (str(e)[:120], "")}


def zeile_fuer(r, gruende, frei):
    rv = r.get("reviewer") or {}
    body = re.sub(r"\s+", " ", (r.get("body") or "")).strip()[:60]
    pid = r.get("product_external_id") or 0
    zust = "veröffentlicht" if r.get("published") else f"ausgeblendet (curated {r.get('curated')})"
    fr = f" · FREIGABE: {frei[str(r['id'])] or 'ohne Grund'}" if str(r.get("id")) in frei else ""
    return (f"| {r.get('id')} | {str(r.get('created_at') or '')[:16]} | {r.get('rating')} | {pid} | "
            f"{(rv.get('name') or '')[:24]} | {maskiere_mail(rv.get('email'))} | «{body}» | {zust} | "
            f"{'; '.join(gruende)}{fr} |")


def main():
    start = datetime.datetime.now(datetime.timezone.utc)
    env = lade_env()
    tok, dom = env.get("JUDGEME_PRIVATE_TOKEN"), env.get("JUDGEME_SHOP_DOMAIN")
    if not tok or not dom:
        print(f"JUDGEME: unklar (kein privater Token/Shop-Domain in {ENV_DATEI})")
        print("FERTIG: 0 geprüft (kein Zugang)")
        return
    betreiber = {m.strip().lower() for m in env.get("JUDGEME_BETREIBER_MAILS", "").split(",") if m.strip()}
    frei = lade_freigabe()
    basis = {"api_token": tok, "shop_domain": dom}
    try:
        gesamt = int(hole(f"{API}/reviews/count?" + urllib.parse.urlencode(basis)).get("count") or 0)
    except Exception as e:
        print(f"JUDGEME: unklar (count: {str(e)[:100]})")
        print("FERTIG: 0 geprüft (count fehlgeschlagen)")
        return

    gelesen, seiten, ids = 0, 0, set()
    harte, weiche, ausgeblendet, freigegeben = [], [], [], []
    fehler, klemmen = None, []
    for rating in (1, 2, 3, 4, 5):
        for seite in range(1, CAP_SEITEN + 1):
            try:
                d = hole(f"{API}/reviews?" + urllib.parse.urlencode(
                    {**basis, "per_page": PER_PAGE, "page": seite, "rating": rating}))
            except Exception as e:
                fehler = f"rating {rating} Seite {seite}: {str(e)[:100]}"
                break
            revs = d.get("reviews") or []
            seiten += 1
            neu = 0
            for r in revs:
                if str(r.get("id")) in ids:      # Liste ist «neueste zuerst»; der Importer schiebt waehrend des Laufs
                    continue
                ids.add(str(r.get("id")))
                gelesen += 1
                neu += 1
                hart, weich = pruefe(r, betreiber)
                if not hart and not weich:
                    continue
                if str(r.get("id")) in frei:
                    freigegeben.append((r, hart + weich))
                elif not r.get("published"):
                    ausgeblendet.append((r, hart + weich))
                elif hart:
                    harte.append((r, hart + weich))
                else:
                    weiche.append((r, weich))
            geklemmt = int(d.get("current_page") or seite) < seite      # API gibt Seite 100 nochmals
            if geklemmt:                       # ZUERST pruefen: die Wiederholung bringt 0 neue IDs und saehe sonst wie ein sauberes Ende aus
                klemmen.append(f"rating {rating} >{seite - 1} Seiten (API-Deckel page=100)")
                break
            if len(revs) < PER_PAGE or neu == 0:
                break
            time.sleep(0.2)
        else:
            klemmen.append(f"rating {rating} >{CAP_SEITEN} Seiten (CAP_SEITEN)")
        if fehler:
            break

    mf = shopify_judgeme_metafelder()
    vollst = gelesen >= gesamt - 5 and not klemmen   # count kann waehrend des Laufs wachsen (Importer)
    if klemmen and not fehler:
        fehler = "unvollstaendig: " + "; ".join(klemmen)
    if fehler:
        ampel = (f"JUDGEME: unklar ({fehler}) · bis dahin {len(harte)} verdaechtig · {len(weiche)} Namen unmaskiert "
                 f"· {gelesen} von {gesamt} gelesen")
    else:
        ampel = (f"JUDGEME: {len(harte)} verdaechtig · {len(weiche)} Namen unmaskiert · {len(ausgeblendet)} ausgeblendet "
                 f"· {gelesen} von {gesamt} gelesen" + ("" if vollst else " ⚠️ unvollstaendig"))
    kopf = "| ID | erstellt | ★ | Produkt-ID | Name | E-Mail (maskiert) | Text | Zustand | Gruende |\n|---|---|---|---|---|---|---|---|---|"
    def tabelle(liste, deckel=300):
        if not liste:
            return "_keine_"
        zeilen = [zeile_fuer(r, g, frei) for r, g in liste[:deckel]]
        rest = f"\n… und {len(liste) - deckel} weitere (Deckel {deckel})" if len(liste) > deckel else ""
        return kopf + "\n" + "\n".join(zeilen) + rest
    mf_zeilen = "\n".join(f"| {k} | {v[0]} | {v[1]} |" for k, v in sorted(mf.items())) or "| – | – | – |"
    text = f"""# Judge.me-Wache — unechte Bewertungen (nur lesen)

Stand: {start.strftime('%Y-%m-%d %H:%M')} UTC · Skript `automation/judgeme_fake_wache.py` (taeglich im Aufseher) · Dauer {int((datetime.datetime.now(datetime.timezone.utc) - start).total_seconds())} s

**{ampel}**

Hausregel: NIE Fake-Reviews (UWG). Die Wache LIEST nur — jeder Befund ist ein Entscheid fuer einen Menschen:
ausblenden = `PUT https://judge.me/api/v1/reviews/<id>` mit `{{"curated":"spam"}}` (privater Token + shop_domain),
loeschen = Judge.me-Admin. Geprueft und in Ordnung → ID in `dropship/_judgeme_freigabe.txt` (ID, Leerzeichen, Grund).

## Regeln
- **hart** (Ampel-Zahl, nur veroeffentlichte): ohne Produkt (Shop-Bewertung) · Titel/Text/Name = Testwort ({', '.join(sorted(TESTWORTE)[:8])}, …) · Absender = Betreiber-Adresse (ENV `JUDGEME_BETREIBER_MAILS`, {len(betreiber)} hinterlegt) · @luxestyle.ch ohne Importer-Muster (`cj-import@`, `importiert+…@`) · Testdomain (example.*, *.invalid, *.test).
- **weich** (eigene Zahl): Reviewer-Name unmaskiert — die Importer maskieren («C***t»), CJ-Nutzernamen ohne Leerzeichen blieben roh. Die API kann Namen/Texte nicht aendern («for authenticity reason»), nur ausblenden.
- Paginierung: je rating 1..5, per_page {PER_PAGE} (Deckel der API), page klemmt bei 100 (gemessen) → je Teilmenge max. 10'000; Stopp bei kurzer Seite, ohne neue IDs oder Klemme; `/reviews/count` als Gegenzahl. Fehler/Klemme → «unklar»/«unvollstaendig», nie «0».

{VORGANG}
## Shopify-Metafelder `judgeme` (was die Startseite zeigt; Judge.me schreibt zeitverzoegert)

| Feld | Wert | updatedAt |
|---|---|---|
{mf_zeilen}

## Harte Befunde — veroeffentlicht ({len(harte)})

{tabelle(harte)}

## Namen unmaskiert — veroeffentlicht ({len(weiche)})

{tabelle(weiche, 200)}

## Bereits ausgeblendet / unveroeffentlicht mit Befund ({len(ausgeblendet)})

{tabelle(ausgeblendet, 100)}

## Freigegeben durch Menschen ({len(freigegeben)})

{tabelle(freigegeben, 100)}
"""
    os.makedirs(os.path.dirname(BERICHT), exist_ok=True)
    tmp = BERICHT + ".teil"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, BERICHT)
    print(ampel)
    print(f"FERTIG: {gelesen} geprüft ({seiten} Seiten, count {gesamt}), {len(harte)} hart, {len(weiche)} weich, "
          f"{len(ausgeblendet)} ausgeblendet, {len(freigegeben)} freigegeben" + (f", FEHLER: {fehler}" if fehler else ""))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:                      # nie mit Traceback sterben: «unklar» ist der Befund
        print(f"JUDGEME: unklar ({type(e).__name__}: {str(e)[:120]})")
        print("FERTIG: abgebrochen")
    sys.exit(0)
