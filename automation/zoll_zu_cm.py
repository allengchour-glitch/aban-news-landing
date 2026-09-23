#!/usr/bin/env python3
"""zoll_zu_cm.py — Masse in Zoll auf Produktseiten in Zentimeter umrechnen (23.09.2026, Audit-Befund 23).

GEMESSEN 23.09.2026: Die dritt-meistbesuchte Produktseite (Spülbecken-Organizer) nannte ihre Masse als
«9.1 × 3.7 × 6.2 Zoll»; `productsCount(status:active AND Zoll, limit:null)` = 1'214 (EXACT, Unsinnswort 0).
Im Export vom 22.09. (51'336 aktive) stehen 1'239 Produkte mit «Zahl + Zoll/inch/″/"» im Text — der grösste
Teil davon ist aber BRANCHENÜBLICH und bleibt: Bildschirm-Diagonalen (Smartwatch «1,3 Zoll Display»), Laptop-
Klassen («für Laptops bis 15.6 Zoll»), Gewinde/Anschlüsse («3/4-Zoll-Verbindung»), Festplatten («2,5-Zoll-SATA»),
Räder/Rollen, Sensoren. Die Quelle neuer Zoll-Masse ist `cj_specs.mjs` (wandelt «inch» in «Zoll», nicht in cm).

REGELN (1 Zoll = 2.54 cm; unter 10 cm eine Nachkommastelle, sonst ganze cm; Dezimalpunkt wie im Shop —
gemessen 2'604 «x.y cm» gegen 1'287 «x,y cm»; hatte die Quelle ein Dezimalkomma, bleibt es beim Komma):
  1. ERSETZEN — Massketten («9.1 × 3.7 × 6.2 Zoll» → «ca. 23 × 9.4 × 16 cm», «52 Zoll B x 63 Zoll L»), Werte mit
     Masswort davor («Durchmesser: 12 Zoll», «Länge von 7, 8 oder 20 Zoll», «Er misst 10 Zoll»), Werte in eigener
     Klammer («Teller (9 Zoll)») und Werte mit Zollzeichen («18" Grösse», «0.47''»).
  2. ERGÄNZEN — alles andere, das kein Branchenmass ist, behält die Angabe und bekommt die Umrechnung dazu:
     «Erhältlich in 15 und 17 Zoll (ca. 38 und 43 cm)», «10-Zoll-Format (ca. 25 cm)». So bleibt eine
     Grössenbezeichnung (Trommel, Perücke, Koffer) erhalten und die Kundin versteht sie trotzdem.
  3. BLEIBT — Branchen-Kontext im selben Satz (Display/Bildschirm/Laptop/Gewinde/SATA/Rad …), Brüche («1/4"»),
     Werte, neben denen schon cm/mm stehen («3,54″ (9 cm)»), Beträge («CHF 5 Zoll»), Titel (Bezeichnung).
  «Zoll» im Sinn von Zollgebühren wird nie berührt: gesucht wird nur eine Zahl DIREKT vor der Einheit.

Kandidaten LIVE (Phrasensuche «Zoll» und «inch», Unsinnswort-Gegenprobe muss 0 ergeben — sonst PAUSE);
geschrieben wird gegen den frisch gelesenen Text, je Produkt unter /tmp/lock_produkttext.lock; nach dem Schreiben
zurückgelesen. Ledger dropship/_zoll_zu_cm.txt (Spur — im Live-Modus filtert es nicht, das Objekt ist die Wahrheit;
Produkte ohne Änderungsbedarf stehen nur im Ledger, damit man sieht, dass sie geprüft wurden).
Standard ist TROCKEN (zeigt Diffs); SCHARF=1 schreibt. CAP (Standard 400) begrenzt Schreibvorgänge je Lauf.
Test ohne Shopify:  python3 automation/zoll_zu_cm.py --selbsttest
"""
import fcntl, html as H, json, os, re, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from eimer_etikette import nachlauf, bilanz
except Exception:  # noqa: BLE001 — Etikette fehlt = trotzdem lauffähig (langsamer Takt unten)
    def nachlauf(d): return 0.0
    def bilanz(): return ""

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, "dropship", "_zoll_zu_cm.txt")
SHOP = "au3j0y-hq.myshopify.com"
SCHARF = os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP", "400"))
ZEIGE = int(os.environ.get("ZEIGE", "20"))
TEXTSPERRE = "/tmp/lock_produkttext.lock"

