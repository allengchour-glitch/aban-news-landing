#!/usr/bin/env python3
"""queue_struktur_wache.py — Strukturwächter für die acht Social-Queue-CSVs (19.10.2026).

ANLASS: queue_schreiber_wache.py prüft die Schreib-WEGE (Roh-Schreiber, Waisen, verschwundene Zeilen) — nicht, ob eine Queue-Datei
INNERLICH heil ist. Bekannte Klasse (Reel-Motor, 28.07.2026): der Plattform-Wert «instagram,facebook» ohne Anführungszeichen schob
alle folgenden Spalten um eins, ein Poster las Müll als Status/Plattform. Dazu: die Poster bilden Spalten mit header.indexOf(name) —
fehlt eine Spalte, ist das Ergebnis -1, und der Poster liest/schreibt still ins Leere (kein Fehler, nur kein «posted»-Vermerk).
Und: ein einzelnes Anführungszeichen mitten in einem Feld («5" Display») kippt in lib/queue_csv.mjs und in den Postern mit eigenem
Leser (social-autopost-meta, tiktok-cloud-autopost …) den Anführungs-Zustand — der Rest der Datei steckt in einem Feld —, während
Python csv und queue_csv.py es als Zeichen lesen (GEMESSEN 19.10. an einer Probe mit 4 Sätzen: csv/queue_csv.py 4, queue_csv.mjs und
Poster-Leser 2). Ein einzelnes CR bringt queue_csv.py sogar zum Absturz (_csv.Error). Das alles trifft heute KEINE echte Datei:
GEMESSEN 19.10.2026 ~17:25 UTC (dieser Leser, Python csv, queue_csv.py, queue_csv.mjs): 8 Queues, 1669 Datensätze, 0 Befunde,
0 Unterschiede zwischen den vier Lesern. Der Wächter hält das so.
Die Idee (Feldanzahl, offenes Anführungszeichen, leere ID) stammt aus Codex-PR #2673 (lib/social_queue.mjs) — Fremdcode, nicht
übernommen; hier als Wächter auf UNSEREN Queues, mit unserem Wortschatz (Status, Plattformen) aus dem Bestand.

WAS GEPRÜFT WIRD (je Queue; ein strenger Zeichen-für-Zeichen-Leser mit Zeilennummern, kein csv-Modul)
  Kopf       Kopfzeile da · Pflichtspalten (Tabelle SPEC + COLS-Liste des Lesers, wo es eine gibt) · keine leeren/doppelten/
             mit Leerraum behafteten Namen · kein BOM · Datei nicht leer · slug-Queues: slug steht an Stelle 0 (Schlüssel des Helfers)
  Satz       Feldzahl wie Kopf · Spalten-Shift (mehr Felder + ≥ 2 Plattformnamen in Folge = ungequotetes Komma im Plattform-Wert)
  Zeichen    offenes Anführungszeichen am Dateiende · Anführungszeichen mitten im ungequoteten Feld · Text nach geschlossenem Feld ·
             einzelnes CR · CR im Feld · Leerzeile · Datei endet ohne Zeilenumbruch (lib/queue_csv lesen() wirft dann nach 20 s) ·
             ungültiges UTF-8
  Werte      ID leer bei offenem Status (ready/posting/posting-unklar-pruefen/pending) · dieselbe ID zweimal, davon eine offen und
             eine weitere offen oder gepostet (Doppelpost-Risiko; reine History-Dubletten wie jury-skip/jury-skip sind normal und
             nur Info) · Status ausserhalb des Wortschatzes · Plattform ausserhalb {instagram, facebook, threads, tiktok, youtube,
             pinterest}
  ERLAUBT    echte Zeilenumbrüche IN Anführungszeichen (GEMESSEN 19.10.: reels_seed 678 Felder, posts_image 363, video_queue 18, metricool_queue 20 —
             nur ig_karussell/tiktok_karussell kodieren Umbrüche als « ⏎ ») · CRLF als Satzende (video_queue.csv) · leere Plattform
             (= alle Kanäle) · leere ID bei Endzuständen (posted…, …-skip).
  LESEN      rein lesend, ohne Sperre (alle Schreiber ersetzen atomar per rename). Hat eine Datei Befunde, wird sie nach 1.2 s noch
             einmal gelesen: nur ein UNVERÄNDERTER Befund zählt (ein Schreiber mitten im Werk ist kein Defekt); ändert sie sich
             dreimal hintereinander → «unklar». Fehlt eine Datei oder ist sie nicht lesbar → «unklar», NIE «ok».
  Es wird NICHTS repariert und nichts geschrieben (auch keine Temp-Dateien, kein __pycache__).

    python3 automation/queue_struktur_wache.py                   Bericht (Tabelle, Befunde, Infos)
    python3 automation/queue_struktur_wache.py --still           nur bei Befund/unklar eine Zeile «QUEUE-STRUKTUR: …» (Keepalive; wie
                                                                 queue_schreiber_wache --still: bei «ok» still)
    python3 automation/queue_struktur_wache.py --parser-abgleich dieselben Dateien mit diesem Leser, Python csv, queue_csv.py und
                                                                 queue_csv.mjs (node) lesen und jeden Unterschied auflisten
    python3 automation/queue_struktur_wache.py --selbsttest      Kanarienvögel je Befundart + echte Queues (Exit 1 bei Fehler)
  Jeder andere Schalter: Meldung auf stderr, Exit 2, KEIN Lauf.
"""
import csv
import io
import json
import os
import re
import subprocess
import sys
import time

sys.dont_write_bytecode = True   # der Wächter schreibt nichts — auch kein __pycache__ beim Import von queue_csv.py

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NODE = "/opt/node22/bin/node"
PAUSE_S = 1.2        # Wartezeit vor dem zweiten Lesen einer Datei MIT Befund
VERSUCHE = 3         # Lesungen, bis ein Befund als beständig gilt

PLATTFORMEN = frozenset({"instagram", "facebook", "threads", "tiktok", "youtube", "pinterest"})

