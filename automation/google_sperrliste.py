"""Gemeinsame Sperrliste für den Google-Kanal — wer hier steht, darf NIE wieder hinein.

DER BEFUND (14.08.2026): Alle 16 Produkte, die `merchant_issue_fix.py` am 09.08. wegen
von Google SELBST gemeldeter Richtlinienverstösse aus dem Google-&-YouTube-Kanal genommen
hatte, standen wieder drin — fünf «Restricted adult content», drei CBD-Fälle, acht
«Personalized advertising: personal hardships». Die Reparatur war zu 100 % zurückgedreht.

WER SIE ZURÜCKGEHOLT HAT (aus den Ledgern belegt, nicht vermutet):
   14  automation/gfeed_restore.py          → «zurueck-im-google-kanal»
    2  automation/google_kanal_nachziehen.py → «im-google-kanal»
Beide prüfen vor dem Publizieren nur den STATUS («ist das Produkt noch ACTIVE?»). Ein
Produkt, das bewusst aus einem einzelnen KANAL genommen wurde, aber im eigenen Shop weiter
verkauft werden darf, sieht für sie aus wie ein vergessenes Produkt — und genau so
behandeln sie es. Die Sperr-Tags (`google-gesperrt-adult` / `-cbd` / `-notlage`) lagen
die ganze Zeit am Produkt, wurden aber von keinem der beiden gelesen.

Das ist das Muster aus dem Projektgedächtnis, eine Ebene weiter: «Zu jedem Backfill gehört
die Frage, wer das Feld beim NÄCHSTEN Produkt schreibt» — hier: wer den Kanal beim NÄCHSTEN
Lauf wieder aufmacht. Deshalb liegt der Ausschluss ab jetzt NICHT in den einzelnen Läufen,
sondern hier an einer Stelle, die jeder Google-Publizierer importiert.

ZWEI QUELLEN, weil jede für sich lückenhaft ist:
  • das Ledger `dropship/_merchant_issue_done.txt` — die Produkt-IDs, die Google gemeldet hat.
    Überlebt auch, wenn jemand den Tag am Produkt versehentlich entfernt.
  • der Tag-Präfix `google-gesperrt` am Produkt — greift auch bei Produkten, die ein
    späterer Lauf sperrt und die noch nicht im Ledger stehen.

BENUTZUNG:
    from google_sperrliste import gesperrte_ids, tag_gesperrt
    sperr = gesperrte_ids()
    if gid_zahl(p["id"]) in sperr or tag_gesperrt(p.get("tags")):
        continue                      # nie in den Google-Kanal publizieren

⚠️ Der Ausschluss gilt AUSSCHLIESSLICH für den Google-Kanal. Im eigenen Onlineshop dürfen
ein CBD-Pflegeset, ein Umstandskissen und eine Yoga-Shorts selbstverständlich verkauft
werden — sie dürfen nur nicht über Google beworben werden. Nichts hier draften oder löschen.
"""
import os
import sys
import re

GOOGLE_PUB_ID = "302872297857"
GOOGLE_PUB = "gid://shopify/Publication/" + GOOGLE_PUB_ID
TAG_PRAEFIX = "google-gesperrt"

_HIER = os.path.dirname(os.path.abspath(__file__))


def _repo():
    """⚠️ 05.10.2026: gfeed_restore und google_sperrtags_durchsetzen laufen als /tmp-Spiegelkopie (Aufseher) und importieren
    /tmp/google_sperrliste.py — dirname(_HIER) war dann «/», das Ledger «/dropship/…» fehlte, gesperrte_ids() gab still
    0 statt 17. Kandidaten: $REPO, Lage der Datei, Arbeitsverzeichnis, fester Pfad; gültig nur mit dropship/ UND automation/."""
    for k in (os.environ.get("REPO"), os.path.dirname(_HIER), os.getcwd(), "/home/user/aban-news-landing"):
        if k and os.path.isdir(os.path.join(k, "dropship")) and os.path.isdir(os.path.join(k, "automation")):
            return k
    return os.path.dirname(_HIER)


LEDGER = os.path.join(_repo(), "dropship", "_merchant_issue_done.txt")


# ─────────────────────────────────────────────────────────────────────────────────────
# AUSSCHLUSS-TAGS — die EINE Liste für alle Google-Publizierer (28.08.2026)
#
# WARUM HIER: Die Menge stand wortgleich in `google_kanal_luecke.py` UND in
# `google_kanal_luecke_schliessen.py`. Zwei Listen, die auseinanderlaufen, sind in diesem
# Projekt eine eigene Fehlerklasse (Farbtabelle 4×, Preisformel 4×, Grössenmenge 3×,
# publishVerified 3×). Neue Ausschluss-Tags gehören AUSSCHLIESSLICH hierher.
#
# WIE DIE LISTE ENTSTANDEN IST: Für jeden Kandidaten wurde LIVE gezählt, wie viele seiner
# Träger im Google-Kanal fehlen. Aufgenommen ist nur, wo Name UND Messung dasselbe sagen
# (28.08.2026, aktive Produkte, Suchindex gegengeprüft):
#     12/12  100 %  verdeckte-ueberwachung          33/33  100 %  google-policy-flag
#     34/34  100 %  nicht-google-bewerben           20/20  100 %  lizenz-nicht-bewerben
#     10/10  100 %  adult-nicht-bewerben            10/10  100 %  gmc-adult-pull
#      8/8   100 %  messer-nicht-bewerben           11/11  100 %  smoke-zubehoer
#      2/2   100 %  waffe-pruefen
#
# ⚠️ ZWEI KANDIDATEN WURDEN GEMESSEN UND VERWORFEN — sie sehen wie Ausschlussgründe aus
# und sind keine:
#   • `nicht-verifiziert-lieferbar`  1/16 =  6 % — 15 der 16 Träger stehen bei Google.
#   • `bild-zu-klein`              52/326 = 16 % — 274 der 326 Träger stehen bei Google.
#     Ein zu kleines Bild ist bei Google eine Warnung für Shopping-ADS («No impact» auf die
#     Gratis-Einträge, Befund 20.08.), kein Ausschluss. Wer es hier einträgt, sperrt 274
#     einwandfreie Produkte aus dem einzigen Kanal, der verkauft.
# Ein Tag-NAME, der nach Ausschluss klingt, ist also kein Beleg. Erst zählen, dann eintragen.
AUSSCHLUSS_TAGS = {
    # Warengruppen und Entscheidungen, die schon vor dem 28.08. galten
    "nicht-bewerben", "nur-onlineshop", "waffengesetz-verboten", "medizinprodukt-pruefen",
    "18plus", "raucher", "erotik", "kostuem", "kostüm", "refurbished",
    "marken-pruefen", "lizenz-risiko", "tierschutz-pruefen",
    # 28.08.2026 ergänzt: am Produkt begründet, aber in keiner der beiden Listen
    "verdeckte-ueberwachung",          # versteckte Kameras/Recorder — Google-Policy
    "google-policy-flag",              # von einem früheren Lauf als Policy-Fall markiert
    "nicht-google-bewerben",           # ausdrücklich: nicht über Google bewerben
    "lizenz-nicht-bewerben",           # Lizenz-/Markenrisiko
    "adult-nicht-bewerben", "gmc-adult-pull",   # Adult-Content
    "messer-nicht-bewerben",           # Klingen, zusätzlich zur Titel-Hausregel
    "smoke-zubehoer",                  # Rauchzubehör (Ergänzung zu «raucher»)
    "waffe-pruefen",                   # wie «medizinprodukt-pruefen»: offene Prüfung
    "niedrig-bewertet-nicht-bewerben", # qualifizierte Form von «nicht-bewerben»
}


