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