# Queue → ID-Spalte, Plattform-Spalte, Pflichtspalten. QUELLE der Pflichtspalten: die Leser-Poster (Spalte «leser» = Datei mit
# `const COLS = […]`, die zusätzlich gelesen und mit der Tabelle abgeglichen wird; ohne COLS-Liste: Zugriffe im Poster gezählt):
#   reels_seed      meta_reel_post.mjs (idx.* = alle 9) · tiktok-autopost.mjs COLS · metricool_tiktok_post.mjs
#   posts_image     social-autopost-meta.mjs COLS · story_queue story-autopost-meta.mjs COLS · video_queue video-autopost-meta.mjs COLS
#   tiktok_queue    tiktok-cloud-autopost.mjs ix('id'|'scheduled_date'|'video_url'|'caption'|'status'|'posted_at')
#   ig_karussell    ig_karussell_post.mjs get(…,'slug'|'modus'|'caption'|'produkte'|'ordner'|'slides'|'status') + idx.posted_at/post_url
#   tiktok_karussell tiktok_karussell.py (kopf.index("slug"|"status"), caption) · metricool_queue metricool-schedule.mjs COLS
SPEC = {
    "automation/reels_seed.csv": {"id": "id", "plattform": "platforms", "leser": "automation/tiktok-autopost.mjs",
                                  "pflicht": ["id", "scheduled_date", "video_url", "caption", "hashtags", "platforms", "status", "posted_at", "post_url"]},
    "social/posts_image.csv": {"id": "id", "plattform": "platforms", "leser": "automation/social-autopost-meta.mjs",
                               "pflicht": ["id", "scheduled_date", "image_url", "caption", "platforms", "status", "posted_at", "post_url"]},
    "social/story_queue.csv": {"id": "id", "plattform": "platforms", "leser": "automation/story-autopost-meta.mjs",
                               "pflicht": ["id", "scheduled_date", "type", "media_url", "platforms", "status", "posted_at", "post_url"]},
    "social/video_queue.csv": {"id": "id", "plattform": "platforms", "leser": "automation/video-autopost-meta.mjs",
                               "pflicht": ["id", "scheduled_date", "video_url", "caption", "platforms", "status", "posted_at", "post_url"]},
    "social/tiktok_queue.csv": {"id": "id", "plattform": None, "leser": None,
                                "pflicht": ["id", "scheduled_date", "video_url", "caption", "status", "posted_at"]},
    "social/ig_karussell.csv": {"id": "slug", "plattform": None, "leser": None,
                                "pflicht": ["slug", "modus", "slides", "ordner", "produkte", "caption", "status", "posted_at", "post_url"]},
    "social/tiktok_karussell.csv": {"id": "slug", "plattform": None, "leser": None,
                                    "pflicht": ["slug", "modus", "slides", "ordner", "produkte", "caption", "status"]},
    "social/metricool_queue.csv": {"id": "id", "plattform": "networks", "leser": "automation/metricool-schedule.mjs",
                                   "pflicht": ["id", "publish_date", "media_url", "text", "networks", "status", "scheduled_at", "note"]},
}

# Status-Wortschatz: Bestand 19.10. (alle Queues) + Git-Verlauf (≈ 25 Stichproben je Queue) + Literale, die Poster/Säuberer in eine
# Queue schreiben (meta_reel_post: markierung-fehlt, promo-veraltet · social-autopost-meta: skipped-nonjpg · metricool-schedule: scheduled ·
# social_captions_polieren: text-pruefen · betreiber_ampel liest: tiktok-fehler). Die «…-skip»/«posted-…»-Familien sind offen (die
# Poster erfinden neue Gründe), alles andere muss hier stehen — ein neuer Wert ist ein Befund, bis er hier eingetragen ist.
STATUS_FEST = frozenset({"ready", "posting", "posting-unklar-pruefen", "pending", "hold", "needs-rehost", "tiktok-entwurf",
                         "produkt-nicht-aktiv", "preis-veraltet", "ig-fehler", "posted", "skip", "markierung-fehlt", "promo-veraltet",
                         "skipped-nonjpg", "scheduled", "text-pruefen", "tiktok-fehler"})
STATUS_FAMILIEN = [re.compile(p) for p in (
    r"posted(-[a-z0-9]+)+",                    # posted-ig-fb, posted-tiktok, posted-youtube, posted-dup-skip …
    r"([a-z0-9]+-)+skip",                      # jury-skip, dup-produkt-skip, saison-skip …
    r"skip(-[a-z0-9]+)+",                      # skip-produkt-ausverkauft …
    r"([a-z0-9]+-)+hold",                      # werbetext-hold
    r"(archived|verworfen|aussortiert)(-[a-z0-9]+)+",
)]
OFFEN = frozenset({"ready", "posting", "posting-unklar-pruefen", "pending"})   # hier ist eine leere ID gefährlich
SCHARF = frozenset({"ready", "posting", "posting-unklar-pruefen"})             # hier würde ein Poster zugreifen / hat es getan


class Instabil(Exception):
    """Die Datei änderte sich bei jedem Lesen — kein beständiger Zustand messbar."""


def status_bekannt(st):
    return st in STATUS_FEST or any(p.fullmatch(st) for p in STATUS_FAMILIEN)


# ----------------------------------------------------------------------------------------------------- strenger Leser
def strikt_parsen(text):
    """Zeichen für Zeichen, mit Zeilennummern. → (saetze, probleme, info)
    saetze   [(zeile, [felder])]  Zeile = physische Zeile (1-basiert) des Satzanfangs; Leerzeilen sind keine Sätze
    probleme [(zeile, art, detail)]  Zeichenebene (nicht Sinnebene)
    info     {felder_mit_umbruch, umbrueche, crlf_enden, lf_enden, offen_id}
    Anders als Python csv und der Leser in queue_csv.mjs (die ein Anführungszeichen mitten im Feld als Umschalter bzw. als Zeichen
    lesen — je nach Leser verschieden) wird hier jede Abweichung vom sauberen RFC-4180 gemeldet; gelesen wird danach trotzdem
    weiter (Zeichen = Zeichen), damit die Feldzahlen vergleichbar bleiben."""
    saetze, probleme, gemeldet = [], [], set()
    info = {"felder_mit_umbruch": 0, "umbrueche": 0, "crlf_enden": 0, "lf_enden": 0, "offen_id": ""}
    n, i, zeile, satz_zeile, q_zeile = len(text), 0, 1, 1, 1
    satz, feld, zustand, feld_umbruch = [], [], "anfang", False    # anfang | einfach | quote | zu

    def melde(art, detail, z=None):
        z = satz_zeile if z is None else z
        if (z, art) not in gemeldet:
            gemeldet.add((z, art))
            probleme.append((z, art, detail))

    def feld_ende():
        nonlocal feld_umbruch
        satz.append("".join(feld))
        feld.clear()
        if feld_umbruch:
            info["felder_mit_umbruch"] += 1
        feld_umbruch = False

    while i < n:
        c = text[i]
        if zustand == "quote":
            if c == '"':
                if i + 1 < n and text[i + 1] == '"':
                    feld.append('"')
                    i += 2
                    continue
                zustand = "zu"
            else:
                if c == "\n":
                    zeile += 1
                    info["umbrueche"] += 1
                    feld_umbruch = True
                elif c == "\r":
                    melde("cr-im-feld", "CR innerhalb eines Feldes — queue_csv.py macht daraus LF, queue_csv.mjs behält es")
                feld.append(c)
            i += 1
            continue
        if c == ",":
            feld_ende()
            zustand = "anfang"
        elif c == "\n" or (c == "\r" and text[i + 1:i + 2] == "\n"):
            if c == "\r":
                i += 1
                info["crlf_enden"] += 1
            else:
                info["lf_enden"] += 1
            if not satz and not feld and zustand == "anfang":
                melde("leerzeile", "leere Zeile — Python csv überspringt sie, queue_csv.mjs macht daraus einen Satz mit einem leeren Feld")
            else:
                feld_ende()
                saetze.append((satz_zeile, satz))
            satz = []
            zeile += 1
            satz_zeile = zeile
            zustand = "anfang"
        elif c == "\r":
            melde("cr-allein", "einzelnes CR ausserhalb von Anführungszeichen — Python csv trennt dort den Satz, queue_csv.mjs ignoriert es")
        elif zustand == "zu":
            melde("text-nach-geschlossenem-feld", "Zeichen hinter dem schliessenden Anführungszeichen (RFC 4180: nur , oder Zeilenende)")
            feld.append(c)
        elif c == '"':
            if zustand == "anfang":
                zustand, q_zeile = "quote", zeile
            else:
                melde("anfuehrungszeichen-im-feld", "Anführungszeichen mitten im ungequoteten Feld — queue_csv.mjs kippt damit den Anführungs-Zustand, Python csv liest es als Zeichen")
                feld.append(c)
        else:
            zustand = "einfach"
            feld.append(c)
        i += 1
    if zustand == "quote":
        info["offen_id"] = satz[0] if satz else "".join(feld)
        melde("offenes-anfuehrungszeichen", f"Anführungszeichen in Zeile {q_zeile} wird nie geschlossen — der Rest der Datei steckt in diesem Feld", z=q_zeile)
    elif satz or feld or zustand != "anfang":
        feld_ende()
        saetze.append((satz_zeile, satz))
        melde("ende-ohne-umbruch", "letzter Satz ohne Zeilenumbruch — lib/queue_csv lesen() hält die Datei für halb geschrieben und wirft nach 20 s")
    return saetze, probleme, info