# ───────────────────────── Erkennung ─────────────────────────
WS = r"(?:[ \t\u00a0]|&nbsp;)"
NUM = r"(?<![\w.,/])(?<![A-Za-z]-)\d{1,3}(?:[.,]\d{1,2})?(?![\d/])"      # erste Zahl: frei stehend
NUM_L = r"\d{1,3}(?:[.,]\d{1,2})?(?![\d/])"                               # Folgezahl nach Trenner («25x20»)
# Einheit: Wort (Zoll/inch, auch «12-Zoll», «1.83inch») oder Zeichen (″, '', ", &quot;) direkt nach der Zahl.
U_WORT = rf"{WS}?-?{WS}?(?:Zoll|[Ii]nch(?:es)?)\b"
U_ZEICHEN = r"(?:[ \u00a0]?(?:″|&Prime;|''|&#39;&#39;|&#x27;&#x27;)|(?:\"|&quot;)(?![\w]))"
U = rf"(?:{U_WORT}|{U_ZEICHEN})"
BUCHST = rf"(?:{WS}?(?:[BHLTW]|Breite|Höhe|Länge|Tiefe)\b(?!-))"
REST = rf"(?:{U})?{BUCHST}?"
# «x» nur beidseitig frei («52 Zoll B x 63») oder beidseitig eng («25x20») — «2x 12x18 Zoll» ist eine STÜCKZAHL.
SEP = rf"(?:{WS}*[×*]{WS}*|{WS}+[xX]{WS}+|(?<=\d)[xX](?=\d))"
LSEP = rf"(?:{WS}*,{WS}*|{WS}+(?:und|oder|bis){WS}+|{WS}*[-–]{WS}*|-{WS}+(?:und|oder){WS}+|{WS}*/{WS}*)"
# Kette/Liste endet IMMER mit einer Einheit; «8 Zoll, 500 g» bleibt «8 Zoll» (Rückverfolgung statt Nachprüfung).
GRUPPE = re.compile(rf"(?:{NUM}{REST}(?:{SEP}|{LSEP})(?:{NUM_L}{REST}(?:{SEP}|{LSEP}))*{NUM_L}{U}{BUCHST}?"
                    rf"|{NUM}{U}{BUCHST}?)")
TEIL_NUM = re.compile(r"\d{1,3}(?:[.,]\d{1,2})?")
TEIL_U = re.compile(U)
# Nur ein NOMEN als Kompositum-Schwanz («-Trolley», «-Länge»); «8-Zoll-tiefer Teller» → Adjektiv → bleibt.
SCHWANZ = re.compile(r"-[A-ZÄÖÜ][\wÄÖÜäöüß]*(?:-[\wÄÖÜäöüß]+)*")

# Branchenmass im selben Satz → bleibt in Zoll (Diagonalen, Laptop-Klassen, Gewinde, Laufwerke, Räder …).
BRANCHE = re.compile(
    r"displ|dispaly|bildschirm|screen|touch|amoled|oled|\blcd|\bips\b|\btft|monitor|\btv\b|fernseh|smartphone|"
    r"\bhandy|iphone|\btablets?\b|\bipad|laptop|notebook|macbook|chromebook|ultrabook|projektion|bildgr|diagonal|"
    r"leinwand|beamer|projektor|sensor|\bccd\b|cmos|\bsata\b|\bhdd|\bssd|festplatte|laufwerk|gewinde|anschluss|"
    r"\brohr|schlauch|verbindung|klinke|stecker|\bxlr\b|adapter|felge|\brad\b|räder|laufrad|fahrrad|\bbike|"
    r"reifen|\brollen?\b|lenkrolle|laufrolle|lautsprecher|subwoofer|woofer|treiber|propeller|\bschaft|spannzange|"
    r"\bbits?\b|stecknuss|ratsche|vierkant|\bbspt?\b|\bnpt\b|mainboard|objektiv|modellflug|drohne|zoll-bereich|"
    r"anzeige|smartwatch|e-reader|kindle|kompatibel|-geräte?n?\b|zoll-geräte?n?\b|kettensäge|sägekette|\bschwert|"
    r"\bvelos?\b|bereifung|\brad(?:konfig|grösse|durchmesser)",
    re.I)
