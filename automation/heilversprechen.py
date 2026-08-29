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

# Krankheiten und Wirkversprechen bei Ware, die kein Medizinprodukt ist.
# ⚠️ Diese Wörter werden NUR gesucht — der umgebende Satz wird danach mit Zeichenketten-
# Operationen abgegrenzt, nicht mit einem Regex. Der erste Entwurf hatte «[^.!?]*WORT[^.!?]*»
# auf beiden Seiten; auf 31'000 Beschreibungen lief das in katastrophales Backtracking und
# stand nach zwei Minuten immer noch. Suchen ist linear, Satzgrenzen finden auch.
KRANKHEIT = re.compile(
    r'\b(?:Ischias\w*|Spinalstenose|Hernien?|Bandscheibenvorfall|Rosacea|Purpura|'
    r'Krampfadern|Besenreiser|Spider-?Venen|Nagelpilz|Myopie\w*|Kurzsichtigkeit|'
    r'Arthrose|Rheuma|Neurodermitis|Schuppenflechte|Psoriasis|H[äa]morrhoiden|'
    r'Tinnitus|Spinalkanal|'
    # 20.08.2026 nachgetragen — alle drei aus echten Fundstellen, keine erfundene Liste:
    #  • Migräne: eine Baumwoll-Augenmaske «lindert Kopfschmerzen, Migräne» (15454201119105)
    #  • Dekubitus: ein Schaumstoff-Sitzkissen «unterstützt die Behandlung von … Dekubitus»
    #    (15503281979777) — Druckgeschwüre sind wundpflegebedürftig, nicht sitzkissen-behandelbar
    #  • ADHS/Autismus/Angstzustände: ein Fidget-Schlüsselanhänger «hilft bei Angstzuständen,
    #    ADHS und Autismus» (15450829095297)
    # ⚠️ «Ischias» steht jetzt mit \w*, weil der Text «Ischiasbeschwerden» schrieb — die
    # deutsche Zusammensetzung frisst die Wortgrenze am Wortende (gleiche Lehre wie
    # «Zahnreinigers» im Medizin-Zweck-Guard).
    r'Migr[äa]ne|Dekubitus|Druckgeschw[üu]r\w*|Wundliegen|'
    r'ADHS|ADHD|Autismus|autistisch\w*|Aufmerksamkeitsst[öo]rung\w*|'
    r'Angstzust[äa]nd\w*|Angstst[öo]rung\w*|Karpaltunnel\w*|Skoliose|Osteoporose|'
    # 28.08.2026 nachgetragen, alle fünf aus echten Fundstellen:
    #  • Akne: Acne vulgaris ist eine Hauterkrankung (ICD L70) und stand in KEINER der drei
    #    Listen — 44 Produkte nennen sie, die Klasse war damit völlig unsichtbar.
    #  • Rosazea: «Rosacea» stand schon oben — die DEUTSCHE Schreibweise nicht. Genau daran
    #    ist 15501877903745 vorbeigerutscht («reduziert Falten, Rosazea»). Eine Krankheit hat
    #    mehr als eine Schreibweise; beide gehören in die Liste.
    #  • Sodbrennen/Reflux: Keilkissen-Set 15449599738241 «um Sodbrennen zu lindern».
    #  • Fieber: die Schlafmaske «Lindert Fieber» stand seit dem 12.08. namentlich OBEN IM
    #    DOCSTRING dieser Datei als Beispiel — und war trotzdem live, weil das Wort nur in der
    #    Beschreibung stand, nie in der Regex. Ein Beispiel in der Doku ist kein Muster.
    #    ⚠️ «Fieber» steckt in «PTC-Fieber» (chinesische Heizangabe einer Glättbürste, 14.08.);
    #    das ist ungefährlich, weil im selben Satz zusätzlich ein WIRKWORT stehen muss.
    r'Akne\w*|Rosazea|Sodbrennen|Reflux|Fieber)\b',
    re.I)