def ausschluss_tag(tags):
    """Trägt das Produkt einen Tag, der seinen Google-Ausschluss ERKLÄRT?

    Deckt drei Wege ab: die Liste oben, den Präfix `google-kanal-` (den die Importer für
    ihre Hausregeln setzen) und `google-gesperrt-*` (von Google selbst gemeldete
    Verstösse). Gibt den gefundenen Grund zurück, sonst "".
    """
    tg = {str(t).strip().lower() for t in (tags or [])}
    treffer = sorted(tg & AUSSCHLUSS_TAGS)
    if treffer:
        return ", ".join(treffer)
    for t in sorted(tg):
        if t.startswith("google-kanal-") or t.startswith(TAG_PRAEFIX):
            return t
    return ""


def id_zahl(pid):
    """«gid://shopify/Product/15448825659777» und «15448825659777» ergeben dasselbe."""
    m = re.search(r'(\d+)\s*$', str(pid or "").strip())
    return m.group(1) if m else ""


def gesperrte_ids(pfad=None):
    """Produkt-IDs (als Zahl-Zeichenkette) aus dem Merchant-Ledger.

    ⚠️ Fehlt die Datei, geben wir eine LEERE Menge zurück — der Aufrufer verliert dann den
    Ledger-Schutz, behält aber den Tag-Schutz. Das ist Absicht: eine harte Ausnahme würde
    den ganzen Lauf abbrechen, ein stiller Ausfall wäre schlimmer. Wer sichergehen will,
    prüft `ledger_vorhanden()`.
    """
    pfad = pfad or LEDGER
    ids = set()
    if not os.path.exists(pfad):
        # 05.10.2026: still leer war die Lücke (siehe _repo) — jetzt wenigstens laut auf stderr.
        print(f"⚠️ google_sperrliste: Merchant-Ledger fehlt → 0 gesperrte IDs: {pfad}", file=sys.stderr, flush=True)
        return ids
    for zeile in open(pfad, encoding="utf-8"):
        z = zeile.strip()
        if not z:
            continue
        n = id_zahl(z.split("\t")[0])
        if n:
            ids.add(n)
    return ids


def ledger_vorhanden(pfad=None):
    return os.path.exists(pfad or LEDGER)


def entfernte_handles(verzeichnis=None):
    """Handles, die jemand (Wächter oder Betreiber) bewusst aus dem Google-Kanal genommen hat — Ledger
    `dropship/_*unpub*.tsv`, Spalten: Zeit, Handle, Art, Grund; zählt nur Art «google-kanal-entfernt».

    20.10.2026: Die 112 Produkte vom 12.10. (Restricted adult content) wurden nur per Ledger entfernt, OHNE Sperr-Tag; der tägliche
    Kanal-Schliesser (google_kanal_luecke.py, liest nur Tags und Titelmuster) hat sie am 13.10. in 109 s wieder publiziert.
    Ein Rückholer muss jede Entfernung kennen — auch die ohne Tag. Fehlt das Verzeichnis/die Datei: leere Menge (Tag-Schutz bleibt)."""
    import glob
    d = verzeichnis or os.path.join(_repo(), "dropship")
    hs = set()
    for pfad in glob.glob(os.path.join(d, "_*unpub*.tsv")):
        try:
            for zeile in open(pfad, encoding="utf-8"):
                sp = zeile.rstrip("\n").split("\t")
                if len(sp) >= 3 and sp[2].strip() == "google-kanal-entfernt" and sp[1].strip():
                    hs.add(sp[1].strip().lower())
        except OSError:
            continue
    return hs


def tag_gesperrt(tags):
    """Trägt das Produkt einen Google-Sperr-Tag?

    Nur der PRÄFIX wird geprüft, nicht eine feste Liste: `merchant_issue_fix.py` legt für
    jede neue Verstoss-Kategorie einen weiteren Tag an (`google-gesperrt-<kategorie>`).
    Eine Aufzählung wäre morgen wieder unvollständig — genau der Fehler, der die
    Medizinprodukt-Suche nach Produktnamen statt nach Funktion teuer gemacht hat.
    """
    for t in (tags or []):
        if str(t).strip().lower().startswith(TAG_PRAEFIX):
            return True
    return False


def darf_zu_google(pid, tags, sperrliste=None):
    """Einzige Frage, die ein Publizierer stellen muss."""
    sperr = gesperrte_ids() if sperrliste is None else sperrliste
    return not (id_zahl(pid) in sperr or tag_gesperrt(tags))