MASSWORT = re.compile(
    # «Grösse» fehlt hier absichtlich: «Grösse von 16 Zoll» ist oft eine Grössenklasse (Laptopfach, Trommel,
    # Teller) → ERGÄNZEN statt ersetzen, die Bezeichnung bleibt stehen.
    # Wortanfang PFLICHT: «Klänge der 7-Zoll Steel Tongue Drum» enthält «länge» (gemessen im DRY 23.09.).
    r"\b(?:ketten|gesamt|innen|aussen|außen|schulter|arm|bein|rücken|brust|hals|kopf|taillen|hüft|sitz|"
    r"schalenmund|kugel|griff|rohr)?-?(?:masse|mass|abmessung|länge|breite|höhe|tiefe|durchmesser|ø|umfang|"
    r"dicke|stärke|misst|messen|gemessen)\w{0,3}[^0-9|]{0,28}$", re.I)
CA_DAVOR = re.compile(r"(?:\bca\.?|circa|etwa|ungefähr|rund|~|approx\.?)\s*$", re.I)
BETRAG_DAVOR = re.compile(r"(?:CHF|EUR|Fr\.|€|\$|USD)\s*$")
CM_NAH = re.compile(r"\d\s?(?:cm|mm)\b")
SATZENDE = re.compile(r"(?:[.!?;]\s|\|)")

BLOCK = re.compile(r"^</?(?:p|li|ul|ol|tr|table|tbody|thead|br|div|h[1-6]|section|article|blockquote|dd|dt|dl)\b", re.I)
ZELLE = re.compile(r"^</?(?:td|th)\b", re.I)


def cm_text(wert, komma):
    cm = float(wert.replace(",", ".")) * 2.54
    if cm < 10:
        s = f"{cm:.1f}"
        if s.endswith(".0"):
            s = s[:-2]
    else:
        s = str(int(cm + 0.5))
    return s.replace(".", ",") if komma else s


def umrechnen_gruppe(g):
    """Rechnet den Text einer Gruppe um: Zahlen → cm, Einheiten → ' cm' (bzw. eine am Ende), Elisions-Bindestrich weg."""
    komma = bool(re.search(r"\d,\d", g))
    teile, pos, hat_u = [], 0, False
    for m in re.finditer(rf"({U})|(\d{{1,3}}(?:[.,]\d{{1,2}})?)", g):
        teile.append(g[pos:m.start()])
        if m.group(1):
            teile.append(" cm"); hat_u = True
        else:
            teile.append(cm_text(m.group(2), komma))
        pos = m.end()
    teile.append(g[pos:])
    s = "".join(teile)
    s = re.sub(r"(\d|cm)-(\s+(?:und|oder)\s)", r"\1\2", s)       # «8- und 10» / «8 cm- und» → ohne Strich
    s = re.sub(r"\s{2,}", " ", s).replace("&nbsp;", " ")
    return s if hat_u else s + " cm"


def _nicht_steigend(g):
    """Eine Aufzählung in Zoll steigt («7, 8, 16 oder 20»). Fällt sie irgendwo, gehören nicht alle Zahlen zur
    Einheit (DRY 23.09.: «Kettensägenmodelle (45, 52, 58, 20-22 Zoll)» → 45/52/58 sind Modellnummern)."""
    z = [float(x.replace(",", ".")) for x in re.findall(r"\d{1,3}(?:[.,]\d{1,2})?(?![\d])", re.sub(r"(\d),\s", r"\1; ", g))]
    return any(a > b for a, b in zip(z, z[1:]))


def segmente(htm):
    """Zerlegt HTML in (ist_tag, text)-Stücke."""
    return [(bool(re.match(r"<[^>]*>$", t)), t) for t in re.split(r"(<[^>]+>)", htm) if t != ""]


def klartext(stuecke):
    out = []
    for tag, t in stuecke:
        if tag:
            out.append(" | " if BLOCK.match(t) else (" : " if ZELLE.match(t) else ""))
        else:
            out.append(H.unescape(t))
    return "".join(out)


def satz_vor(s, n=70):
    s = s[-n:]
    ms = list(SATZENDE.finditer(s))
    return s[ms[-1].end():] if ms else s


def satz_nach(s, n=45):
    s = s[:n]
    m = SATZENDE.search(s)
    return s[:m.start()] if m else s