# Ein Krankheitsname allein ist keine Heilaussage — es braucht ein Wirkversprechen dazu.
WIRKWORT = re.compile(r'\b(?:heilt|kuriert|therapiert|lindert|bek[äa]mpft|beseitigt|'
                      r'wirksam\s+gegen|hilfe|hilft\s+(?:bei|gegen)|Ergebnisse\s+bei|'
                      r'Abhilfe|behandelt|Linderung|'
                      # 20.08.2026: «unterstützt die BEHANDLUNG von … Dekubitus» rutschte
                      # durch, weil nur das Verb «behandelt» auf der Liste stand, nicht das
                      # Hauptwort. Und «Aufmerksamkeitsstörungen ENTGEGENWIRKT» hatte gar
                      # kein bekanntes Wirkwort. «Behandlung» ist ungefährlich: es feuert
                      # nur zusammen mit einem Krankheitsnamen im selben Satz, und die
                      # Wortgrenze schützt vor «Oberflächenbehandlung».
                      r'Behandlung|entgegenwirk\w*|erleichtert|'
                      # «Ob bei Angstzuständen, ADHS oder einfach zur Entspannung» hat gar
                      # kein Verb — die Krankheit steht als Anwendungsfall da. Eine
                      # Indikationsformel IST ein Wirkversprechen; sie feuert nur zusammen
                      # mit einem Krankheitsnamen im selben Satz.
                      r'Ob\s+bei|ideal\s+bei|perfekt\s+bei|speziell\s+bei|Einsatz\s+bei|'
                      r'Anwendung\s+bei|empfohlen\s+bei|'
                      # 28.08.2026: Der Rückenstabilisator 15449429279105 führte «Passt für
                      # Hohlkreuz, Skoliose, Schulter-Rundung» — «Skoliose» stand längst in
                      # KRANKHEIT, der Satz hatte nur kein bekanntes Wirkwort. Eine Krankheit
                      # als blosser Aufzählungspunkt IST eine Indikation.
                      r'passt\s+f[üu]r|geeignet\s+bei|Stabilit[äa]t\s+bei|Schutz\s+bei)\b'
                      # ⚠️ Die Wortgrenze am ANFANG frisst geklebte Wirkwörter: der
                      # CJ-Text schrieb «Schlafkissenmasken|lindert» ohne Leerzeichen,
                      # und \blindert\b greift mitten im Wort nicht mehr. Spiegelbild
                      # der Genitiv-Falle («Zahnreinigers») am Wortende.
                      r'|\w*lindert\b|\w*heilt\b'
                      # ⚠️ 28.08.2026: Die Liste kannte nur die FINITE Form. «um Sodbrennen zu
                      # LINDERN» (Keilkissen 15449599738241) rutschte durch, weil nur «lindert»
                      # dastand — im Deutschen steht das Wirkwort nach «um … zu» aber im
                      # Infinitiv, und genau so formulieren die CJ-Übersetzungen fast immer.
                      # Dieselbe Beugungsfalle wie «Zahnreinigers» (Genitiv) und
                      # «Ischiasbeschwerden» (Kompositum): das Wortende ist beweglich.
                      # \b vorne ist Pflicht — ohne sie trifft «linder» das Wort «Zylinder».
                      r'|\blinder\w*|\bheilen\b|\bbehandeln\b|\bbek[äa]mpfen\b|\bbeseitigen\b', re.I)
# Diese stehen für sich allein — dafür braucht es keinen Krankheitsnamen.
STARK = re.compile(r'\b(?:medizinisch\s+(?:bewiesen|nachgewiesen)|klinisch\s+(?:bewiesen|getestet)|'
                   r'empfohlen\s+von\s+(?:Chiropraktikern|[ÄA]rzten|Physiotherapeuten)|'
                   r'von\s+[ÄA]rzten\s+empfohlen|heilt\s+\w|'
                   # «Ideal zur Myopiehilfe» hatte KEIN zweites Wirkwort im Satz: das
                   # Kompositum trägt es selbst («…hilfe»), und \bhilfe\b greift nicht
                   # mitten im Wort. Solche Krankheit+Wirkwort-Komposita müssen deshalb
                   # für sich allein stehen.
                   r'Myopiehilfe|Sehhilfe\s+gegen|ADHS-?(?:Hilfe|Therapie))', re.I)