# ------------------------------------------------------------------------------------------------------ Prüfung einer Datei
def leser_cols(repo, rel):
    """COLS-Liste eines Posters (`const COLS = ['id', …]`) oder None (Datei/Literal nicht lesbar)."""
    try:
        t = open(os.path.join(repo, rel), encoding="utf-8", errors="replace").read()
    except OSError:
        return None
    m = re.search(r"\bconst\s+COLS\s*=\s*\[([^\]]*)\]", t)
    return re.findall(r"""['"]([A-Za-z_]\w*)['"]""", m.group(1)) if m else None


def pflicht_fuer(repo, q):
    """Pflichtspalten = Tabelle ∪ COLS des Lesers (Reihenfolge der Tabelle, Neues hinten)."""
    sp = SPEC[q]
    pf = list(sp["pflicht"])
    if sp["leser"]:
        for c in leser_cols(repo, sp["leser"]) or []:
            if c not in pf:
                pf.append(c)
    return pf


def _shift_signatur(r, n_kopf):
    """(erster_index, lauf) wenn die Zeile länger ist als der Kopf und ≥ 2 Plattformnamen als eigene Felder hintereinander stehen
    (= ein Plattform-Wert «a,b» ohne Anführungszeichen), sonst None. Ein einzelner Plattformname reicht nicht: «Hallo, Welt» in der
    Caption plus ein einzelnes «instagram» ist ein ungequotetes Komma in der Caption, kein Shift durch den Plattform-Wert."""
    if len(r) <= n_kopf:
        return None
    best, lauf, start = None, 0, 0
    for k, f in enumerate(r):
        if f.strip().lower() in PLATTFORMEN:
            if lauf == 0:
                start = k
            lauf += 1
            if lauf >= 2 and (best is None or lauf > best[1]):
                best = (start, lauf)
        else:
            lauf = 0
    return best


def pruefe_text(q, text, pflicht=None):
    """Alle Prüfungen auf dem Text EINER Queue. → {befunde: [(zeile, id, art, detail)], saetze, info}"""
    sp = SPEC[q]
    pflicht = list(pflicht or sp["pflicht"])
    befunde = []
    res = {"befunde": befunde, "saetze": 0, "info": {}}
    if text == "":
        befunde.append((1, "", "leer", "Datei ist 0 Byte gross — lib/queue_csv lesen() wirft dann «bleibt unvollständig»"))
        return res
    if text.startswith("\ufeff"):
        befunde.append((1, "", "bom", "Byte-Order-Mark am Anfang — der erste Spaltenname lautet dadurch «\\ufeff…» und wird von indexOf() nicht gefunden"))
        text = text[1:]
    saetze, probleme, info = strikt_parsen(text)
    res["info"] = dict(info, kodiert=text.count("⏎"))
    id_zu_zeile = {z: (r[0] if r else "") for z, r in saetze}
    for z, art, detail in probleme:
        befunde.append((z, info["offen_id"] if art == "offenes-anfuehrungszeichen" else id_zu_zeile.get(z, ""), art, detail))
    if not saetze:
        befunde.append((1, "", "kopf-fehlt", "keine einzige Zeile lesbar"))
        return res
    kopf = saetze[0][1]
    res["saetze"] = len(saetze) - 1
    # --- Kopf
    if sum(1 for p in pflicht if p in kopf) == 0:
        befunde.append((1, "", "kopf-fehlt", "keine der Pflichtspalten im Kopf — fehlt die Kopfzeile? (erste Zeile: " + ",".join(kopf)[:60] + ")"))
        return res    # ohne Kopf sind Feldzahl/Status/ID gegen etwas Beliebiges gemessen — nur dieser eine Befund
    fehlt = [p for p in pflicht if p not in kopf]
    if fehlt:
        befunde.append((1, "", "kopf-spalte-fehlt", "Pflichtspalte fehlt: " + ", ".join(fehlt) + " — die Poster lesen/schreiben mit indexOf() = -1 still ins Leere"))
    sauber = [k for k in kopf if k and k == k.strip()]
    if len(sauber) != len(kopf):
        befunde.append((1, "", "kopf-unsauber", "leerer oder mit Leerraum behafteter Spaltenname: " + repr(kopf)[:120]))
    elif len(set(kopf)) != len(kopf):
        befunde.append((1, "", "kopf-unsauber", "doppelter Spaltenname: " + ", ".join(sorted({k for k in kopf if kopf.count(k) > 1}))))
    if sp["id"] == "slug" and "slug" in kopf and kopf.index("slug") != 0:
        befunde.append((1, "", "kopf-unsauber", "slug steht nicht an Stelle 0 — queue_csv.py/.mjs schlüsseln dann nach der falschen Spalte"))
    ix = {k: kopf.index(k) for k in kopf if k}
    ii, si = ix.get(sp["id"]), ix.get("status")
    pi = ix.get(sp["plattform"]) if sp["plattform"] else None
    # --- Sätze
    ids = {}
    leere_id_history = 0
    for z, r in saetze[1:]:
        if len(r) != len(kopf):
            sh = _shift_signatur(r, len(kopf))
            if sh:
                befunde.append((z, r[0] if r else "", "spalten-shift",
                                f"{len(r)} statt {len(kopf)} Felder; Plattformnamen in Feld {sh[0] + 1}–{sh[0] + sh[1]} stehen einzeln "
                                f"(Plattform-Wert ohne Anführungszeichen?) — Status/Rest sind um {len(r) - len(kopf)} verschoben"))
            else:
                befunde.append((z, r[0] if r else "", "feldzahl", f"{len(r)} statt {len(kopf)} Felder"))
            continue
        sid = r[ii].strip() if ii is not None else ""
        st = r[si] if si is not None else None
        if st is not None and not status_bekannt(st):
            befunde.append((z, sid, "status-unbekannt", repr(st) + (" (Leerraum/Gross-Kleinschreibung?)" if st.strip().lower() != st or not st.strip() else "")))
        elif st is not None and ii is not None:
            if not sid:
                if st in OFFEN:
                    befunde.append((z, "", "id-leer", f"Status «{st}» ohne {sp['id']} — Doppelpost-Sperren und Helfer finden die Zeile nicht"))
                else:
                    leere_id_history += 1
            else:
                ids.setdefault(sid, []).append((z, st))
        if pi is not None:
            teile = [t for t in re.split(r"[;,\s]+", r[pi].strip().lower()) if t]
            unbek = [t for t in teile if t not in PLATTFORMEN]
            if unbek:
                befunde.append((z, sid, "plattform-unbekannt", "unbekannt: " + ", ".join(unbek)))
    hist = 0
    for sid, zs in ids.items():
        if len(zs) < 2:
            continue
        offen = [x for x in zs if x[1] in SCHARF]
        gepostet = [x for x in zs if x[1].startswith("posted")]
        if offen and len(offen) + len(gepostet) >= 2:
            befunde.append((zs[-1][0], sid, "id-doppelt-offen",
                            f"{len(zs)}× in Zeilen " + ", ".join(str(x[0]) for x in zs) + " mit Status " + ", ".join(x[1] for x in zs)))
        else:
            hist += 1
    res["info"]["doppelte_ids_history"] = hist
    res["info"]["leere_id_history"] = leere_id_history
    res["info"]["spalten"] = len(kopf)
    return res


