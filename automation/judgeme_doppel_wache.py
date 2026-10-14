#!/usr/bin/env python3
"""judgeme_doppel_wache.py — doppelt importierte Lieferanten-Bewertungen bei Judge.me finden und ausblenden.

WARUM (14.10.2026, Verbesserungsrunde 20:25, Workflow wf_3c125add-ef9 mit Gegenprobe):
  `cj_reviews_import.mjs` prüfte vor dem POST nur sein lokales Ledger, nie Judge.me selbst. Liefen zwei Instanzen
  oder ging das Ledger verloren (Snapshot-Rewind), wurde derselbe CJ-Kommentar ein zweites oder drittes Mal gepostet,
  jedes Mal neu übersetzt («Sehr einfach zu installieren» → «Super einfach zu montieren»).
  GEMESSEN: 296 Doppel unter 11'513 veröffentlichten Bewertungen auf 67 Produkten. Auf den 59 aktiven davon waren
  277 von 591 Bewertungen Kopien (47 %). Beispiele: Teleskop-Organizer 10 = 5 × 2, Laufshirt 17 = 5 + 6 + 6,
  Hunde-Winterjacke 24 = 8 × 3. `reviews.rating_count` geht als ratingCount/reviewCount in die strukturierten Daten
  (sections/product-information.liquid) → Kundinnen UND Google sahen eine aufgeblähte Zahl. Hausregel: NIE Fake-Reviews
  (UWG Art. 3). Eine Kopie zählt eine Stimme doppelt.

REGEL (geeicht 14.10. an ALLEN 273 Kandidaten gegen die Autorennamen im Widget, Workflow wf_45efc012-356:
  272 richtig, 1 falsch gepaart, 0 echte Stimme verloren; danach die fünf bestätigten Schwächen behoben):
  · NUR IMPORTIERTE: Kopie UND Vorlage tragen eine Importer-Adresse (IMPORT_ADRESSE aus judgeme_fake_wache). Eine echte
    Kundenbewertung wird nie ausgeblendet und nie als Vorlage benutzt.
  · LAUF = Bewertungen desselben Produkts, deren Zeitstempel höchstens LUECKE_S (3 s) auseinanderliegen. Gemessen:
    10'856 von 11'022 Lücken 0–1 s, 116 bei 2 s; mit 8 s verschmolzen zwei Importläufe 7–8 s auseinander (16 verpasst).
  · ÄHNLICHKEIT = max(difflib a→b, b→a) mit autojunk=False (mit autojunk sanken neu übersetzte Texte ab 200 Zeichen
    auf 0,17–0,41, ohne auf 0,50–0,87 — 10 verpasst, dazu 8 der Quarz-Uhr).
  · Eine Bewertung eines SPÄTEREN Laufs ist KOPIE, wenn gleiches Produkt, gleiche Sterne, Ähnlichkeit ≥ AEHNLICH (0,6).
    Zuordnung BESTER TREFFER ZUERST (alle Paare des Laufs absteigend; Gleichstand → gleiche Position im Lauf), eins zu
    eins: jede GRUPPE (Vorlage + bisherige Kopien) nimmt je späterem Lauf höchstens EINE Kopie auf.
  · Der Lauf muss als WIEDERHOLUNG erkennbar sein: m = n (bei n = 1 nur mit Ähnlichkeit ≥ 0,9 oder ≥ 12 Zeichen), ODER
    m ≥ 2 und m/n ≥ 0,5, ODER Einzeltreffer ≥ 0,9 bei ≥ 25 Zeichen. Ein Nachhol-Lauf mit NEUEN Kommentaren und einem
    zufällig ähnlichen Kurztext («Top! 👍» ↔ «ok top 👍», 1 von 8) bleibt unangetastet.
  · Innerhalb EINES Laufs wird nie ausgeblendet («Perfekt, robust …» stammt dort von zwei Autoren) — fast wortgleiche
    lange Paare (≥ 0,9, ≥ 60 Zeichen) stehen im Bericht zur menschlichen Entscheidung.
  · Von jeder Gruppe bleibt die FRÜHESTE VERÖFFENTLICHTE stehen. Ist die Vorlage ausgeblendet und eine Kopie
    veröffentlicht, bleibt die Kopie stehen (keine Stimme verschwindet ganz). Ausgeblendete werden nie angefasst.
  · FREIGABE: dropship/_judgeme_doppel_freigabe.txt (eine Review-ID je Zeile, Rest = Grund) → nie ausblenden.
  · Bekannte Lücke: kurze Umschreibungen unter 0,6 («Hervorragend.» ↔ «Ausgezeichnet.») bleiben stehen.
  · Autorenwahrheit gibt es NUR im Widget (Metafeld judgeme.review_widget_ssr_html; zuordnen über Sterne + Sekunde +
    Text). Das API-Feld reviewer.name taugt nicht: 690 von 709 Bewertungen tragen dort «C***t».

SCHREIBEN (nur mit FIX=1): PUT /reviews/<id> {"curated":"spam"} (= Judge.me «Hide»; die API kennt kein DELETE —
  siehe judgeme_fake_wache.py). Danach GET zurücklesen: published muss false sein. Rückweg: {"curated":"ok"}.
  · Kanarienvogel: die ERSTE Ausblendung wird zurückgelesen; ist sie nicht wirksam → Abbruch ohne weitere Schreibung.
  · Bremsen: höchstens CAP (400) je Lauf; mehr als ANTEIL_MAX (8 %) der gelesenen veröffentlichten Bewertungen als
    Kopie erkannt → die Regel ist kaputt → nur melden, nichts schreiben.
  · Ledger dropship/_judgeme_doppel.tsv (je Ausblendung eine Zeile, Datei je Zeile geöffnet).

LESEN: GET /reviews je Sternstufe, per_page 100, Seiten bis 100 (die API klemmt `page` bei 100 → je Stufe höchstens
  10'000; sort/order/created_at_max werden ignoriert, gemessen 14.10.). Ist eine Stufe gedeckelt, wird sie zusätzlich je
  reviewer_id gelesen (der Importer-Rezensent hat 9'753 Bewertungen mit 5★, unter dem Deckel). Bleibt ein Rest, steht im
  Bericht «unvollständig (n nicht lesbar)» — nie Vollständigkeit vortäuschen. Ein Dump trägt seine Unvollständigkeit mit.

AUSGABE: erste Zeile «START …», Ampel-Zeile «JUDGEME-DOPPEL: …», letzte Zeile «FERTIG rc=…» (Aufseher: still_gestorben).
  Bericht dropship/JUDGEME-DOPPEL.md.
ENV: FIX=1 (schreiben) · CAP (400) · JUDGEME_ENV (/tmp/judgeme.env) · DUMP=<pfad> (gelesene Bewertungen als JSON ablegen)
     · AUS_DUMP=<pfad> (statt der API einen Dump lesen; nur Messung, schreibt nie)
SELBSTTEST: python3 automation/judgeme_doppel_wache.py --selbsttest (ohne Netz)
"""
import collections, datetime, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from difflib import SequenceMatcher

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from judgeme_fake_wache import lade_env, hole, IMPORT_ADRESSE  # noqa: E402  (Modul startet nichts beim Import)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, "dropship", "JUDGEME-DOPPEL.md")
LEDGER = os.path.join(REPO, "dropship", "_judgeme_doppel.tsv")
FREIGABE = os.path.join(REPO, "dropship", "_judgeme_doppel_freigabe.txt")
API = "https://judge.me/api/v1"
SHOP = "au3j0y-hq.myshopify.com"
LUECKE_S = 3
AEHNLICH = 0.6
FAST_GLEICH = 0.9
FAST_GLEICH_MIN_ZEICHEN = 25
EINZEL_MIN_ZEICHEN = 12
INNERHALB_MIN_ZEICHEN = 60
LAENGEN_SCHRANKE = 0.42   # ratio ≤ 2·min/(a+b): unter 0,43 Längenverhältnis kann 0,6 nie erreicht werden
CAP = int(os.environ.get("CAP", "400"))
ANTEIL_MAX = 0.08


