#!/usr/bin/env python3
"""echte_bewertungen_wache.py — kommen echte Bewertungen von echten Käufern an? (21.10.2026, Betreiber «produktbewertungen» → «Echte Bewertungen sammeln»)

GEMESSEN 21.10.2026 (Judge.me API v1, privater Token, nur lesen):
  · 16'891 Bewertungen, alle aus dem CJ-Import (source web, verified nothing) — 0 von eigenen Käufern. Die 1'191 Importer-Bewertungen seit dem
    Stopp vom 12.10. sind ausgeblendet (judgeme_fake_wache.py, Betreiber-Entscheid A). Erfunden/übernommen wird nichts (UWG Art. 3).
  · Judge.me kennt 17 erfüllte Bestellungen (alle CH), davon 11 seit ≥ 21 T geliefert (= fällig für eine Anfrage). Für alle 13 Käufer-IDs liefert
    `/reviews?reviewer_id=…` 0 Bewertungen. Ob die Judge.me-Anfrage nach Lieferung ÜBERHAUPT eingestellt ist, kann die API nicht sagen (Einstellungen
    nur für bekannte Schlüssel lesbar, `review_request*` unbekannt) → Betreiber-Klick, Klickweg in dropship/ECHTE-BEWERTUNGEN-2026-10-21.md.
  · Die Käuferadressen stehen hinter `/reviewers/<id>` — diese Wache liest nur Zähler und Bestellnummern, NIE Namen oder Adressen.

ZÄHLT: Bestellungen (erfüllt, nicht storniert), fällig (≥ FAELLIG_TAGE seit Erfüllung), Bewertungen dieser Käufer (je reviewer_id).
AMPEL (`zeile()`): ℹ️ solange der Betreiber die Anfrage nicht bestätigt hat (Datei dropship/_judgeme_anfrage_an.txt, erste Zeile = Datum JJJJ-MM-TT);
  ⚠️ wenn die Anfrage seit ≥ 35 T läuft, ≥ 3 danach gelieferte Bestellungen fällig waren und trotzdem 0 echte Bewertungen da sind
  (Absender/Spam/Sprache prüfen), oder der Stand älter als 36 h ist.
  python3 automation/echte_bewertungen_wache.py            misst, schreibt dropship/_echte_bewertungen_stand.json, Zeile «FERTIG …»
  python3 automation/echte_bewertungen_wache.py --selbsttest | --zeile
"""
import datetime as dt, json, os, sys, urllib.error, urllib.parse, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
STAND = os.path.join(REPO, "dropship", "_echte_bewertungen_stand.json")
ANFRAGE = os.path.join(REPO, "dropship", "_judgeme_anfrage_an.txt")
FAELLIG_TAGE = 21        # Anfrage 21 Tage nach Erfüllung (Lieferung aus China 10–20 Werktage), siehe dropship/BEWERTUNGEN-2026-10-01.md
WARN_NACH_TAGEN = 35     # Anfrage läuft seit ≥ 35 T = 21 + 14 Tage Antwortzeit
WARN_MIN_BESTELLUNGEN = 3
STALE_H = 36


def auswerten(bestellungen, bewertungen_je_kaeufer, jetzt, anfrage_ab=None):
    """Reine Funktion. bestellungen = [{name, fulfilled_at, cancelled_at, reviewer_id}], bewertungen_je_kaeufer = {reviewer_id: Anzahl}.
    Gibt die Zähler zurück (keine Namen, keine Adressen)."""
    erfuellt = [b for b in bestellungen if b.get("fulfilled_at") and not b.get("cancelled_at")]
    faellig, nach_anfrage = 0, 0
    for b in erfuellt:
        t = dt.datetime.fromisoformat(b["fulfilled_at"][:19])
        if (jetzt - t).days >= FAELLIG_TAGE:
            faellig += 1
            if anfrage_ab and t.date() >= anfrage_ab:
                nach_anfrage += 1
    kaeufer = {b["reviewer_id"] for b in erfuellt if b.get("reviewer_id")}
    echte = sum(bewertungen_je_kaeufer.get(k, 0) for k in kaeufer)
    return {"bestellungen": len(erfuellt), "kaeufer": len(kaeufer), "faellig": faellig, "faellig_nach_anfrage": nach_anfrage, "echte_bewertungen": echte}