# ---------------------------------------------------------------------------
# HEIKLE WARENGRUPPEN — EINE Quelle fuer alle Google-Publizierer (04.09.2026).
#
# Sie stand wortgleich in `google_kanal_luecke_schliessen.py` und
# `google_kanal_nachziehen.py` — und die beiden Fassungen waren AUSEINANDERGELAUFEN:
# der Schliesser wurde am 29.08. verankert (`maske`, `grinder`, `waffen?`) und von den
# Klingenwoertern befreit, der Nachzieher trug weiter das ungeankerte
# `messer|dolch|machete|waffe|maske\b|grinder\b`. Damit galten dort Waffelstrick-Pullover
# als Waffen, Schlafmasken als Kostuem und ein Seifengrinder als Rauchzubehoer — und die
# gepflegte Klingenregel war vollstaendig beschattet, weil HEIKEL VOR ihr geprueft wird.
# **Die Klingenfrage beantwortet ausschliesslich `klingenregel.ist_klinge()`** — hier
# stehen deshalb KEINE Klingenwoerter.
# 05.10.2026 (Prüfer, Google-Adult): `kost[üu]m` traf das Tag «kostuem-hut» NICHT (ASCII-Schreibung «ue»), ein Fasnachts-
# Plüschhut (Widmann) stand im Google-Kanal; drei Maskenball-/Performance-Masken trugen weder «kostuem» noch ein Wort,
# das `(?<!\w)maske\b` trifft («Halbmaske», «Maskenbälle»). Beide Schreibungen und die Maskenball-Wörter sind jetzt drin.
HEIKEL = re.compile(
    r'kost[üu]e?m|verkleid|fasnacht|halloween|per[üu]cke|(?<![\wäöüß])maske\b|halbmaske\b|maskenb[aä]ll|'
    r'performance-?maske|tutu\b|'
    r'hexe|vampir|zombie|clown|'
    r'dessous|reizw|erotik|18\+|generalüberholt|restauriert|refurb|ersatzteil|ersatzkopf|'
    r'waffen?\b|munition|armbrust|'
    # Rauchzubehoer behandelt Google wie Tabak. 04.09.: `feuerzeug` ergaenzt — ein
    # «Sturmfeuerzeug fuer Outdoor & Kueche» stand auf der Veroeffentlichungsliste.
    # Ob ein Allzweck-Feuerzeug wirklich darunter faellt, war eine BETREIBER-Entscheidung —
    # ENTSCHIEDEN 13.10.2026: ja, alle Feuerzeuge (siehe ist_feuerzeug() weiter unten).
    r'shisha|wasserpfeife|bong\b|vape|e-?zigarette|tabak|zigarre|feuerzeug|'
    r'(?<![\wäöüß])grinder\b|cbd\b', re.I)


def ist_heikel(*texte):
    """True, wenn einer der Texte (Titel, productType, Tags) eine heikle Warengruppe nennt."""
    return any(HEIKEL.search(t or '') for t in texte)


# ---------------------------------------------------------------------------
# FEUERZEUGE = RAUCHZUBEHÖR (Betreiber-Entscheid 13.10.2026: «3 ja und auch sonst normale feuerzeug»).
# GEMESSEN 13.10. (Voll-Export): 30 Titel mit Feuer-/Anzünder-Wörtern, davon 18 Feuerzeuge im Google-Kanal ohne Sperr-Tag
# (Sturm-, Stab-, USB-, Lichtbogen-, Kerosin-Feuerzeuge, Feuerzeug-Armbanduhr). KEINE Feuerzeuge: Auto-Ladegeräte für den
# Zigarettenanzünder (Steckdose im Auto), Gasherd-Zünder, Feuerstahl, Kamin-/Grillanzünder (Brennstoff). Folge: Tag
# «smoke-zubehoer» → google_sperrtags_durchsetzen nimmt die Ware aus Google UND allen Werbekanälen (ALLE_WERBEKANAELE),
# der Laden bleibt. Entschieden wird am Titel (+ Typ), nie am Beschreibungstext.
FEUERZEUG = re.compile(r'feuerzeug|(?<![\wäöü])lighters?\b|zigarrenanz[üu]nder|zippo\b|(?:lichtbogen|plasma|arc)-?(?:anz[üu]nder|zünder)',
                       re.I)
FEUERZEUG_NICHT = re.compile(r'zigarettenanz[üu]nder|kfz|ladeger[äa]t|auto-?lade|gasherd|herd-?z[üu]nder|feuerstahl|'
                             r'kaminanz|grillanz|kohleanz', re.I)


def ist_feuerzeug(titel, typ=""):
    t = titel or ""
    return bool(FEUERZEUG.search(t)) and not FEUERZEUG_NICHT.search(t)


FEUERZEUG_KANARIEN = [
    ("Windsicheres Feuerzeug für Outdoor", True),
    ("Handlicher Outdoor-Stabfeuerzeug mit Holzgriff", True),
    ("USB-Feuerzeug-Armbanduhr aus Metall", True),
    ("Metall-Lighter", True),
    ("Kerosin-Feuerzeug", True),
    ("Sturmfeuerzeug Kupfer mit Gravur", True),
    ("Zigarrenanzünder mit Locher – 4 Flammen", True),
    ("Kabelloses Dual-Laser-Feuerzeug", True),
    ("Faltbares Sturmfeuerzeug mit Jet-Flamme", True),
    ("Auto-Zigarettenanzünder mit USB & Type-C", False),
    ("USB-Autoladegerät für Zigarettenanzünder", False),
    ("Elektronischer Gasherd-Zünder", False),
    ("Feuerstahl für Camping und Bushcraft", False),
    ("Kaminanzünder aus Holzwolle · 100 Stück", False),
    ("Elektrischer Kohleanzünder für Shisha – 500W", False),   # schon «raucher», aber kein Feuerzeug
    ("Leichter Daunenmantel für Damen", False),
]


def feuerzeug_kanarien():
    f = [(t, s) for t, s in FEUERZEUG_KANARIEN if ist_feuerzeug(t) != s]
    return len(FEUERZEUG_KANARIEN), f


# ---------------------------------------------------------------------------
# HEIL-SCHMUCK (13.10.2026) — Schmuck, der seiner ART nach ein Therapie-Artikel ist (Magnettherapie-, Lymph-, Abnehm-,
# Terahertz-, Germanium-, Ionen-Schmuck). Hausregel «Wellness-/Magnet-Armband = Heilversprechen», präzisiert: die Grenze
# ist die AUSSAGE, nie das Material (Kupfer, Titanstahl, Magnetverschluss bleiben). GEMESSEN 13.10.: 298 aktive Schmuck-
# stücke mit Kupfer/Titan/Magnet/Ionen im Titel im Google-Kanal, 2 davon mit Therapie-Identität im Titel, 10 mit einer
# Heilaussage im Text/SEO/Bild (→ heilversprechen_wache ERSATZ, dropship/MAGNETSCHMUCK-2026-10-13.md). Regel und
# Kanarien stehen EINMAL in data/heilschmuck_regel.json (cat_tags.mjs liest dieselbe Datei beim Import).
import json as _json
import unicodedata as _ud