# ── Regel (rein, ohne Netz) ────────────────────────────────────────────────────────────────────────────────────
def text_norm(t):
    t = (t or "").lower()
    t = re.sub(r"\s+", " ", t)
    return re.sub(r"[^a-zäöüß0-9 ]", "", t).strip()


def zeit(s):
    return datetime.datetime.fromisoformat(str(s).replace("Z", "+00:00")).timestamp()


def veroeffentlicht(r):
    return bool(r.get("published")) and (r.get("curated") in (None, "ok"))


def aehnlich(a, b):
    """max beider Richtungen, autojunk aus (siehe Kopf). a, b schon normalisiert."""
    if not a or not b:
        return 0.0
    if min(len(a), len(b)) / max(len(a), len(b)) < LAENGEN_SCHRANKE:
        return 0.0
    return max(SequenceMatcher(None, a, b, autojunk=False).ratio(), SequenceMatcher(None, b, a, autojunk=False).ratio())


def ist_import(r):
    """Fehlt das Feld (alter Dump), gilt die Bewertung als importiert — der Live-Lauf setzt es immer."""
    return r.get("import", True)


def finde_doppel(bewertungen):
    """bewertungen: Dicts mit id, pext, rating, body, t (ISO), published, curated[, import].
    Rückgabe: (kopien, innerhalb) — kopien = [{id, vorlage, sim, lauf_m, lauf_n, pext}], innerhalb = [(a, b, sim)]."""
    je_produkt = collections.defaultdict(list)
    for r in bewertungen:
        if r.get("t"):
            je_produkt[r["pext"]].append(r)
    kopien, innerhalb = [], []
    for pext, rs in je_produkt.items():
        rs = sorted(rs, key=lambda r: (zeit(r["t"]), r["id"]))
        norm_von = {r["id"]: text_norm(r["body"]) for r in rs}
        lauf, letzte, laeufe = 0, None, collections.defaultdict(list)
        for r in rs:
            t = zeit(r["t"])
            if letzte is not None and t - letzte > LUECKE_S:
                lauf += 1
            letzte = t
            laeufe[lauf].append(r)
        lauf_von = {r["id"]: L for L, liste in laeufe.items() for r in liste}
        pos_von = {r["id"]: i for liste in laeufe.values() for i, r in enumerate(liste)}
        # Innerhalb eines Laufs nur melden (lange, fast wortgleiche Paare)
        for liste in laeufe.values():
            for i, x in enumerate(liste):
                for y in liste[i + 1:]:
                    if x["rating"] == y["rating"] and min(len(norm_von[x["id"]]), len(norm_von[y["id"]])) >= INNERHALB_MIN_ZEICHEN:
                        s = aehnlich(norm_von[x["id"]], norm_von[y["id"]])
                        if s >= FAST_GLEICH:
                            innerhalb.append((x["id"], y["id"], round(s, 3)))
        eltern = {}

        def wurzel(x):
            while eltern.setdefault(x, x) != x:
                eltern[x] = eltern[eltern[x]]
                x = eltern[x]
            return x
        for L in sorted(laeufe):
            if L == 0:
                continue
            frueher = [e for e in rs if lauf_von[e["id"]] < L and ist_import(e) and norm_von[e["id"]]]
            paare = []
            for r in laeufe[L]:
                nr = norm_von[r["id"]]
                if not nr or not ist_import(r):
                    continue
                for e in frueher:
                    if e["rating"] != r["rating"]:
                        continue
                    sim = aehnlich(nr, norm_von[e["id"]])
                    if sim >= AEHNLICH:
                        paare.append((round(sim, 2), -abs(pos_von[r["id"]] - pos_von[e["id"]]), sim, r, e))
            paare.sort(key=lambda x: (x[0], x[1]), reverse=True)        # bester Treffer zuerst, Gleichstand → Position
            r_benutzt, w_benutzt, treffer = set(), set(), []
            for _, _, sim, r, e in paare:
                w = wurzel(e["id"])
                if r["id"] in r_benutzt or w in w_benutzt:
                    continue
                r_benutzt.add(r["id"])
                w_benutzt.add(w)
                treffer.append((r, e, sim))
            n, m = len(laeufe[L]), len(treffer)
            for r, e, sim in treffer:
                laenge = len(norm_von[r["id"]])
                if n == 1:
                    wiederholung = sim >= FAST_GLEICH or laenge >= EINZEL_MIN_ZEICHEN
                else:
                    wiederholung = (m == n) or (m >= 2 and m / n >= 0.5) or \
                        (sim >= FAST_GLEICH and laenge >= FAST_GLEICH_MIN_ZEICHEN)
                if wiederholung:
                    kopien.append({"id": r["id"], "vorlage": e["id"], "sim": round(sim, 3), "lauf_m": m, "lauf_n": n,
                                   "pext": pext})
                    eltern[wurzel(r["id"])] = wurzel(e["id"])
    return kopien, innerhalb


