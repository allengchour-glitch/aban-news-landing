#!/usr/bin/env python3
"""baby_claims_wache.py — Säuglings-Ware mit Medizin-/Sicherheitsversprechen und Spielzeug mit «0–3 Jahre» (19.10.2026, Spähtrupp katalog K3).

BEFUND (GEMESSEN, Export 19.10. 05:37 UTC): 110 aktive Texte nennen «Säuglinge/Neugeborene/0–3 Jahre», 101 davon ohne Warnhinweis. Zwei Klassen sind
rechtlich und für die Kundinnen riskant:
  K  Baby-Kissen, -Nester und Lagerungshilfen mit Heil-/Sicherheitsversprechen («gegen Plattkopf», «Kopfformkorrektur», «Anti-Erstickungs-Kissen»).
     Das sind Medizinprodukt-Zusagen (dieselbe Klasse wie die abgelehnten Wellness-Armbänder, Hausregel «keine Heilversprechen»); «Anti-Erstickung»
     ist als Zusage nicht belegbar, und Kinderärzte raten im ersten Lebensjahr von Kissen und Nestchen im Bett ab (QUELLE: Empfehlungen zur
     SIDS-Vorbeugung, u. a. Schweizerische Gesellschaft für Pädiatrie / American Academy of Pediatrics — hier nicht neu geprüft).
     → DRAFT (kein Löschen), Tags baby-schlaf-claim · medizinprodukt-pruefen · nicht-bewerben. Rückweg: Status ACTIVE.
  S1 Spielzeug mit Kleinteilen/Elektronik/Holzteilen, dessen Text «für Säuglinge / 0–3 Jahre» behauptet (Beispiel «Alloy Auto Modell 1:32»: «ab 14 Jahren
     und gleichzeitig für Säuglinge von 0 bis 3 Jahren geeignet»). Es gibt keinen Prüfbeleg (EN 71) im Text.
     → Altersangabe im Text auf «ab 3 Jahren» umgeschrieben + der Hinweis aus kinder_sicherheit.py (Erstickungsgefahr, ab 3 Jahren); Titel «für Kleinkinder»
     → «für Kinder». Alter Text im Ledger dropship/_baby_claims_vorher.jsonl (Rückweg).
  S2 reine Säuglings-Spielzeuge (Rassel, Tumbler, Stapelspielzeug, Badespielzeug, Weissrausch-Schlafhilfe): ein «nicht unter 36 Monaten»-Hinweis würde das
     Produkt widerlegen, ein Prüfbeleg fehlt → DRAFT, Tags kinder-saeugling-pruefen · nicht-bewerben.
Bewusst NICHT angefasst: Kleidung/Schuhe/Schlafsäcke/Tragen (kein Spielzeug), Markenware (Infantino …), «grosse Bausteine» (Hausregel kinder_sicherheit.KLEINKIND),
Tierbedarf, Produkte mit schon vorhandenem Hinweis, Werbetest-Produkte (dropship/_werbetest_sperre.txt bis 24.10.).

    python3 automation/baby_claims_wache.py --selbsttest
    python3 automation/baby_claims_wache.py              # DRY: zeigt Treffer + Vorher/Nachher
    FIX=1 python3 automation/baby_claims_wache.py        # schreibt (Aufseher täglich)
"""
import fcntl
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

FIX = os.environ.get("FIX") == "1"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_baby_claims.tsv")
VORHER = os.path.join(REPO, "dropship", "_baby_claims_vorher.jsonl")
STAND = os.path.join(REPO, "dropship", "_baby_claims_stand.json")
MAX_LAUF = int(os.environ.get("MAX_LAUF", "40"))

# Prüfung 19.10. (baby B1): Shopify ignoriert führende Wildcards (`title:*spielzeug*` = `title:spielzeug*`) — «Badespielzeug», «Holzspielhaus» wurden nie gelesen.
# Spielzeug über Produkttyp/Tag, Kissen/Baby-Ware über Titel-ANFANG.
LIVE_Q = ("status:active AND (product_type:'Spielzeug & Spiele' OR product_type:'Spass-Elektronik' OR tag:spielzeug OR tag:baby OR tag:baby-kids OR tag:kinder "
          "OR title:Baby* OR title:Neugeboren* OR title:Säugling* OR title:Kopfkissen* OR title:Babykissen* OR title:Nestchen* OR title:Kleinkind* "
          "OR title:Rassel* OR title:Beissring* OR title:Bade* OR title:Lernspiel* OR title:Spielhaus* OR title:Holzspiel*)")

