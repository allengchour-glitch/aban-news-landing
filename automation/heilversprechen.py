"""Streicht medizinische Messversprechen aus Wearables und Heilaussagen aus Produkttexten.

WARUM EIN ZWEITER LAUF (12.08.2026): Gestern wurde das Blutzucker-Versprechen aus 11 Armbändern
entfernt. Die Nachkontrolle zeigt, dass der Fix auf ein WORT zielte statt auf das Muster:
dieselben Armbänder versprechen weiterhin EKG und Blutdruckmessung, und drei Zeilen tiefer
stehen «Harnsäure» und «Blutfett» — Werte, die am Handgelenk noch weniger messbar sind als
Blutzucker. 132 aktive Wearables sind betroffen, alle im Google-Kanal.

Warum das mehr ist als ein Textfehler: Wer sein Blutdruckmedikament nach der Anzeige eines
CHF-40-Armbands dosiert, kann echten Schaden nehmen. Rechtlich macht eine Messfunktion für
Vitalparameter das Produkt zum Medizinprodukt (MepV) — das Armband hat dafür keine Zulassung.

DREI GRUPPEN:
 (A) Wearables mit unhaltbaren Messversprechen (Blutdruck, EKG, Harnsäure, Blutfett, Lipide).
     Die Behauptung wird chirurgisch aus Titel und Aufzählung entfernt; Herzfrequenz,
     Blutsauerstoff, Schlaf und Schritte bleiben — die kann ein optischer Sensor tatsächlich.
 (B) Heil- und Krankheitsaussagen bei gewöhnlichen Produkten: «Langfristige Ergebnisse bei
     Ischias, Spinalstenose oder Hernien — empfohlen von Chiropraktikern» für ein
     Schaumstoffkissen zu CHF 8.90, «lindert Fieber» für eine Schlafmaske, «Ideal zur
     Myopiehilfe» für eine Augenmaske, Kosmetika gegen Krampfadern und Nagelpilz.

⚠️ DREI AUSNAHMEN, alle beim Durchlesen der Treffer entdeckt und alle wichtig:
 1. «Manuelle Erfassung von Blutdruck, Menstruationszyklus» ist KEIN Messversprechen — die
    Nutzerin tippt ihren selbst gemessenen Wert ein. Das ist eine Tagebuchfunktion und bleibt.
 2. Eine Aufzählung darf nicht zum Torso werden. «Misst Herzfrequenz, Blutsauerstoff und
    Blutdruck» wird zu «Misst Herzfrequenz und Blutsauerstoff» — nicht zu «Misst Herzfrequenz,
    Blutsauerstoff und». Bleibt ein Satzfragment übrig, fällt der ganze Punkt weg.
 3. «EKG» im Musternamen («Mountain EKG»-Shirt) und die SR626SW-Batterie, die
    Blutzuckermessgeräte als Einsatzzweck nennt, sind Fehltreffer. Deshalb greift Gruppe A nur
    bei Armband/Uhr/Ring/Tracker.

DRY=1 zeigt jede Zeile vorher/nachher.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_heilversprechen.txt"

TRAGBAR = re.compile(r'armband|smart-?watch|\buhr\b|watch|\bring\b|tracker|\bband\b', re.I)

# Der Messwert samt vorangehendem Verhältniswort, damit «Kontrolle DES Blutdrucks» ganz fällt.
MESSWERT = re.compile(
    r'(?:\b(?:des|der|von|für|zur|zum|und|sowie)\s+)?'
    r'\b(?:Blutdruck\w*|EKG(?:[- ]?\w+)?|ECG(?:[- ]?\w+)?|Harns[äa]ure\w*|Blutfett\w*|'
    r'Lipidprofil\w*|Blutzucker\w*)\b', re.I)
MESSWERT_ROH = re.compile(r'Blutdruck|EKG|ECG|Harns[äa]ure|Blutfett|Lipidprofil|Blutzucker', re.I)
# Selbst eingetragene Werte sind eine Tagebuchfunktion, kein Messversprechen.
MANUELL = re.compile(r'manuell|selbst\s+(?:erfass|eintrag|eingeb)|Eingabe', re.I)

# Krankheiten und Heilaussagen bei Ware, die kein Medizinprodukt ist.
HEILSATZ = re.compile(
    r'[^.!?]*\b(?:Ischias|Spinalstenose|Hernie\w*|Bandscheibenvorfall|Rosacea|Purpura|'
    r'Krampfadern|Nagelpilz|Myopie\w*|Kurzsichtigkeit|Arthrose|Rheuma|Neurodermitis|'
    r'Schuppenflechte|Psoriasis|Migr[äa]ne|Fieber|Karies|Parodontitis|Hämorrhoiden|'
    r'Depression\w*|Tinnitus)\b[^.!?]*[.!?]?', re.I)
# «heilt», «kuriert», «behandelt» — Wirkversprechen ohne Krankheitsnamen.
HEILWORT = re.compile(r'[^.!?]*\b(?:heilt|kuriert|therapiert|behandelt\s+(?:erfolgreich|wirksam)|'
                      r'medizinisch\s+(?:bewiesen|nachgewiesen)|von\s+[ÄA]rzten\s+empfohlen|'
                      r'empfohlen\s+von\s+(?:Chiropraktikern|[ÄA]rzten|Physiotherapeuten))'
                      r'\b[^.!?]*[.!?]?', re.I)
# Wo eine Krankheit nur den Anlass beschreibt, ist nichts zu beanstanden.
HEIL_AUSNAHME = re.compile(r'Fieberthermometer|Fiebermesser|Migr[äa]ne-?Brille|Kost[üu]m|'
                           r'Fasnacht|Karneval', re.I)

LI = re.compile(r'<li\b[^>]*>(.*?)</li>', re.S | re.I)


def gql(q, v=None):
    with open("/tmp/_hv.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_hv.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    return {}


def glaetten(s):
    """Räumt auf, was das Herausschneiden aus einer Aufzählung hinterlässt."""
    s = re.sub(r'\s*,\s*(?=\)|$)', '', s)          # «(Herzfrequenz, )» → «(Herzfrequenz)»
    s = re.sub(r'\(\s*\)', '', s)                   # leere Klammer
    s = re.sub(r'\s*,\s*,+', ',', s)
    s = re.sub(r',\s*und\b', ' und', s, flags=re.I)
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip(" ,;·-–")


TORSO = re.compile(r'(?:\b(?:und|sowie|mit|von|des|der|für|zur|zum|misst|erfasst|'
                   r'[ÜU]berwachung|Kontrolle|Messung)\s*[,:]?)$', re.I)


def zeile_saeubern(text):
    """Gibt den bereinigten Aufzählungspunkt zurück — oder None, wenn er ganz wegfällt."""
    if MANUELL.search(text):
        return text                                  # Tagebuchfunktion, kein Versprechen
    neu = glaetten(MESSWERT.sub("", text))
    roh = re.sub(r'<[^>]+>', ' ', neu).strip()
    if len(roh) < 10 or TORSO.search(roh) or not re.search(r'[A-Za-zÄÖÜäöü]{4}', roh):
        return None
    return neu


def html_saeubern(html):
    treffer = []

    def ersetze(m):
        inner = m.group(1)
        if not MESSWERT_ROH.search(inner):
            return m.group(0)
        neu = zeile_saeubern(inner)
        treffer.append((re.sub(r'<[^>]+>', ' ', inner).strip(),
                        "(Punkt entfernt)" if neu is None
                        else re.sub(r'<[^>]+>', ' ', neu).strip()))
        return "" if neu is None else m.group(0).replace(inner, neu)

    neu = LI.sub(ersetze, html)

    # Fliesstext ausserhalb der Aufzählung: nur ganze Sätze anfassen.
    def satz(m):
        s = m.group(0)
        if MANUELL.search(s):
            return s
        treffer.append((re.sub(r'<[^>]+>', ' ', s).strip()[:110], "(Satz entfernt)"))
        return ""
    neu = re.sub(r'[^.!?<>]*(?:Blutdruck|Harns[äa]ure|Blutfett|Lipidprofil)[^.!?<>]*[.!?]',
                 satz, neu)
    return re.sub(r'\s{2,}', ' ', neu), treffer


def titel_saeubern(t):
    neu = glaetten(MESSWERT.sub("", t))
    neu = re.sub(r'\s*&\s*$', '', neu).strip(" ·-–,&")
    neu = re.sub(r'\b(mit|für|und)\s*$', '', neu, flags=re.I).strip(" ·-–,&")
    return neu


def main():
    wearables, heil = [], []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        t, html = p["title"], (p.get("descriptionHtml") or "")
        if TRAGBAR.search(t) and MESSWERT_ROH.search(t + html):
            neu_html, tr = html_saeubern(html)
            neu_t = titel_saeubern(t) if MESSWERT_ROH.search(t) else t
            if (neu_html != html or neu_t != t) and len(neu_t) >= 12:
                wearables.append((p["id"], t, neu_t, html, neu_html, tr))
            continue
        if HEIL_AUSNAHME.search(t):
            continue
        if HEILSATZ.search(html) or HEILWORT.search(html):
            neu = HEILWORT.sub("", HEILSATZ.sub("", html))
            neu = re.sub(r'<li\b[^>]*>\s*</li>', '', neu)
            neu = re.sub(r'<p\b[^>]*>\s*</p>', '', neu)
            neu = re.sub(r'\s{2,}', ' ', neu)
            if neu != html:
                heil.append((p["id"], t, html, neu))

    print(f"(A) Wearables mit Messversprechen: {len(wearables)}", flush=True)
    for _, alt, neu_t, _, _, tr in wearables[:8 if DRY else 3]:
        print(f"\n   {alt[:60]}", flush=True)
        if neu_t != alt:
            print(f"      Titel → «{neu_t[:60]}»", flush=True)
        for a, b in tr[:4]:
            print(f"      «{a[:64]}»\n         → «{b[:64]}»", flush=True)
    print(f"\n(B) Heil-/Krankheitsaussagen: {len(heil)}", flush=True)
    for _, t, alt, neu in heil[:8 if DRY else 3]:
        weg = [x.strip() for x in HEILSATZ.findall(alt)][:1]
        m = HEILSATZ.search(re.sub(r'<[^>]+>', ' ', alt)) or HEILWORT.search(
            re.sub(r'<[^>]+>', ' ', alt))
        print(f"   {t[:44]:<46} entfernt: «{(m.group(0).strip() if m else '')[:70]}»", flush=True)
    if DRY:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n1 = n2 = 0
    for gid, alt, neu_t, _, neu_html, _ in wearables:
        if gid in done:
            continue
        eingabe = {"id": gid, "descriptionHtml": neu_html}
        if neu_t != alt:
            eingabe["title"] = neu_t
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": eingabe})
        e = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {alt[:36]}: {e[0]['message'][:60]}", flush=True)
            continue
        n1 += 1
        f.write(f"{gid}\twearable-messversprechen\t{neu_t}\n")
        if n1 % 40 == 0:
            f.flush()
            print(f"  … {n1}/{len(wearables)}", flush=True)
        time.sleep(0.3)
    for gid, t, _, neu in heil:
        if gid in done:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": {"id": gid, "descriptionHtml": neu}})
        e = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if e:
            continue
        n2 += 1
        f.write(f"{gid}\theilaussage-gestrichen\t{t}\n")
        time.sleep(0.3)
    f.flush()
    print(f"FERTIG: {n1} Wearables bereinigt, {n2} Heilaussagen gestrichen")


if __name__ == "__main__":
    main()