def gruppen(kopien):
    """Vereinigt Vorlage→Kopie-Ketten zu Gruppen (Union-Find)."""
    eltern = {}

    def wurzel(x):
        while eltern.setdefault(x, x) != x:
            eltern[x] = eltern[eltern[x]]
            x = eltern[x]
        return x
    for k in kopien:
        a, b = wurzel(k["id"]), wurzel(k["vorlage"])
        if a != b:
            eltern[a] = b
    g = collections.defaultdict(set)
    for x in list(eltern):
        g[wurzel(x)].add(x)
    return [s for s in g.values() if len(s) > 1]


def auszublenden(bewertungen, kopien, freigabe=frozenset()):
    """Je Gruppe bleibt die früheste VERÖFFENTLICHTE stehen; die übrigen veröffentlichten werden ausgeblendet."""
    nach_id = {r["id"]: r for r in bewertungen}
    weg = []
    for g in gruppen(kopien):
        pub = sorted((nach_id[i] for i in g if i in nach_id and veroeffentlicht(nach_id[i])),
                     key=lambda r: (zeit(r["t"]), r["id"]))
        for r in pub[1:]:
            if r["id"] not in freigabe:
                weg.append((r["id"], pub[0]["id"]))
    return weg


# ── Netz ───────────────────────────────────────────────────────────────────────────────────────────────────────
def basis(env):
    return {"api_token": env["JUDGEME_PRIVATE_TOKEN"], "shop_domain": env.get("JUDGEME_SHOP_DOMAIN", SHOP)}