# ⚠️ VIER SATZARTEN, die im ersten Probelauf fälschlich entfernt worden wären:
#  • «Nicht kompatibel mit Myopie-Linsen» und «Option für Myopie verfügbar» — das ist eine
#    Passform-Angabe für Brillenträger, keine Behandlung. Wer sie streicht, nimmt der Kundin
#    genau die Information, wegen der sie den Satz liest.
#  • «Die Brille ist für Personen mit Kurzsichtigkeit bis 600° geeignet» — eine Spezifikation.
#  • «hilft, Karies vorzubeugen» bei einer Zahnbürste — Vorbeugung ist bei Mundpflege üblich
#    und zulässig; Karies und Parodontitis stehen deshalb gar nicht erst auf der Liste.
#  • «um das ERSCHEINUNGSBILD von Besenreisern zu verbessern» — genau die Formulierung, die
#    ein Kosmetikum verwenden MUSS. Sie zu löschen hiesse, die korrekte Fassung zu bestrafen.
#  • ⚠️ FÜNFTE Art, aufgefallen erst beim Erweitern der Liste am 20.08.2026: «lindert
#    Angstzustände» steht in drei HAUSTIER-Artikeln (Seilspielzeug für Hunde 15446270574977,
#    Vogel-Sound-Spielzeug 15448947786113, Beruhigungsweste für Katzen 15454894391681).
#    Angst beim Hund ist keine Humanmedizin — wer diese Sätze streicht, nimmt der Kundin die
#    Kaufinformation und repariert eine wahre Aussage kaputt. Die Sperre steht bewusst hier,
#    also SATZWEISE, und nicht in HEIL_AUSNAHME (die prüft den Titel und würde das ganze
#    Produkt überspringen — dann bliebe eine echte Humanaussage im selben Text stehen).
KEIN_HEILVERSPRECHEN = re.compile(r'kompatib|geeignet\s+f[üu]r|Option\s+f[üu]r|verf[üu]gbar|'
                                  r'Erscheinungsbild|Aussehen\s+von|passend\s+f[üu]r|'
                                  r'nicht\s+geeignet|Brillentr[äa]ger|'
                                  r'\bHund\w*|\bH[üu]ndin|\bKatze\w*|\bK[äa]tzchen|Haustier\w*|'
                                  r'Vierbeiner|\bWelpe\w*|\bTierarzt|\bTiere\b|'
                                  # 28.08.2026, zusammen mit «Akne» eingeführt — ohne diese vier
                                  # würde die KORREKTE Fassung bestraft: «für zu Akne NEIGENDE
                                  # Haut» (15502557151617) ist die Formel, die ein Kosmetikum
                                  # verwenden MUSS; «KASCHIERT Akneflecken» / «DECKT Aknenarben AB»
                                  # (Concealer, Grundierung) sind Abdeckung statt Wirkung; und
                                  # «Akne am Kinn VORZUBEUGEN» steht in einem KATZENnapf.
                                  r'neigend\w*|kaschier\w*|abdeck\w*|deckt\s|vorbeug\w*|vorzubeugen|'
                                  # ⚠️ Und ein ALTER Fehltreffer, der beim Nachmessen am
                                  # 28.08.2026 auffiel: STARK enthält «heilt\s+\w», damit
                                  # «heilt Krampfadern» für sich allein steht. Damit traf es
                                  # 15500912820609 «Papier-Tape … der sich selbst HEILT und
                                  # verdeckt» — eine Materialeigenschaft, kein Heilversprechen.
                                  r'selbst\s*heilend|selbstheilend|sich\s+selbst\s+heilt|self[- ]?healing', re.I)


def ist_heilaussage(satz):
    if KEIN_HEILVERSPRECHEN.search(satz):
        return False
    if STARK.search(satz):
        return True
    return bool(KRANKHEIT.search(satz) and WIRKWORT.search(satz))


HEILWORT = re.compile(KRANKHEIT.pattern + "|" + STARK.pattern, re.I)


def satz_um(text, i, j):
    """Grenzt den Satz ab, in dem der Treffer [i:j) liegt — linear, ohne Regex."""
    a = max((text.rfind(z, 0, i) for z in ".!?>\n"), default=-1)
    b = min((k for k in (text.find(z, j) for z in ".!?<\n") if k != -1), default=len(text))
    if text[b:b + 1] in ".!?":
        b += 1
    return a + 1, b


