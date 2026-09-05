"""Zieht die Heilversprechen-Bereinigung ins SEO-Feld nach — und repariert, was sie zerbrach.

ZWEI FEHLER MEINES EIGENEN LAUFS VON HEUTE, beide in der Nachkontrolle aufgefallen:

1. DAS VERSPRECHEN IST NICHT WEG, ES STEHT WOANDERS. Der Lauf hat Titel und Beschreibungstext
   von EKG-, Blutdruck-, Harnsäure- und Blutfett-Behauptungen befreit — die SEO-Beschreibung
   nicht. Und die ist beim Import als eingefrorene KOPIE des alten Titels entstanden:

       Titel jetzt:  «Fitness-Smartwatch mit Herzfrequenz-Tracking»
       SEO sagt:     «Smartwatch mit EKG, Blutdruck- und Blutzuckermessung – jetzt bei …»

   Genau dieses Feld liest Google Merchant als `description`. Für den Feed war die Behauptung
   also nie weg. 46 aktive Produkte, alle im Google-Kanal.
   → Lehre, zum zweiten Mal an einem Tag: Wer eine Aussage aus einem Feld entfernt, muss
     prüfen, welches ANDERE Feld sie trägt. Beim Refurb-Zustand war es dasselbe Muster.

2. FÜNF TITEL SIND DABEI KAPUTTGEGANGEN. Mein Glätter entfernte den Messwert, räumte aber nur
   an den ENDEN auf — mitten im Satz blieb die Lücke stehen:

       «Smart Armband mit & Körpertemperaturmessung»
       «V19 Smart Armband mit , PPG und SpO2»
       «Smart-Armband - & Temperaturmessung»

   Das steht seit heute Nachmittag so im Shop. Ein Reiniger, der sichtbaren Schaden
   hinterlässt, ist schlimmer als der Fehler, den er behebt.

DIE REPARATUR NUTZT DEN SCHADEN VON GESTERN: Weil die SEO-Beschreibung den ORIGINALTITEL
enthält, lässt sich der richtige Titel daraus neu herleiten — Originaltitel nehmen, den
Messwert sauber herausschneiden, fertig. Kein Raten nötig.

⚠️ Blutsauerstoff/SpO2 bleibt unangetastet (116 Produkte): optische Pulsoximetrie ist bei
Konsumenten-Wearables üblich und war nie Teil des Problems. Und «Mountain EKG Kurzarm-Shirt»
ist ein MUSTER auf einem Shirt — deshalb greift die Prüfung nur bei Armband, Uhr, Ring und
Tracker.

DRY=1 zeigt jede Änderung.
"""
import json, os, re, subprocess, time

TOK = open("/tmp/cj_shop_token.txt").read().strip()
DRY = os.environ.get("DRY") == "1"
EXPORT = os.environ.get("EXPORT", "/tmp/export.jsonl")
LEDGER = "dropship/_heilversprechen_seo.txt"

TRAGBAR = re.compile(r'armband|smart-?watch|\buhr\b|watch|\bring\b|tracker|\bband\b', re.I)
MESSWERT_ROH = re.compile(r'Blutdruck|EKG|ECG|Harns[äa]ure|Blutfett|Lipidprofil|Blutzucker', re.I)
MESSWERT = re.compile(
    r'(?:\b(?:des|der|von|für|zur|zum|und|sowie)\s+)?'
    r'\b(?:Blutdruck\w*|EKG(?:[- ]?\w+)?|ECG(?:[- ]?\w+)?|Harns[äa]ure\w*|Blutfett\w*|'
    r'Lipidprofil\w*|Blutzucker\w*)\b', re.I)
MESSWORT = r'(?:Blutdruck|EKG|ECG|Harns[äa]ure|Blutfett|Lipidprofil|Blutzucker)'
# «… – jetzt bei LuxeStyle CH bestellen. Gratis-Versand …» ist der angehängte Baustein,
# davor steht der Originaltitel. Der Baustein hat mehrere Fassungen («– bei LuxeStyle
# Schweiz», «– der Trend-Hit bei LuxeStyle»), gemeinsam ist der Gedankenstrich vor einem
# Abschnitt, in dem LuxeStyle vorkommt.
SEO_ANHANG = re.compile(r'\s*[–—-]\s*(?=[^–—]*LuxeStyle)')