def bearbeite(htm, titel=""):
    """→ (neues_html, [(art, alt, neu, kontext)], [(grund, fund, kontext)]). Ändert nur Textknoten.
    titel: Produkttitel — nennt er ein Branchenmass-Gerät (Smartwatch, TV-Halter, Laptop-Rucksack), bleiben
    Einzelwerte ohne Masswort in Zoll («Grösse von 16 Zoll» im Laptop-Rucksack = Laptopklasse)."""
    titel_branche = bool(BRANCHE.search(titel or ""))
    st = segmente(htm)
    aend, bleibt = [], []
    neu_st = []
    for i, (tag, t) in enumerate(st):
        if tag or not re.search(r"\d", t):
            neu_st.append(t); continue
        vorher_txt = klartext(st[max(0, i - 6):i])
        nachher_txt = klartext(st[i + 1:i + 5])
        out, pos = [], 0
        for m in GRUPPE.finditer(t):
            g = m.group(0)
            vor = vorher_txt + H.unescape(t[:m.start()])
            rest_roh = t[m.end():]
            sm = SCHWANZ.match(rest_roh)
            schwanz = sm.group(0) if sm else ""
            nach = H.unescape(rest_roh) + nachher_txt
            v_satz, n_satz = satz_vor(vor), satz_nach(nach)
            ctx = (v_satz[-45:] + "⟦" + H.unescape(g) + "⟧" + n_satz[:35]).replace("\n", " ")
            grund = None
            if re.search(r"\d\s*/\s*$", vor[-4:]) or re.match(r"\s*/\s*\d", nach):
                grund = "bruch"
            elif BETRAG_DAVOR.search(vor[-12:]):
                grund = "betrag"
            elif BRANCHE.search(v_satz[-60:]) or BRANCHE.search(schwanz) or BRANCHE.search(n_satz):
                grund = "branche"
            elif CM_NAH.search(vor[-22:]) or CM_NAH.search(nach[:28]):
                grund = "cm-schon-da"
            elif not re.search(SEP, g) and _nicht_steigend(g):
                grund = "liste-unklar"               # «(45, 52, 58, 20-22 Zoll)»: Modellnummern + Zoll gemischt
            elif (rest_roh.startswith("-") and not schwanz) or re.search(r"(?:Zoll|[Ii]nch)-,?\s*(?:und|oder)?\s*$", vor):
                grund = "bindestrich-folgt"          # «12-Zoll-, 13-Zoll- und 14-Zoll-Geräte»
            if grund:
                bleibt.append((grund, H.unescape(g), ctx)); continue
            kette = re.search(SEP, g) is not None and len(TEIL_NUM.findall(g)) >= 2 and re.search(r"[×xX*]", g)
            zeichen = re.search(U_ZEICHEN, g) is not None and not re.search(U_WORT, g)
            in_klammer = vor.rstrip().endswith("(") and nach.lstrip().startswith(")")
            label = (MASSWORT.search(v_satz[-45:]) is not None
                     or re.match(r"\s*(?:breit|lang|hoch|tief|dick|gross|groß)\b", n_satz) is not None)
            if titel_branche and not (kette or label or zeichen):
                bleibt.append(("branche-titel", H.unescape(g), ctx)); continue
            ersetzen = (kette or label or in_klammer or zeichen) and not schwanz
            umg = umrechnen_gruppe(g)
            if ersetzen:
                ca = "" if CA_DAVOR.search(vor[-10:]) else "ca. "
                neu = ca + umg
                out.append(t[pos:m.start()]); out.append(neu); pos = m.end()
                aend.append(("ersetzt", H.unescape(g), neu, ctx))
            else:
                ende = m.end() + len(schwanz)
                folgt = t[ende:]
                if folgt.lstrip().startswith("(") or (in_klammer and schwanz):
                    bleibt.append(("klammer-folgt", H.unescape(g), ctx)); continue
                zusatz = f" (ca. {umg})"
                out.append(t[pos:ende]); out.append(zusatz); pos = ende
                aend.append(("ergaenzt", H.unescape(g + schwanz), H.unescape(g + schwanz) + zusatz, ctx))
        out.append(t[pos:])
        neu_st.append("".join(out))
    return "".join(neu_st), aend, bleibt


# ───────────────────────── Shopify ─────────────────────────
def token():
    t = os.environ.get("SHOPIFY_ADMIN_TOKEN") or ""
    if not t and os.path.exists("/tmp/cj_shop_token.txt"):
        t = open("/tmp/cj_shop_token.txt").read()
    return t.strip()