def _lese_bytes(repo, q):
    with open(os.path.join(repo, q), "rb") as f:
        return f.read()


def _pruefe_bytes(repo, q, roh):
    try:
        text, utf8 = roh.decode("utf-8"), None
    except UnicodeDecodeError as e:
        text, utf8 = roh.decode("utf-8", errors="replace"), e
    res = pruefe_text(q, text, pflicht_fuer(repo, q))
    if utf8 is not None:
        zeile = roh[:utf8.start].count(b"\n") + 1
        res["befunde"].insert(0, (zeile, "", "kein-utf8", f"ungültiges UTF-8 ab Byte {utf8.start} — frischLesen() in queue_csv.mjs verwirft die Datei als halb geschrieben"))
    return res


def pruefe_queue(repo, q, lese=None, pause=PAUSE_S, versuche=VERSUCHE):
    """Eine Queue lesen und prüfen. Hat sie Befunde, wird nach `pause` erneut gelesen: nur ein unveränderter Befund gilt.
    OSError vom Lesen geht an den Aufrufer (→ «unklar»); Instabil, wenn sich die Datei bei jeder Lesung ändert."""
    lese = lese or _lese_bytes
    roh = lese(repo, q)
    res = _pruefe_bytes(repo, q, roh)
    for _ in range(versuche - 1):
        if not res["befunde"]:
            return res
        time.sleep(pause)
        roh2 = lese(repo, q)
        if roh2 == roh:
            return res
        roh, res = roh2, _pruefe_bytes(repo, q, roh2)
    if res["befunde"]:
        raise Instabil(f"ändert sich bei jedem Lesen ({versuche}×, {pause} s Abstand)")
    return res


def pruefen(repo=REPO, lese=None, pause=PAUSE_S):
    """Alle Queues. → {queues: {q: res}, unklar: [(q, grund)]}"""
    erg = {"queues": {}, "unklar": []}
    for q in SPEC:
        try:
            erg["queues"][q] = pruefe_queue(repo, q, lese, pause)
        except FileNotFoundError:
            erg["unklar"].append((q, "Datei fehlt"))
        except Instabil as e:
            erg["unklar"].append((q, str(e)))
        except OSError as e:
            erg["unklar"].append((q, f"nicht lesbar ({e.__class__.__name__})"))
    return erg


# --------------------------------------------------------------------------------------------------------------- Ausgabe
def alle_befunde(erg):
    return [(q, b) for q, r in erg["queues"].items() for b in r["befunde"]]


def kurz(q, b):
    z, i, art, detail = b
    zusatz = f" {detail}" if art in ("feldzahl", "plattform-unbekannt") else ""
    return f"{os.path.basename(q)}:{z} id={i[:24] or '-'} {art}{zusatz}"


def still_zeile(erg, zeigen=4):
    teile, bf = [], alle_befunde(erg)
    if bf:
        teile.append(f"⚠️ {len(bf)} Befund{'e' if len(bf) != 1 else ''} (" + " · ".join(kurz(q, b) for q, b in bf[:zeigen]) + (" …" if len(bf) > zeigen else "") + ")")
    if erg["unklar"]:
        teile.append("unklar (" + "; ".join(f"{os.path.basename(q)}: {g}" for q, g in erg["unklar"]) + ")")
    return ("QUEUE-STRUKTUR: " + " · ".join(teile) + " → python3 automation/queue_struktur_wache.py") if teile else None


def bericht(erg):
    bf = alle_befunde(erg)
    saetze = sum(r["saetze"] for r in erg["queues"].values())
    print(f"QUEUE-STRUKTUR {time.strftime('%d.%m.%Y %H:%M', time.gmtime())} UTC — {len(erg['queues'])} von {len(SPEC)} Queues gelesen, "
          f"{saetze} Datensätze, {len(bf)} Befund(e), {len(erg['unklar'])} unklar")
    for q, r in erg["queues"].items():
        n = sum(1 for qq, _ in bf if qq == q)
        inf = r["info"]
        extra = []
        if inf.get("felder_mit_umbruch"):
            extra.append(f"echte Umbrüche in {inf['felder_mit_umbruch']} Feldern (erlaubt)")
        if inf.get("kodiert"):
            extra.append(f"«⏎» kodiert ×{inf['kodiert']}")
        if inf.get("crlf_enden"):
            extra.append(f"CRLF-Satzenden ×{inf['crlf_enden']}")
        if inf.get("doppelte_ids_history"):
            extra.append(f"History-Dubletten {inf['doppelte_ids_history']}")
        if inf.get("leere_id_history"):
            extra.append(f"leere ID bei Endstatus {inf['leere_id_history']}")
        print(f"  {q:<30} {r['saetze']:>5} Datensätze · {inf.get('spalten', '?')} Spalten · {n} Befund(e)" + (" · " + " · ".join(extra) if extra else ""))
    for q, g in erg["unklar"]:
        print(f"  {q:<30} UNKLAR: {g}")
    if bf:
        print("Befunde:")
        for q, (z, i, art, detail) in bf[:40]:
            print(f"  {q}:{z}  id={i or '-'}  [{art}] {detail}")
        if len(bf) > 40:
            print(f"  … und {len(bf) - 40} weitere")