BABY = re.compile(r"\b(?:Baby(?:s|kissen|-[\w-]+)?|Babies|Neugeboren\w*|S[äa]ugling\w*|Kleinkind\w*)\b", re.I)     # kein «babyweich», «Babyrosa»
BABY_WIE = re.compile(r"\bwie\s+(?:ein|ein\s+kleines)\s+Baby\b", re.I)                                              # «Schlafe wie ein Baby»
KISSEN = re.compile(r"Kissen|\bNest(?:chen)?\b|Polster|Lagerung|Matratze|\bLiege\b", re.I)
KOPF_STARK = re.compile(
    r"Plattkopf|Plagiocephal\w*|Kopfformkorrektur|Kopfverformung\w*|Kopfabflachung|"
    r"Abflachung\s+(?:des\s+)?(?:Kopf|Sch[äa]del|Hinterkopf)\w*|Verformung\w*\s+(?:des\s+)?(?:Kopf|Sch[äa]del)\w*|Anti-?Erstick\w*|Erstickungs-?schutz", re.I)
# «Kopfform» allein ist nur ein Versprechen mit Korrektur-/Vorbeuge-Wort in der Nähe («passt sich der Kopfform an» ist es nicht)
KOPF_FORM = re.compile(r"(?:korrigier\w*|vorbeug\w*|verhindert\w*|gesunde\w*|korrekte\w*|sch[öo]ne\w*|f[öo]rder\w*|formt\w*)\s+(?:\w+\s+){0,3}Kopfform|Kopfform\s+(?:\w+\s+){0,3}(?:korrigier\w*|vorbeug\w*)", re.I)
KOPF_CLAIM = KOPF_STARK     # Rückwärtskompatibilität (Selbsttest-Importe)
# «gegen Verformungen» im Titel eines Baby-Kissens («Babykissen gegen Verformungen»): der Text nennt dort Kopf/Schädel
TITEL_VERFORM = re.compile(r"gegen\s+Verformung", re.I)

SAEUG = re.compile(r"S[äa]ugling\w*|\b0\s*(?:bis|-|–| – )\s*[23]\s*Jahr\w*|ab\s*0\s*Monat\w*|Neugeboren\w*|Babys\s+und\s+Kleinkind\w*", re.I)
SPIEL_TYP = {"Spielzeug & Spiele", "Spass-Elektronik"}
# Prüfung 19.10. (baby B5): Titelwörter nur noch STARK und mit Wortanfang — «Modell», «Sensor», «Stapel», «Roboter» allein trafen Saugroboter, Wäschekörbe, Babyphones.
SPIEL_STARK = re.compile(r"\b\w*spielzeug\b|\bRassel|\bBeissring|\bTumbler|\bLernspiel|\bSpielhaus|\bGeburtstagszug|\bBausteine?\b|\bPuzzle\b", re.I)
SAEUG_ZWECK = re.compile(r"\bRassel|\bTumbler|\bStapel(?:spielzeug|türme?|ringe?)|\bBade(?:spielzeug)?\b|\bBadespielzeug|\bWeissrausch|\bSchlafhilfe|\bSpringbrunnen|\bSpieluhr|"
                         r"\bGreifling|\bBeissring|\bBeißring|\bZahn|\bKrabbel|\bGreif|\bMeilenstein|\bMobile\b|\bSpielbogen", re.I)