def gql(q, v=None):
    with open("/tmp/_hs.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    for _ in range(6):
        r = subprocess.run(["curl", "-s", "--max-time", "60",
                            "https://au3j0y-hq.myshopify.com/admin/api/2024-10/graphql.json",
                            "-H", "X-Shopify-Access-Token: " + TOK,
                            "-H", "Content-Type: application/json",
                            "--data-binary", "@/tmp/_hs.json"], capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
            if d.get("data") is not None:
                return d
        except Exception:
            pass
        time.sleep(6)
    # ⚠️ 05.09.2026: Hier stand `return {}`. Faellt die Anmeldung aus (die Custom-App
    # war weg), kann der Aufrufer ein leeres Dict nicht von einer geglueckten Mutation
    # ohne userErrors unterscheiden — er quittiert dann Arbeit, die nie stattfand.
    # Ein lauter Abbruch ist hier richtig: eine falsche Quittung ueberspringt den Fall
    # fuer immer, ein Absturz nur diesen Lauf.
    raise RuntimeError("Shopify antwortet nicht (alle Versuche erschoepft) — Lauf abgebrochen, damit nichts falsch quittiert wird")


def glaetten(s):
    """Räumt auch MITTEN im Satz auf — das hat dem ersten Lauf gefehlt."""
    # «mit & Körpertemperatur» / «mit , PPG» → das Bindewort mit der Lücke verschwindet.
    s = re.sub(r'\b(mit|und|für|aus)\s*[,&·]\s*', r'\1 ', s, flags=re.I)
    s = re.sub(r'\s*[-–]\s*[&,]\s*', ' ', s)
    s = re.sub(r'(?<![\wäöüß])[-–]\s*(?=und\b|,|$)', '', s)
    s = re.sub(r'\s*,\s*(?=\)|$)', '', s)
    s = re.sub(r'\(\s*\)', '', s)
    s = re.sub(r'\s*,\s*,+', ',', s)
    s = re.sub(r',\s*und\b', ' und', s, flags=re.I)
    s = re.sub(r'\s{2,}', ' ', s)
    s = s.strip(" ,;·-–&")
    s = re.sub(r'^(?:und|sowie|oder|,)\s+', '', s, flags=re.I)
    # Ein Titel, der auf einem Bindewort endet, ist ein Rumpf.
    s = re.sub(r'\s+(?:mit|und|für|aus|sowie|oder)\s*$', '', s, flags=re.I)
    # Und ein Bindewort direkt VOR einem Trennzeichen ist genauso ein Rumpf — im SEO-Feld
    # steht hinter dem Titel noch «– jetzt bei LuxeStyle …», deshalb stand «Smartwatch mit –
    # jetzt bei …» da, bis diese Zeile dazukam.
    s = re.sub(r'\s+(?:mit|und|für|aus|sowie|oder)\s*(?=[–—,.;:]|$)', '', s, flags=re.I)
    return (s[:1].upper() + s[1:]) if s else s


def ohne_messwert(text):
    # «Herz- & Blutdruckmessung» → «Herzmessung»: das Grundwort gehört ans erste Glied zurück.
    # Die Regel kannte nur «und» — mit «&» blieb «Herz» als Rumpf stehen, und genau so steht
    # es seit dem ersten Lauf im Shop.
    neu = re.sub(r'(\w+)-\s*(?:und|&|sowie)\s*' + MESSWORT
                 + r'(messung|[üu]berwachung|tracking|kontrolle)',
                 r'\1\2', text, flags=re.I)
    neu = re.sub(MESSWORT + r'-\s*(?:und|&|sowie)\s*(\w)', r'\1', neu, flags=re.I)
    neu = re.sub(MESSWORT + r'-\s*(?=&|,|und\b)', '', neu, flags=re.I)
    # «Blutdruck-Uhr» → «Uhr», «Blutzucker-Tracking» → das ganze Merkmal fällt weg.
    neu = re.sub(r'\bmit\s+' + MESSWORT + r'-\w+', '', neu, flags=re.I)
    neu = re.sub(MESSWORT + r'-(?=\w)', '', neu, flags=re.I)
    return glaetten(MESSWERT.sub("", neu))


def main():
    aufgaben = []
    for zeile in open(EXPORT):
        p = json.loads(zeile)
        if p["status"] != "ACTIVE":
            continue
        t = p["title"]
        if not TRAGBAR.search(t):
            continue
        seo = p.get("seo") or {}
        sd, st = seo.get("description") or "", seo.get("title") or ""
        kaputt = bool(re.search(r'\b(mit|und|für)\s*[,&·]|\s[-–]\s*[&,]|\s{2,}|'
                                r'\s(?:mit|und|für)\s*$', t))
        if not (MESSWERT_ROH.search(sd) or MESSWERT_ROH.search(st) or kaputt):
            continue

        # Der Originaltitel steckt unversehrt in der SEO-Beschreibung — daraus lässt sich der
        # richtige Titel neu bilden, statt den Rumpf zu flicken.
        original = SEO_ANHANG.split(sd, 1)[0].strip() if sd else ""
        kandidat = ohne_messwert(original) if original else ""
        neu_t = t
        if kaputt and len(kandidat) >= 14:
            neu_t = kandidat
        elif kandidat and len(kandidat) > len(t) and kandidat.lower().startswith(t.lower()):
            # ⚠️ ABGESCHNITTENE TITEL, die kein Trennzeichen hinterliessen und deshalb nicht
            # als «kaputt» auffielen: «Smartes Sportarmband mit Herz» war einmal «… mit Herz-
            # & Blutdruckmessung». Der Rumpf endet auf einem halben Wort, sieht aber wie ein
            # ganzer Titel aus. Ist der aus dem Original hergeleitete Titel LÄNGER und
            # beginnt mit dem heutigen, war der heutige eine Kürzung.
            neu_t = kandidat
        elif kaputt:
            neu_t = glaetten(t)
        # ⚠️ SEO-Beschreibung NEU BILDEN statt darin herumzuschneiden. Sie ist aufgebaut als
        # «<Titel> – <Werbebaustein>»; wird nur der Messwert herausgeschnitten, bleibt ein
        # Rumpf wie «Smartwatch mit – jetzt bei LuxeStyle …» stehen. Aus dem bereinigten
        # Titel plus dem unveränderten Baustein entsteht dagegen zwangsläufig ein ganzer
        # Satz — und Titel und SEO sagen danach dasselbe.
        neu_sd = sd
        if MESSWERT_ROH.search(sd):
            teil = SEO_ANHANG.split(sd, 1)
            baustein = sd[len(teil[0]):] if len(teil) > 1 else ""
            neu_sd = (neu_t + baustein) if baustein else ohne_messwert(sd)
        neu_st = ohne_messwert(st) if MESSWERT_ROH.search(st) else st
        if neu_t != t or neu_sd != sd or neu_st != st:
            aufgaben.append((p["id"], t, neu_t, sd, neu_sd, st, neu_st))

    kaputte = [a for a in aufgaben if a[1] != a[2]]
    print(f"Produkte zu berichtigen: {len(aufgaben)} | davon kaputte Titel: {len(kaputte)}",
          flush=True)
    for _, t, neu_t, sd, neu_sd, _, _ in aufgaben[:14 if DRY else 6]:
        if t != neu_t:
            print(f"   TITEL «{t[:52]}»\n         → «{neu_t[:52]}»", flush=True)
        if sd != neu_sd:
            print(f"   SEO   «{sd[:56]}»\n         → «{neu_sd[:56]}»", flush=True)
    if DRY or not aufgaben:
        return

    done = set()
    if os.path.exists(LEDGER):
        done = {l.split("\t")[0] for l in open(LEDGER)}
    f = open(LEDGER, "a")
    n = 0
    for gid, t, neu_t, sd, neu_sd, st, neu_st in aufgaben:
        if gid in done:
            continue
        eingabe = {"id": gid}
        if neu_t != t and len(neu_t) >= 12:
            eingabe["title"] = neu_t
        seo = {}
        if neu_sd != sd:
            seo["description"] = neu_sd
        if neu_st != st:
            seo["title"] = neu_st
        if seo:
            eingabe["seo"] = seo
        if len(eingabe) == 1:
            continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}',
                {"i": eingabe})
        e = ((r.get("data") or {}).get("productUpdate") or {}).get("userErrors")
        if e:
            print(f"  ⚠️ {t[:34]}: {e[0]['message'][:60]}", flush=True)
            continue
        n += 1
        f.write(f"{gid}\t{neu_t}\n")
        f.flush()
        time.sleep(0.3)
    print(f"FERTIG: {n} Produkte berichtigt")


if __name__ == "__main__":
    main()