# ------------------------------------------------------------------------------------------------------- Parser-Abgleich
def _csv_modul(text):
    return [r for r in csv.reader(io.StringIO(text, newline="")) if r]


def _queue_csv_py(text, repo=REPO):
    sys.path.insert(0, os.path.join(repo, "automation"))
    try:
        from queue_csv import parse_csv
    finally:
        sys.path.pop(0)
    return [r for r in parse_csv(text) if r]


def _queue_csv_mjs(texte, repo=REPO):
    """parseCsv() aus lib/queue_csv.mjs für alle Texte in EINEM node-Aufruf (offline, leere Umgebung, Text über stdin).
    → {name: Sätze} oder None, wenn node nicht lief."""
    if not os.path.exists(NODE):
        return None
    js = ("import {parseCsv} from '" + os.path.join(repo, "automation/lib/queue_csv.mjs") + "';let s='';"
          "process.stdin.on('data',d=>s+=d).on('end',()=>{const t=JSON.parse(s),o={};for(const k in t)o[k]=parseCsv(t[k]);process.stdout.write(JSON.stringify(o));});")
    try:
        p = subprocess.run(["env", "-i", "PATH=/opt/node22/bin:/usr/bin:/bin", NODE, "--input-type=module", "-e", js],
                           input=json.dumps(texte), capture_output=True, text=True, timeout=90)
        if p.returncode != 0:
            return None
        o = json.loads(p.stdout)
    except Exception:
        return None
    return {k: [r for r in v if r != [""]] for k, v in o.items()}


def abgleich_texte(texte, repo=REPO):
    """Je Text (name → Inhalt): Sätze und Sätze mit falscher Feldzahl nach DIESEM Leser, Python csv, queue_csv.py, queue_csv.mjs.
    Ein Leser, der abstürzt, steht als «FEHLER …», einer, der nicht lief, als None («unklar») — beides zählt als Unterschied.
    → [{q, n: {leser: Sätze|None}, abweichler: {leser: …}, unterschiede: [(leser, satz_nr|None, text)]}]"""
    mjs = _queue_csv_mjs(texte, repo)
    aus = []
    for name, text in texte.items():
        if text.startswith("\ufeff"):
            text = text[1:]
        strikt = [r for _, r in strikt_parsen(text)[0]]
        leser = {"dieser Leser": strikt, "Python csv": None, "queue_csv.py": None, "queue_csv.mjs": (mjs or {}).get(name)}
        fehler = {}
        for k, fn in (("Python csv", _csv_modul), ("queue_csv.py", lambda x: _queue_csv_py(x, repo))):
            try:
                leser[k] = fn(text)
            except Exception as e:
                fehler[k] = f"FEHLER {type(e).__name__}: {str(e)[:70]}"
        kopf_n = len(strikt[0]) if strikt else 0
        n = {k: (len(v) if v is not None else None) for k, v in leser.items()}
        abw = {k: (sum(1 for r in v if len(r) != kopf_n) if v is not None else None) for k, v in leser.items()}
        unterschiede = []
        for k, v in leser.items():
            if k == "dieser Leser":
                continue
            if v is None:
                unterschiede.append((k, None, fehler.get(k, "nicht gelaufen (unklar)")))
                continue
            for j in range(max(len(strikt), len(v))):
                x, y = (strikt[j] if j < len(strikt) else None), (v[j] if j < len(v) else None)
                if x != y:
                    unterschiede.append((k, j, f"Satz {j}: {len(x) if x is not None else '-'} Felder (dieser Leser) vs {len(y) if y is not None else '-'}"))
                    if sum(1 for u in unterschiede if u[0] == k) >= 5:
                        break
        aus.append({"q": name, "n": n, "abweichler": abw, "unterschiede": unterschiede})
    return aus


def parser_abgleich(repo=REPO):
    """Die acht echten Queues. Eine nicht lesbare Datei steht als {q, fehler}."""
    texte, aus = {}, []
    for q in SPEC:
        try:
            texte[q] = _lese_bytes(repo, q).decode("utf-8")
        except (OSError, UnicodeDecodeError) as e:
            aus.append({"q": q, "fehler": f"nicht lesbar ({e.__class__.__name__})"})
    return aus + abgleich_texte(texte, repo)


def parser_abgleich_bericht(repo=REPO):
    erg = parser_abgleich(repo)
    unterschiede = 0
    print("PARSER-ABGLEICH (Sätze inkl. Kopf; «Abw.» = Sätze mit anderer Feldzahl als der Kopf)")
    for e in erg:
        if "fehler" in e:
            print(f"  {e['q']:<30} UNKLAR: {e['fehler']}")
            unterschiede += 1
            continue
        zeile = " · ".join(f"{k} {e['n'][k] if e['n'][k] is not None else '?'}/Abw. {e['abweichler'][k] if e['abweichler'][k] is not None else '?'}" for k in e["n"])
        print(f"  {e['q']:<30} {zeile}")
        for k, j, t in e["unterschiede"]:
            unterschiede += 1
            print(f"      Unterschied {k}: {t}")
    print(f"{unterschiede} Unterschied(e) zwischen den Lesern")
    return unterschiede


# -------------------------------------------------------------------------------------------------------------- Selbsttest
def _arts(res):
    return sorted(b[2] for b in res["befunde"])