def _eintrag(x):
    rv = x.get("reviewer") or {}
    return {"id": x["id"], "pext": x.get("product_external_id"), "rating": x.get("rating"), "body": x.get("body") or "",
            "t": x.get("created_at"), "published": x.get("published"), "curated": x.get("curated"),
            "handle": x.get("product_handle") or "", "titel": x.get("product_title") or "",
            "import": bool(IMPORT_ADRESSE.match(rv.get("email") or "")), "rid": rv.get("id")}


def _seiten(b, alle, **filter_):
    """Liest bis zu 100 Seiten; gibt (neu gelesen, gedeckelt?) zurück."""
    neu_ges = 0
    for seite in range(1, 101):
        d = hole(f"{API}/reviews?" + urllib.parse.urlencode({**b, "per_page": 100, "page": seite, **filter_}))
        rs = d.get("reviews") or []
        neu = 0
        for x in rs:
            if x["id"] not in alle:
                alle[x["id"]] = _eintrag(x)
                neu += 1
        neu_ges += neu
        if len(rs) < 100 or neu == 0:
            return neu_ges, False
    return neu_ges, True


def lesen(env):
    b = basis(env)
    alle, unvollstaendig = {}, {}
    for stufe in (1, 2, 3, 4, 5):
        try:
            soll = hole(f"{API}/reviews/count?" + urllib.parse.urlencode({**b, "rating": stufe})).get("count")
        except Exception:
            soll = None
        _, gedeckelt = _seiten(b, alle, rating=stufe)
        ist = sum(1 for r in alle.values() if r["rating"] == stufe)
        if gedeckelt or (isinstance(soll, int) and soll > ist):
            # je Rezensent nachlesen (jede Scheibe unter dem Seitendeckel)
            for rid in sorted({r["rid"] for r in alle.values() if r["rating"] == stufe and r["rid"]}):
                _seiten(b, alle, rating=stufe, reviewer_id=rid)
            ist = sum(1 for r in alle.values() if r["rating"] == stufe)
            if isinstance(soll, int):
                if soll > ist:
                    unvollstaendig[stufe] = soll - ist
            else:
                unvollstaendig[stufe] = "unbekannt"
    return list(alle.values()), unvollstaendig