def gql(q, v=None):
    tok = token()
    if not tok:
        raise RuntimeError("kein Shopify-Token (/tmp/cj_shop_token.txt fehlt)")
    letzte = None
    for i in range(8):
        try:
            r = urllib.request.Request(f"https://{SHOP}/admin/api/2026-01/graphql.json",
                                       data=json.dumps({"query": q, "variables": v or {}}).encode(),
                                       headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
            d = json.loads(urllib.request.urlopen(r, timeout=60).read())
            if d.get("errors") and "THROTTLED" in json.dumps(d["errors"]):
                ts = ((d.get("extensions") or {}).get("cost") or {}).get("throttleStatus") or {}
                time.sleep(min(20, max(2, (1000 - float(ts.get("currentlyAvailable") or 0)) / float(ts.get("restoreRate") or 100))))
                continue
            nachlauf(d)
            if d.get("data") is not None:
                return d
            letzte = d.get("errors")
        except Exception as e:  # noqa: BLE001
            letzte = f"{type(e).__name__}: {e}"
        time.sleep(3 * (i + 1))
    # Lauter Abbruch statt {} — ein leeres Ergebnis darf nie als «geschrieben» quittiert werden.
    raise RuntimeError(f"Shopify antwortet nicht: {str(letzte)[:200]}")


def zaehle(q):
    d = gql('query($q:String){productsCount(query:$q,limit:null){count precision}}', {"q": q})
    pc = d["data"]["productsCount"]
    return pc["count"], pc["precision"]


# «″» und «"» kennt die Shopify-Suche nicht (gemessen 23.09.: «status:active AND ″» = 0, obwohl der Export vom 22.09.
# 6 Produkte damit trägt). Diese Produkte liefert ein frischer Voll-Export als ZUSATZ-Quelle (nur die IDs — gelesen
# und geschrieben wird immer der Live-Text).
SUCHEN = ['status:active AND "Zoll"', 'status:active AND inch']
DECKEL_SUCHE = 5000          # mehr Treffer = Suchwort wird ignoriert (Kanarienvogel) → diese Suche überspringen
EXPORT_ZUSATZ = os.environ.get("EXPORT_ZUSATZ", "")


def export_zusatz():
    """Neuester /tmp/aktiv_bulk_*.jsonl (höchstens 4 Tage alt) → IDs mit Zahl+Zoll-Muster (auch ″/")."""
    import glob
    kand = [EXPORT_ZUSATZ] if EXPORT_ZUSATZ else sorted(glob.glob("/tmp/aktiv_bulk_*.jsonl"), key=os.path.getmtime)[-1:]
    if not kand or not os.path.exists(kand[0]) or time.time() - os.path.getmtime(kand[0]) > 4 * 86400:
        return []
    out = []
    for z in open(kand[0], encoding="utf-8"):
        try:
            o = json.loads(z)
        except ValueError:
            continue
        h = o.get("descriptionHtml") or ""
        if o.get("id", "").startswith("gid://shopify/Product/") and GRUPPE.search(h) \
                and bearbeite(h, o.get("title") or "")[1]:
            out.append((o["id"], o.get("handle", "")))
    print(f"  Zusatz aus {os.path.basename(kand[0])}: {len(out)} Produkte mit Umrechnungsbedarf (Stand Export)", flush=True)
    return out


def kandidaten_live():
    """Alle aktiven Produkte, deren Text die Einheit trägt — LIVE, mit Unsinnswort-Gegenprobe."""
    n0, p0 = zaehle('status:active AND "xqzvwkzoll"')
    if n0 != 0:
        print(f"PAUSE (Suchfilter wirkungslos: Unsinnswort ergibt {n0} {p0}) — kein Ergebnis ist kein Befund")
        return None
    ids, gesehen = [], set()
    for q in SUCHEN:
        n, p = zaehle(q)
        print(f"  Suche «{q}»: {n} ({p})", flush=True)
        if n > DECKEL_SUCHE:
            print(f"  ⚠️ Suche «{q}» liefert {n} — Suchwort wirkt nicht, übersprungen", flush=True); continue
        cur = None
        while True:
            d = gql('query($q:String,$c:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor}'
                    ' nodes{id handle title descriptionHtml}}}', {"q": q, "c": cur})
            pg = d["data"]["products"]
            for x in pg["nodes"]:
                if x["id"] in gesehen:
                    continue
                gesehen.add(x["id"])
                # Vorfilter am gelesenen Text: nur Produkte mit Umrechnungsbedarf werden gesperrt und neu gelesen
                # (sonst täglich ~1'300 Sperr-/Lesezyklen für Smartwatch-Displays, die ohnehin bleiben).
                h = x.get("descriptionHtml") or ""
                if GRUPPE.search(h) and bearbeite(h, x.get("title") or "")[1]:
                    ids.append((x["id"], x["handle"]))
            if not pg["pageInfo"]["hasNextPage"]:
                break
            cur = pg["pageInfo"]["endCursor"]
    n_live = len(ids)
    for gid, h in export_zusatz():
        if gid not in gesehen:
            gesehen.add(gid); ids.append((gid, h))
    print(f"  davon aus der Live-Suche {n_live}, nur aus dem Export {len(ids) - n_live}", flush=True)
    return ids


def geerbte_sperre_freigeben():
    """Vom Aufseher geerbte Lauf-Sperre (TXTLOCK, fd 8) sofort lösen. Einmal je Prozess, VOR dem eigenen Öffnen.
    23.09. gemessen: liechtenstein_raus hielt die Text-Sperre (TXTLOCK) und wartete in der Shopify-Schranke auf
    Platz 1; produkttexte_du_form hielt Platz 1 und wartete auf die Text-Sperre — 80 Min Stillstand aller
    Text-Schreiber. Wer die Sperre nur erbt, soll sie nicht über Suche/Warten hinweg festhalten."""
    for fd in os.listdir("/proc/self/fd"):
        try:
            if os.readlink(f"/proc/self/fd/{fd}") == TEXTSPERRE:
                fcntl.flock(int(fd), fcntl.LOCK_UN); os.close(int(fd))
                print(f"  geerbte Lauf-Sperre (fd {fd}) freigegeben — gesperrt wird je Produkt", flush=True)
        except OSError:
            pass


class TextSperre:
    """Je Produkt sperren (lesen → schreiben → rücklesen), nie für den ganzen Lauf.
    Hat ein Aufrufer die Sperre für den ganzen Lauf VERERBT (Aufseher-TXTLOCK auf fd 8), wird sie hier
    freigegeben — sonst wartete dieser Prozess auf sich selbst (22.09.: 52 Min Selbst-Deadlock bei du_form)."""

    def __init__(self, warte=300):
        self.warte = warte
        geerbte_sperre_freigeben()
        self.f = open(TEXTSPERRE, "a")

    def __enter__(self):
        # BLOCKIEREND mit Frist (alarm): ein Nicht-blockierendes Pollen verliert gegen du_form, das nach 0.25 s
        # wieder sperrt; ein wartender flock wird beim Freigeben geweckt.
        import signal

        def _frist(*a):
            raise TimeoutError(f"Text-Sperre seit {self.warte} s belegt")
        alt = signal.signal(signal.SIGALRM, _frist)
        signal.alarm(self.warte)
        try:
            fcntl.flock(self.f, fcntl.LOCK_EX)
        finally:
            signal.alarm(0); signal.signal(signal.SIGALRM, alt)
        return self

    def __exit__(self, *a):
        fcntl.flock(self.f, fcntl.LOCK_UN)
        time.sleep(0.2)          # Wartende kommen dran


class _KeineSperre:
    def __enter__(self): return self
    def __exit__(self, *a): pass


def quitt(f, gid, handle, art, info=""):
    f.write(f"{gid}\t{handle}\t{time.strftime('%Y-%m-%dT%H:%M')}\t{art}\t{info}\n"); f.flush()


def main():
    if "--selbsttest" in sys.argv:
        return selbsttest()
    print(f"zoll_zu_cm {time.strftime('%Y-%m-%d %H:%M')} · {'SCHARF' if SCHARF else 'TROCKEN'} · CAP {CAP}", flush=True)
    geerbte_sperre_freigeben()
    kand = kandidaten_live()
    if kand is None:
        return 0
    print(f"Kandidaten mit Umrechnungsbedarf: {len(kand)}", flush=True)
    # TROCKEN liest nur — keine Text-Sperre nötig (gemessen 23.09.: die Sperre stand 80 Min in einem Verklemmen
    # zweier anderer Werkzeuge; ein Trockenlauf soll davon nicht abhängen).
    sperre = TextSperre() if SCHARF else _KeineSperre()
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    lf = open(LEDGER, "a")
    n_prod = n_ers = n_erg = n_ohne = n_fehl = gezeigt = 0
    gruende = {}
    for gid, handle in kand:
        if n_prod >= CAP:
            print(f"CAP {CAP} erreicht — nächster Lauf macht weiter"); break
        try:
            with sperre:
                d = gql('query($id:ID!){product(id:$id){status title descriptionHtml}}', {"id": gid})
                p = d["data"]["product"]
                if not p or p["status"] != "ACTIVE":
                    continue
                alt = p["descriptionHtml"] or ""
                titel = p.get("title") or ""
                neu, aend, bleibt = bearbeite(alt, titel)
                for g, _, _ in bleibt:
                    gruende[g] = gruende.get(g, 0) + 1
                if not aend or neu == alt:
                    n_ohne += 1
                    if SCHARF:
                        quitt(lf, gid, handle, "geprueft-bleibt", ",".join(sorted({b[0] for b in bleibt})))
                    continue
                if gezeigt < ZEIGE:
                    gezeigt += 1
                    print(f"\n── {handle}")
                    for art, a, b, ctx in aend:
                        print(f"   [{art}] «{a}» → «{b}»\n        {ctx}")
                if not SCHARF:
                    n_prod += 1
                    n_ers += sum(1 for x in aend if x[0] == "ersetzt"); n_erg += sum(1 for x in aend if x[0] == "ergaenzt")
                    continue
                r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}',
                        {"i": {"id": gid, "descriptionHtml": neu}})
                pu = r["data"]["productUpdate"] or {}
                if pu.get("userErrors"):
                    n_fehl += 1; print(f"  ✗ {handle}: {pu['userErrors']}"); continue
                # Rücklesen: frisch vom Objekt, nicht aus der Mutationsantwort allein.
                zr = gql('query($id:ID!){product(id:$id){descriptionHtml}}', {"id": gid})
                jetzt = zr["data"]["product"]["descriptionHtml"] or ""
                _, rest, _ = bearbeite(jetzt, titel)
                if rest or " cm" not in jetzt:
                    n_fehl += 1; print(f"  ✗ {handle}: Rücklesen zeigt noch {len(rest)} Zoll-Masse"); continue
                n_prod += 1
                n_ers += sum(1 for x in aend if x[0] == "ersetzt"); n_erg += sum(1 for x in aend if x[0] == "ergaenzt")
                quitt(lf, gid, handle, "umgerechnet", " | ".join(f"{a}→{b}" for _, a, b, _ in aend)[:400])
        except TimeoutError as e:
            print(f"PAUSE ({e}) — nächster Lauf macht weiter"); return 0
        except RuntimeError as e:
            print(f"PAUSE ({e}) — nichts falsch quittiert"); return 0
    print(f"\nBleibt (Branchenmass/Bruch/cm schon da …): {gruende}")
    wort = "umgerechnet" if SCHARF else "würden umgerechnet (TROCKEN)"
    print(f"{bilanz()}")
    print(f"FERTIG: {n_prod} Produkte {wort} · {n_ers} ersetzt · {n_erg} ergänzt · {n_ohne} ohne Bedarf · {n_fehl} Fehler")
    return 0


