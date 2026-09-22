#!/usr/bin/env python3
"""Produkttexte Sie → du — der ganze Katalog, täglich in Raten, mit Sicherheitsnetz.

ANLASS (22.09.2026, Betreiber «webseite ist a und o, optimiere alles und produkten auch»):
Bulk-Export über 51'336 aktive Produkte: **26'189 (51 %) siezen** — der Shop duzt (Regel seit
den Ratgebern, `kollektionstexte_du_form.py`). Bisher wurden nur BESUCHTE Seiten auf du gebracht
(`besuchte_seiten_lieferbar.politur()`), der Rest nie.

WAS DIESER LAUF TUT
 1. Liest `dropship/_du_form_kandidaten.txt` (Handles mit Sie-Form aus dem Bulk-Export) minus
    Ledger `dropship/_du_form_done.txt`.
 2. Holt den LIVE-Text (nie den Export — Lehre 22.09.: sonst geht ein zwischenzeitlich
    nachgetragener Faktenblock verloren), wandelt mit `um()` aus kollektionstexte_du_form.
 3. SICHERHEITSNETZ: `um()` hat schon «denst du» (22.09.) und «du … sorgen möchten» (22.09.)
    erzeugt. Jeder Text wird nach der Wandlung gegen WARNMUSTER geprüft; ein Treffer wird NICHT
    geschrieben, sondern in `dropship/DU-FORM-VERDACHT.md` gemeldet (Mensch/Regelwerk).
 4. Schreibt unter `/tmp/lock_produkttext.lock`, liest zurück, quittiert im Ledger.

  DRY=1 zeigen · CAP=n Produkte je Lauf (Standard 1500) · HANDLES=datei eigene Liste
"""
import fcntl, html as H, json, os, re, subprocess, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from kollektionstexte_du_form import um  # noqa: E402

SHOP = "au3j0y-hq.myshopify.com"
KAND = os.environ.get("HANDLES") or os.path.join(REPO, "dropship", "_du_form_kandidaten.txt")
LEDGER = os.path.join(REPO, "dropship", "_du_form_done.txt")
VERDACHT = os.path.join(REPO, "dropship", "DU-FORM-VERDACHT.md")
DRY = os.environ.get("DRY") == "1"
CAP = int(os.environ.get("CAP", "1500"))
SIE = re.compile(r"\b(Sie|Ihnen|Ihr|Ihre|Ihrem|Ihren|Ihrer|Ihres)\b")
# Pluralverb direkt nach «du», kaputte Stämme, doppelte Pronomen
WARN = re.compile(r"\bdu (können|möchten|haben|sind|wollen|sollten|müssen|erhalten|finden|profitieren|"
                  r"geniessen|genießen|sparen|bekommen|brauchen|suchen|lieben|werden|sehen|setzen|wählen|"
                  r"kaufen|bestellen|schätzen|verwöhnen|entdecken|erleben|fühlen|tragen|nutzen|behalten)\b"
                  r"(?! (?:kannst|musst|willst|sollst|darfst|wirst|möchtest|solltest|könntest|müsstest|wolltest|würdest|lässt)\b)"
                  r"|\bdenst\b|\bdu du\b|\bdich dich\b|\bdir dir\b|\bdu sich\b|\b[a-zäöüß]+(?:st|est) (?:musst|kannst|willst|sollst|wirst|hast|bist|solltest|könntest)\b|\bdeine?[mnrs]? (Sie|Ihre?)\b")
# Pluralverb SPÄTER im selben Satzteil («wenn du es eilig haben», «du … sorgen möchten») — Regel 2b tauscht nur das
# Pronomen. Absichtlich grob (fängt auch «du kannst … haben»): ein Fehlalarm landet im Bericht, ein Fehler im Shop nicht.
WARN2 = re.compile(r"\bdu\b[^.,;!?:]{0,60}?\b(haben|können|möchten|wollen|sind|müssen|sollten|werden|brauchen|benötigen|"
                   r"suchen|finden|erhalten|bekommen|wünschen|sparen|geniessen|genießen|profitieren|lieben|schätzen)\b")


WARN3 = re.compile(r"\bdu\b[^.,;!?:]{0,80}?\b[a-zäöüß]{3,}en\b(?=[.,;!?]|\s*$)")
ZWEITE = re.compile(r"\b(kannst|möchtest|willst|musst|sollst|darfst|wirst|hast|bist|solltest|könntest|würdest|wolltest|müsstest)\b")


def _folgt_zweite(tn, ende):
    """Steht nach dem Treffer ein 2.-Person-Verb («brauchen kannst», «suchen solltest»)? Dann ist der Infinitiv richtig."""
    return bool(re.match(r"\s+(kannst|musst|willst|sollst|darfst|wirst|hast|bist|möchtest|solltest|könntest|müsstest|wolltest|würdest|lässt)\b", tn[ende:ende + 14]))