def _heilschmuck_regel():
    for k in (os.path.join(_repo(), "data", "heilschmuck_regel.json"),
              os.path.join(os.path.dirname(_HIER), "data", "heilschmuck_regel.json")):
        if os.path.exists(k):
            return _json.load(open(k, encoding="utf-8"))
    # Kein harter Abbruch: dieses Modul importieren ein Dutzend Google-Publizierer (auch als /tmp-Spiegel). Fehlt die
    # Datei, trifft die Regel nichts und ALLE Kanarien fallen durch → der Durchsetzer überspringt die Regel laut.
    print("⚠️ google_sperrliste: data/heilschmuck_regel.json fehlt → Heil-Schmuck-Regel aus", file=sys.stderr, flush=True)
    return {"schmuck": "(?!)", "heil": "(?!)", "nicht": "(?!)", "kanarien": [["Kupfer Magnetarmband gegen Arthritis", True]]}


_HS = _heilschmuck_regel()
HEILSCHMUCK_SCHMUCK = re.compile(_HS["schmuck"])
HEILSCHMUCK_HEIL = re.compile(_HS["heil"])
HEILSCHMUCK_NICHT = re.compile(_HS["nicht"])
HEILSCHMUCK_KANARIEN = [tuple(k) for k in _HS["kanarien"]]
# Prefilter-Wörter für die Titelsuche des Durchsetzers (Shopify findet nur Wortanfänge; entschieden wird an ist_heilschmuck).
HEILSCHMUCK_SUCHWORTE = ["magnettherapie", "therapie", "lymph", "abnehm", "schlankheit", "terahertz", "germanium", "ionen",
                         "negativ", "bio-energie", "energiefluss", "skalar", "arthritis", "rheuma", "schmerz", "detox",
                         "entgift", "akupressur", "wellness", "durchblutung"]


def heilschmuck_norm(titel):
    """Wie normTitel() in cat_tags.mjs: klein, Umlaute ohne Punkte, Leerzeichen vorn und hinten."""
    s = _ud.normalize("NFD", (titel or "").lower())
    return " " + "".join(c for c in s if not _ud.combining(c)) + " "


def ist_heilschmuck(titel):
    s = heilschmuck_norm(titel)
    return bool(HEILSCHMUCK_SCHMUCK.search(s) and HEILSCHMUCK_HEIL.search(s) and not HEILSCHMUCK_NICHT.search(s))


def heilschmuck_kanarien():
    f = [(t, s) for t, s in HEILSCHMUCK_KANARIEN if ist_heilschmuck(t) != s]
    return len(HEILSCHMUCK_KANARIEN), f


# ---------------------------------------------------------------------------
# KOSTÜM-ERKENNUNG AM TITEL (13.10.2026) — EINE Regel für Tagger, Durchsetzer und Rückholer.
#
# GEMESSEN 13.10. (Messrunde, Admin-API): 7 Horror-/Cosplay-Masken mit productType «Hautpflege» und ein
# «Kinderkostüm Falbala» (Tag «kinderkostuem») standen ACTIVE im Google-Kanal — gegen die Hausregel «Kostüme nie in
# den Google-Kanal». Der Durchsetzer fragte nur EXAKTE Sperr-Tags («kinderkostuem» ≠ «kostuem»), und HEIKEL ist zum
# Entfernen zu laut (62 Google-Produkte mit Maske/Perücke/Kostüm im Titel, die Mehrheit LED-/Kollagen-Masken,
# Echthaar-Perücken, «Pulloverkleid»). Deshalb hier eine ENGE Regel: Maske NUR mit Kostüm-Kontext, «…kostüm» nur am
# Wortende und nicht als Damenanzug. Kanarien in google_sperrtags_durchsetzen.py --kanarien (0 Fehler Pflicht).
KOSTUEM_KONTEXT = re.compile(
    r'horror|latex|zombie|totenkopf|skull|cosplay|halloween|grusel|vampir|hexe|clown|pl[üu]sch|fasnacht|fasching|'
    r'karneval|steampunk|viking|wikinger|monster|teufel|d[äa]mon|geist|fratze|joker|scream|maskerade|party', re.I)
KOSTUEM_MASKE = re.compile(r'\w*maske\b|\bmask\b', re.I)
KOSTUEM_WORT = re.compile(r'\w*kost[üu]e?m(?:e|en)?\b|\bkost[üu]m(?:kleid|handschuhe?|set|zubeh[öo]r)\w*|halbmaske|maskenb[aä]ll|'
                          r'(?<![\wäöüß])verkleidung\b', re.I)
# Prüfung 13.10. (Workflow wf_1c367cd7-abd, Befund bestätigt): KOSTUEM_NICHT stand VOR allem anderen und schlug ein
# ausdrückliches «Kinderkostüm» über blosse Wortteile — «Kinderkostüm Hexe mit LED», «… Pinguin · Anzug & Kopfteil»,
# «… Pirat · … Kopftuch», «Atemberaubendes Vampir Kostüm», «Jedi Kostüm mit Lichtschwert» galten als «kein Kostüm».
# Jetzt: Steht das Kostümwort im Titel, zählt NUR die Damenanzug-Ausnahme (KOSTUEM_ANZUG). Die übrigen Ausnahmen gelten
# nur für Masken/…verkleidung ohne Kostümwort; dort sind LED/Licht keine Ausnahme mehr, wenn Kostüm-Kontext da ist
# («LED Purge Maske Halloween»), denn die Beauty-Masken tragen ihr eigenes Wort (Photon, Kollagen, Gesichtspflege …).
KOSTUEM_ANZUG = re.compile(r'blazer|business|damenanzug|kost[üu]mjacke|kost[üu]mrock|\bdamen\s+kost[üu]m\b(?!\w)', re.I)
# «…verkleidung» als Wortteil (Heizkörper-, Kotflügel-, Wandverkleidung) ist Technik — nur MIT Kostüm-Kontext ein Kostüm.
KOSTUEM_VERKLEIDUNG_TEIL = re.compile(r'\w+verkleidung\b', re.I)
KOSTUEM_NICHT = re.compile(
    r'\bled\b|photon|licht|infrarot|coll?agen|kollagen|peel|\bmud\b|schlaf|tuch|sheet|thermo|sport|atem|staub|'
    r'\buv\b|gesichtspflege|feuchtigkeit|hydrat|ffp|chirurg|tauch|schnorchel|\bski|winddicht|motorrad|schweiss|'
    r'blazer|hosenanzug|business|damenanzug|kost[üu]mjacke|kost[üu]mrock|'
    r'wandverkleidung|verkleidungsleiste|wandpaneel|kopfteil|bettverkleidung|dekoration|wanddeko', re.I)