def selbsttest(repo=REPO):
    fehler, faelle = [], 0

    def pruef(ok, was):
        nonlocal faelle
        faelle += 1
        if not ok:
            fehler.append(was)

    Q = "automation/reels_seed.csv"
    H = ",".join(SPEC[Q]["pflicht"]) + "\n"
    row = lambda i="a", st="ready", pl="instagram", cap="c": f"{i},2026-10-19,https://x/{i}.mp4,{cap},#a,{pl},{st},,\n"

    # --- je Befundart: die kaputte Datei MUSS genau diese Art melden, die saubere nichts
    sauber = {
        "sauber (echter Umbruch + Komma in Anführungszeichen, doppelte Anführungszeichen)":
            H + row("a", cap='"Zeile 1\nZeile 2, mit Komma\n\nund ""Zitat"""', pl='"instagram,facebook"') + row("b", "posted-tiktok", "tiktok"),
        "sauber mit CRLF-Satzenden": (H + row("a", pl='"instagram,facebook"') + row("b", "jury-skip")).replace("\n", "\r\n"),
        "nur Kopf": H,
        "leere Plattform + Leerzeichen/Semikolon in der Liste": H + row("a", pl="") + row("b", pl='"instagram, facebook"') + row("c", pl="Instagram;Threads"),
        "leere ID bei Endstatus": H + row("", "posted-ig-fb") + row("", "jury-skip"),
        "History-Dubletten": H + row("a", "jury-skip") + row("a", "jury-skip") + row("b", "posted") + row("b", "posted-dup-skip"),
        "Status-Familien und Literale": H + "".join(row(f"s{k}", st) for k, st in enumerate(
            ["posted-youtube", "posted-instagram", "dup-zeile-skip", "skip-produkt-ausverkauft", "archived-deadurl", "verworfen-fremdvideo",
             "werbetext-hold", "tiktok-entwurf", "pending", "posting-unklar-pruefen", "markierung-fehlt", "promo-veraltet", "skipped-nonjpg",
             "scheduled", "text-pruefen", "tiktok-fehler"])),
    }
    for name, text in sauber.items():
        r = pruefe_text(Q, text)
        pruef(not r["befunde"], f"Fehlalarm bei «{name}»: {[b[2:3] for b in r['befunde']]}")
    kaputt = [
        ("feldzahl (zu wenig)", H + "a,2026-10-19,u,cap,#a,instagram,ready,\n", ["feldzahl"]),
        ("feldzahl (Caption-Komma, ein einzelner Plattformname)", H + "a,2026-10-19,u,Hallo, Welt,#a,instagram,ready,,\n", ["feldzahl"]),
        ("Komma-Spalten-Shift (instagram,facebook ohne Anführungszeichen)", H + "a,2026-10-19,u,cap,#a,instagram,facebook,ready,,\n", ["spalten-shift"]),
        ("Spalten-Shift mit drei Plattformen", H + "a,2026-10-19,u,cap,#a,instagram,facebook,threads,ready,,\n", ["spalten-shift"]),
        ("offenes Anführungszeichen am Dateiende", H + row("a") + 'b,2026-10-19,u,"Caption ohne Ende,#a,instagram,ready,,\n' + row("c"), ["offenes-anfuehrungszeichen"]),
        ("Anführungszeichen im ungequoteten Feld", H + row("a", cap='sag "hallo" Welt'), ["anfuehrungszeichen-im-feld"]),
        ("5\" Display (ungerade Zahl Anführungszeichen)", H + row("a", cap='5" Display') + row("b"), ["anfuehrungszeichen-im-feld"]),
        ("Text nach geschlossenem Feld", H + row("a", cap='"cap"x'), ["text-nach-geschlossenem-feld"]),
        ("ID leer bei ready", H + row("", "ready"), ["id-leer"]),
        ("ID leer bei posting", H + row("", "posting"), ["id-leer"]),
        ("ID doppelt, beide ready", H + row("a") + row("b") + row("a"), ["id-doppelt-offen"]),
        ("ID doppelt, ready neben posted", H + row("a", "posted-ig-fb") + row("a", "ready"), ["id-doppelt-offen"]),
        ("Status «Ready»", H + row("a", "Ready"), ["status-unbekannt"]),
        ("Status « ready» (Leerraum)", H + row("a", " ready"), ["status-unbekannt"]),
        ("Status leer", H + row("a", ""), ["status-unbekannt"]),
        ("Status Tippfehler", H + row("a", "rady"), ["status-unbekannt"]),
        ("Plattform unbekannt", H + row("a", pl="insta"), ["plattform-unbekannt"]),
        ("Pflichtspalte fehlt (post_url)", H.replace(",post_url", "") + "a,2026-10-19,u,c,#a,instagram,ready,\n", ["kopf-spalte-fehlt"]),
        ("Kopfzeile gelöscht", row("a") + row("b"), ["kopf-fehlt"]),
        ("doppelter Spaltenname", H.replace("hashtags", "caption") + row("a"), ["kopf-spalte-fehlt", "kopf-unsauber"]),
        ("Spaltenname mit Leerzeichen", H.replace("status", "status ") + row("a"), ["kopf-spalte-fehlt", "kopf-unsauber"]),
        ("BOM", "\ufeff" + H + row("a"), ["bom"]),
        ("leere Datei", "", ["leer"]),
        ("Datei endet ohne Zeilenumbruch", H + row("a").rstrip("\n"), ["ende-ohne-umbruch"]),
        ("Leerzeile mitten in der Datei", H + "\n" + row("a"), ["leerzeile"]),
        ("einzelnes CR", H + row("a", cap="ca\rp"), ["cr-allein"]),
        ("CR im Feld", H + row("a", cap='"ca\r\np"'), ["cr-im-feld"]),
    ]
    for name, text, soll in kaputt:
        r = pruefe_text(Q, text)
        pruef(_arts(r) == sorted(soll), f"«{name}»: erwartet {soll}, gemeldet {_arts(r)}")
    QS = "social/ig_karussell.csv"   # slug-Queue: slug muss an Stelle 0 stehen (der Helfer schlüsselt nach Spalte 0, wenn es kein «id» gibt)
    r = pruefe_text(QS, "modus,slug,slides,ordner,produkte,caption,status,posted_at,post_url\nprodukt,s1,2,o,p,c,ready,,\n")
    pruef(_arts(r) == ["kopf-unsauber"], f"slug nicht an Stelle 0: {_arts(r)}")
    r = pruefe_text(QS, "slug,modus,slides,ordner,produkte,caption,status,posted_at,post_url\ns1,produkt,2,o,p,c,ready,,\n")
    pruef(not r["befunde"], f"saubere slug-Queue meldet etwas: {r['befunde']}")
    pruef(_arts(pruefe_text(Q, "\n")) == ["kopf-fehlt", "leerzeile"], "Datei aus einem einzigen Zeilenumbruch")
    # Zeilennummer + ID: Kopf = Zeile 1, Satz «a» belegt die Zeilen 2–4 (zwei echte Umbrüche), der Shift-Satz beginnt in Zeile 5
    r = pruefe_text(Q, H + row("a", cap='"1\n2\n3"') + "zz,2026-10-19,u,c,#a,instagram,facebook,ready,,\n")
    pruef([b[:3] for b in r["befunde"]] == [(5, "zz", "spalten-shift")], f"Zeile/ID des Shifts: {r['befunde']}")
    # ungültiges UTF-8 geht über _pruefe_bytes
    b = H.encode() + row("a", cap="xQx").encode().replace(b"xQx", b"x\xffx")
    pruef([x[2] for x in _pruefe_bytes(repo, Q, b)["befunde"]] == ["kein-utf8"], "ungültiges UTF-8 nicht erkannt")
    # jede der acht Queues: eine nach Tabelle gebaute saubere Datei meldet nichts, mit einem Feld mehr genau feldzahl, mit leerer ID bei ready id-leer
    for q, sp in SPEC.items():
        k = sp["pflicht"]
        werte = {c: "x" for c in k}
        werte[sp["id"]] = "a"
        werte["status"] = "ready"
        if sp["plattform"]:
            werte[sp["plattform"]] = "instagram"
        z = lambda w: ",".join(w.get(c, "") for c in k) + "\n"
        pruef(not pruefe_text(q, ",".join(k) + "\n" + z(werte))["befunde"], f"{q}: saubere Tabellen-Datei meldet etwas")
        pruef(_arts(pruefe_text(q, ",".join(k) + "\n" + z(werte).rstrip("\n") + ",x\n")) == ["feldzahl"], f"{q}: Feld zu viel nicht als feldzahl erkannt")
        pruef(_arts(pruefe_text(q, ",".join(k) + "\n" + z(dict(werte, **{sp["id"]: ""})))) == ["id-leer"], f"{q}: leere ID bei ready nicht erkannt")
    # --- Beständigkeit: ein Schreiber mitten im Werk ist kein Befund; ein beständiger Defekt schon; ewiges Flackern ist «unklar»
    kaputt_roh, heil_roh = (H + "a,2026-10-19,u,c,#a,instagram,ready,\n").encode(), (H + row("a")).encode()

    def folge(*texte):
        it = iter(texte)
        last = [texte[-1]]
        return lambda repo_, q_: next(it, last[0])
    pruef(not pruefe_queue(repo, Q, folge(kaputt_roh, heil_roh), pause=0)["befunde"], "halb geschriebene Datei (beim 2. Lesen heil) wurde gemeldet")
    pruef(_arts(pruefe_queue(repo, Q, folge(kaputt_roh, kaputt_roh), pause=0)) == ["feldzahl"], "beständiger Defekt nicht gemeldet")
    try:
        pruefe_queue(repo, Q, folge(kaputt_roh, kaputt_roh + b"x", kaputt_roh + b"xy"), pause=0)
        pruef(False, "flackernde Datei nicht als instabil erkannt")
    except Instabil:
        pruef(True, "")
    # --- Lesefehler: fehlende / nicht lesbare Datei = unklar, nie ok
    def weg(repo_, q_):
        raise FileNotFoundError(q_)

    def gesperrt(repo_, q_):
        raise PermissionError(q_)

    def ein_loch(repo_, q_):   # tiktok_queue.csv fehlt, Q ist heil, der Rest ist die echte Datei
        if q_.endswith("tiktok_queue.csv"):
            raise FileNotFoundError(q_)
        return (H + row("a")).encode() if q_ == Q else _lese_bytes(repo_, q_)
    e0 = pruefen(repo, lese=weg, pause=0)
    z0 = still_zeile(e0)
    pruef(len(e0["unklar"]) == len(SPEC) and not e0["queues"] and bool(z0) and z0.startswith("QUEUE-STRUKTUR: unklar (") and "Datei fehlt" in z0,
          f"fehlende Dateien nicht als unklar gemeldet: {z0}")
    e1 = pruefen(repo, lese=gesperrt, pause=0)
    pruef(len(e1["unklar"]) == len(SPEC) and "nicht lesbar" in (still_zeile(e1) or ""), "nicht lesbare Dateien nicht als unklar gemeldet")
    e2 = pruefen(repo, lese=ein_loch, pause=0)
    pruef(len(e2["unklar"]) == 1 and "tiktok_queue.csv: Datei fehlt" in (still_zeile(e2) or ""), "eine fehlende Datei unter lesbaren nicht gemeldet")
    pruef(still_zeile({"queues": {Q: pruefe_text(Q, H + row("a"))}, "unklar": []}) is None, "--still meldet bei sauberem Stand etwas")
    pruef("⚠️ 1 Befund (" in (still_zeile({"queues": {Q: pruefe_text(Q, H + row("", "ready"))}, "unklar": []}) or ""), "--still-Zeile bei einem Befund")
    # --- Tabelle ↔ queue_schreiber_wache.QUEUES (kein Import: kein __pycache__) und Tabelle ↔ COLS der Leser
    try:
        t = open(os.path.join(repo, "automation/queue_schreiber_wache.py"), encoding="utf-8").read()
        m = re.search(r"^QUEUES\s*=\s*\[(.*?)\]", t, re.S | re.M)
        liste = re.findall(r"""['"]([^'"]+\.csv)['"]""", m.group(1)) if m else None
        pruef(liste is not None and sorted(liste) == sorted(SPEC), f"Queue-Liste weicht von queue_schreiber_wache.QUEUES ab: {liste}")
    except OSError as e:
        pruef(False, f"queue_schreiber_wache.py nicht lesbar: {e}")
    for q, sp in SPEC.items():
        if not sp["leser"]:
            continue
        cols = leser_cols(repo, sp["leser"])
        pruef(cols is not None and set(cols) == set(sp["pflicht"]), f"{q}: Tabelle weicht von COLS in {sp['leser']} ab ({cols})")
    # --- echte Queues: sind die Leser sich einig (dieser Leser == Python csv == queue_csv.py == queue_csv.mjs), meldet die Wache nichts;
    #     uneinige Leser MÜSSEN einen Befund der Wache haben (sonst wäre sie blind). Prüft das Werkzeug, nicht die Daten.
    abgleich = parser_abgleich(repo)
    echt = pruefen(repo, pause=0)
    mjs_lief = all(e["n"]["queue_csv.mjs"] is not None for e in abgleich if "n" in e)
    for e in abgleich:
        if "fehler" in e:
            pruef(False, f"{e['q']}: {e['fehler']}")
            continue
        uneinig = [u for u in e["unterschiede"] if not u[2].startswith("nicht gelaufen")]
        hat_befund = bool(echt["queues"].get(e["q"], {}).get("befunde"))
        pruef(not uneinig or hat_befund, f"{e['q']}: Leser uneinig ({uneinig[:2]}), aber kein Befund der Wache")
        if not hat_befund:
            pruef(len({v for v in e["n"].values() if v is not None}) == 1, f"{e['q']}: Satzzahlen verschieden {e['n']}")
            pruef(len({v for v in e["abweichler"].values() if v is not None}) == 1, f"{e['q']}: Feldzahl-Abweichler verschieden {e['abweichler']}")
            pruef(e["q"] in echt["queues"] and e["n"]["dieser Leser"] - 1 == echt["queues"][e["q"]]["saetze"], f"{e['q']}: Satzzahl der Wache weicht ab")
    # Abgleich-Werkzeug selbst: ein sauberer Text zeigt keinen Unterschied, ein einzelnes CR MUSS einen zeigen (Python csv trennt dort den Satz)
    syn = {e["q"]: e for e in abgleich_texte({"sauber": "id,a\nx,1\n", "cr": "id,a,b\nx,a\rb,2\nz,3,4\n"}, repo)}
    pruef(not [u for u in syn["sauber"]["unterschiede"] if not u[2].startswith("nicht gelaufen")], f"Abgleich: Fehlalarm bei sauberem Text {syn['sauber']['unterschiede']}")
    pruef(any(u[0] == "Python csv" for u in syn["cr"]["unterschiede"]), "Abgleich: einzelnes CR nicht als Unterschied erkannt")
    # die 0 im echten Lauf braucht einen Fall, der treffen MUSS: dieselbe Prüfung auf Kopien der echten Texte mit je einem eingebauten Defekt
    for q, sp in SPEC.items():
        try:
            text = _lese_bytes(repo, q).decode("utf-8")
        except (OSError, UnicodeDecodeError) as e:
            pruef(False, f"{q}: echte Datei nicht lesbar ({e.__class__.__name__}) — Kanarienvogel nicht möglich")
            continue
        basis = _pruefe_bytes(repo, q, text.encode("utf-8"))
        n0 = len(basis["befunde"])
        kopf = strikt_parsen(text)[0][0][1]
        # 1) offenes Anführungszeichen am Ende
        r = _pruefe_bytes(repo, q, (text + 'zzz,"offen\n').encode("utf-8"))
        pruef(sorted(b[2] for b in r["befunde"] if b not in basis["befunde"]) == ["offenes-anfuehrungszeichen"], f"{q}: Kanarienvogel offenes Anführungszeichen")
        # 2) eine Zeile mit einem Feld zu viel (am Ende angehängt: Zeilennummer = Zeilenzahl + 1)
        r = _pruefe_bytes(repo, q, (text + ",".join(["x"] * (len(kopf) + 1)) + "\n").encode("utf-8"))
        neu = [b for b in r["befunde"] if b not in basis["befunde"]]
        pruef([b[2] for b in neu] == ["feldzahl"] and neu[0][0] == text.count("\n") + 1, f"{q}: Kanarienvogel Feldzahl {neu}")
        # 3) ready ohne ID
        w = ["x"] * len(kopf)
        w[kopf.index(sp["id"])] = ""
        w[kopf.index("status")] = "ready"
        if sp["plattform"]:
            w[kopf.index(sp["plattform"])] = "instagram"
        r = _pruefe_bytes(repo, q, (text + ",".join(w) + "\n").encode("utf-8"))
        neu = [b for b in r["befunde"] if b not in basis["befunde"]]
        pruef([b[2] for b in neu] == ["id-leer"], f"{q}: Kanarienvogel ID leer {neu}")
        # 4) Komma-Spalten-Shift: der erste Satz mit einer Plattform-LISTE verliert seine Anführungszeichen (nur Queues mit Plattform-Spalte).
        #    Erwartet: genau ein neuer Befund «spalten-shift» in der Zeile, in der DIESER Satz beginnt (Captions haben echte Umbrüche).
        if sp["plattform"]:
            pi = kopf.index(sp["plattform"])
            ziel = next(((z, r) for z, r in strikt_parsen(text)[0][1:] if len(r) == len(kopf) and "," in r[pi] and all(x in PLATTFORMEN for x in r[pi].split(","))), None)
            if ziel:
                z0, r0 = ziel
                off = sum(len(l) + 1 for l in text.split("\n")[:z0 - 1])
                m = re.compile('"' + re.escape(r0[pi]) + '"').search(text, off)
                r = _pruefe_bytes(repo, q, (text[:m.start()] + r0[pi] + text[m.end():]).encode("utf-8"))
                neu = [b for b in r["befunde"] if b not in basis["befunde"]]
                pruef([b[:3] for b in neu] == [(z0, r0[0], "spalten-shift")], f"{q}: Kanarienvogel Spalten-Shift (erwartet Zeile {z0}, id {r0[0]!r}): {[b[:3] for b in neu]}")
        pruef(len(basis["befunde"]) == n0, f"{q}: Prüfung nicht wiederholbar")
    # --- Schalter: unbekannt → Exit 2 ohne Lauf; Kombinationen ebenso
    for args in (["--gibtsnicht"], ["--still", "--selbsttest"], ["bericht"], ["--selbsttest", "--parser-abgleich"], ["--help", "--still"]):
        p = subprocess.run([sys.executable, os.path.abspath(__file__)] + args, capture_output=True, text=True, timeout=60)
        pruef(p.returncode == 2 and p.stdout == "", f"Schalter {args}: Exit {p.returncode}, stdout {p.stdout[:60]!r} (erwartet Exit 2, nichts auf stdout)")
    return fehler, faelle, mjs_lief