def heilsaetze_entfernen(html):
    """Entfernt jeden Satz, der ein Krankheits- oder Wirkversprechen enthält."""
    weg, neu, ende = [], [], 0
    for m in HEILWORT.finditer(html):
        a, b = satz_um(html, m.start(), m.end())
        if a < ende:
            continue                                  # Satz schon entfernt
        satz = html[a:b].strip()
        if len(satz) < 8 or len(satz) > 400 or not ist_heilaussage(satz):
            continue
        neu.append(html[ende:a])
        weg.append(satz)
        ende = b
    if not weg:
        return html, []
    neu.append(html[ende:])
    s = "".join(neu)
    s = re.sub(r'<li\b[^>]*>\s*</li>', '', s)
    s = re.sub(r'<p\b[^>]*>\s*</p>', '', s)
    return re.sub(r'\s{2,}', ' ', s), weg
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
    # «Herzfrequenz-, Blutdruck- und Blutsauerstoffmessung»: der Bindestrich der ausgeschnittenen
    # Zusammensetzung bleibt sonst als nacktes «-» stehen.
    s = re.sub(r'(?<![\wäöüÄÖÜ])[-–]\s*(?=und\b|,|$)', '', s)
    s = re.sub(r'\s*,\s*(?=\)|$)', '', s)          # «(Herzfrequenz, )» → «(Herzfrequenz)»
    s = re.sub(r'\(\s*\)', '', s)                   # leere Klammer
    s = re.sub(r'\s*,\s*,+', ',', s)
    s = re.sub(r',\s*und\b', ' und', s, flags=re.I)
    s = re.sub(r'\s{2,}', ' ', s)
    s = s.strip(" ,;·-–")
    # Führendes Bindewort, wenn das erste Glied der Aufzählung weggefallen ist:
    # «EKG-Funktion und Herzfrequenzmessung» → «und Herzfrequenzmessung» → «Herzfrequenzmessung».
    s = re.sub(r'^(?:und|sowie|oder|,)\s+', '', s, flags=re.I)
    return s[:1].upper() + s[1:] if s else s


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


MESSWORT = r'(?:Blutdruck|EKG|ECG|Harns[äa]ure|Blutfett|Lipidprofil|Blutzucker)'


def titel_saeubern(t):
    # ⚠️ DIE BEHAUPTUNG STEHT NICHT IMMER IN EINER AUFZÄHLUNG. Der erste Entwurf beherrschte
    # nur die Form «… mit EKG, Blutdruck & Herzfrequenz» und liess deshalb zwei Artikel
    # unangetastet, bei denen sie am stärksten wirkt — im Produktnamen selbst:
    # «EKG-Überwachungsarmband» und «EKG Sport Smartwatch», beide CHF 49.90, beide im
    # Google-Kanal. Weil dort nichts zu ersetzen war, blieben Titel UND Text unverändert, und
    # die Produkte galten gar nicht erst als Kandidaten. Ein Reiniger, der nur eine Satzform
    # kennt, meldet «nichts gefunden» und meint «nichts erkannt».
    # Keine der beiden Beschreibungen belegt übrigens ein EKG; das Wort steht allein im Namen.
    neu = re.sub(r'^' + MESSWORT + r'[- ]\s*(?=[A-ZÄÖÜ])', '', t)
    # «Temperatur- und Blutdruckmessung»: fällt nur das zweite Glied weg, bliebe «Temperatur-»
    # als Rumpf stehen. Das Grundwort gehört ans erste Glied zurück.
    neu = re.sub(r'(\w+)-\s+und\s+' + MESSWORT + r'(messung|[üu]berwachung|tracking)',
                 r'\1\2', neu, flags=re.I)
    neu = re.sub(MESSWORT + r'-\s+und\s+(\w)', r'\1', neu, flags=re.I)
    neu = glaetten(MESSWERT.sub("", neu))
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
        if HEIL_AUSNAHME.search(t) or not HEILWORT.search(html):
            continue
        neu, weg = heilsaetze_entfernen(html)
        if weg:
            heil.append((p["id"], t, html, neu, weg))

    print(f"(A) Wearables mit Messversprechen: {len(wearables)}", flush=True)
    for _, alt, neu_t, _, _, tr in wearables[:8 if DRY else 3]:
        print(f"\n   {alt[:60]}", flush=True)
        if neu_t != alt:
            print(f"      Titel → «{neu_t[:60]}»", flush=True)
        for a, b in tr[:4]:
            print(f"      «{a[:64]}»\n         → «{b[:64]}»", flush=True)
    print(f"\n(B) Heil-/Krankheitsaussagen: {len(heil)}", flush=True)
    for _, t, _, _, weg in heil[:12 if DRY else 4]:
        print(f"   {t[:40]:<42} entfernt: «{re.sub(r'<[^>]+>', ' ', weg[0]).strip()[:74]}»",
              flush=True)
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
    for gid, t, _, neu, _ in heil:
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