# ROLLEN-KOSTÜME OHNE KOSTÜMWORT (13.10.2026, Richter-Punkt A4d). GEMESSEN 13.10.: unter den 172 aktiven Google-Produkten
# (Typ «Kostüme & Verkleidung» ∪ Kollektionen halloween/kostueme-ch-lager) waren 6 Kostüme, die ist_kostuem() NICHT erkannte,
# weil das Wort «Kostüm» fehlt — von Hand + Bild geprüft: «Hemd Waggis rot», «Nikolaus Baby-Strampler», «Zimmermädchenset»,
# «Araber Schuhüberzug» (Fortura, CH-Lager), «Göttinnen-Kleid für Mottopartys und Halloween» und «Tier-Halloween-Mantel» (CJ;
# beide nennen sich in der Beschreibung selbst «Kostüm»). Bewusst ENG: eine Rolle zählt nur zusammen mit einem Kleidungsstück
# (Waggis-Ratsche, Weihnachtsmann-Figur, Kerzenform «Göttin» bleiben draussen), Motivware (Print/Muster/Druck) nie, und
# KEINE Typ-Regel (siehe ist_kostuem). Mützen/Kopfschmuck/Perücken zählen hier nicht (Entscheid 23.09.: «kostuem-hut» ist kein
# Ausschluss-Tag). Jede Zeile wurde am Voll-Export gezählt (aktive Treffer 13.10.: waggis 9, zimmermädchen 1, nikolaus+Kleid 1,
# göttin+Kleid+Kontext 1, araber+Schuh 1, Tier+Halloween+Mantel 1). Kanarien unten.
# (Rolle, Kleidungsstück oder None, zusätzlich nötiger Kontext oder None)
KOSTUEM_ROLLE = [
    (re.compile(r'waggis', re.I), re.compile(r'hemd|hose|zipfelm[üu]tze|kittel|larve|jacke', re.I), None),
    (re.compile(r'zimmerm[äa]dchen', re.I), None, None),
    (re.compile(r'nikolaus|samichlaus|weihnachtsmann|\bsanta\b', re.I),
     re.compile(r'strampler|anzug|overall|kleid\b|mantel\b|robe\b', re.I), None),
    (re.compile(r'g[öo]ttin', re.I), re.compile(r'kleid|gewand|robe\b|toga', re.I), KOSTUEM_KONTEXT),
    # Gegenprüfung 13.10. (A4d-Teil1-Regel): «Sultan Tunika Herren Leinen» / «Scheich Kopftuch» wären ohne Kontext als
    # Kostüm gezählt worden. Ohne Kontext zählt deshalb nur der Fasnachts-Artikel «…Schuhüberzug» (Fortura, CH-Lager);
    # Tunika/Gewand/Kopftuch/Turban/Umhang brauchen Kostüm-Kontext (Fasnacht, Halloween, Party …).
    (re.compile(r'\baraber|scheich|sultan', re.I), re.compile(r'schuh[üu]e?berzug', re.I), None),
    (re.compile(r'\baraber|scheich|sultan', re.I), re.compile(r'schuh|tunika|gewand|kopftuch|turban|umhang', re.I),
     KOSTUEM_KONTEXT),
    (re.compile(r'(?:^|[\s-])(?:haus)?tier(?:e|-|\b)|(?<![\wäöüß])hunde?\b|(?<![\wäöüß])katzen?\b', re.I),
     re.compile(r'mantel|umhang|\bcape\b|outfit|anzug', re.I), re.compile(r'halloween', re.I)),
]
KOSTUEM_ROLLE_NICHT = re.compile(r'print|muster|druck|motiv|figur|deko', re.I)
# Prefilter-Wörter für die Titelsuche des Durchsetzers (Shopify findet nur Wortanfänge; entschieden wird an ist_kostuem).
KOSTUEM_ROLLE_SUCHWORTE = ["waggis", "zimmermädchen", "nikolaus", "samichlaus", "weihnachtsmann", "santa", "göttin",
                           "araber", "scheich", "sultan", "tier-halloween", "halloween"]


def kostuem_rolle(titel):
    """True, wenn der Titel eine Kostüm-Rolle MIT Kleidungsstück nennt (ohne das Wort «Kostüm»)."""
    t = titel or ""
    if KOSTUEM_ROLLE_NICHT.search(t):
        return False
    for rolle, stueck, kontext in KOSTUEM_ROLLE:
        if rolle.search(t) and (stueck is None or stueck.search(t)) and (kontext is None or kontext.search(t)):
            return True
    return False


POD_WARE = re.compile(r'(?:sticker|tasse|t-shirt|tasche|kissen|mauspad|poster|hoodie|sweatshirt|becher|handyh[üu]lle|leinwand|'
                      r'puzzle|kalender|karte|fussmatte)\b', re.I)
POD_TYPEN = {"sticker", "tasse", "t-shirt", "tasche", "kissen", "mauspad", "poster", "hoodie", "sweatshirt", "becher",
             "handyhülle", "leinwand", "puzzle", "kalender"}