# ───────────────────────── Selbsttest (Kanarienvögel) ─────────────────────────
FAELLE = [
    ("<p>Masse: 9.1 × 3.7 × 6.2 Zoll</p>", "Masse: ca. 23 × 9.4 × 16 cm"),
    ("<li>Masse pro Vorhang: 52 Zoll B x 63 Zoll L</li>", "ca. 132 cm B x 160 cm L"),
    ("<li>Grösse: 25x20 Zoll</li>", "ca. 64x51 cm"),
    ("<li>1,3 Zoll IPS Full-Touch-Display</li>", None),
    ("<p>passend für Laptops bis 15.6 Zoll.</p>", None),
    ("<p>Standardisierte 3/4-Zoll-Verbindung (26 mm)</p>", None),
    ("<p>Kompatibel mit 2,5-Zoll-SATA-Laufwerken</p>", None),
    ("<p>Durchmesser: 3,54″ (9 cm)</p>", None),
    ("<p>Zollgebühren sind inklusive, keine Zollabfertigung nötig.</p>", None),
    ("<p>Teller (9 Zoll), 4 Tassen</p>", "Teller (ca. 23 cm)"),
    ("<p>Dieser stilvolle 20-Zoll-Trolley ist ideal</p>", "20-Zoll-Trolley (ca. 51 cm) ist"),
    ("<p>Kurze Haare in 8- und 10-Zoll-Länge</p>", "8- und 10-Zoll-Länge (ca. 20 und 25 cm)"),
    ("<p>Er misst 10 Zoll und besteht aus Polyester</p>", "Er misst ca. 25 cm und"),
    ("<p>Keramik, 7,5 Zoll</p>", "Keramik, 7,5 Zoll (ca. 19 cm)"),
    ("<p>eine Länge von 7, 8, 16, 18 oder 20 Zoll.</p>", "ca. 18, 20, 41, 46 oder 51 cm"),
    ("<p>Doppellagige Ballons in 10- oder 12-Zoll-Grössen (50 Stk.)</p>", None),
    ("<p>Der \"Liegender T5019\" Sportwagen</p>", None),
    ("<p>1/4\" Schaft für gängige Oberfräsen</p>", None),
    ("<p>Unterstützt Projektionsgrössen von 30 bis 138 Zoll</p>", None),
    ("<p>Kosten: CHF 5 Zoll-Pauschale</p>", None),
    ("<p>Slim: 3.9 x 2.6 x 0.6 inches, 3.5 oz</p>", "ca. 9.9 x 6.6 x 1.5 cm, 3.5 oz"),
    ("<p><strong>Masse:</strong> 24.02 × 13.78 × 4.72 Zoll</p>", "ca. 61 × 35 × 12 cm"),
    ("<p>Kugel-Durchmesser: 14.5 cm (6 Zoll)</p>", None),
    ("<p>Grösse L enthält 2x 12x18 Zoll und 1x 12x30 Zoll</p>", "2x ca. 30x46 cm und 1x ca. 30x76 cm"),
    ("<p>passend für 12-Zoll-, 13-Zoll- und 14-Zoll-Geräte</p>", None),
    ("<p>Mit einer Grösse von 16 Zoll bietet er Platz</p>", "16 Zoll (ca. 41 cm) bietet"),
    ("<p>Die Anzeige hat eine Grösse von 4.2 Zoll</p>", None),
    ("<p>Klänge der 7-Zoll Steel Tongue Drum</p>", "7-Zoll (ca. 18 cm) Steel"),
    ("<p>Passend für Modelle (45, 52, 58, 20-22 Zoll)</p>", None),
    ("<p>passend für Velos mit 26, 27.5 oder 29 Zoll Bereifung</p>", None),
    ("<p>Masse: 10,5 und 12 Zoll</p>", "ca. 27 und 30 cm"),
    ("<p>passend für Halsumfang 8 bis 26 Zoll</p>", "Halsumfang ca. 20 bis 66 cm"),
]