def _modal_spaeter(tn, ende):
    """Aufzählung «du schneiden, würfeln oder Eier trennen möchtest»: 2.-Person-Modal später im Satz (bis .;!?), ohne
    dass ein Komma-Segment mit Konjunktion/Pronomen beginnt → der Infinitiv gehört zum Modalverb."""
    rest = re.split(r"[.;!?]", tn[ende:], 1)[0]
    for seg in re.split(r",", rest):
        if re.match(r"\s*(?:dass|damit|wenn|ob|weil|während|bevor|nachdem|sodass|falls|sobald|wo|was|wie|um|denn|aber|doch|dann|so|es|er|wir|ihr|sie|man|du|mit|für|bei|in|an|auf|ohne|egal)\b", seg):
            return False
        if ZWEITE.search(seg):
            return True
    return False


_DET = {'einen','einem','den','dem','diesen','diesem','keinen','keinem','jeden','jedem','ihren','ihrem','deinen','deinem','seinen','seinem','unseren','unserem','meinen','meinem','welchen','welchem','allen','vielen','manchen','solchen','beiden','anderen','eigenen','ganzen','ersten','zweiten','neuen','kleinen','grossen','großen','schönen','weichen','warmen','kalten','hellen','dunklen','roten','blauen','einer','ihrer','deiner','seiner','unserer','jeder','dieser','keiner','aller','vieler','mancher'}


def warn2(tn):
    for m in WARN2.finditer(tn):
        if _folgt_zweite(tn, m.end()):
            continue
        if ZWEITE.search(tn[max(0, m.start() - 16):m.start()] + " "):   # «kannst du … finden» — Modal steht VOR du
            continue
        if _modal_spaeter(tn, m.end()):
            continue
        if re.search(r"\b(oder|und)\s+(du|dein\w*)\b", m.group(0)):   # zusammengesetztes Subjekt → Plural richtig
            continue
        return m
    return None


WARN4 = re.compile(r"\b(?!zwischen|gegen|wegen|neben|oben|unten|ohne|innen|einen|keinen|meinen|deinen|seinen|ihren|unseren|diesen|jeden|allen|vielen|wenigen|denen|welchen|ihnen|sachen|morgen|wochen|tagen|jahren|stunden|minuten|zeiten|farben|massen|kissen|draussen|dagegen|dazwischen|wenn|denn|dann|schon|eben)[a-zäöüß]{3,}(?:en|ern|eln) du\b")


def warn3(tn):
    """Satzteil nach «du» endet auf «-en» (Infinitiv/Plural: «ob du Videos schauen oder Anrufe tätigen») — ausser
    ein 2.-Person-Modal steht im Satzteil oder direkt davor («kannst du … haben»). Fängt auch Nomen auf -en
    («… dein Kissen.») — Fehlalarm landet im Bericht, nicht im Shop."""
    for m in WARN3.finditer(tn):
        if ZWEITE.search(m.group(0)) or ZWEITE.search(tn[max(0, m.start() - 16):m.start()] + " ") or _folgt_zweite(tn, m.end()):
            continue
        if re.search(r"\b(oder|und)\s+(du|dein\w*)\b", m.group(0)):
            continue
        w = m.group(0).rstrip().split(" ")
        if len(w) >= 2 and w[-2].lower() in _DET:      # «du einen matten,» — Adjektiv nach Artikel, kein Verb
            continue
        if _modal_spaeter(tn, m.end()):                 # «ob du schneiden, würfeln … möchtest» — Aufzählung
            continue
        _vor = tn[max(0, m.start() - 16):m.start()]
        if re.search(r"\b[a-zäöüß]{3,}st\s*$", _vor) and re.match(r"(?:ge|ver|be|er|ent|zer)[a-zäöüß]+en$", w[-1]) \
                and not re.search(r"\b(und|oder)\b", m.group(0)):   # «bleibst du stets verbunden» — Partizip nach 2.-Person-Verb
            continue
        return m
    return None


def tok():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(REPO, "automation", "shop_token_refresh.sh")], capture_output=True)
    return open(p).read().strip()


TOK = tok()


