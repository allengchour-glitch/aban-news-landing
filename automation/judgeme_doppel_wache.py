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

REGEL (an der Stichprobe gegen die Autorennamen im Widget geeicht, siehe dropship/JUDGEME-DOPPEL.md):
  · LAUF = Bewertungen desselben Produkts, deren Zeitstempel höchstens LUECKE_S (8 s) auseinanderliegen
    (der Importer postet alle Kommentare eines Produkts mit 700 ms Abstand).
  · Eine Bewertung eines SPÄTEREN Laufs ist KOPIE einer früheren, wenn: gleiches Produkt, gleiche Sterne,
    Text-Ähnlichkeit ≥ AEHNLICH (0,6, difflib auf normalisiertem Text). Jede frühere Bewertung dient je späterem
    Lauf höchstens EINER Kopie als Vorlage (eins zu eins — zwei Käufer mit gleichem Kurztext bleiben zwei).
  · Der Lauf muss als WIEDERHOLUNG erkennbar sein, sonst zählt der Treffer nicht:
      alle Bewertungen des Laufs haben eine Vorlage (m = n), ODER mindestens 2 und mindestens die Hälfte (m ≥ 2,
      m/n ≥ 0,5), ODER der einzelne Treffer ist fast wortgleich (≥ 0,9) bei mindestens 25 Zeichen.
    Ein späterer Lauf mit NEUEN Kommentaren (Nachhol-Lauf 24.09. mit 1–3★) und einem zufällig ähnlichen Kurztext
    («Top! 👍» ↔ «ok top 👍», 1 von 8) wird damit nicht angefasst.
  · Innerhalb EINES Laufs wird nie ausgeblendet («Perfekt, robust …» stammt dort von zwei Autoren) — nur gezählt.
  · Von jeder Gruppe (Vorlage + Kopien) bleibt die FRÜHESTE VERÖFFENTLICHTE stehen. Ist die Vorlage ausgeblendet
    und eine Kopie veröffentlicht, bleibt die Kopie stehen (keine Stimme verschwindet ganz).
  · Ausgeblendete (curated ≠ ok / published false) werden nie angefasst.
  · FREIGABE: dropship/_judgeme_doppel_freigabe.txt (eine Review-ID je Zeile, Rest = Grund) → nie ausblenden.

SCHREIBEN (nur mit FIX=1): PUT /reviews/<id> {"curated":"spam"} (= Judge.me «Hide»; die API kennt kein DELETE —
  siehe judgeme_fake_wache.py). Danach GET zurücklesen: published muss false sein. Rückweg: {"curated":"ok"}.
  · Kanarienvogel: die ERSTE Ausblendung wird zurückgelesen; ist sie nicht wirksam → Abbruch ohne weitere Schreibung.
  · Bremsen: höchstens CAP (400) je Lauf; mehr als ANTEIL_MAX (8 %) der gelesenen veröffentlichten Bewertungen als
    Kopie erkannt → die Regel ist kaputt → nur melden, nichts schreiben.
  · Ledger dropship/_judgeme_doppel.tsv (je Ausblendung eine Zeile, Datei je Zeile geöffnet).