# Baby-Zweckwörter im TEXT: steht noch eines da, bleibt die Ware ein Säuglingsprodukt (nicht auf «ab 3 Jahren» umschreiben, sondern entwerfen)
TEXT_ZWECK = re.compile(r"\bKrabbel\w*|\bGreif\w*|\bZahn(?:en|ungs)?\w*|\bersten\s+Lebens\w*|\bLebensmonat\w*|\bLebensjahr\w*|\bBeissring|\bBeißring", re.I)
MARKE = re.compile(r"\b(?:Infantino|Fisher[- ]?Price|Vtech|Chicco|Playmobil|Lego|Bruder)\b", re.I)
KLEINKIND_GROSS = re.compile(r"Grossteil|Gro(?:ss|ß)e?n? ?Baustein", re.I)
TIER = re.compile(r"\b(?:Hund(?!ert)\w*|Katze\w*|Haustier\w*|Welpe\w*|K[äa]tzchen\w*)", re.I)   # auch Kompositum «Hundespielzeug»
# Tragen, Sitze, Kleidung, Schlafsäcke, Flaschen … sind kein Spielzeug, auch wenn Shopify sie unter «Spielzeug & Spiele» führt (Baby-Hüftsitz)
KEIN_SPIEL = re.compile(r"\bH[üu]ftsitz|\bTrage\b|\bTragegurt|\bTragetuch|\bKinderwagen|\bAutositz|\bSchlafsack|\bStrampler|\bOverall\b|\bBody\b|\bSchuhe?\b|\bSandalen?\b|"
                        r"\bStiefel\b|\bHose\b|\bJacke\b|\bM[üu]tze\b|\bDecke\b|\bL[äa]tzchen\b|\bLatz\b|\bFlasche\b|\bWindeln?\b|\bWippe\b|\bHochstuhl\b|"
                        r"\bStuhl\b|\bKleid\b|\bPyjama\b", re.I)
HINWEIS_DA = re.compile(r"nicht f[üu]r Kinder unter|Erstickungsgefahr|Achtung|unter 36 Monaten|verschluckbare|nicht geeignet|ungeeignet|Warnung", re.I)
# Verneinung im Umfeld einer Altersangabe («Nicht für Kleinkinder von 0 bis 3 Jahren geeignet») — die Umschreibung würde den Satz umkehren → offen
NEG = re.compile(r"nicht\s+(?:f[üu]r|geeignet|empfohlen|verwenden|benutzen)|ungeeignet|Warnung|Achtung|Vorsicht", re.I)
SEO_CLAIM = re.compile(r"Kleinkind\w*|\bBabys?\b|S[äa]ugling\w*|Neugeboren\w*|\b0\s*(?:bis|-|–)\s*[23]\s*Jahr", re.I)

NB = r"[\s  ]*"
SUBS = [
    # Alloy-Auto-Fall: der Satz widerspricht sich selbst («ab 14 Jahren und gleichzeitig für Säuglinge»)
    (re.compile(r",?\s*und\s+ist\s+gleichzeitig\s+für\s+S[äa]ugling\w*\s+von\s+0\s+bis\s+3\s+Jahr\w*\s+geeignet"), ""),
    (re.compile(r"(?:Babys|S[äa]uglinge)\s+und\s+Kleinkind\w*" + NB + r"(?:im\s+Alter\s+)?von\s+0" + NB + r"(?:bis|[-–])" + NB + r"[23]\s+Jahr\w*"), "Kinder ab 3 Jahren"),
    (re.compile(r"Kleinkind\w*" + NB + r"(?:im\s+Alter\s+)?von\s+0" + NB + r"(?:bis|[-–])" + NB + r"[23]\s+Jahr\w*"), "Kinder ab 3 Jahren"),
    (re.compile(r"Babys" + NB + r"von\s+0" + NB + r"(?:bis|[-–])" + NB + r"[23]\s+Jahr\w*"), "Kinder ab 3 Jahren"),
    (re.compile(r"im\s+Alter\s+von\s+0\s+bis\s+3\s+Jahr\w*"), "ab 3 Jahren"),
    (re.compile(r"Kleinkind\w*" + NB + r"ab\s+0" + NB + r"[-–]" + NB + r"3\s+Jahr\w*"), "Kinder ab 3 Jahren"),
    (re.compile(r"(?:Babys\s+und\s+)?Kleinkind\w*" + NB + r"\(0" + NB + r"[-–]" + NB + r"3\s+Jahre\)"), "Kinder ab 3 Jahren"),
    (re.compile(r",?\s*und\s+entspricht\s+der\s+3C[\u2011-]Konfiguration\s+für\s+Holzspielzeug"), ""),     # China-Kennzeichen, kein EU-Beleg
    (re.compile(r"für\s+Kinder\s+von\s+0" + NB + r"(?:bis|[–-])" + NB + r"[23]\s+Jahr\w*"), "für Kinder ab 3 Jahren"),
    (re.compile(r"Kinder\s+ab\s+0" + NB + r"[–-]" + NB + r"3" + NB + r"Jahr\w*"), "Kinder ab 3 Jahren"),
    (re.compile(r"Altersgruppe:?\s*0" + NB + r"[–-]" + NB + r"3\s+Jahre"), "Altersgruppe: ab 3 Jahren"),
    (re.compile(r"Verwendbar\s+ab:\s*0" + NB + r"[-–]" + NB + r"3\s+Jahre"), "Verwendbar ab: 3 Jahre"),
    (re.compile(r"Babys\s+und\s+Kleinkinder\b"), "Kinder"),          # Rückfall nach den genauen Mustern («erstes Lernspielzeug für Babys und Kleinkinder»)
]
TITEL_SUBS = [(re.compile(r"\bfür\s+Babys\s*(?:&|und)\s*Kleinkinder\b"), "für Kinder"), (re.compile(r"\bfür\s+Kleinkinder\b"), "für Kinder")]