def gql(q, v=None):
    grund = ""
    for i in range(8):
        r = subprocess.run(["curl", "-s", "--max-time", "45", f"https://{SHOP}/admin/api/2026-01/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK, "-H", "Content-Type: application/json",
                            "-d", json.dumps({"query": q, "variables": v or {}})], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            grund = "kein JSON: " + r.stdout[:80]; time.sleep(3 + i); continue
        errs = d.get("errors") or []
        if any((e.get("extensions") or {}).get("code") == "THROTTLED" for e in errs):
            k = (d.get("extensions") or {}).get("cost") or {}; ts = k.get("throttleStatus") or {}
            time.sleep(min(20, max(2, (k.get("requestedQueryCost", 50) - ts.get("currentlyAvailable", 0))
                                   / (ts.get("restoreRate") or 50) + 1)))
            grund = "gedrosselt"; continue
        if errs:
            grund = str(errs)[:120]; time.sleep(2); continue
        return d
    raise RuntimeError(f"Shopify antwortet nicht (8 Versuche) — letzter Grund: {grund}")


def text(h):
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", h or ""))).strip()


def quitt(h, heute, was):
    if DRY:
        return
    with open(LEDGER, "a") as f:
        f.write(f"{h}\t{heute}\t{was}\n")


def main():
    if not os.path.exists(KAND):
        print("FERTIG: keine Kandidatenliste"); return 0
    done = set()
    if os.path.exists(LEDGER):
        done = {z.split("\t")[0] for z in open(LEDGER) if z.strip()}
    # Handles, auf die cj_specs_backfill.mjs noch einen Faktenblock schreibt, NICHT anfassen (zwei Schreiber,
    # ein Text — der zweite überschreibt den ersten). Sie sind besuchte Seiten, die politur() schon geduzt hat.
    prio = os.path.join(REPO, "dropship", "_cj_specs_prio.txt"); pdone = os.path.join(REPO, "dropship", "_cj_specs_done.txt")
    offen_fakt = set()
    if os.path.exists(prio):
        offen_fakt = {z.split("\t")[0].strip() for z in open(prio) if z.strip()}
        if os.path.exists(pdone):
            offen_fakt -= {z.split("\t")[0].strip() for z in open(pdone) if z.strip()}
    hs = [z.strip() for z in open(KAND) if z.strip() and z.strip() not in done and z.strip() not in offen_fakt]
    print(f"Kandidaten offen: {len(hs)} (Ledger {len(done)}) · CAP {CAP} · {'DRY' if DRY else 'SCHREIBEN'}")
    if not hs:
        print("FERTIG: alle Kandidaten quittiert"); return 0
    heute = time.strftime("%Y-%m-%d")
    n_du = n_teil = n_warn = n_skip = n_fehler = 0
    verdacht = []
    with open("/tmp/lock_produkttext.lock", "w") as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        for h in hs[:CAP]:
            try:
                d = gql('query($h:String!){productByHandle(handle:$h){id status descriptionHtml}}', {"h": h})
                p = (d.get("data") or {}).get("productByHandle")
                if not p or p["status"] != "ACTIVE":
                    n_skip += 1; quitt(h, heute, "nicht-aktiv"); continue
                alt = p["descriptionHtml"] or ""
                if not SIE.search(text(alt)):
                    n_skip += 1; quitt(h, heute, "schon-du"); continue
                neu = um(alt)
                tn = text(neu)
                m = WARN.search(tn) or warn2(tn) or warn3(tn) or WARN4.search(tn)
                if m:
                    n_warn += 1
                    i = max(0, m.start() - 60)
                    verdacht.append((h, m.group(0), tn[i:m.end() + 60]))
                    quitt(h, heute, f"verdacht:{m.group(0)}"); continue
                if neu == alt:
                    n_skip += 1; quitt(h, heute, "um-ohne-wirkung"); continue
                rest = len(SIE.findall(tn))
                if DRY:
                    print(f"  [DRY] {h[:50]:52s} Sie {len(SIE.findall(text(alt)))} → {rest}")
                    n_du += 1; continue
                r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}',
                        {"i": {"id": p["id"], "descriptionHtml": neu}})
                pu = ((r.get("data") or {}).get("productUpdate") or {})
                if pu.get("userErrors") or (pu.get("product") or {}).get("descriptionHtml") != neu:
                    n_fehler += 1; print(f"  FEHLER {h}: {pu.get('userErrors')}"); continue
                if rest: n_teil += 1
                else: n_du += 1
                quitt(h, heute, "teilweise" if rest else "du")
            except Exception as e:  # noqa: BLE001
                n_fehler += 1; print(f"  FEHLER {h}: {type(e).__name__}: {str(e)[:100]}")
                if n_fehler >= 15:
                    print("ABBRUCH: 15 Fehler — Shopify/Netz prüfen"); break
            time.sleep(0.25)
    if verdacht:
        neu_ = not os.path.exists(VERDACHT)
        with open(VERDACHT, "a") as f:
            if neu_:
                f.write("# Du-Form: verdächtige Wandlungen (NICHT geschrieben)\n\nRegelwerk `um()` in `kollektionstexte_du_form.py` "
                        "nachbessern, dann Ledger-Zeile `verdacht:` löschen und erneut laufen lassen.\n\n| Handle | Muster | Kontext |\n|---|---|---|\n")
            for h, mu, ctx in verdacht:
                f.write(f"| `{h}` | {mu} | …{ctx.replace('|', '/')}… |\n")
    print(f"DU-FORM: {n_du} auf du · {n_teil} teilweise · {n_warn} Verdacht (nicht geschrieben) · {n_skip} übersprungen · {n_fehler} Fehler")
    rest = len(hs) - min(len(hs), CAP)
    print("FERTIG: alle Kandidaten quittiert" if rest == 0 and not n_fehler else f"offen: {rest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
