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
import re

GOOGLE_PUB_ID = "302872297857"
GOOGLE_PUB = "gid://shopify/Publication/" + GOOGLE_PUB_ID
TAG_PRAEFIX = "google-gesperrt"

_HIER = os.path.dirname(os.path.abspath(__file__))
LEDGER = os.path.join(os.path.dirname(_HIER), "dropship", "_merchant_issue_done.txt")


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
HEIKEL = re.compile(
    r'kost[üu]m|verkleid|fasnacht|halloween|per[üu]cke|(?<![\wäöüß])maske\b|tutu\b|'
    r'hexe|vampir|zombie|clown|'
    r'dessous|reizw|erotik|18\+|generalüberholt|restauriert|refurb|ersatzteil|ersatzkopf|'
    r'waffen?\b|munition|armbrust|'
    # Rauchzubehoer behandelt Google wie Tabak. 04.09.: `feuerzeug` ergaenzt — ein
    # «Sturmfeuerzeug fuer Outdoor & Kueche» stand auf der Veroeffentlichungsliste.
    # Ob ein Allzweck-Feuerzeug wirklich darunter faellt, ist eine BETREIBER-Entscheidung;
    # bis dahin gilt die teurere Seite des Irrtums nicht: draussen kostet einen Artikel,
    # drinnen im schlimmsten Fall das Merchant-Konto.
    r'shisha|wasserpfeife|bong\b|vape|e-?zigarette|tabak|zigarre|feuerzeug|'
    r'(?<![\wäöüß])grinder\b|cbd\b', re.I)


def ist_heikel(*texte):
    """True, wenn einer der Texte (Titel, productType, Tags) eine heikle Warengruppe nennt."""
    return any(HEIKEL.search(t or '') for t in texte)