TAGS_K = ["baby-schlaf-claim", "medizinprodukt-pruefen", "nicht-bewerben"]
TAGS_S2 = ["kinder-saeugling-pruefen", "nicht-bewerben"]


def klartext(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or ""))


def klasse(p):
    """→ (K | S1 | S1W | S2 | SEO | None, Beleg-Schnipsel). Reine Funktion (Selbsttest ohne Netz).
    S1W = wie S1, aber der Text trägt schon einen Hinweis (nur Altersangabe umschreiben, nichts anhängen); SEO = Text ist sauber, nur der SEO-Titel/-Text trägt noch die alte Altersangabe."""
    t = p.get("title") or ""
    html = p.get("descriptionHtml") or ""
    text = BABY_WIE.sub("", klartext(html))
    typ = p.get("productType") or ""
    tags = {x.lower() for x in (p.get("tags") or [])}
    seo = p.get("seo") or {}
    if MARKE.search(t) or TIER.search(t):
        return None, ""
    if BABY.search(t + " " + text[:700]) and (KISSEN.search(t) or TITEL_VERFORM.search(t)):
        m = KOPF_STARK.search(t + " " + text) or KOPF_FORM.search(t + " " + text) or TITEL_VERFORM.search(t)
        if m:
            return "K", m.group(0)
    spiel = typ in SPIEL_TYP or "spielzeug" in tags or bool(SPIEL_STARK.search(t))
    if not spiel or KISSEN.search(t) or KEIN_SPIEL.search(t) or KLEINKIND_GROSS.search(t):
        return None, ""
    m = SAEUG.search(text)
    warn = bool(HINWEIS_DA.search(html))
    if m:
        if SAEUG_ZWECK.search(t) or TEXT_ZWECK.search(text):
            return "S2", m.group(0)
        return ("S1W" if warn else "S1"), m.group(0)
    if warn and not re.search(r"\bBabys?\b|S[äa]ugling|Neugeboren", text, re.I):      # echte Baby-Ware (Beissring «Für Babys ab 3 Monaten») behält ihre SEO-Angabe
        ms = SEO_CLAIM.search((seo.get("title") or "") + " " + (seo.get("description") or ""))
        if ms:
            return "SEO", ms.group(0)
    return None, ""


def _negiert(text):
    for m in SAEUG.finditer(text):
        if NEG.search(text[max(0, m.start() - 80): m.end() + 40]):
            return True
    return False


def s1_umschreiben(titel, html):
    """→ (neuer Titel, neues html, Rest-Treffer im Text). Rest > 0 = nicht schreiben (Wortlaut, den keine Ersetzung kennt, oder Verneinungssatz)."""
    if _negiert(klartext(html)):
        return titel, html, 99
    neu = html
    for rx, ers in SUBS:
        neu = rx.sub(ers, neu)
    nt = titel
    for rx, ers in TITEL_SUBS:
        nt = rx.sub(ers, nt)
    return nt, neu, len(SAEUG.findall(klartext(neu)))


def seo_umschreiben(seo):
    """→ (neuer SEO-Titel, neue SEO-Beschreibung, Rest). Beide Felder werden IMMER zusammen geschrieben (seo{title} allein nullt die Beschreibung)."""
    t, d = (seo or {}).get("title") or "", (seo or {}).get("description") or ""
    for rx, ers in TITEL_SUBS:
        t = rx.sub(ers, t)
    for rx, ers in SUBS + TITEL_SUBS:
        d = rx.sub(ers, d)
    return t, d, len(SEO_CLAIM.findall(t + " " + d))


def gql(q, v=None):
    import kollektion_leer as kl
    return kl.gql(q, v)