# ------------------------------------------------------------------------------------------------------------------- main
def main(argv=None):
    args = sys.argv[1:] if argv is None else list(argv)
    erlaubt = {"--still", "--selbsttest", "--parser-abgleich", "--help", "-h"}
    if args and (len(set(args)) != 1 or args[0] not in erlaubt):
        print(f"queue_struktur_wache: unbekannter Schalter/Kombination {' '.join(args)!r} — kein Lauf.\n"
              "Erlaubt: (nichts) | --still | --parser-abgleich | --selbsttest | --help", file=sys.stderr)
        return 2
    modus = args[0] if args else "bericht"
    if modus in ("--help", "-h"):
        print(__doc__)
        return 0
    try:
        if modus == "--selbsttest":
            f, n, mjs_lief = selbsttest()
            if f:
                print(f"❌ queue_struktur_wache: {len(f)} Fehler in {n} Prüfungen\n - " + "\n - ".join(f))
                return 1
            print(f"✅ queue_struktur_wache Selbsttest ok ({n} Prüfungen" + ("" if mjs_lief else "; queue_csv.mjs-Abgleich NICHT gelaufen — unklar") + ")")
            return 0
        if modus == "--parser-abgleich":
            parser_abgleich_bericht()
            return 0
        erg = pruefen()
        if modus == "--still":
            z = still_zeile(erg)
            if z:
                print(z)
            return 0
        bericht(erg)
        return 0
    except Exception as e:   # ein Wächter, der still stirbt, sieht aus wie ein gesunder
        if modus == "--selbsttest":
            print(f"❌ queue_struktur_wache: Ausnahme {type(e).__name__}: {e}")
            return 1
        print(f"QUEUE-STRUKTUR: unklar (Fehler im Wächter: {type(e).__name__}: {e})")
        return 0


if __name__ == "__main__":
    sys.exit(main())