def anfrage_datum():
    try:
        z = open(ANFRAGE, encoding="utf-8").readline().strip()[:10]
        return dt.date.fromisoformat(z)
    except Exception:
        return None


def zeile(jetzt=None, stand=None, anfrage=None):
    """Leer = nichts zu melden. Siehe Kopf für die Regeln."""
    pfad = stand or STAND
    jetzt = jetzt or dt.datetime.utcnow()
    anfrage = anfrage if anfrage is not None else anfrage_datum()
    if not os.path.exists(pfad):
        return ""
    try:
        s = json.load(open(pfad, encoding="utf-8"))
        alter = (jetzt - dt.datetime.strptime(s["geprueft"], "%Y-%m-%dT%H:%MZ")).total_seconds() / 3600
    except Exception:
        return "⚠️ ECHTE BEWERTUNGEN: Stand unlesbar (dropship/_echte_bewertungen_stand.json)"
    if alter > STALE_H:
        return f"⚠️ ECHTE BEWERTUNGEN: seit {alter:.0f} h nicht gemessen (Takt 24 h) — Log /tmp/echte_bewertungen_wache.log"
    z = (f"{s['echte_bewertungen']} echte Bewertung(en) von {s['kaeufer']} Käufern · {s['bestellungen']} Bestellungen, "
         f"{s['faellig']} seit ≥ {FAELLIG_TAGE} T geliefert")
    if anfrage is None:
        return (f"ℹ️ ECHTE BEWERTUNGEN: {z} — Judge.me-Anfrage nach Lieferung noch nicht bestätigt "
                "(Klickweg dropship/ECHTE-BEWERTUNGEN-2026-10-21.md, danach Datum in dropship/_judgeme_anfrage_an.txt)")
    seit = (jetzt.date() - anfrage).days
    if seit >= WARN_NACH_TAGEN and s.get("faellig_nach_anfrage", 0) >= WARN_MIN_BESTELLUNGEN and s["echte_bewertungen"] == 0:
        return (f"⚠️ ECHTE BEWERTUNGEN: Anfrage läuft seit {seit} T, {s['faellig_nach_anfrage']} danach gelieferte Bestellungen, "
                "aber 0 echte Bewertungen — Absender, Spam-Ordner, Sprache und Betreffzeile der Anfrage prüfen")
    return ""


def schreiben(d):
    d = dict(d, geprueft=f"{dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}")
    tmp = STAND + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, STAND)


def _api(pfad, **q):
    tok = os.environ["JUDGEME_PRIVATE_TOKEN"]
    q.update(api_token=tok, shop_domain=os.environ["JUDGEME_SHOP_DOMAIN"])
    u = "https://judge.me/api/v1/" + pfad + "?" + urllib.parse.urlencode(q)
    for versuch in range(3):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "luxe-echte-bewertungen"}), timeout=60))
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and versuch < 2:
                import time; time.sleep(10 * (versuch + 1)); continue
            raise


def messen():
    heute = dt.date.today()
    bestellungen = []
    for seite in range(1, 8):
        d = _api("orders", per_page=100, page=seite, start_date="01/05/2026", end_date=(heute + dt.timedelta(days=1)).strftime("%d/%m/%Y"))
        bestellungen += d.get("orders", [])
        if len(d.get("orders", [])) < 100:
            break
    ids = {b["reviewer_id"] for b in bestellungen if b.get("reviewer_id") and b.get("fulfilled_at") and not b.get("cancelled_at")}
    je = {}
    for k in sorted(ids):
        je[k] = len(_api("reviews", reviewer_id=k, per_page=100).get("reviews", []))
    return auswerten(bestellungen, je, dt.datetime.utcnow(), anfrage_datum())