LESEN: GET /reviews je Sternstufe, per_page 100, Seiten bis 100 (die API klemmt `page` bei 100 → je Stufe höchstens
  10'000). Ist eine Stufe grösser, steht im Bericht «unvollständig (n nicht lesbar)» — nie Vollständigkeit vortäuschen.

AUSGABE: erste Zeile «START …», Ampel-Zeile «JUDGEME-DOPPEL: …», letzte Zeile «FERTIG rc=…» (Aufseher: still_gestorben).
  Bericht dropship/JUDGEME-DOPPEL.md.
ENV: FIX=1 (schreiben) · CAP (400) · JUDGEME_ENV (/tmp/judgeme.env) · DUMP=<pfad> (gelesene Bewertungen als JSON ablegen)
     · AUS_DUMP=<pfad> (statt der API einen Dump lesen; nur Messung, schreibt nie)
SELBSTTEST: python3 automation/judgeme_doppel_wache.py --selbsttest (ohne Netz)
"""
import collections, datetime, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from difflib import SequenceMatcher

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from judgeme_fake_wache import lade_env, hole  # noqa: E402  (Modul startet nichts beim Import)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BERICHT = os.path.join(REPO, "dropship", "JUDGEME-DOPPEL.md")
LEDGER = os.path.join(REPO, "dropship", "_judgeme_doppel.tsv")
FREIGABE = os.path.join(REPO, "dropship", "_judgeme_doppel_freigabe.txt")
API = "https://judge.me/api/v1"
SHOP = "au3j0y-hq.myshopify.com"
LUECKE_S = 8
AEHNLICH = 0.6
FAST_GLEICH = 0.9
FAST_GLEICH_MIN_ZEICHEN = 25
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


def finde_doppel(bewertungen):
    """bewertungen: Dicts mit id, pext, rating, body, t (ISO), published, curated.
    Rückgabe: (kopien, innerhalb) — kopien = [{id, vorlage, sim, lauf_m, lauf_n, pext}], innerhalb = Paare im selben Lauf."""
    je_produkt = collections.defaultdict(list)
    for r in bewertungen:
        je_produkt[r["pext"]].append(r)
    kopien, innerhalb = [], []
    for pext, rs in je_produkt.items():
        rs = sorted(rs, key=lambda r: (zeit(r["t"]), r["id"]))
        lauf, letzte, laeufe = 0, None, collections.defaultdict(list)
        for r in rs:
            t = zeit(r["t"])
            if letzte is not None and t - letzte > LUECKE_S:
                lauf += 1
            letzte = t
            laeufe[lauf].append(r)
        lauf_von = {r["id"]: L for L, liste in laeufe.items() for r in liste}
        # Innerhalb eines Laufs nur zählen
        for liste in laeufe.values():
            for i, a in enumerate(liste):
                for b in liste[i + 1:]:
                    if a["rating"] == b["rating"] and text_norm(a["body"]) and \
                            SequenceMatcher(None, text_norm(a["body"]), text_norm(b["body"])).ratio() >= FAST_GLEICH:
                        innerhalb.append((a["id"], b["id"]))
        for L in sorted(laeufe):
            if L == 0:
                continue
            frueher = [e for e in rs if lauf_von[e["id"]] < L]
            benutzt, treffer = set(), []
            for r in laeufe[L]:
                nr = text_norm(r["body"])
                if not nr:
                    continue
                best = None
                for e in frueher:
                    if e["rating"] != r["rating"] or e["id"] in benutzt:
                        continue
                    ne = text_norm(e["body"])
                    if not ne:
                        continue
                    s = SequenceMatcher(None, nr, ne).ratio()
                    if s >= AEHNLICH and (best is None or s > best[0]):
                        best = (s, e)
                if best:
                    benutzt.add(best[1]["id"])
                    treffer.append((r, best[1], best[0]))
            n, m = len(laeufe[L]), len(treffer)
            for r, e, s in treffer:
                wiederholung = (m == n) or (m >= 2 and m / n >= 0.5) or \
                    (s >= FAST_GLEICH and len(text_norm(r["body"])) >= FAST_GLEICH_MIN_ZEICHEN)
                if wiederholung:
                    kopien.append({"id": r["id"], "vorlage": e["id"], "sim": round(s, 3), "lauf_m": m, "lauf_n": n,
                                   "pext": pext})
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


def lesen(env):
    b = basis(env)
    alle, unvollstaendig = {}, {}
    for stufe in (1, 2, 3, 4, 5):
        try:
            soll = hole(f"{API}/reviews/count?" + urllib.parse.urlencode({**b, "rating": stufe})).get("count")
        except Exception:
            soll = None
        gelesen = 0
        for seite in range(1, 101):
            d = hole(f"{API}/reviews?" + urllib.parse.urlencode({**b, "per_page": 100, "page": seite, "rating": stufe}))
            rs = d.get("reviews") or []
            neu = 0
            for x in rs:
                if x["id"] in alle:
                    continue
                neu += 1
                gelesen += 1
                alle[x["id"]] = {"id": x["id"], "pext": x.get("product_external_id"), "rating": x.get("rating"),
                                 "body": x.get("body") or "", "t": x.get("created_at"), "published": x.get("published"),
                                 "curated": x.get("curated"), "handle": x.get("product_handle") or "",
                                 "titel": x.get("product_title") or ""}
            if len(rs) < 100 or neu == 0:
                break
        if isinstance(soll, int) and soll > gelesen:
            unvollstaendig[stufe] = soll - gelesen
    return list(alle.values()), unvollstaendig


def ausblenden(env, rid):
    b = basis(env)
    url = f"{API}/reviews/{rid}?" + urllib.parse.urlencode(b)
    req = urllib.request.Request(url, data=json.dumps({"curated": "spam"}).encode(), method="PUT",
                                 headers={"Content-Type": "application/json", "User-Agent": "luxestyle-judgeme-doppel/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        r.read()
    zur = hole(url)
    rv = zur.get("review") or zur
    return (not rv.get("published")) and rv.get("curated") == "spam"


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
def bericht(jetzt, bew, unvoll, kopien, innerhalb, weg, geschrieben, fix, stopp):
    nach_id = {r["id"]: r for r in bew}
    pub = [r for r in bew if veroeffentlicht(r)]
    je_prod = collections.Counter(nach_id[k]["handle"] or str(nach_id[k]["pext"]) for k, _ in weg)
    z = [f"# Judge.me — doppelt importierte Bewertungen · Stand {jetzt}", "",
         f"Gelesen: {len(bew)} Bewertungen, davon {len(pub)} veröffentlicht. "
         + ("Vollständig." if not unvoll else "**Unvollständig:** " + ", ".join(f"{s}★ {n} nicht lesbar (API-Seitendeckel)" for s, n in sorted(unvoll.items()))),
         "", f"- Kopien erkannt (Regel im Skriptkopf): **{len(kopien)}**",
         f"- davon veröffentlicht und auszublenden: **{len(weg)}** auf **{len(je_prod)}** Produkten",
         f"- gleichartige Paare INNERHALB eines Laufs (nur gezählt, nie ausgeblendet): {len(innerhalb)}",
         f"- Modus: {'FIX — ausgeblendet ' + str(geschrieben) if fix else 'nur gemessen'}" + (f" · **STOPP:** {stopp}" if stopp else ""),
         "", "## Produkte mit den meisten Kopien", "", "| Produkt | Kopien |", "|---|---:|"]
    z += [f"| {h} | {n} |" for h, n in je_prod.most_common(25)]
    z += ["", "## Stichprobe zum Nachprüfen (Kopie ↔ bleibt stehen)", ""]
    for rid, bleibt in weg[:15]:
        a, b = nach_id[rid], nach_id[bleibt]
        z.append(f"- {a['handle']} ★{a['rating']} · `{rid}` «{a['body'][:70]}» ↔ `{bleibt}` «{b['body'][:70]}»")
    z += ["", "Rückweg je Bewertung: `PUT https://judge.me/api/v1/reviews/<id>` mit `{\"curated\":\"ok\"}`. "
          "Ausnahmen dauerhaft: `dropship/_judgeme_doppel_freigabe.txt`.", ""]
    with open(BERICHT, "w", encoding="utf-8") as f:
        f.write("\n".join(z))


def main():
    jetzt = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    fix = os.environ.get("FIX") == "1" and not os.environ.get("AUS_DUMP")
    env = lade_env()
    if not os.environ.get("AUS_DUMP") and not env.get("JUDGEME_PRIVATE_TOKEN"):
        print("JUDGEME-DOPPEL: unklar (kein privater Token in /tmp/judgeme.env)")
        return 2
    try:
        if os.environ.get("AUS_DUMP"):
            bew, unvoll = json.load(open(os.environ["AUS_DUMP"], encoding="utf-8")), {}
        else:
            bew, unvoll = lesen(env)
    except Exception as e:
        print(f"JUDGEME-DOPPEL: unklar — {type(e).__name__}: {e}")
        return 2
    if os.environ.get("DUMP"):
        json.dump(bew, open(os.environ["DUMP"], "w", encoding="utf-8"), ensure_ascii=False)
    kopien, innerhalb = finde_doppel(bew)
    weg = auszublenden(bew, kopien, lade_freigabe())
    pub_n = sum(1 for r in bew if veroeffentlicht(r))
    stopp, geschrieben = "", 0
    if pub_n and len(weg) / pub_n > ANTEIL_MAX:
        stopp = f"{len(weg)} von {pub_n} veröffentlichten als Kopie erkannt (> {ANTEIL_MAX:.0%}) — Regel prüfen, nichts geschrieben"
    if fix and not stopp:
        nach_id = {r["id"]: r for r in bew}
        for i, (rid, bleibt) in enumerate(weg[:CAP]):
            try:
                ok = ausblenden(env, rid)
            except Exception as e:
                ok = False
                print(f"  Fehler {rid}: {type(e).__name__}: {e}")
            r = nach_id[rid]
            ledger_zeile(jetzt, rid, r["pext"], r["handle"], r["rating"], bleibt, "ausgeblendet" if ok else "FEHLER")
            if ok:
                geschrieben += 1
            elif i == 0:
                stopp = "Kanarienvogel: erste Ausblendung nicht wirksam (zurückgelesen) — Abbruch"
                break
            time.sleep(0.4)
        if len(weg) > CAP:
            stopp = (stopp + " · " if stopp else "") + f"CAP {CAP} erreicht, {len(weg) - CAP} beim nächsten Lauf"
    bericht(jetzt, bew, unvoll, kopien, innerhalb, weg, geschrieben, fix, stopp)
    prod_weg = {r["pext"] for r in bew if r["id"] in {i for i, _ in weg}}
    teil = f" · unvollständig ({sum(unvoll.values())} nicht lesbar)" if unvoll else ""
    if fix:
        print(f"JUDGEME-DOPPEL: {geschrieben} ausgeblendet von {len(weg)} veröffentlichten Kopien"
              f" ({len(prod_weg)} Produkte){teil}" + (f" · STOPP: {stopp}" if stopp else ""))
    else:
        print(f"JUDGEME-DOPPEL: {len(weg)} veröffentlichte Kopien auf {len(prod_weg)} Produkten{teil}"
              + (f" · STOPP: {stopp}" if stopp else "") + " · nur gemessen (FIX=1 blendet aus)")
    return 1 if (weg and not fix) or stopp else 0


# ── Selbsttest ─────────────────────────────────────────────────────────────────────────────────────────────────
def selbsttest():
    def r(i, p, st, body, t, pub=True, cur="ok"):
        return {"id": i, "pext": p, "rating": st, "body": body, "t": f"2026-09-22T11:{t}+00:00", "published": pub,
                "curated": cur, "handle": f"p{p}"}
    faelle = []
    # A: Lauf von 3, 40 s später neu übersetzt wiederholt → 3 Kopien
    a = [r(1, 10, 5, "Sehr einfach zu installieren und stabil.", "10:00"), r(2, 10, 5, "Gute Qualität, schnelle Lieferung.", "10:01"),
         r(3, 10, 4, "Farbe etwas heller als auf dem Bild.", "10:02"),
         r(4, 10, 5, "Super einfach zu montieren und stabil.", "10:40"), r(5, 10, 5, "Gute Qualität und schnelle Lieferung.", "10:41"),
         r(6, 10, 4, "Die Farbe ist etwas heller als auf dem Bild.", "10:42")]
    faelle.append(("A Wiederholungslauf", a, {4, 5, 6}))
    # B: gleicher Kurztext zweier Autoren im SELBEN Lauf → nichts
    b = [r(11, 20, 5, "Perfekt, robust und erfüllen ihren Zweck.", "20:00"), r(12, 20, 5, "Perfekt, robust und erfüllen ihren Zweck.", "20:01")]
    faelle.append(("B gleicher Text im selben Lauf", b, set()))
    # C: späterer Lauf mit NEUEN Kommentaren + ein zufällig ähnlicher Kurztext (1 von 4) → nichts
    c = [r(21, 30, 5, "Top! 👍", "30:00"), r(22, 30, 5, "Bequem und warm.", "30:01"),
         r(23, 30, 5, "ok top 👍", "40:00"), r(24, 30, 2, "Naht nach einer Woche gerissen.", "40:01"),
         r(25, 30, 3, "Grösse fällt klein aus, eine Nummer grösser nehmen.", "40:02"), r(26, 30, 1, "Kam nie an.", "40:03")]
    faelle.append(("C neuer Lauf mit Zufallsähnlichkeit", c, set()))
    # D: Vorlage ausgeblendet, Kopie veröffentlicht → Kopie bleibt
    d = [r(31, 40, 2, "Der Reissverschluss klemmt ständig.", "50:00", pub=False, cur="spam"),
         r(32, 40, 2, "Der Reissverschluss klemmt dauernd.", "51:00")]
    faelle.append(("D Vorlage ausgeblendet", d, set()))
    # E: dreifach (3 Läufe) → 2 Kopien je Kommentar
    e = [r(41, 50, 5, "Warm und gut verarbeitet, Hund mag sie.", "52:00"), r(42, 50, 5, "Passt perfekt.", "52:01"),
         r(43, 50, 5, "Warm und gut verarbeitet, der Hund mag sie.", "53:00"), r(44, 50, 5, "Passt perfekt!", "53:01"),
         r(45, 50, 5, "Warm, gut verarbeitet, mein Hund mag sie.", "54:00"), r(46, 50, 5, "Passt perfekt.", "54:01")]
    faelle.append(("E dreifach", e, {43, 44, 45, 46}))
    # F: Einzel-Lauf wiederholt (n = 1) → Kopie
    f = [r(51, 60, 5, "Sehr gut dehnbar.", "55:00"), r(52, 60, 5, "Sehr gut dehnbar.", "57:00")]
    faelle.append(("F Einzel-Lauf wiederholt", f, {52}))
    # G: andere Sterne trotz gleichem Text → nichts
    g = [r(61, 70, 5, "Alles wie beschrieben.", "58:00"), r(62, 70, 3, "Alles wie beschrieben.", "59:00")]
    faelle.append(("G andere Sterne", g, set()))
    fehler = 0
    for name, bew, soll in faelle:
        kopien, _ = finde_doppel(bew)
        ist = {i for i, _ in auszublenden(bew, kopien)}
        ok = ist == soll
        fehler += not ok
        print(f"  {'✅' if ok else '❌'} {name}: ausblenden {sorted(ist)} (Soll {sorted(soll)})")
    # Freigabe wirkt
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