def ist_kostuem(titel, typ=""):
    """True, wenn das Produkt ein Kostüm / eine Kostüm-Maske ist (nie in den Google-Kanal).

    Reihenfolge (13.10., nach Prüfung): Druck-Ware nie · Kostümwort im Titel → Kostüm, ausser Damenanzug (KOSTUEM_ANZUG) ·
    Maske/…verkleidung nur mit Kostüm-Kontext und ohne Ausnahme (KOSTUEM_NICHT; LED/Licht zählen dort bei Kontext nicht).
    """
    t = titel or ""
    # ⚠️ KEINE Typ-Regel: «Kostüme & Verkleidung» ist bei Fortura-Ware massenhaft falsch vergeben (GEMESSEN 13.10.:
    # 113 aktive Google-Produkte mit diesem Typ, darunter Toilettenpapier, Spielzeug-Traktoren, Luftmatratzen, HARIBO).
    # Druck-Ware mit Motivnamen («Tasse «Fasnacht Mask»») ist kein Kostüm.
    if POD_WARE.match(t.strip()) or (typ or "").strip().lower() in POD_TYPEN:
        return False
    if KOSTUEM_WORT.search(t):
        return not KOSTUEM_ANZUG.search(t)
    if kostuem_rolle(t):          # 13.10. A4d: Rolle + Kleidungsstück ohne Kostümwort («Hemd Waggis rot»)
        return True
    if not (KOSTUEM_MASKE.search(t) or KOSTUEM_VERKLEIDUNG_TEIL.search(t)) or not KOSTUEM_KONTEXT.search(t):
        return False
    rest = re.sub(r'\bled\b|licht', ' ', t, flags=re.I)     # bei Kostüm-Kontext sind LED/Licht keine Ausnahme
    return not KOSTUEM_NICHT.search(rest)


KOSTUEM_KANARIEN = [
    # (Titel, Typ, erwartet)
    ("Horror Maske Blutung Totenkopf", "Hautpflege", True),
    ("Horror Maske für Halloween und Fasnacht", "Hautpflege", True),
    ("Horror Totenkopf Latex-Maske", "Hautpflege", True),
    ("Viking Ugly Latex Maske", "Hautpflege", True),
    ("Skull Maske", "Hautpflege", True),
    ("Horror Zombie Maske", "Hautpflege", True),
    ("Steampunk Cosplay Maske", "Hautpflege", True),
    ("Kinderkostüm Falbala", "Kinderkostüme", True),
    ("Latex-Horrormaske «Verrottete Fratze»", "", True),
    ("Halbmaske Löwe aus Plüsch", "", True),
    ("Lustiges Teddy Cape Geist Kostüm", "", True),
    ("Silikon Photon Maske LED", "Beauty-Tools", False),
    ("Collagen Hydrating Maske", "Hautpflege", False),
    ("Winddichte Thermo-Maske für Outdoor-Aktivitäten", "", False),
    ("Atmungsaktive Maske für Sport", "", False),
    ("Pailletten-Pulloverkleid mit Rollkragen", "Damenmode", False),
    ("Wandverkleidung aus Stoff", "Wohnen & Deko", False),
    ("HD-Lace Haarperücke aus echtem Haar", "Perücken", False),
    ("Damen Kostüm Blazer", "Damenmode", False),
    ("Seidene Schlafmaske mit Kühlgel", "", False),
    ("Animatronic XXL Hexe 300 cm", "Partydeko & Ballone", False),
    ("Plüsch-Teddybär 40 cm", "Spielzeug & Spiele", False),
    ("LED-Gesichtsmaske mit 7 Farben", "Beauty-Tools", False),
    ("Halloween Deko Kürbis mit Licht", "", False),
    ("Heizkörperverkleidung aus Holz", "Wohnen & Deko", False),
    ("Kotflügelverkleidung für E-Scooter", "", False),
    ("Faschingsverkleidung Pirat für Kinder", "", True),
    ("Verkleidung Polizist für Erwachsene", "", True),
    ("Kostümjacke aus Tweed", "Damenmode", False),
    ("Tasse «Fasnacht Mask»", "Tasse", False),
    ("Sticker «Ch Fasnacht Mask» · 1 Stück", "Sticker", False),
    ("Tengu Dämonenmaske Dekoration", "Aufbewahrung & Organizer", False),
    ("WC Papier rosa 4 Rollen Red Label 3 lagig", "Kostüme & Verkleidung", False),
    ("Claas Disco 8550 C Plus Dreifach-Mähwerk", "Kostüme & Verkleidung", False),
    ("Plüsch Maske Werwolf", "Spielzeug & Spiele", True),
    # 13.10. Prüfung: ausdrückliches Kostümwort schlägt Wortteile der Ausnahmeliste
    ("Kinderkostüm Hexe mit LED", "Kostüme & Verkleidung", True),
    ("Kinderkostüm Pinguin · Anzug & Kopfteil (Widmann)", "", True),
    ("Kinderkostüm Pirat · Hemd, Weste, Hose & Kopftuch (Widmann)", "", True),
    ("Atemberaubendes Vampir Kostüm", "", True),
    ("Jedi Kostüm mit Lichtschwert", "", True),
    ("Kinderkostüm Taucher", "", True),
    ("Kostüm Skifahrer", "", True),
    ("Kostüm Set Chirurg", "", True),
    ("Kostüm Hosenanzug Geist", "", True),
    ("Halloween Kostümkleid Set", "", True),
    ("Kostümhandschuhe Skelett", "", True),
    ("LED Purge Maske Halloween", "", True),
    ("Business Damen Kostüm zweiteilig", "Damenmode", False),
    ("Motorrad Sturmhaube Totenkopf Maske", "", False),
    ("Ski-Maske mit Totenkopf-Print", "", False),
    # 13.10. A4d (Richter): Rollen-Kostüme ohne Kostümwort — und was trotz Rolle/Typ KEIN Kostüm ist
    ("Hemd Waggis rot", "Kostüme & Verkleidung", True),
    ("Nikolaus Baby-Strampler", "Kostüme & Verkleidung", True),
    ("Zimmermädchenset", "Kostüme & Verkleidung", True),
    ("Waggishose kurz gelb", "Kostüme & Verkleidung", True),
    ("Araber Schuhüberzug", "Kostüme & Verkleidung", True),
    ("Sultan Tunika Herren Leinen", "", False),          # Gegenprüfung 13.10.: Rolle + Stück ohne Kontext = Kleidung
    ("Scheich Kopftuch", "", False),
    ("Araber Gewand für Fasnacht", "", True),
    ("Göttinnen-Kleid für Mottopartys und Halloween", "Damenmode", True),
    ("Tier-Halloween-Mantel", "Haustierbedarf", True),
    ("Kunstblut 113.2 ml", "Kostüme & Verkleidung", False),
    ("Styroporkopf weiss", "Kostüme & Verkleidung", False),
    ("Narbenplastiktube", "Kostüme & Verkleidung", False),
    ("Tasse «Waggis»", "Tasse", False),
    ("Holzratsche Waggis gross", "Kostüme & Verkleidung", False),
    ("Kletternder singender Weihnachtsmann", "Partydeko & Ballone", False),
    ("Weihnachtsmann-Mütze aus Plüsch, Rot oder Schwarz", "Spielzeug & Spiele", False),
    ("Herren Hoodie mit Santa- und Biermuster", "Herrenmode", False),
    ("Fransen-Minirock «Santa Fe» · Wildleder-Optik, 2-lagig", "Damenmode", False),
    ("Kerzenform «Göttin von Athen»", "Küche & Bar", False),
    ("Griechisches Göttinnen-Abendkleid", "Damenmode", False),
    ("Camouflage Schuhüberzug Schlangenstichschutz", "Sportschuhe", False),
    ("Aladins Wunderlampe", "Haushalt & Wohnen", False),
    ("Halloween Haustier-Set mit Fliege", "Haustierbedarf", False),
    ("Hundepullover Halloween", "Haustierbedarf", False),
    ("Königliches Umhang-Set für Haustiere", "Haustierbedarf", False),
    ("Halloween-Outfit für Mädchen", "Baby & Kinder", False),
    ("Edelweisshemd langarm geknöpft", "Schweizer Editionen", False),
    ("Plüschmütze Panda", "Spielzeug & Spiele", False),
    ("Gesichtsvisier Regenbogen", "Kostüme & Verkleidung", False),
    ("Kinder Sommer-Strampler für Mädchen", "Baby & Kinder", False),
    # 13.10. abends (Kauf-Strecke Klasse 3f): ist_kostuem gegen alle 99 aktiven Google-Produkte mit Tag «halloween» (79 CJ,
    # 19 CH-Lager) → 0 Treffer. Von Hand + Bild geprüft (Kontaktbogen): Kopfschmuck/Mützen zählen nicht (Entscheid 23.09.),
    # Motiv-Kleidung ist kein Kostüm. Diese Grenzfälle bleiben im Google-Kanal und halten die Regel fest:
    ("Lolita-Stirnband mit Hexenhut und Rosen", "Damenmode", False),
    ("Halloween Haustier-Kopfbedeckung & Halsband", "Haustierbedarf", False),
    ("Baby-Strampler Halloween mit Kapuze", "Baby & Kinder", False),
    ("Gelber Leopard-Hoodie mit Teufelshörnern", "Damenmode", False),
    ("Gotischer Kopfschmuck schwarz", "Accessoires", False),
    ("Animatronic XL Sensemann", "Kostüme & Verkleidung", False),
    ("Horrorhand mit Klammer", "Kostüme & Verkleidung", False),
]