def ausblenden(env, rid):
    """PUT curated=spam, bei 429/5xx bis 4× mit Wartezeit. Rückgabe 'ok' | 'put-fehl:<grund>' | 'ruecklesen-fehl:<grund>'."""
    b = basis(env)
    url = f"{API}/reviews/{rid}?" + urllib.parse.urlencode(b)
    grund = ""
    for v in range(4):
        try:
            req = urllib.request.Request(url, data=json.dumps({"curated": "spam"}).encode(), method="PUT",
                                         headers={"Content-Type": "application/json", "User-Agent": "luxestyle-judgeme-doppel/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                r.read()
            grund = ""
            break
        except urllib.error.HTTPError as e:
            grund = f"HTTP {e.code}"
            if e.code not in (429, 500, 502, 503, 504):
                break
        except Exception as e:                       # Netz/Timeout
            grund = type(e).__name__.replace("Error", "Fehl")
        time.sleep(3 * (v + 1))
    if grund:
        return f"put-fehl:{grund}"
    try:
        zur = hole(url)
    except Exception as e:
        return "ruecklesen-fehl:" + type(e).__name__.replace("Error", "Fehl")
    rv = zur.get("review") or zur
    if (not rv.get("published")) and rv.get("curated") == "spam":
        return "ok"
    return f"ruecklesen-fehl:published={rv.get('published')} curated={rv.get('curated')}"


def ledger_zeile(*felder):
    with open(LEDGER, "a", encoding="utf-8") as f:              # je Zeile öffnen (git-Merge ersetzt die Datei)
        f.write("\t".join(str(x) for x in felder) + "\n")


def lade_freigabe():
    ids = set()
    try:
        for z in open(FREIGABE, encoding="utf-8"):
            m = re.match(r"\s*(\d+)", z)
            if m:
                ids.add(int(m.group(1)))
    except OSError:
        pass
    return ids


# ── Bericht ────────────────────────────────────────────────────────────────────────────────────────────────────
def vollstaendigkeit(unvoll):
    if unvoll is None:
        return "Vollständigkeit unbekannt (Dump ohne Angabe)."
    if not unvoll:
        return "Vollständig gelesen."
    return "**Unvollständig:** " + ", ".join(f"{s}★ {n} nicht lesbar (API-Seitendeckel)" for s, n in sorted(unvoll.items()))


def bericht(jetzt, bew, unvoll, kopien, innerhalb, weg, geschrieben, fix, stopp):
    nach_id = {r["id"]: r for r in bew}
    pub = [r for r in bew if veroeffentlicht(r)]
    je_prod = collections.Counter(nach_id[k]["handle"] or str(nach_id[k]["pext"]) for k, _ in weg)
    z = [f"# Judge.me — doppelt importierte Bewertungen · Stand {jetzt}", "",
         f"Gelesen: {len(bew)} Bewertungen, davon {len(pub)} veröffentlicht. " + vollstaendigkeit(unvoll),
         "", f"- Kopien erkannt (Regel im Skriptkopf `automation/judgeme_doppel_wache.py`): **{len(kopien)}**",
         f"- davon veröffentlicht und auszublenden: **{len(weg)}** auf **{len(je_prod)}** Produkten",
         f"- fast wortgleiche lange Paare INNERHALB eines Laufs (nur gemeldet, nie ausgeblendet): {len(innerhalb)}",
         f"- Modus: {'FIX — ausgeblendet ' + str(geschrieben) if fix else 'nur gemessen'}" + (f" · **STOPP:** {stopp}" if stopp else ""),
         "", "## Produkte mit den meisten Kopien", "", "| Produkt | Kopien |", "|---|---:|"]
    z += [f"| {h} | {n} |" for h, n in je_prod.most_common(25)]
    z += ["", "## Stichprobe zum Nachprüfen (Kopie ↔ bleibt stehen)", ""]
    for rid, bleibt in weg[:15]:
        a, b = nach_id[rid], nach_id[bleibt]
        z.append(f"- {a['handle']} ★{a['rating']} · `{rid}` «{a['body'][:70]}» ↔ `{bleibt}` «{b['body'][:70]}»")
    if innerhalb:
        z += ["", "## Zur Entscheidung: fast wortgleich im SELBEN Lauf (≥ 0,9, ≥ 60 Zeichen)", "",
              "Gemessen 14.10. am Widget: 6 von 6 prüfbaren Paaren stammen von VERSCHIEDENEN Autoren (CJ führt denselben "
              "Text unter mehreren Käufern). Darum wird hier nie automatisch ausgeblendet. Ein Mensch "
              "entscheidet am Widget (Autor gleich = Kopie → `PUT curated=spam`; verschieden → in die Freigabe-Datei).", ""]
        for x, y, sim in innerhalb[:20]:
            z.append(f"- {nach_id[x]['handle']} · `{x}` ↔ `{y}` ({sim}) «{nach_id[x]['body'][:80]}»")
    z += ["", "Rückweg je Bewertung: `PUT https://judge.me/api/v1/reviews/<id>` mit `{\"curated\":\"ok\"}`. "
          "Ausnahmen dauerhaft: `dropship/_judgeme_doppel_freigabe.txt`. Ledger: `dropship/_judgeme_doppel.tsv`.", ""]
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write("\n".join(z))


def main():
    jetzt = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    aus_dump = os.environ.get("AUS_DUMP")
    fix = os.environ.get("FIX") == "1" and not aus_dump
    env = lade_env()
    if not aus_dump and not env.get("JUDGEME_PRIVATE_TOKEN"):
        print("JUDGEME-DOPPEL: unklar (kein privater Token in /tmp/judgeme.env)")
        return 2
    try:
        if aus_dump:
            d = json.load(open(aus_dump, encoding="utf-8"))
            if isinstance(d, dict):
                bew, unvoll = d.get("bewertungen") or [], {int(k): v for k, v in (d.get("unvollstaendig") or {}).items()}
            else:
                bew, unvoll = d, None
        else:
            bew, unvoll = lesen(env)
        if os.environ.get("DUMP"):
            json.dump({"stand": jetzt, "unvollstaendig": unvoll, "bewertungen": bew},
                      open(os.environ["DUMP"], "w", encoding="utf-8"), ensure_ascii=False)
        kopien, innerhalb = finde_doppel(bew)
        weg = auszublenden(bew, kopien, lade_freigabe())
    except Exception as e:
        print(f"JUDGEME-DOPPEL: unklar — {type(e).__name__.replace('Error', 'Fehl')}: {str(e)[:120]}")
        return 2
    pub_n = sum(1 for r in bew if veroeffentlicht(r))
    stopp, geschrieben = "", 0
    if pub_n and len(weg) / pub_n > ANTEIL_MAX:
        stopp = f"{len(weg)} von {pub_n} veröffentlichten als Kopie erkannt (> {ANTEIL_MAX:.0%}) — Regel prüfen, nichts geschrieben"
    if fix and not stopp:
        nach_id = {r["id"]: r for r in bew}
        folge = 0
        for i, (rid, bleibt) in enumerate(weg[:CAP]):
            ergebnis = ausblenden(env, rid)
            r = nach_id[rid]
            ledger_zeile(jetzt, rid, r["pext"], r["handle"], r["rating"], bleibt,
                         "ausgeblendet" if ergebnis == "ok" else ergebnis)
            if ergebnis == "ok":
                geschrieben += 1
                folge = 0
            else:
                folge += 1
                print(f"  Fehlschlag {rid}: {ergebnis}")
                if i == 0:
                    stopp = f"Kanarienvogel: erste Ausblendung nicht wirksam ({ergebnis}) — Abbruch"
                    break
                if folge >= 3:
                    stopp = f"3 Fehlschläge in Folge (zuletzt {ergebnis}) — Abbruch"
                    break
            time.sleep(0.4)
        if len(weg) > CAP and not stopp:
            stopp = f"CAP {CAP} erreicht, {len(weg) - CAP} beim nächsten Lauf"
    bericht(jetzt, bew, unvoll, kopien, innerhalb, weg, geschrieben, fix, stopp)
    prod_weg = {r["pext"] for r in bew if r["id"] in {i for i, _ in weg}}
    if unvoll is None:
        teil = " · Vollständigkeit unbekannt (Dump)"
    elif unvoll:
        teil = " · unvollständig (" + ", ".join(f"{s}★ {n}" for s, n in sorted(unvoll.items())) + " nicht lesbar)"
    else:
        teil = ""
    inn = ""   # Paare im selben Lauf nur im Bericht: am Widget 6 von 6 verschiedene Autoren (CJ führt gleiche Texte mehrfach)
    if fix:
        print(f"JUDGEME-DOPPEL: {geschrieben} ausgeblendet von {len(weg)} veröffentlichten Kopien"
              f" ({len(prod_weg)} Produkte){teil}{inn}" + (f" · STOPP: {stopp}" if stopp else ""))
    else:
        print(f"JUDGEME-DOPPEL: {len(weg)} veröffentlichte Kopien auf {len(prod_weg)} Produkten{teil}{inn}"
              + (f" · STOPP: {stopp}" if stopp else "") + " · nur gemessen (FIX=1 blendet aus)")
    return 0


# ── Selbsttest ─────────────────────────────────────────────────────────────────────────────────────────────────
def selbsttest():
    def r(i, p, st, body, t, pub=True, cur="ok", imp=True):
        return {"id": i, "pext": p, "rating": st, "body": body, "t": f"2026-09-22T11:{t}+00:00", "published": pub,
                "curated": cur, "handle": f"p{p}", "import": imp}
    faelle = []
    a = [r(1, 10, 5, "Sehr einfach zu installieren und stabil.", "10:00"), r(2, 10, 5, "Gute Qualität, schnelle Lieferung.", "10:01"),
         r(3, 10, 4, "Farbe etwas heller als auf dem Bild.", "10:02"),
         r(4, 10, 5, "Super einfach zu montieren und stabil.", "10:40"), r(5, 10, 5, "Gute Qualität und schnelle Lieferung.", "10:41"),
         r(6, 10, 4, "Die Farbe ist etwas heller als auf dem Bild.", "10:42")]
    faelle.append(("A Wiederholungslauf", a, {4, 5, 6}))
    b = [r(11, 20, 5, "Perfekt, robust und erfüllen ihren Zweck.", "20:00"), r(12, 20, 5, "Perfekt, robust und erfüllen ihren Zweck.", "20:01")]
    faelle.append(("B gleicher Text im selben Lauf", b, set()))
    c = [r(21, 30, 5, "Top! 👍", "30:00"), r(22, 30, 5, "Bequem und warm.", "30:01"),
         r(23, 30, 5, "ok top 👍", "40:00"), r(24, 30, 2, "Naht nach einer Woche gerissen.", "40:01"),
         r(25, 30, 3, "Grösse fällt klein aus, eine Nummer grösser nehmen.", "40:02"), r(26, 30, 1, "Kam nie an.", "40:03")]
    faelle.append(("C neuer Lauf mit Zufallsähnlichkeit", c, set()))
    d = [r(31, 40, 2, "Der Reissverschluss klemmt ständig.", "50:00", pub=False, cur="spam"),
         r(32, 40, 2, "Der Reissverschluss klemmt dauernd.", "51:00")]
    faelle.append(("D Vorlage ausgeblendet", d, set()))
    e = [r(41, 50, 5, "Warm und gut verarbeitet, Hund mag sie.", "52:00"), r(42, 50, 5, "Passt perfekt.", "52:01"),
         r(43, 50, 5, "Warm und gut verarbeitet, der Hund mag sie.", "53:00"), r(44, 50, 5, "Passt perfekt!", "53:01"),
         r(45, 50, 5, "Warm, gut verarbeitet, mein Hund mag sie.", "54:00"), r(46, 50, 5, "Passt perfekt.", "54:01")]
    faelle.append(("E dreifach", e, {43, 44, 45, 46}))
    f = [r(51, 60, 5, "Sehr gut dehnbar.", "55:00"), r(52, 60, 5, "Sehr gut dehnbar.", "57:00")]
    faelle.append(("F Einzel-Lauf wiederholt", f, {52}))
    g = [r(61, 70, 5, "Alles wie beschrieben.", "58:00"), r(62, 70, 3, "Alles wie beschrieben.", "59:00")]
    faelle.append(("G andere Sterne", g, set()))
    lang1 = ("Ich habe dieses Ladegerät für mein Auto gekauft und bin sehr zufrieden damit. Es lädt mein Telefon schnell auf, "
             "sitzt fest im Anschluss und wird auch bei längeren Fahrten nicht heiss. Die Verarbeitung wirkt solide.")
    lang2 = ("Ich habe dieses Ladegerät fürs Auto gekauft und bin sehr zufrieden. Es lädt mein Handy schnell, sitzt fest in "
             "der Buchse und wird auch auf langen Fahrten nicht heiss. Die Verarbeitung macht einen soliden Eindruck.")
    h = [r(71, 80, 5, lang1, "01:00"), r(72, 80, 5, lang2, "01:50")]
    faelle.append(("I Neuübersetzung über 200 Zeichen", h, {72}))
    j = [r(81, 90, 5, "Weich und warm.", "02:00"), r(82, 90, 5, "Gut verpackt.", "02:01"),
         r(83, 90, 5, "Weich und warm!", "02:08"), r(84, 90, 5, "Gut verpackt!", "02:09")]
    faelle.append(("J zwei Läufe 7 s auseinander", j, {83, 84}))
    k = [r(91, 91, 5, "Sieht super aus, wie von Guzema!", "03:00"), r(92, 91, 5, "Tolle Qualität und sieht super aus!", "03:01"),
         r(93, 91, 5, "Sieht super aus und die Qualität ist top!", "03:30"), r(94, 91, 5, "Sieht super aus, wie von Guzema!", "03:31")]
    # 93 ist eine Umschreibung von 92 unter 0,6 → bleibt (bekannte Lücke); vorher nahm die Zeitreihenfolge 93 ↔ 91 (0,6)
    # und liess die wortgleiche 94 stehen (Eichung 14.10.: 1346883386/1346883389).
    faelle.append(("K bester Treffer zuerst", k, {94}))
    m = [r(101, 92, 5, "Perfekt! Danke!", "04:00"), r(102, 92, 5, "Perfekt,", "04:30")]
    faelle.append(("L Ein-Bewertungs-Lauf mit Kurztext", m, set()))
    n_ = [r(111, 93, 5, "Hält super, sehr empfehlenswert.", "05:00", imp=False), r(112, 93, 5, "Hält super, sehr empfehlenswert.", "05:40")]
    faelle.append(("M echte Kundenbewertung als Vorlage", n_, set()))
    o = [r(121, 94, 5, "Sehr gut.", "06:00"), r(122, 94, 5, "Schön warm.", "06:01"),
         r(123, 94, 5, "Sehr gut.", "06:30"), r(124, 94, 5, "Schön warm.", "06:31"),
         r(125, 94, 5, "Sehr gut.", "07:00"), r(126, 94, 5, "Sehr gut!", "07:01"), r(127, 94, 5, "Schön warm.", "07:02")]
    faelle.append(("N 3. Lauf: neue Käuferin mit gleichem Kurztext bleibt", o, {123, 124, 125, 127}))
    fehler = 0
    for name, bew, soll in faelle:
        kopien, _ = finde_doppel(bew)
        ist = {i for i, _ in auszublenden(bew, kopien)}
        ok = ist == soll
        fehler += not ok
        print(f"  {'✅' if ok else '❌'} {name}: ausblenden {sorted(ist)} (Soll {sorted(soll)})")
    kopien, _ = finde_doppel(a)
    ist = {i for i, _ in auszublenden(a, kopien, frozenset({5}))}
    ok = ist == {4, 6}
    fehler += not ok
    print(f"  {'✅' if ok else '❌'} H Freigabe-Datei: ausblenden {sorted(ist)} (Soll [4, 6])")
    print("SELBSTTEST:", "ok" if not fehler else f"{fehler} Fehler")
    return 0 if not fehler else 1


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    sys.stdout.reconfigure(line_buffering=True)
    print(f"START {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} judgeme_doppel_wache FIX={os.environ.get('FIX', '0')}")
    rc = main()
    print(f"FERTIG rc={rc} {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")
    sys.exit(rc)