def kandidaten():
    cur = None
    while True:
        d = gql('query($c:String,$q:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} '
                'nodes{id title status tags productType descriptionHtml seo{title description}}}}', {"c": cur, "q": LIVE_Q})
        pr = d["products"]
        for n in pr["nodes"]:
            yield n
        if not pr["pageInfo"]["hasNextPage"]:
            return
        cur = pr["pageInfo"]["endCursor"]
        time.sleep(0.4)


def schreibe_entwurf(gid, tags):
    """→ (Entwurf gesetzt, Tags gesetzt). Prüfung B9: tagsAdd-Fehler werden sichtbar (Ledger «DRAFT-OHNE-TAG»)."""
    r = gql('mutation($i:ProductUpdateInput!){productUpdate(product:$i){product{status} userErrors{message}}}',
            {"i": {"id": gid, "status": "DRAFT"}})
    pu = r.get("productUpdate") or {}
    if pu.get("userErrors") or (pu.get("product") or {}).get("status") != "DRAFT":
        return False, False
    t = gql('mutation($id:ID!,$t:[String!]!){tagsAdd(id:$id,tags:$t){userErrors{message}}}', {"id": gid, "t": tags})
    return True, not ((t.get("tagsAdd") or {}).get("userErrors")) and "tagsAdd" in (t or {})