def selbsttest():
    fehler = 0
    for eingabe, erwartet in FAELLE:
        neu, aend, bleibt = bearbeite(eingabe)
        ok = (neu == eingabe) if erwartet is None else (erwartet in neu)
        if not ok:
            fehler += 1
        print(f"{'OK ' if ok else 'XX '} {H.unescape(re.sub('<[^>]+>', '', neu))[:90]}"
              + ("" if ok else f"   ← erwartet {erwartet!r} · {aend} · {bleibt}"))
    # Titel-Kontext: im Laptop-Rucksack bleibt die Grössenklasse, die Masskette wird trotzdem umgerechnet.
    for eingabe, titel, erwartet in [
            ("<p>Mit einer Grösse von 16 Zoll bietet er Platz</p>", "Business Laptop Rucksack", None),
            ("<p>Masse: 12 x 4 x 16 Zoll</p>", "Business Laptop Rucksack", "ca. 30 x 10 x 41 cm")]:
        neu, aend, bleibt = bearbeite(eingabe, titel)
        ok = (neu == eingabe) if erwartet is None else (erwartet in neu)
        if not ok:
            fehler += 1
        print(f"{'OK ' if ok else 'XX '} {H.unescape(re.sub('<[^>]+>', '', neu))[:90]}"
              + ("" if ok else f"   ← erwartet {erwartet!r} · {aend} · {bleibt}"))
    print(f"Selbsttest: {len(FAELLE) + 2 - fehler}/{len(FAELLE) + 2} OK")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