def selbsttest():
    fehler = []
    ok = lambda b, t: b or fehler.append(t)
    jetzt = dt.datetime(2026, 12, 1, 12, 0)
    best = [{"name": "#1", "fulfilled_at": "2026-10-01T10:00:00+00:00", "reviewer_id": 1},
            {"name": "#2", "fulfilled_at": "2026-10-05T10:00:00+00:00", "reviewer_id": 2},
            {"name": "#3", "fulfilled_at": "2026-10-07T10:00:00+00:00", "reviewer_id": 3},
            {"name": "#4", "fulfilled_at": "2026-11-25T10:00:00+00:00", "reviewer_id": 4},
            {"name": "#7", "fulfilled_at": "2026-11-13T10:00:00+00:00", "reviewer_id": 7},   # 18 T her: noch nicht fällig (Grenze 21)
            {"name": "#8", "fulfilled_at": "2026-11-06T10:00:00+00:00", "reviewer_id": 8},   # 25 T her: fällig
            {"name": "#5", "fulfilled_at": None, "reviewer_id": 5},
            {"name": "#6", "fulfilled_at": "2026-10-02T10:00:00+00:00", "reviewer_id": 6, "cancelled_at": "2026-10-03T00:00:00+00:00"}]
    z = auswerten(best, {1: 0, 2: 1, 3: 0, 4: 0, 6: 5}, jetzt, dt.date(2026, 9, 30))
    ok(z["bestellungen"] == 6, f"stornierte/unerfüllte zählen nicht ({z})")
    ok(z["faellig"] == 4, f"fällig = ≥ 21 T geliefert ({z})")
    ok(z["faellig_nach_anfrage"] == 4, f"nach Anfrage fällig ({z})")
    ok(z["echte_bewertungen"] == 1, f"Bewertung stornierter Bestellung zählt nicht ({z})")
    ok(auswerten(best, {}, jetzt)["faellig_nach_anfrage"] == 0, "ohne Anfrage-Datum keine «nach Anfrage»")
    import tempfile
    tmp = os.path.join(tempfile.mkdtemp(), "s.json")
    basis = {"geprueft": "2026-12-01T08:00Z", "bestellungen": 17, "kaeufer": 13, "faellig": 11, "faellig_nach_anfrage": 0, "echte_bewertungen": 0}
    json.dump(basis, open(tmp, "w"))
    ok(zeile(jetzt, tmp, None).startswith("ℹ️") and "noch nicht bestätigt" in zeile(jetzt, tmp, None), "ohne Anfrage: ℹ️")
    ok("Namen" not in zeile(jetzt, tmp, None) and "@" not in zeile(jetzt, tmp, None), "keine Personendaten in der Zeile")
    ok(zeile(jetzt, tmp, dt.date(2026, 11, 20)) == "", "Anfrage erst 11 T → noch nichts")
    json.dump(dict(basis, faellig_nach_anfrage=4), open(tmp, "w"))
    ok(zeile(jetzt, tmp, dt.date(2026, 10, 20)).startswith("⚠️") and "0 echte Bewertungen" in zeile(jetzt, tmp, dt.date(2026, 10, 20)), "Anfrage 42 T, 4 fällig, 0 Bewertungen → ⚠️")
    json.dump(dict(basis, faellig_nach_anfrage=4, echte_bewertungen=2), open(tmp, "w"))
    ok(zeile(jetzt, tmp, dt.date(2026, 10, 20)) == "", "mit echten Bewertungen → nichts")
    json.dump(dict(basis, faellig_nach_anfrage=2), open(tmp, "w"))
    ok(zeile(jetzt, tmp, dt.date(2026, 10, 20)) == "", "nur 2 fällig → noch kein Alarm")
    json.dump(dict(basis, geprueft="2026-11-28T08:00Z"), open(tmp, "w"))
    ok(zeile(jetzt, tmp, None).startswith("⚠️") and "nicht gemessen" in zeile(jetzt, tmp, None), "Stand 76 h alt → ⚠️")
    ok(zeile(jetzt, os.path.join(os.path.dirname(tmp), "gibtsnicht.json"), None) == "", "ohne Stand-Datei: leer")
    if fehler:
        print("SELBSTTEST FEHLER:\n  " + "\n  ".join(fehler))
        return 1
    print("SELBSTTEST OK (Zählung, Anfrage-Datum, ℹ️/⚠️-Regeln, keine Personendaten, Stale)")
    return 0


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(selbsttest())
    if "--zeile" in sys.argv:
        print(zeile() or "OK")
        sys.exit(0)
    print(f"START {dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}", flush=True)
    try:
        d = messen()
    except KeyError as e:
        raise SystemExit(f"Error: Judge.me-Zugang fehlt ({e}) — /tmp/judgeme.env gesourced?")
    schreiben(d)
    print(f"FERTIG: {d['echte_bewertungen']} echte Bewertung(en) von {d['kaeufer']} Käufern · {d['bestellungen']} Bestellungen, {d['faellig']} fällig")