def selbsttest():
    f = []
    def k(titel, text, typ="Wohnen & Deko"):
        return klasse({"title": titel, "descriptionHtml": "<p>" + text + "</p>", "productType": typ})[0]
    fall = [
        (("Baby-Kopfkissen gegen Plattkopf", "Dieses Kissen für Neugeborene beugt einem Plattkopf vor."), "K"),
        (("Riesenwal Anti-Erstickungs-Kissen für Babys", "Für Neugeborene und Säuglinge konzipiert."), "K"),
        (("Babykissen zur Kopfformkorrektur", "Für Babys."), "K"),
        (("Babykissen gegen Verformungen", "Schützt Neugeborene."), "K"),
        (("Zierkissen Samt 45 x 45", "Kopfform des Sofas bleibt erhalten."), None),            # kein Baby
        (("Reisekissen Memory-Schaum", "Unterstützt Nacken, Plattkopf egal."), None),           # kein Baby-Kontext
        (("Infantino Baby Tino Karotten-Beissring", "Für Säuglinge von 0 bis 2 Jahren."), None),  # Marke
    ]
    for (t, x), soll in fall:
        if k(t, x) != soll:
            f.append(f"{t!r}: {k(t, x)!r}, soll {soll!r}")
    spiel = [
        (("Alloy Auto Modell 1:32", "Es gehört zur Spielzeugkategorie für Personen ab 14 Jahren und ist gleichzeitig für Säuglinge von 0 bis 3 Jahren geeignet."), "Spass-Elektronik", "S1"),
        (("Wukong Roboter Mecha Bausteine für Kleinkinder", "Ideal für kleine Baumeister im Alter von 0 bis 3 Jahren."), "Spielzeug & Spiele", "S1"),
        (("Hübsches Küken Tumbler Rassel-Spielzeug", "Perfekt für Babys von 0 bis 3 Jahren."), "Spielzeug & Spiele", "S2"),
        (("Grosse Bausteine für Kleinkinder mit Eimer", "Für Kleinkinder im Alter von 0 bis 3 Jahren."), "Spielzeug & Spiele", None),   # Hausregel Grossteile
        (("Lernspielzeug Holz", "Ab 3 Jahren. Achtung! Nicht für Kinder unter 36 Monaten."), "Spielzeug & Spiele", None),            # Hinweis da
        (("Hundespielzeug Rassel", "Für Welpen und Neugeborene Hunde."), "Spielzeug & Spiele", None),                                  # Tier
        (("Elektro-Roboterhund 8-Radantrieb", "Fernsteuerungsspielzeug für Kleinkinder ab 0-3 Jahren."), "Spass-Elektronik", "S1"),
        (("Baby-Hüftsitz Leichtreise", "Für Babys und Kleinkinder."), "Spielzeug & Spiele", None),                                    # Trage, kein Spielzeug
        (("Holzbausteine 32-Teilig für Kleinkinder", "Das Set ist für Kinder von 0–2 Jahren geeignet und entspricht der 3C‑Konfiguration für Holzspielzeug."), "Spielzeug & Spiele", "S1"),
    ]
    for (t, x), typ, soll in spiel:
        if k(t, x, typ) != soll:
            f.append(f"{t!r}: {k(t, x, typ)!r}, soll {soll!r}")
    # S1-Umschreibung: kein Säuglingswort mehr übrig, Aussagen bleiben sinnvoll
    gaenge = [
        ("Wukong Roboter Mecha Bausteine für Kleinkinder",
         "<p>Ideal als Geschenk für kleine Baumeister im Alter von 0 bis 3 Jahren.</p><ul><li>Speziell für Kleinkinder (0-3 Jahre) entwickelt</li></ul>",
         "Wukong Roboter Mecha Bausteine für Kinder", ["ab 3 Jahren", "Kinder ab 3 Jahren"]),
        ("Alloy Auto Modell 1:32",
         "<p>Es gehört zur Spielzeugkategorie für Personen ab 14 Jahren und ist gleichzeitig für Säuglinge von 0 bis 3 Jahren geeignet. Die Verpackung enthält ein Auto.</p>",
         "Alloy Auto Modell 1:32", ["ab 14 Jahren. Die Verpackung"]),
        ("Elektro-Roboterhund 8-Radantrieb",
         "<p>Fernsteuerungsspielzeug für Kleinkinder ab 0-3 Jahren.</p><li>Verwendbar ab: 0-3 Jahre</li>",
         "Elektro-Roboterhund 8-Radantrieb", ["Kinder ab 3 Jahren", "Verwendbar ab: 3 Jahre"]),
        ("Elektrisches Oktopus-Spielzeug mit Sound & Licht",
         "<p>Wurde speziell für Babys und Kleinkinder von 0 bis 3 Jahren entwickelt.</p>",
         "Elektrisches Oktopus-Spielzeug mit Sound & Licht", ["speziell für Kinder ab 3 Jahren entwickelt"]),
        ("Holzspielhaus mit Telefon", "<p>Das Produkt ist für Kinder ab 0 – 3 Jahren geeignet.</p><li>Altersgruppe 0–3 Jahre</li>",
         "Holzspielhaus mit Telefon", ["für Kinder ab 3 Jahren geeignet", "Altersgruppe: ab 3 Jahren"]),
        ("Holzbausteine 32-Teilig für Kleinkinder", "<p>Das Set enthält 32 Stück, ist für Kinder von 0–2 Jahren geeignet und entspricht der 3C\u2011Konfiguration für Holzspielzeug.</p>",
         "Holzbausteine 32-Teilig für Kinder", ["32 Stück, ist für Kinder ab 3 Jahren geeignet."]),
    ]
    for titel, html, soll_t, enthaelt in gaenge:
        nt, nh, rest = s1_umschreiben(titel, html)
        if rest or nt != soll_t or any(e not in nh for e in enthaelt):
            f.append(f"S1-Umschreibung {titel!r}: Titel {nt!r} · Rest {rest} · Text {klartext(nh)!r}")
    # Prüfung 19.10. (baby B1–B10): Gegen-Kanarien
    neu = [
        ("Saugroboter mit Hindernis-Sensor", "Ideal für Haushalte mit Babys und Kleinkindern.", "Haushaltsgeräte", None),
        ("Stapelbarer Wäschekorb", "Auch für Babykleidung (Neugeborene).", "Haushalt & Wohnen", None),
        ("Babyphone mit Kamera Modell 2024", "Für Babys und Kleinkinder von 0 bis 3 Jahren.", "Elektronik", None),
        ("Memory Foam Nackenkissen", "Passt sich der Kopfform an. Schlafe wie ein Baby.", "Wohnen & Deko", None),
        ("Kopfkissen Hotelqualität", "Babyweiche Mikrofaser, passt sich der Kopfform an.", "Wohnen & Deko", None),
        ("Matratzenschoner gegen Verformung", "Schützt die Matratze.", "Wohnen & Deko", None),
        ("Baby-Kopfkissen für schöne Kopfform", "Für Neugeborene.", "Wohnen & Deko", "K"),
        ("Spielplatz Rutsche für Kleinkinder", "Für Kinder von 0 bis 3 Jahren.", "Spielzeug & Spiele", "S1"),
        ("Spielzeugkiste mit Deckel", "Für Kleinkinder von 0 bis 3 Jahren.", "Spielzeug & Spiele", "S1"),
        ("Magnetspielzeug Set", "Warnung: Nicht für Kleinkinder von 0 bis 3 Jahren geeignet.", "Spielzeug & Spiele", "S1W"),
        ("Elektrisches Oktopus-Spielzeug", "Unterstützt beim Krabbeln und Greifen, für Babys und Kleinkinder von 0 bis 3 Jahren.", "Spass-Elektronik", "S2"),
        ("Silikon Beissring Banane", "Für Babys und Kleinkinder von 0 bis 3 Jahren.", "Spielzeug & Spiele", "S2"),
    ]
    for t, x, typ, soll in neu:
        if k(t, x, typ) != soll:
            f.append(f"{t!r}: {k(t, x, typ)!r}, soll {soll!r}")
    # Verneinung: nicht umdrehen
    nt, nh, rest = s1_umschreiben("Magnetspielzeug Set", "<p>Warnung: Nicht für Kleinkinder von 0 bis 3 Jahren geeignet.</p>")
    if rest != 99 or "ab 3 Jahren" in nh:
        f.append(f"Verneinungssatz wurde umgeschrieben: {nh!r}")
    # SEO-Rest
    kl_, _ = klasse({"title": "Holzbausteine-Puzzle für Kinder", "productType": "Spielzeug & Spiele",
                     "descriptionHtml": "<p>Ab 3 Jahren.</p><p class='ls-warnhinweis'>Achtung! Nicht für Kinder unter 36 Monaten.</p>",
                     "seo": {"title": "Holzbausteine-Puzzle für Kleinkinder | LuxeStyle CH", "description": "Bausteine für Kleinkinder."}})
    if kl_ != "SEO":
        f.append(f"SEO-Rest nicht erkannt: {kl_!r}")
    st, sd, srest = seo_umschreiben({"title": "Holzbausteine-Puzzle für Kleinkinder | LuxeStyle CH", "description": "Bausteine für Kleinkinder."})
    if srest or "Kleinkind" in st or "Kleinkind" in sd:
        f.append(f"SEO-Umschreibung: {st!r} / {sd!r} Rest {srest}")
    total = len(fall) + len(spiel) + len(gaenge) + len(neu) + 2
    print(f"baby_claims_wache Selbsttest: {total - len(f)}/{total}")
    for x in f:
        print("  FAIL", x)
    return not f