def kostuem_kanarien():
    fehler = [(t, ty, e) for t, ty, e in KOSTUEM_KANARIEN if ist_kostuem(t, ty) != e]
    return len(KOSTUEM_KANARIEN), fehler


# ---------------------------------------------------------------------------
# SCHUSSWAFFEN-ZUBEHÖR (14.10.2026) — Zielfernrohr-Montagen, Holster, Zweibeine, Gewehrriemen, Magazintaschen, Laser-Visiere.
# GEMESSEN 14.10. (alle 54'523 aktiven Produkte, Titel/Typ/Tags/Beschreibung): 10 Treffer PER REGEL, 7 ohne «waffe-pruefen»,
# 6 davon im Google-Kanal («Zielfernrohr-Halterungszubehör», zwei Gewehr-Zweibeine als «Taktisches Outdoor-Stativ», ein
# Schulterholster als «Taktische Brusttasche» …). ⚠️ Das ist NICHT alles: die Nachprüfung (1'735 Bilder) fand ≥ 13 WEITERE
# Waffenteile, die nur am BILD erkennbar sind — Titel UND CJ-Name harmlos («T6 Taschenlampe Set» = Waffenlicht,
# «Multifunktions-Schraubenschlüssel» / CJ «Multifunctional tactical wrench» = AR-15-Schlüssel, «Taktischer Angelrucksack» =
# Gewehrrucksack). Die stehen als Handliste «bild_geprueft» in der Regeldatei (SWZ_BILD); der Wächter taggt sie wie Treffer. HEIKEL kennt nur «waffen?\b|munition|armbrust», und die
# Titel-Sperren von heikel_zweck.json («Halterung», «Rahmen» = Kamera-Zubehör) haben die Waffen-Regeln dort beschattet.
# Folge eines Treffers: Tag «waffe-pruefen» → google_sperrtags_durchsetzen nimmt die Ware aus Google UND allen Werbe-/Social-
# Kanälen (ALLE_WERBEKANAELE), der Laden bleibt (in der Schweiz legal). Regel + Kanarien EINMAL in
# automation/data/schusswaffen_zubehoer_regel.json; der Importer-Zwilling schusswaffen_zubehoer.mjs liest dieselbe Datei
# (Gleichlauf: automation/schusswaffen_zubehoer_gleichlauf_test.mjs). Der Text entscheidet nie allein (siehe «_» dort).
def _swz_regel():
    for k in (os.path.join(_repo(), "automation", "data", "schusswaffen_zubehoer_regel.json"),
              os.path.join(_HIER, "data", "schusswaffen_zubehoer_regel.json")):
        if os.path.exists(k):
            return _json.load(open(k, encoding="utf-8"))
    # Kein harter Abbruch (dieses Modul importieren ein Dutzend Publizierer): die Regel trifft nichts und die Kanarien
    # fallen durch → der Wächter überspringt die Regel laut.
    print("⚠️ google_sperrliste: automation/data/schusswaffen_zubehoer_regel.json fehlt → Schusswaffen-Zubehör-Regel aus",
          file=sys.stderr, flush=True)
    nie = "(?!)"
    return {"stark": nie, "stark_en": nie, "schwach": nie, "kontext": nie, "kontext_kopf": nie, "text_tragen": nie,
            "nicht_hart": nie, "nicht_weich": nie, "nicht_en": nie, "bild_geprueft": {}, "bild_ok": {},
            "bild_pruefen": {"ab": "9999", "wort": nie, "ding": nie, "kanarien": []},
            "kanarien": [["AK74 Zielfernrohrbrücke aus Metall", "", [], "", "", True]]}