def main():
    from werbetest_sperre import gesperrt
    from kinder_sicherheit import WARNUNG_KLEIN, WARNUNG_MAGNET, MAGNET
    arten = ("K", "S2", "S1", "S1W", "SEO")
    treffer = {a: [] for a in arten}
    gesehen = 0
    for p in kandidaten():
        gesehen += 1
        if p.get("status") != "ACTIVE" or gesperrt(p["id"]):
            continue
        kl_, beleg = klasse(p)
        if kl_:
            treffer[kl_].append((p, beleg))
    print(f"{gesehen} Kandidaten gelesen · " + " · ".join(f"{a} {len(treffer[a])}" for a in arten) + f" · {'FIX' if FIX else 'DRY'}", flush=True)
    for art in arten:
        for p, beleg in treffer[art]:
            print(f"  [{art}] {p['id'].split('/')[-1]} {p['title'][:60]} · «{beleg}»", flush=True)
    geschrieben = fehler = offen = 0
    gesamt = sum(len(v) for v in treffer.values())
    if FIX:
        lock = open("/tmp/lock_produkttext.lock", "w")
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            print("PAUSE: Text-Sperre belegt — nächster Lauf", flush=True)
            return 0
        stempel = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        n = 0
        for art in ("K", "S2"):                                   # Entwürfe
            for p, beleg in treffer[art]:
                if n >= MAX_LAUF:
                    break
                n += 1
                ok, tags_ok = schreibe_entwurf(p["id"], TAGS_K if art == "K" else TAGS_S2)
                if ok:
                    geschrieben += 1
                    with open(LEDGER, "a", encoding="utf-8") as led:       # Prüfung B9: Vor-Tags für einen sauberen Rückweg
                        led.write(f"{stempel}\t{p['id'].split('/')[-1]}\t{art}\t{'DRAFT' if tags_ok else 'DRAFT-OHNE-TAG'}\t{p['title']}\t{beleg}\t{json.dumps(p.get('tags') or [], ensure_ascii=False)}\n")
                else:
                    fehler += 1
                time.sleep(0.3)
        for art in ("S1", "S1W", "SEO"):                          # Textkorrekturen
            for p, beleg in treffer[art]:
                if n >= MAX_LAUF:
                    break
                n += 1
                frisch = (gql('query($id:ID!){product(id:$id){title status descriptionHtml seo{title description}}}', {"id": p["id"]}) or {}).get("product") or {}
                html = frisch.get("descriptionHtml") or ""
                if frisch.get("status") != "ACTIVE":
                    continue
                titel0 = frisch.get("title") or p["title"]
                if art == "SEO":
                    nt, nh, rest = titel0, html, 0
                else:
                    if art == "S1" and HINWEIS_DA.search(html):
                        continue                                  # inzwischen anders versorgt
                    nt, nh, rest = s1_umschreiben(titel0, html)
                st, sd, srest = seo_umschreiben(frisch.get("seo"))
                if rest or srest:
                    offen += 1
                    print(f"  ⚠️ offen (Wortlaut unbekannt/Verneinung): {p['title'][:50]} → {[m.group(0) for m in SAEUG.finditer(klartext(nh))][:3]} {SEO_CLAIM.findall(st + ' ' + sd)[:3]}", flush=True)
                    continue
                if art == "S1":
                    nh = nh + (WARNUNG_MAGNET if MAGNET.search(titel0 + " " + klartext(html)[:1200]) else WARNUNG_KLEIN)
                with open(VORHER, "a", encoding="utf-8") as vf:     # Rückweg VOR dem Schreiben (Text, Titel, SEO)
                    vf.write(json.dumps({"id": p["id"], "titel": frisch.get("title"), "html": html, "seo": frisch.get("seo")}, ensure_ascii=False) + "\n")
                eingabe = {"id": p["id"], "title": nt, "descriptionHtml": nh}
                if frisch.get("seo") and (frisch["seo"].get("title") or frisch["seo"].get("description")):
                    eingabe["seo"] = {"title": st, "description": sd}       # immer beide Felder
                r = gql('mutation($i:ProductUpdateInput!){productUpdate(product:$i){product{descriptionHtml title seo{title description}} userErrors{message}}}', {"i": eingabe})
                pu = r.get("productUpdate") or {}
                zp = pu.get("product") or {}
                zur = zp.get("descriptionHtml") or ""
                if (pu.get("userErrors") or "ls-warnhinweis" not in zur or SAEUG.search(klartext(zur))
                        or SEO_CLAIM.search(((zp.get("seo") or {}).get("title") or "") + " " + ((zp.get("seo") or {}).get("description") or ""))):
                    fehler += 1
                    print(f"  ⛔ Rücklesen: {p['title'][:50]} {pu.get('userErrors')}", flush=True)
                    continue
                geschrieben += 1
                with open(LEDGER, "a", encoding="utf-8") as led:
                    led.write(f"{stempel}\t{p['id'].split('/')[-1]}\t{art}\tTEXT{'+HINWEIS' if art == 'S1' else ''}\t{titel0}\t{beleg}\t[]\n")
                time.sleep(0.3)
        lock.close()
        with open(STAND, "w", encoding="utf-8") as f:                  # Prüfung B12: ein DRY-Lauf überschreibt den Stand des letzten echten Laufs nicht
            json.dump({"stand": time.strftime("%Y-%m-%dT%H:%MZ", time.gmtime()), "gelesen": gesehen, **{a: len(treffer[a]) for a in arten},
                       "geschrieben": geschrieben, "offen": offen, "fehler": fehler, "fix": FIX}, f, ensure_ascii=False, indent=1)
    # FERTIG sperrt den Wächter 20 h — nur drucken, wenn nichts durch Fehler oder MAX_LAUF liegen blieb («offen» = Wortlaut ohne Ersetzung, wird gemeldet, blockiert nicht)
    if FIX and (fehler or geschrieben + offen + fehler < gesamt):
        print(f"PAUSE: baby_claims_wache unvollständig (geschrieben {geschrieben}, offen {offen}, Fehler {fehler}, Treffer {gesamt}) — nächster Lauf", flush=True)
        return 1 if fehler else 0
    print(f"FERTIG {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}: " + " · ".join(f"{a} {len(treffer[a])}" for a in arten)
          + f" · geschrieben {geschrieben} · offen {offen} · Fehler {fehler}" + ("" if FIX else " (DRY)"), flush=True)
    return 1 if fehler else 0


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--selbsttest":
            sys.exit(0 if selbsttest() else 1)
        print(f"unbekannter Schalter {sys.argv[1]!r} — Abbruch (kein Lauf)")
        sys.exit(2)
    sys.exit(main())