_SWZ = _swz_regel()
SWZ = {k: re.compile(_SWZ.get(k) or "(?!)") for k in ("stark", "stark_en", "schwach", "kontext", "kontext_kopf", "text_tragen",
                                                     "nicht_hart", "nicht_weich", "nicht_en")}
SWZ_KANARIEN = [tuple(k) for k in _SWZ["kanarien"]]
# 14.10.2026 (Nachbesserung): am BILD bestimmte Waffenware, Titel und CJ-Name harmlos → Wächter taggt wie einen Treffer.
SWZ_BILD = dict(_SWZ.get("bild_geprueft") or {})
SWZ_BILD_OK = dict(_SWZ.get("bild_ok") or {})
_SWZ_BP = _SWZ.get("bild_pruefen") or {}
SWZ_BILD_PRUEFEN_AB = _SWZ_BP.get("ab", "9999")
_SWZ_BP_WORT = re.compile(_SWZ_BP.get("wort") or "(?!)")
_SWZ_BP_DING = re.compile(_SWZ_BP.get("ding") or "(?!)")
# Prefilter-Wörter für Titelsuchen (Shopify findet nur Wortanfänge); entschieden wird an ist_schusswaffen_zubehoer.
SWZ_SUCHWORTE = ["zielfernrohr", "picatinny", "weaver", "glock", "ak74", "ak47", "holster", "magazin", "zweibein", "bipod",
                 "gewehr", "munition", "taktisch", "tactical", "airsoft", "softair", "laservisier", "rotpunkt", "mündung"]


def _swz_klar(html):
    """Wie in schusswaffen_zubehoer.mjs: Tags weg, &nbsp;/&amp;, Leerraum zusammen, klein."""
    s = re.sub(r"<[^>]+>", " ", html or "").replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", s).lower()


def ist_schusswaffen_zubehoer(titel, typ="", tags=(), text="", en=""):
    """Grund (wahr) oder "" — Schusswaffen-Zubehör nach automation/data/schusswaffen_zubehoer_regel.json.

    titel/typ/tags = was das Produkt IST; text = Beschreibung (HTML erlaubt, liefert nur Kontext); en = englischer
    Lieferantenname (Importer; Bestand über dropship/_cj_name_en.tsv). Reihenfolge: nicht_hart (Titel/Typ) → nicht_en (CJ-Name
    zählt dann nicht) → stark (Titel/Typ/Tags) → stark_en (CJ-Name eindeutig, schlägt nicht_weich) → stark im CJ-Namen ohne
    nicht_weich → schwaches Titelwort + Waffen-Kontext ohne nicht_weich. Bildgeprüfte Ware (SWZ_BILD) kennt diese Funktion
    nicht — sie entscheidet nur am Text.
    """
    t = (titel or "").lower()
    ty = (typ or "").lower()
    e = (en or "").lower()
    if SWZ["nicht_hart"].search(t) or SWZ["nicht_hart"].search(ty):
        return ""
    if e and SWZ["nicht_en"].search(e):
        e = ""
    kopf = " | ".join([t, ty, " ".join(str(x) for x in (tags or [])).lower()])
    m = SWZ["stark"].search(kopf)
    if m:
        return "stark:" + m.group(0)
    m = SWZ["stark_en"].search(e)
    if m:
        return "stark-en-eindeutig:" + m.group(0)
    weich = SWZ["nicht_weich"].search(t)
    m = SWZ["stark"].search(e)
    if m and not weich:
        return "stark-en:" + m.group(0)
    s = SWZ["schwach"].search(t) or SWZ["schwach"].search(e)
    if s and not weich:
        x = _swz_klar(text)
        k = (SWZ["kontext"].search(kopf + " | " + e) or SWZ["kontext_kopf"].search(kopf + " | " + e)
             or SWZ["kontext"].search(x) or SWZ["text_tragen"].search(x))
        if k:
            return "schwach:" + s.group(0) + "+kontext:" + k.group(0)[:40]
    return ""


def swz_en_verdacht(en):
    """Kann dieser CJ-Name allein einen Treffer tragen? Vorauswahl für den Bestand (Cache dropship/_cj_name_en.tsv):
    nur diese Produkte fragt der Wächter live nach und prüft sie dann mit Titel/Typ/Tags/Text + en ganz."""
    e = (en or "").lower()
    if not e or SWZ["nicht_en"].search(e):
        return False
    return bool(SWZ["stark_en"].search(e) or SWZ["stark"].search(e) or SWZ["schwach"].search(e))


def swz_bild_pruefen(titel, typ="", en=""):
    """Neue Ware zur BILDprüfung vormerken (kein Tag): Wort (taktisch/military/jagd …) UND Ding (Tasche/Werkzeug/Lampe/
    Halterung …) in Titel oder CJ-Name, ohne nicht_hart. Grund (wahr) oder ""."""
    t = (titel or "").lower()
    if SWZ["nicht_hart"].search(t) or SWZ["nicht_hart"].search((typ or "").lower()):
        return ""
    x = t + " | " + (en or "").lower()
    w, d = _SWZ_BP_WORT.search(x), _SWZ_BP_DING.search(x)
    return f"{w.group(0)}+{d.group(0)}" if w and d else ""


def schusswaffen_kanarien():
    """(Anzahl, Fehler) über Regel-Kanarien, Bildprüf-Kanarien und die Handlisten (Form, keine Überschneidung)."""
    f = [(k[0], k[5], ist_schusswaffen_zubehoer(*k[:5])) for k in SWZ_KANARIEN if bool(ist_schusswaffen_zubehoer(*k[:5])) != k[5]]
    bp = _SWZ_BP.get("kanarien") or []
    f += [(k[0], k[3], swz_bild_pruefen(k[0], k[1], k[2])) for k in bp if bool(swz_bild_pruefen(k[0], k[1], k[2])) != k[3]]
    f += [(pid, "Handliste: nur Ziffern, nicht zugleich bild_ok", "") for pid in SWZ_BILD
          if not pid.isdigit() or pid in SWZ_BILD_OK]
    f += [(pid, "bild_ok: nur Ziffern", "") for pid in SWZ_BILD_OK if not pid.isdigit()]
    return len(SWZ_KANARIEN) + len(bp) + len(SWZ_BILD) + len(SWZ_BILD_OK), f
