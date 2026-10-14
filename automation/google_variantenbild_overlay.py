#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""google_variantenbild_overlay.py — Google «Promotional overlay on image» auf VARIANTENBILDERN beheben (14.10.2026).

ANLASS (GEMESSEN 14.10., Bild-Messung Befunde 8 und 10–12): Google nimmt je Variante das VARIANTENBILD als image_link.
Bei 11 der 31 Produkte mit «Promotional overlay on image» (Ziel [Free_listings,Shopping_ads] = echter Gratis-Eintrag-
Blocker) trägt jede Farbe ein eigenes Bild ≠ Hauptbild, und die Einblendung sitzt dort («10 Pairs», «Black/Red»,
«BABY SHOES BLACK», «1-152»-Badge, Bambus-Badge, USPS-/«3000mAh»-Banner). google_bild_tausch, google_overlay_bereinigen und
hauptbild_ohne_text ändern nur media[0] und erreichen diese Bilder nie (Lesebrille: Hauptbild am 12.10. bereinigt,
Variantenbild weiter gemeldet). GEMESSEN: Tausch MIT Variantenbild 65 % frei = Niveau der Unberührten (63–66 %).

VERFAHREN je Produkt der Klasse (Handles aus dropship/_google_feedback_stand.json, google_feedback_wache täglich):
  0. Werbetest-Sperre (werbetest_sperre.gesperrt) → überspringen, vor jedem Lesen der Bilder. Nicht ACTIVE oder nicht im
     Google-Kanal → überspringen (kein Vision-Kontingent für Ware, die Google nicht sieht).
  1. Alle Varianten (blätternd) mit eigenem Bild, gruppiert nach Media-ID (Grössen teilen ein Farbbild). Ohne
     Variantenbild → «kein-variantenbild» (Sache der Hauptbild-Werkzeuge).
  2. Alle Produktbilder laden, exakte Doppel zusammenlegen (16×16-Abdruck), höchstens MAX_BILDER, Variantenbilder zuerst.
     Gemini UND Zweitprüfer (zweitmodell.chat_json: ChatGPT, sonst Groq-Vision) urteilen UNABHÄNGIG: je Bild «Einblendung?
     wo?», je Variantenbild «anderes Bild DERSELBEN Farbe/desselben Modells OHNE Einblendung?».
  3. Plan je Variantenbild — nur Einigkeit beider Prüfer führt zu einer Änderung:
     sauber        beide: keine Einblendung → nichts
     uneinig       nur ein Prüfer sieht eine Einblendung, oder ein Urteil fehlt → nichts
     tauschen      beide: Einblendung, dieselbe Ersatz-Nummer, und beide sehen auf dem Ersatz KEINE Einblendung →
                   productVariantDetachMedia (alt) + productVariantAppendMedia (Ersatz) für alle Varianten mit diesem Bild.
                   NIE, wenn Variantenwert, -titel oder Optionsname ein MODELL-Wort trägt (Style|Stil|Modell|Model|Version|
                   Typ|Type|Upgraded|Luxury|Flagship|Pro|Plus|Max|Mini|Lite, Wortgrenzen) → zuschnitt-pruefen. GEMESSEN
                   14.10. (Prüfer): Trinkflasche «3086 Luxury Style Brown» sollte das Bild des FLAGSHIP-Modells bekommen —
                   gleiche Farbe, anderer Artikel; die Vision fällt auf die Farbe herein. NIE, wenn der Ersatz das
                   Variantenbild einer Variante mit ANDEREM Wert der Bild-Option ist (Bordeaux-Foto an Rot) oder sich die
                   Ausprägung nicht vergleichen lässt → zuschnitt-pruefen.
                   SCHARF tauscht nur GESICHTETE PAARE: TAUSCH_FREIGABE=handle:alte_media:ersatz_media,… (Media-IDs kurz).
                   Der Trockenlauf schreibt je Tausch-Paar einen Kontaktbogen «alt | Ersatz» nach TROCKEN_BILDER und die
                   Freigabe-Zeile in die Trockenliste. Wählt das neue Urteil im SCHARF-Lauf ein ANDERES Ersatzbild als
                   freigegeben (Vision mit Temperatur 0.1, Bildnummern verschieben sich) → «tausch-wartet» mit dem neuen
                   Paar in der Notiz, nichts geändert. Ein blosser Handle (Form bis 14.10. mittags) gibt nichts frei.
                   «tausch-wartet» bleibt quittiert, bis eine NEUE Freigabe für dieses alte Bild vorliegt (methode
                   «freigabe-geprueft:<ersatz>» merkt sich, welche Freigabe schon am Urteil gescheitert ist).
     zuschneiden   kein gemeinsamer Ersatz, beide verorten die Einblendung an einer Ecke/einem Rand, und
                   (a) tools/bild_text_weg.py meldet «bereinigt» (Text auf gleichmässigem Grund, Muster
                       google_overlay_bereinigen) UND JEDES geänderte Pixel liegt in einem Randband (BAND = 25 % der
                       Kante) einer Seite, die BEIDE Prüfer nennen — bild_text_weg füllt jede Textgruppe auf gleichmässigem
                       Grund, also auch einen AUFDRUCK auf einem weissen Artikel vor weissem Grund (Gegenprobe 14.10. des
                       Prüfers an einem gebauten Bild: «SUMMER VIBES» weg; an den 5 echten Kandidaten nur im oberen Band
                       geändert); sonst Weg (b). Die Prüfung sieht dann Original UND Kandidat und muss zusätzlich
                       «Artikel unverändert» bestätigen; oder
                   (b) ein Randstreifen enthält ALLE Einblendungs-Boxen (Gemini, Promille) und berührt den Artikel nicht,
                       Sicherheitsrand 20 ‰, bei Banner-Boxen (> 50 % der Kante breit) 40 ‰ (GEMESSEN 14.10.: beim Akku
                       blieb mit 20 ‰ ein Rest der runden «USA Stock»-Plakette stehen), Rest ≥ 70 %, kürzere Seite ≥ 400 px;
                   danach prüfen BEIDE das neue Bild: keine Einblendung UND Artikel vollständig. Erst dann neues Medium
                   hochladen (READY abwarten), Varianten umhängen. Das Original bleibt am Produkt (keine Freigabeliste
                   nötig: es kommt nur ein Ausschnitt bzw. ein nur am Rand bereinigtes Bild desselben Fotos dazu).
     lassen        sonst (flächig, über dem Artikel, Wasserzeichen-Muster, Zuschnitt-Prüfung nicht bestanden)
  4. SCHARF=1: ausführen, je Variante ZURÜCKLESEN (media der Variante == neues Bild), Ledger
     dropship/_google_variantenbild_overlay.tsv (datum, handle, produkt, art, alte_media, neue_media, varianten, methode,
     notiz) — die alte Media-ID ist der Rückweg. Auch sauber/uneinig/lassen werden quittiert (kein Vision-Kontingent für
     denselben Fall am nächsten Tag); «fehler» nicht. Ein neues Variantenbild (andere Media-ID) wird neu beurteilt.
     Rückweg auch bei Teilzuständen: VOR der ersten Umhänge-Mutation steht «begonnen-tauschen|-zuschneiden» (alte und neue
     Media, Varianten) im Ledger; scheitert Umhängen oder Zurücklesen, baut umhaengen() selbst zurück (neu lösen, alt
     anhängen). Bestätigt ist dieser Rückbau im Lauf NUR, wenn Shopify das Wieder-Anhängen von «alt» für JEDE Variante, die
     «alt» verloren haben könnte, OHNE userError und ohne Ausnahme quittiert hat UND das Zurücklesen «alt» zeigt. Eine
     Lesung allein beweist nichts: das Rückbau-Ziel ist der Startzustand, und den zeigt auch eine hinkende Lesung (GEMESSEN
     14.10., Prüfer: hinkt 12 Lesungen + MEDIA_CANNOT_BE_MODIFIED beim Lösen → Zuschnitt-Medium gelöscht, Varianten bildlos,
     Ledger «fehler»). Sonst → «fehler-teil-…» mit neue_media, Handle gesperrt. Ein selbst angelegtes Zuschnitt-Medium löscht
     der Lauf nur nach quittiertem Rückbau, und gelöscht gilt es nur mit deletedMediaIds.
     --zurueck (später, eigener Prozess) glaubt einer LESUNG nur nach Ruhe: zweimal «alt» im Abstand GVO_RUHE (60 s), die
     erste GVO_RUHE nach der letzten Mutation; ein eigenes Medium gilt dort auch als entfernt, wenn es zweimal so gelesen in den
     Produkt-Medien fehlt (frühere Löschung mit verlorener Antwort, Abbruch vor der Ledger-Zeile, «does not exist»). Gleiche
     Handles bearbeitet --zurueck nur einmal.
  Kontingent: Gemini leer oder Zweitprüfer leer → sauberer ABBRUCH, der Rest bleibt offen. Kein Ein-Modell-Betrieb: ein
  falsches Farbbild an einer Variante ist schlimmer als ein gesperrter Gratis-Eintrag.

AUFRUF
  python3 automation/google_variantenbild_overlay.py                 Trockenlauf (Standard) → TROCKEN_TSV + Zählung
  SCHARF=1 python3 automation/google_variantenbild_overlay.py        ausführen
  SCHARF=1 TAUSCH_FREIGABE=handle:alte_media:ersatz_media,… python3 automation/google_variantenbild_overlay.py
                                                                     ausführen, Tausch nur für genau diese Paare
  SCHARF=1 python3 automation/google_variantenbild_overlay.py --zurueck <handle> …
                                                                     Rückweg: alte Media-ID wieder an die Varianten (auch aus
                                                                     «begonnen-…»/«fehler-teil-…»), ein selbst angelegtes
                                                                     Zuschnitt-Medium wird wieder entfernt
  python3 automation/google_variantenbild_overlay.py --selbsttest    Planlogik + Schreibweg mit falscher gql (kein Netz,
                                                                     Ledger nur in einem Wegwerf-Ordner)
  Umgebung: KLASSE, N (Produkte je Lauf), MAX_BILDER, TAUSCH_FREIGABE, TROCKEN_TSV (Standard /tmp/…, nie ein
  Sitzungsordner), TROCKEN_BILDER (Ordner für Zuschnitt-Vorschauen und Tausch-Kontaktbögen, Standard: keine), GVO_RUHE.
"""
import io, json, os, re, statistics, subprocess, sys, tempfile, time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
sys.path.insert(0, os.path.join(REPO, "tools"))
from PIL import Image

SCHARF = os.environ.get("SCHARF") == "1"
KLASSE = os.environ.get("KLASSE", "Promotional overlay on image")
STAND = os.environ.get("GVO_STAND") or os.path.join(REPO, "dropship", "_google_feedback_stand.json")
LEDGER = os.environ.get("GVO_LEDGER") or os.path.join(REPO, "dropship", "_google_variantenbild_overlay.tsv")
TROCKEN_TSV = os.environ.get("TROCKEN_TSV") or "/tmp/google_variantenbild_overlay_trocken.tsv"
TROCKEN_BILDER = os.environ.get("TROCKEN_BILDER", "")
GOOGLE = "gid://shopify/Publication/302872297857"
N = int(os.environ.get("N", "40"))
MAX_BILDER = int(os.environ.get("MAX_BILDER", "20"))
MIN_REST = 0.70          # Zuschnitt: mindestens 70 % der Fläche bleiben
MIN_SEITE = 400          # Zuschnitt: kürzere Seite danach mindestens 400 px
RAND = 20                # Sicherheitsabstand um die Einblendung, Promille der Bildkante
RAND_BANNER = 40         # dito bei Banner-Boxen (> BANNER_AB der Kante breit): runde Plaketten reichen tiefer als die Box
BANNER_AB = 500          # Promille
DOPPEL_TOL = 14          # 16×16-Abdruck: höchste Kanal-Abweichung für «dasselbe Bild» (JPEG-Rauschen, keine andere Farbe)
STREUUNG = 14            # Auffüllen nur bei gleichmässigem Rand (wie bild_text_weg.STREUUNG)
BAND = 250               # text-weg: geänderte Pixel nur in einem Randband dieser Tiefe (Promille der Kante)
RUHE = int(os.environ.get("GVO_RUHE", "60"))    # --zurueck: Sekunden Ruhe vor/zwischen den zwei Lesungen, denen es glaubt
FREIGABE_RE = re.compile(r"^([^\s:,]+):(?:gid://shopify/MediaImage/)?(\d+):(?:gid://shopify/MediaImage/)?(\d+)$")


def freigabe_aus(text, falsch=None):
    """«handle:alte_media:ersatz_media,…» (Media-IDs kurz oder als gid) → frozenset {(handle, alt, ersatz)}. Die Freigabe gilt
    dem GESICHTETEN PAAR, nicht dem Produkt: ein blosser Handle (alte Form) gibt nichts frei und landet in «falsch»."""
    out = set()
    for x in str(text or "").split(","):
        x = x.strip()
        if not x:
            continue
        m = FREIGABE_RE.match(x)
        if m:
            out.add(m.groups())
        elif falsch is not None:
            falsch.append(x)
    return frozenset(out)


def paar_text(h, alt, ersatz):
    return f"{h}:{kurz(alt)}:{kurz(ersatz)}"


def freigaben_fuer(freigabe, h, alt):
    """Freigegebene Ersatz-IDs (kurz) für dieses alte Bild. Einträge, die kein Paar sind (alte Handle-Form), geben nichts frei."""
    return {x[2] for x in freigabe or () if isinstance(x, tuple) and len(x) == 3 and x[0] == h and x[1] == kurz(alt)}


TAUSCH_FREIGABE_FALSCH = []
TAUSCH_FREIGABE = freigabe_aus(os.environ.get("TAUSCH_FREIGABE", ""), TAUSCH_FREIGABE_FALSCH)
# Variante unterscheidet sich (auch) im MODELL → ein «gleichfarbiges» Galeriebild zeigt womöglich einen anderen Artikel.
MODELL_WOERTER = re.compile(r"\b(Style|Stil|Modell?|Model|Version|Typ|Type|Upgraded|Luxury|Flagship|Pro|Plus|Max|Mini|Lite)\b",
                            re.IGNORECASE)

ORTE_RAND = ("ecke-oben-links", "ecke-oben-rechts", "ecke-unten-links", "ecke-unten-rechts",
             "rand-oben", "rand-unten", "rand-links", "rand-rechts")
GEAENDERT = ("tauschen", "zuschneiden")
QUITTIERT = ("sauber", "uneinig", "lassen", "tauschen", "zuschneiden", "zurueck")   # «fehler» bekommt eine neue Runde
WARTET = "tausch-wartet"         # quittiert, bis für dieses alte Bild eine noch nicht geprüfte Paar-Freigabe vorliegt (methode freigabe-geprueft:<ersatz>)
# Teilzustände: Varianten womöglich gelöst/umgehängt oder ein eigenes Medium übrig → Rückweg-Kandidat, Handle gesperrt
OFFEN_TEIL = ("begonnen-tauschen", "begonnen-zuschneiden", "fehler-teil-tauschen", "fehler-teil-zuschneiden")
EIGENES_MEDIUM = ("zuschneiden", "begonnen-zuschneiden", "fehler-teil-zuschneiden")   # neue_media hat DIESES Werkzeug angelegt
SPALTEN = ("datum", "handle", "produkt", "art", "alte_media", "neue_media", "varianten", "methode", "notiz")
M_DEL = 'mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p,mediaIds:$m){deletedMediaIds mediaUserErrors{code field message}}}'

EINBLENDUNG = """Google sperrt dieses Produkt mit «Promotional overlay on image»: eingeblendeter Werbetext, Mengen-/Rabatt-Sticker
(«10 Pairs», «2 in 1», «SALE»), Logos von Händlern/Paketdiensten, Wasserzeichen, Farbnamen-Etiketten («BLACK», «Black/Red»),
Badges/Abzeichen, Rahmen oder Grafik-Collagen ÜBER dem Produktfoto. Schrift, die AUF dem Produkt selbst gedruckt ist (Etikett
einer Tube, Aufdruck eines Shirts), ist KEINE Einblendung."""

PROMPT_PRODUKT = """[AUFGABE-PRODUKT] Du prüfst Produktbilder für Google Merchant (Gratis-Einträge, Schweiz).
""" + EINBLENDUNG + """
Artikel: «{titel}». Du siehst {k} Bilder, nummeriert 1 bis {k} in dieser Reihenfolge. Werden sie dir als EIN Raster gezeigt,
sind die schwarzen Etiketten «Bild n» über den Feldern nur die Nummern dieser Prüfung — sie gehören nicht zu den Bildern und
sind KEINE Einblendung; beurteile jedes Feld für sich.
Google zeigt je Variante ihr Variantenbild:
{varianten}
1. Für JEDES der {k} Bilder: trägt es eine Einblendung? Wo? ort ∈ ecke-oben-links | ecke-oben-rechts | ecke-unten-links |
   ecke-unten-rechts | rand-oben | rand-unten | rand-links | rand-rechts | mitte (über dem Artikel) | flaechig (ganzes Bild,
   Wasserzeichen-Muster, mehrere Stellen) | keine. motiv = Farbe/Modell des Artikels in 2–5 Wörtern.
2. Für JEDES Variantenbild: die Nummer eines ANDEREN Bildes, das denselben Artikel in DERSELBEN Farbe/demselben Modell zeigt
   und KEINE Einblendung trägt (kein Sammelbild mit mehreren Farben, keine Detailaufnahme, keine Grössentabelle). Sonst 0.
Antworte NUR mit JSON:
{{"bilder":[{{"nr":1,"einblendung":true,"ort":"rand-oben","motiv":"..."}}],"varianten":[{{"nr":2,"ersatz":0,"grund":"max. 1 Satz"}}]}}"""

PROMPT_BOX = """[AUFGABE-BOX] Auf diesem Produktbild («{titel}») ist eine Werbe-Einblendung.
""" + EINBLENDUNG + """
Gib die Rechtecke ALLER Einblendungen und das Rechteck des ARTIKELS an, jeweils [ymin, xmin, ymax, xmax] in Promille
(0–1000) der Bildhöhe bzw. -breite. flaechig=true, wenn eine Einblendung über dem Artikel liegt oder das ganze Bild bedeckt.
Antworte NUR mit JSON: {{"einblendungen":[[ymin,xmin,ymax,xmax]],"artikel":[ymin,xmin,ymax,xmax],"flaechig":false}}"""

PROMPT_PRUEF = """[AUFGABE-PRUEF] Prüfe dieses Produktbild («{titel}», Variante «{variante}») für Google Merchant.
""" + EINBLENDUNG + """
Trägt das Bild noch eine solche Einblendung? Ist der Artikel vollständig (nicht angeschnitten) und unverzerrt zu sehen?
Antworte NUR mit JSON: {{"einblendung": true|false, "artikel_vollstaendig": true|false, "grund": "max. 1 Satz"}}"""

# text-weg füllt Flächen IM Bild: die Prüfung sieht Original und Kandidat und muss bestätigen, dass der ARTIKEL gleich blieb.
PROMPT_PRUEF_VERGLEICH = """[AUFGABE-PRUEF] Prüfe ein bearbeitetes Produktbild («{titel}», Variante «{variante}») für Google Merchant.
Du siehst 2 Bilder: Bild 1 = ORIGINAL mit Einblendung, Bild 2 = BEARBEITET (eingeblendeter Text übermalt). Werden sie als
Raster gezeigt, sind die Etiketten «Bild n» nur Nummern dieser Prüfung. Beurteile Bild 2:
""" + EINBLENDUNG + """
1. einblendung: trägt Bild 2 noch eine solche Einblendung?
2. artikel_vollstaendig: ist der Artikel auf Bild 2 vollständig (nicht angeschnitten) und unverzerrt?
3. artikel_unveraendert: ist der ARTIKEL auf Bild 2 genau wie auf Bild 1 — gleicher Aufdruck/Text AUF dem Artikel, gleiche
   Form, gleiche Farbe? false, wenn auf dem Artikel selbst etwas übermalt, verschwunden oder verändert ist.
Antworte NUR mit JSON: {{"einblendung": true|false, "artikel_vollstaendig": true|false, "artikel_unveraendert": true|false,
"grund": "max. 1 Satz"}}"""


class Leer(RuntimeError):
    """Ein Prüfer hat kein Kontingent mehr → Lauf sauber abbrechen, Rest bleibt offen."""


# ─────────────────────────────── reine Logik (Selbsttest ohne Netz) ───────────────────────────────

def kurz(gid):
    return (gid or "").rsplit("/", 1)[-1]


def _bool(x):
    if isinstance(x, bool):
        return x
    if isinstance(x, (int, float)):
        return bool(x)
    if isinstance(x, str):
        t = x.strip().lower()
        if t in ("true", "ja", "yes", "1", "wahr"):
            return True
        if t in ("false", "nein", "no", "0", "falsch"):
            return False
    return None


def norm_ort(x):
    """Freitext-Ort → ein Wert aus ORTE_RAND | mitte | flaechig | keine | ''. Wortweise, damit «oben» nicht in «obenauf»
    und «rechts» nicht in «Rechtschreibung» steckt (Regel 9b); deutsche Beugungen («linke obere Ecke») zählen mit."""
    t = str(x or "").strip().lower().replace("_", "-")
    if t in ORTE_RAND or t in ("mitte", "flaechig", "keine"):
        return t
    w = set(t.replace("-", " ").replace("/", " ").replace(",", " ").replace("(", " ").replace(")", " ").split())
    if w & {"keine", "none", "kein", "no"}:
        return "keine"
    if w & {"flaechig", "flächig", "ganzes", "ganze", "ganzen", "wasserzeichen", "mehrere", "overall", "whole", "tiled"}:
        return "flaechig"
    if w & {"über", "ueber", "auf", "over"}:                  # «über dem Artikel» schlägt jede Randangabe
        return "mitte"
    v = "oben" if w & {"oben", "obere", "oberen", "oberer", "top", "upper"} else \
        "unten" if w & {"unten", "untere", "unteren", "unterer", "bottom", "lower"} else ""
    s = "links" if w & {"links", "linke", "linken", "linker", "left"} else \
        "rechts" if w & {"rechts", "rechte", "rechten", "rechter", "right"} else ""
    if v and s:
        return f"ecke-{v}-{s}"
    if v or s:
        return f"rand-{v or s}"                             # «oben mitte» = Etikett mittig am oberen Rand
    if w & {"mitte", "zentrum", "center", "centre", "middle"}:
        return "mitte"
    return ""


def abdruck(im):
    return im.convert("RGB").resize((16, 16)).tobytes()


def gleich(a, b, tol=DOPPEL_TOL):
    return len(a) == len(b) and max(abs(x - y) for x, y in zip(a, b)) <= tol


def gruppen(abdruecke):
    """Abdrücke → Gruppen (Indexlisten) exakter Doppel, Reihenfolge = erstes Vorkommen."""
    out = []
    for i, f in enumerate(abdruecke):
        for g in out:
            if gleich(abdruecke[g[0]], f):
                g.append(i)
                break
        else:
            out.append([i])
    return out


def variantenbilder(varianten):
    """[{id,title,options,media}] → {media_id: [variante, …]} — nur Varianten mit eigenem Bild."""
    out = {}
    for v in varianten:
        if v.get("media"):
            out.setdefault(v["media"], []).append(v)
    return out


def _gemeinsam(vs):
    """[(Option, Wert)], die ALLE Varianten eines Bildes teilen (die Grössen eines Farbbildes teilen die Farbe)."""
    opts = [dict((o["name"], o["value"]) for o in (v.get("options") or [])) for v in vs]
    return [(k, w) for k, w in (opts[0] if opts else {}).items() if all(o.get(k) == w for o in opts)]


def gemeinsamer_text(titel):
    """Gemeinsamer Wortanteil mehrerer Variantentitel — nie der Titel der ersten Variante allein. Erst ganze Abschnitte
    (getrennt durch «/», «-», «,»), sonst einzelne Wörter ohne reine Zahlen, Reihenfolge des ersten Titels; '' wenn nichts
    gemeinsam ist. GEMESSEN 14.10. (Lesebrille): «100 degrees-Black Frame Red Rope» … «400 degrees-…» → «Black Frame Red Rope»."""
    titel = [str(t).strip() for t in titel or [] if str(t or "").strip() and str(t).strip() != "Default Title"]
    if not titel:
        return ""
    if len(set(titel)) == 1:
        return titel[0]
    for teile in (lambda t: [s.strip() for s in re.split(r"\s*[/,]\s*|\s*-\s*", t) if s.strip()],
                  lambda t: [w for w in re.findall(r"\w+", t) if not w.isdigit()]):
        rest = [set(teile(t)) for t in titel[1:]]
        gemein = [s for s in teile(titel[0]) if all(s in r for r in rest)]
        if gemein:
            return " ".join(dict.fromkeys(gemein))
    return ""


def beschreibung(vs):
    """Für Prompt und Liste: «Farbe: Schwarz (10 Var.)», sonst der gemeinsame Teil der Titel."""
    if not vs:
        return "-"
    t = ", ".join(f"{k}: {w}" for k, w in _gemeinsam(vs)) or gemeinsamer_text([v.get("title") for v in vs]) or "-"
    return f"{t} ({len(vs)} Var.)"


def farbwert(vs):
    """Für den Alt-Text des neuen Bildes (Kundinnen, Screenreader): nur die Werte, ohne Zählung — «Schwarz». Ohne gemeinsame
    Option der gemeinsame Teil der Titel, sonst '' (dann trägt der Alt-Text nur den Produkttitel)."""
    return " / ".join(w for _, w in _gemeinsam(vs)) or gemeinsamer_text([v.get("title") for v in vs or []])


def modell_wort(vs):
    """Erstes Modell-Wort in Titel, Optionswerten oder Optionsnamen der Varianten eines Bildes, sonst ''."""
    for v in vs or []:
        texte = [v.get("title") or ""] + [f'{o.get("name") or ""} {o.get("value") or ""}' for o in v.get("options") or []]
        for t in texte:
            m = MODELL_WOERTER.search(str(t))
            if m:
                return m.group(1)
    return ""


def bild_optionen(alle):
    """Optionsnamen, nach denen sich die Variantenbilder unterscheiden: innerhalb JEDES Bildes genau ein Wert, über die Bilder
    mindestens zwei Werte (typisch «Farbe»; «Grösse» wechselt innerhalb eines Bildes und fällt weg)."""
    je = {}
    for v in alle or []:
        if v.get("media"):
            je.setdefault(v["media"], []).append({o.get("name"): o.get("value") for o in v.get("options") or []})
    namen = {k for liste in je.values() for o in liste for k in o}
    out = []
    for k in sorted(n for n in namen if n):
        werte = []
        for liste in je.values():
            w = {o.get(k) for o in liste}
            if len(w) != 1 or None in w:
                break
            werte.append(w.pop())
        else:
            if len(set(werte)) >= 2:
                out.append(k)
    return out


def fremdes_variantenbild(vs_alt, gruppe, alle):
    """Feste Sperre für «tauschen»: ist der Ersatz (alle Media-IDs seiner Doppel-Gruppe) das Variantenbild einer ANDEREN
    Variante, muss diese denselben Wert jeder Bild-Option tragen wie die Varianten des alten Bildes. Lässt sich das nicht
    vergleichen (keine Bild-Option, z. B. «100 degrees-Red» mischt Grad und Farbe) → ebenfalls gesperrt. → Grund oder ''."""
    eigene = {v.get("id") for v in vs_alt or []}
    gruppe = set(gruppe or [])
    fremde = [w for w in alle or [] if w.get("media") in gruppe and w.get("id") not in eigene]
    if not fremde:
        return ""
    gem = dict(_gemeinsam(vs_alt or []))
    ko = [k for k in bild_optionen(alle) if k in gem]
    for w in fremde:
        wo = {o.get("name"): o.get("value") for o in w.get("options") or []}
        if not ko or any(k not in wo for k in ko):
            return f"Ersatz ist das Variantenbild von «{w.get('title')}» (Ausprägung nicht vergleichbar)"
        anders = [k for k in ko if wo[k] != gem[k]]
        if anders:
            k = anders[0]
            return f"Ersatz ist das Variantenbild von «{w.get('title')}» ({k}: {wo[k]} ≠ {gem[k]})"
    return ""


def seiten_von(ort):
    """«ecke-oben-links» → {oben, links}; «rand-unten» → {unten}; sonst leer."""
    t = str(ort or "")
    return {s for s in ("oben", "unten", "links", "rechts") if t in ORTE_RAND and s in t.split("-")}


def aenderung_im_rand(orig, kand, orte, band=BAND):
    """text-weg: JEDES geänderte Pixel (exakter Vergleich, kein JPEG dazwischen) muss in einem Randband der Tiefe «band» ‰
    an einer Seite liegen, die ALLE Prüfer nennen (ecke-oben-links = oberes ODER linkes Band). → (ok, grund)."""
    from PIL import ImageChops, ImageDraw
    if orig.size != kand.size:
        return False, f"Grösse geändert {orig.size} → {kand.size}"
    gemeinsam = set.intersection(*[seiten_von(o) for o in orte]) if orte else set()
    if not gemeinsam:
        return False, f"Prüfer nennen keine gemeinsame Seite ({', '.join(str(o) for o in orte)})"
    r, g, b = ImageChops.difference(orig.convert("RGB"), kand.convert("RGB")).split()
    diff = ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda x: 255 if x else 0)
    if not diff.getbbox():
        return False, "nichts geändert"
    w, h = orig.size
    dy, dx = round(h * band / 1000), round(w * band / 1000)
    verboten = Image.new("L", (w, h), 255)
    d = ImageDraw.Draw(verboten)
    for s in gemeinsam:
        d.rectangle({"oben": (0, 0, w, dy - 1), "unten": (0, h - dy, w, h), "links": (0, 0, dx - 1, h),
                     "rechts": (w - dx, 0, w, h)}[s], fill=0)
    bb = ImageChops.multiply(diff, verboten).getbbox()
    if bb:
        rel = [round(v * 1000 / s) for v, s in zip(bb, (w, h, w, h))]
        return False, f"text-weg ändert ausserhalb des Randbands {'/'.join(sorted(gemeinsam))} (‰ x0,y0,x1,y1 {rel})"
    return True, ""


def je_bild(antwort):
    out = {}
    for b in (antwort or {}).get("bilder") or []:
        try:
            nr = int(b.get("nr"))
        except (TypeError, ValueError, AttributeError):
            continue
        out[nr] = {"einblendung": _bool(b.get("einblendung")), "ort": norm_ort(b.get("ort")), "motiv": str(b.get("motiv") or "")[:60]}
    return out


def je_variante(antwort):
    out = {}
    for b in (antwort or {}).get("varianten") or []:
        try:
            out[int(b.get("nr"))] = int(b.get("ersatz") or 0)
        except (TypeError, ValueError, AttributeError):
            continue
    return out


def gemini_sperrt(x):
    """google_bild_tausch.gemini() antwortet bei promptFeedback.blockReason mit seinem eigenen Format."""
    return isinstance(x, dict) and str(x.get("grund", "")).startswith("Gemini sperrt")


def plan_variantenbild(nr, g_b, c_b, g_v, c_v, k_max):
    """Entscheid für EIN Variantenbild (Bildnummer nr). → (plan, ersatz_nr, grund);
    plan ∈ sauber | uneinig | tauschen | zuschnitt-pruefen."""
    a, b = g_b.get(nr), c_b.get(nr)
    if not a or not b or a["einblendung"] is None or b["einblendung"] is None:
        return "uneinig", 0, "Urteil fehlt"
    if not a["einblendung"] and not b["einblendung"]:
        return "sauber", 0, "beide: keine Einblendung"
    if a["einblendung"] != b["einblendung"]:
        return "uneinig", 0, "nur ein Prüfer sieht eine Einblendung"
    eg, ec = g_v.get(nr, 0), c_v.get(nr, 0)
    if eg and eg == ec and eg != nr and 1 <= eg <= k_max:
        ka, kb = g_b.get(eg), c_b.get(eg)
        if ka and kb and ka["einblendung"] is False and kb["einblendung"] is False:
            return "tauschen", eg, f"beide: Bild {eg} gleiche Farbe ohne Einblendung"
        return "zuschnitt-pruefen", 0, f"Ersatz {eg} trägt laut Bild-Urteil selbst eine Einblendung"
    if eg == nr or ec == nr:
        return "zuschnitt-pruefen", 0, "Ersatz = dasselbe Bild"
    return "zuschnitt-pruefen", 0, ("kein Ersatzbild" if not eg and not ec else f"Ersatz uneinig (G{eg}/C{ec})")


def rand_badge(a, b):
    """Beide Prüfer verorten die Einblendung an Ecke/Rand (nicht Mitte, nicht flächig)."""
    return bool(a and b and a.get("ort") in ORTE_RAND and b.get("ort") in ORTE_RAND)


def _box(b):
    """[ymin, xmin, ymax, xmax] in Promille (0–1 wird hochgerechnet) → Tupel oder None."""
    try:
        y0, x0, y1, x1 = (float(v) for v in b)
    except (TypeError, ValueError):
        return None
    if max(y0, x0, y1, x1) <= 1.0:
        y0, x0, y1, x1 = y0 * 1000, x0 * 1000, y1 * 1000, x1 * 1000
    if not (0 <= y0 < y1 <= 1000 and 0 <= x0 < x1 <= 1000):
        return None
    return y0, x0, y1, x1


def zuschnitt_box(w, h, einblendungen, artikel, rand=RAND, min_rest=MIN_REST, min_seite=MIN_SEITE, rand_banner=RAND_BANNER):
    """EIN Randstreifen, der ALLE Einblendungs-Boxen enthält und KEINE Artikel-Box berührt. Sicherheitsrand «rand»; für
    einen Schnitt oben/unten «rand_banner», sobald eine Box breiter als BANNER_AB ist (links/rechts: höher als BANNER_AB).
    → ((x0, y0, x1, y1) in Pixeln, seite, rest) oder (None, grund, rest)."""
    E = [x for x in (_box(b) for b in einblendungen or []) if x]
    A = [x for x in (_box(b) for b in artikel or []) if x]
    if not E:
        return None, "keine gültige Einblendungs-Box", 0.0
    if not A:
        return None, "keine gültige Artikel-Box", 0.0
    ey0, ex0, ey1, ex1 = min(b[0] for b in E), min(b[1] for b in E), max(b[2] for b in E), max(b[3] for b in E)
    ay0, ax0, ay1, ax1 = min(b[0] for b in A), min(b[1] for b in A), max(b[2] for b in A), max(b[3] for b in A)
    r_quer = max(rand, rand_banner) if any(b[3] - b[1] > BANNER_AB for b in E) else rand      # Schnitt oben/unten
    r_laengs = max(rand, rand_banner) if any(b[2] - b[0] > BANNER_AB for b in E) else rand    # Schnitt links/rechts
    kand = []
    s = ey1 + r_quer
    if s <= ay0:
        kand.append(("oben", (0, s, 1000, 1000)))
    s = ey0 - r_quer
    if s >= ay1:
        kand.append(("unten", (0, 0, 1000, s)))
    s = ex1 + r_laengs
    if s <= ax0:
        kand.append(("links", (s, 0, 1000, 1000)))
    s = ex0 - r_laengs
    if s >= ax1:
        kand.append(("rechts", (0, 0, s, 1000)))
    if not kand:
        return None, "kein Randstreifen ohne Artikel", 0.0
    seite, (x0, y0, x1, y1) = max(kand, key=lambda k: (k[1][2] - k[1][0]) * (k[1][3] - k[1][1]))
    rest = (x1 - x0) * (y1 - y0) / 1e6
    if rest < min_rest:
        return None, f"Streifen {seite} nähme {1 - rest:.0%} weg", rest
    px = (round(x0 * w / 1000), round(y0 * h / 1000), round(x1 * w / 1000), round(y1 * h / 1000))
    if min(px[2] - px[0], px[3] - px[1]) < min_seite:
        return None, f"danach zu klein ({px[2] - px[0]}×{px[3] - px[1]})", rest
    return px, seite, rest


def auffuellen(im, w0, h0):
    """Zuschnitt zurück aufs alte Seitenverhältnis — nur wenn der Bildrand gleichmässig ist (Studiohintergrund). Sonst bleibt
    das Bild schmaler: lieber ehrlich zugeschnitten als ein sichtbarer Farbbalken."""
    w, h = im.size
    if abs(w / h - w0 / h0) < 0.01:
        return im
    px = im.load()
    rand = [px[x, 0] for x in range(0, w, max(1, w // 80))] + [px[x, h - 1] for x in range(0, w, max(1, w // 80))]
    rand += [px[0, y] for y in range(0, h, max(1, h // 80))] + [px[w - 1, y] for y in range(0, h, max(1, h // 80))]
    if max(statistics.pstdev([p[c] for p in rand]) for c in range(3)) > STREUUNG:
        return im
    farbe = tuple(int(statistics.median([p[c] for p in rand])) for c in range(3))
    if w / h < w0 / h0:
        neu = Image.new("RGB", (round(h * w0 / h0), h), farbe)
    else:
        neu = Image.new("RGB", (w, round(w * h0 / w0)), farbe)
    neu.paste(im, ((neu.width - w) // 2, (neu.height - h) // 2))
    return neu


def pruef_einig(g, c, unveraendert=False):
    """Kandidat (Zuschnitt/Text weg) zählt nur, wenn BEIDE sagen: keine Einblendung UND Artikel vollständig — bei text-weg
    (unveraendert=True) zusätzlich «Artikel unverändert» gegenüber dem Original; ein fehlendes Feld zählt als nein."""
    def ok(x):
        return isinstance(x, dict) and not gemini_sperrt(x) and _bool(x.get("einblendung")) is False \
            and _bool(x.get("artikel_vollstaendig")) is True and (not unveraendert or _bool(x.get("artikel_unveraendert")) is True)
    return ok(g) and ok(c)


def ledger_lesen(pfad=None):
    pfad = pfad or LEDGER
    if not os.path.exists(pfad):
        return []
    out = []
    for l in open(pfad, encoding="utf-8"):
        f = l.rstrip("\n").split("\t")
        if len(f) >= 6 and f[0] != "datum":
            out.append(dict(zip(SPALTEN, f + [""] * (len(SPALTEN) - len(f)))))
    return out


def _letzte(zeilen):
    letzte = {}
    for z in zeilen:
        letzte[(z["handle"], z["alte_media"])] = z
    return letzte


GEPRUEFT = "freigabe-geprueft:"   # methode einer «tausch-wartet»-Zeile: diese Freigabe(n) lagen beim Urteil schon vor


def erledigt_aus(zeilen, freigabe=()):
    """(handle, media) beider Seiten der LETZTEN Zeile je (handle, alte_media), sofern quittiert. Ein getauschtes
    Ersatzbild gilt mit als erledigt, sonst beurteilt der nächste Lauf sein eigenes Werk neu. «tausch-wartet» gilt als
    quittiert, bis für DIESES alte Bild eine Freigabe vorliegt, die beim letzten Urteil noch nicht vorlag (dann einmal neu
    beurteilen; tauschen nur, wenn das Urteil genau das freigegebene Paar trifft)."""
    out = set()
    for (h, alt), z in _letzte(zeilen).items():
        if z["art"] == WARTET:
            m = z.get("methode") or ""
            versucht = set(m[len(GEPRUEFT):].split("+")) if m.startswith(GEPRUEFT) else set()
            if not (freigaben_fuer(freigabe, h, alt) - versucht):
                out.add((h, alt))
        elif z["art"] in QUITTIERT:
            out.add((h, alt))
            if z["art"] in GEAENDERT and z["neue_media"]:
                out.add((h, z["neue_media"]))
    return out


def teil_offen_aus(zeilen):
    """Handles, deren letzte Zeile zu einem Bild ein Teilzustand ist («begonnen-…» ohne Abschluss, «fehler-teil-…»):
    kein neuer Lauf fasst sie an, bis --zurueck gelaufen ist."""
    return {h for (h, _), z in _letzte(zeilen).items() if z["art"] in OFFEN_TEIL}


def aenderungen_offen(zeilen, handle):
    """Letzte Zeile je alte_media dieses Handles, wenn sie eine Änderung (tauschen/zuschneiden) oder ein Teilzustand
    («begonnen-…», «fehler-teil-…») ist — Rückweg-Kandidaten."""
    return [z for (h, _), z in _letzte(zeilen).items() if h == handle and (z["art"] in GEAENDERT or z["art"] in OFFEN_TEIL)]


def plane_produkt(titel, bilder, nr_von, offen, urteil, voll_laden, text_weg, ersatz_sperre=None):
    """Kern ohne Shopify: bilder = JPEG-Bytes (nummeriert ab 1), nr_von = {media_id: nr}, offen = {media_id: [variante]}.
    urteil(text, bilder, beide=True) → (g, c); voll_laden(media_id) → PIL-Bild; text_weg(PIL) → (status, info, neu|None);
    ersatz_sperre(media_id, ersatz_nr) → Grund oder '' (feste Sperre gegen das Variantenbild einer anderen Ausprägung).
    → Liste von dicts {media, nr, plan, ersatz_nr, kandidat, methode, befund, grund, variante}. Wirft Leer."""
    vlist = "\n".join(f"Bild {nr_von[m]} → {beschreibung(vs)}" for m, vs in offen.items())
    g, c = urteil(PROMPT_PRODUKT.format(titel=titel, k=len(bilder), varianten=vlist), bilder)
    out = []
    if gemini_sperrt(g) or gemini_sperrt(c):
        for m, vs in offen.items():
            out.append({"media": m, "nr": nr_von[m], "plan": "lassen", "ersatz_nr": 0, "kandidat": None, "methode": "",
                        "befund": "Gemini sperrt die Bilder", "grund": "Vision gesperrt", "variante": beschreibung(vs)})
        return out
    g_b, c_b, g_v, c_v = je_bild(g), je_bild(c), je_variante(g), je_variante(c)
    for m, vs in offen.items():
        nr = nr_von[m]
        a, b = g_b.get(nr) or {}, c_b.get(nr) or {}
        befund = (f"G: {'ja' if a.get('einblendung') else 'nein' if a.get('einblendung') is False else '?'} {a.get('ort', '')}"
                  f" «{a.get('motiv', '')}» | C: {'ja' if b.get('einblendung') else 'nein' if b.get('einblendung') is False else '?'}"
                  f" {b.get('ort', '')} «{b.get('motiv', '')}»")
        plan, k, grund = plan_variantenbild(nr, g_b, c_b, g_v, c_v, len(bilder))
        wort = modell_wort(vs) if plan == "tauschen" else ""
        if wort:            # Farbe gleich heisst nicht Modell gleich (Trinkflasche Luxury ↔ Flagship) — nur das eigene Foto
            plan, k, grund = "zuschnitt-pruefen", 0, f"{grund}, aber Variante trägt Modell-Wort «{wort}» → kein Tausch"
        sperre = ersatz_sperre(m, k) if plan == "tauschen" and ersatz_sperre else ""
        if sperre:          # Bordeaux-Foto an Rot: das Ersatzbild gehört sichtbar zu einer anderen Ausprägung
            plan, k, grund = "zuschnitt-pruefen", 0, f"{grund}, aber {sperre} → kein Tausch"
        z = {"media": m, "nr": nr, "plan": plan, "ersatz_nr": k, "kandidat": None, "methode": "", "befund": befund,
             "grund": grund, "variante": beschreibung(vs)}
        if plan == "zuschnitt-pruefen":
            if not rand_badge(a, b):
                z.update(plan="lassen", grund=f"{grund}; Einblendung nicht an Ecke/Rand (G {a.get('ort') or '?'}, C {b.get('ort') or '?'})")
            else:
                z.update(_zuschnitt(titel, m, vs, voll_laden, urteil, text_weg, grund, (a.get("ort"), b.get("ort"))))
        out.append(z)
    return out


def _zuschnitt(titel, m, vs, voll_laden, urteil, text_weg, grund, orte=()):
    """Kandidat bauen (Text weg, sonst Randstreifen) und von BEIDEN prüfen lassen. → Felder für plane_produkt.
    text-weg zählt nur, wenn jede Änderung im Randband einer Seite liegt, die beide Prüfer nennen (sonst Randstreifen-Weg);
    seine Prüfung sieht Original UND Kandidat und verlangt zusätzlich «Artikel unverändert»."""
    im = voll_laden(m)
    w0, h0 = im.size
    st, info, neu = text_weg(im)
    tw_ok, tw_grund = aenderung_im_rand(im, neu, orte) if st == "bereinigt" and neu is not None else (False, "")
    if tw_ok:
        kand, methode = neu, "text-weg"
    else:
        if tw_grund:
            grund = f"{grund}; {tw_grund}"
        g, _ = urteil(PROMPT_BOX.format(titel=titel), [_jpg(im, 1000)], beide=False)
        if gemini_sperrt(g) or _bool((g or {}).get("flaechig")):
            return {"plan": "lassen", "grund": f"{grund}; Box: flächig/über dem Artikel"}
        art = (g or {}).get("artikel")
        if not isinstance(art, list):
            art = []
        elif art and not isinstance(art[0], (list, tuple)):
            art = [art]                              # eine einzelne Box statt einer Liste von Boxen
        box, seite, rest = zuschnitt_box(w0, h0, (g or {}).get("einblendungen") or [], art)
        if not box:
            return {"plan": "lassen", "grund": f"{grund}; {seite}"}
        kand, methode = auffuellen(im.crop(box), w0, h0), f"rand-ab-{seite} {rest:.0%}"
    if methode == "text-weg":
        gp, cp = urteil(PROMPT_PRUEF_VERGLEICH.format(titel=titel, variante=beschreibung(vs)), [_jpg(im, 768), _jpg(kand, 768)])
    else:
        gp, cp = urteil(PROMPT_PRUEF.format(titel=titel, variante=beschreibung(vs)), [_jpg(kand, 768)])
    if not pruef_einig(gp, cp, unveraendert=methode == "text-weg"):
        return {"plan": "lassen", "methode": methode, "kandidat": kand,
                "grund": f"{grund}; {methode} nicht bestanden (G: {str((gp or {}).get('grund'))[:60]} | C: {str((cp or {}).get('grund'))[:60]})"}
    return {"plan": "zuschneiden", "methode": methode, "kandidat": kand, "grund": f"{grund}; {methode} von beiden geprüft"}


def _jpg(im, seite=512, q=82):
    im = im.convert("RGB").copy()
    im.thumbnail((seite, seite))
    b = io.BytesIO()
    im.save(b, "JPEG", quality=q)
    return b.getvalue()


# ─────────────────────────────── Shopify / Netz ───────────────────────────────

def gql(q, v=None):
    import google_feedback_wache as gfw        # Eimer-Etikette (nachlauf) + Drossel-Geduld
    return gfw.gql(q, v)


Q_PROD = ('query($h:String!){p:productByIdentifier(identifier:{handle:$h}){id handle title status '
          'publishedOnPublication(publicationId:"%s") media(first:100){nodes{id ... on MediaImage{image{url width height}}}}}}' % GOOGLE)
Q_VAR = ('query($id:ID!,$c:String){product(id:$id){variants(first:100,after:$c){pageInfo{hasNextPage endCursor} '
         'nodes{id title selectedOptions{name value} media(first:1){nodes{id}}}}}}')
Q_VMEDIA = 'query($ids:[ID!]!){nodes(ids:$ids){... on ProductVariant{id media(first:1){nodes{id}}}}}'
M_DET = ('mutation($p:ID!,$vm:[ProductVariantDetachMediaInput!]!){productVariantDetachMedia(productId:$p,variantMedia:$vm)'
         '{userErrors{code field message}}}')
M_APP = ('mutation($p:ID!,$vm:[ProductVariantAppendMediaInput!]!){productVariantAppendMedia(productId:$p,variantMedia:$vm)'
         '{userErrors{code field message}}}')


def varianten_lesen(pid):
    out, c = [], None
    while True:
        d = gql(Q_VAR, {"id": pid, "c": c})["data"]["product"]["variants"]
        for v in d["nodes"]:
            out.append({"id": v["id"], "title": v["title"], "options": v.get("selectedOptions") or [],
                        "media": ((v["media"]["nodes"] or [{}])[0]).get("id")})
        if not d["pageInfo"]["hasNextPage"]:
            return out
        c = d["pageInfo"]["endCursor"]


def variant_media(ids):
    out = {}
    ids = list(ids)
    for i in range(0, len(ids), 100):
        for n in gql(Q_VMEDIA, {"ids": ids[i:i + 100]})["data"]["nodes"] or []:
            if n:
                knoten = (n.get("media") or {}).get("nodes") or []
                out[n["id"]] = knoten[0]["id"] if knoten else None
    return out


def laden(url, breite=None):
    u = url + (("&" if "?" in url else "?") + f"width={breite}" if breite else "")
    r = subprocess.run(["curl", "-sL", "--max-time", "60", u], capture_output=True)
    return Image.open(io.BytesIO(r.stdout)).convert("RGB")


def _fehler(d, feld):
    return ((d.get("data") or {}).get(feld) or {}).get("userErrors") or ((d.get("data") or {}).get(feld) is None and d.get("errors"))


def _quittiert(d, feld):
    """True nur, wenn Shopify die Mutation OHNE userErrors und ohne GraphQL-Fehler beantwortet hat."""
    return isinstance(d, dict) and isinstance((d.get("data") or {}).get(feld), dict) and not _fehler(d, feld) \
        and not d.get("errors")


class _Gescheitert(RuntimeError):
    pass


def _teile(vids, n=50):
    return [vids[i:i + n] for i in range(0, len(vids), n)]


def _warten_auf(vids, ziel, runden=10):
    """Zurücklesen, bis ALLE Varianten «ziel» zeigen. → (bestaetigt, ist). Shopify liest nach einer Mutation teils hinterher."""
    ist = {}
    for _ in range(runden):
        time.sleep(2)
        ist = variant_media(vids)
        if all(ist.get(v) == ziel for v in vids):
            return True, ist
    return False, ist


def _ruhig_gelesen(vids, ziel, ruhe):
    """Lesung, der man glauben darf: «ruhe» Sekunden nach der letzten Mutation, dann noch einmal «ruhe» später — BEIDE
    zeigen bei ALLEN Varianten «ziel». Nur für --zurueck (eigener, späterer Prozess)."""
    for _ in range(2):
        time.sleep(ruhe)
        ist = variant_media(vids)
        if not all(ist.get(v) == ziel for v in vids):
            return False
    return True


def _senden(mut, feld, pid, vids, media):
    """«media» an alle «vids» lösen/anhängen: erst in Teilen; scheitert ein Teil (userError, Ausnahme), je Variante.
    → Menge der Varianten, für die Shopify die Mutation OHNE userError quittiert hat. Eine Ausnahme heisst «unbekannt»
    (Antwort verloren, Mutation womöglich doch ausgeführt) und zählt nie als Quittung."""
    ok = set()
    for t in _teile(list(vids)):
        try:
            if _quittiert(gql(mut, {"p": pid, "vm": [{"variantId": v, "mediaIds": [media]} for v in t]}), feld):
                ok.update(t)
                continue
        except Exception:
            pass
        if len(t) > 1:
            for v in t:
                try:
                    if _quittiert(gql(mut, {"p": pid, "vm": [{"variantId": v, "mediaIds": [media]}]}), feld):
                        ok.add(v)
                except Exception:
                    pass
    return ok


def _zurueckbauen(pid, vids, alt, neu, verloren=None, ruhe=0):
    """Zustandsunabhängig zurück auf «alt»: «neu» von den Varianten lösen, dann «alt» anhängen (Teile, sonst je Variante;
    erwartbare Einzelfehler im gemischten Zustand werden übergangen). verloren = Varianten, die «alt» verloren haben KÖNNTEN
    (im Lauf: alle, deren Lösen-Aufruf gesendet wurde; None = alle).
    Bestätigt ist der Rückbau nur
      (a) mit QUITTUNG: jede Variante aus «verloren» hat das Wieder-Anhängen von «alt» ohne userError bestätigt bekommen, UND
          das Zurücklesen zeigt «alt» — eine Lesung allein beweist nichts, das Rückbau-Ziel ist der Startzustand, den auch eine
          hinkende Lesung zeigt (GEMESSEN 14.10., Prüfer-Gegenprobe: hinkt 12 + MEDIA_CANNOT_BE_MODIFIED → falsch «alt»);
      (b) nur mit ruhe > 0 (--zurueck): zweimal «alt» gelesen, die erste Lesung «ruhe» s nach der letzten Mutation.
    → (bestaetigt, wie)."""
    vids = list(vids)
    verloren = set(vids) if verloren is None else set(verloren) & set(vids)
    if neu:
        _senden(M_DET, "productVariantDetachMedia", pid, vids, neu)
    quittiert = _senden(M_APP, "productVariantAppendMedia", pid, vids, alt) if alt else set()
    offen = verloren - quittiert
    if not offen and _warten_auf(vids, alt)[0]:
        return True, "Wieder-Anhängen quittiert und zurückgelesen"
    if ruhe > 0 and _ruhig_gelesen(vids, alt, ruhe):
        return True, f"zweimal «alt» gelesen ({ruhe} s Ruhe)"
    return False, (f"{len(offen)} von {len(vids)} Var. ohne Quittung fürs Wieder-Anhängen" if offen
                   else "quittiert, aber Zurücklesen zeigt nicht «alt»")


def umhaengen(pid, vids, alt, neu):
    """Varianten von «alt» lösen, an «neu» hängen, zurücklesen. Scheitert eine Mutation, bricht der Lauf ab (Netz, Drossel,
    unerwartete Antwort) oder bestätigt das Zurücklesen «neu» nicht, baut die Funktion selbst zurück (neu lösen, alt
    anhängen). → (grund, stand): stand «neu» = alles am neuen Bild (grund ''), «alt» = Rückbau QUITTIERT und zurückgelesen
    (_zurueckbauen a), «teil» = nicht nachgewiesen (Teilzustand möglich → Ledger «fehler-teil-…», --zurueck)."""
    vids = list(vids)
    if not vids or not alt or not neu or alt == neu:
        return f"ungültiger Auftrag (alt {kurz(alt)}, neu {kurz(neu)}, {len(vids)} Var.) — nichts geändert", "alt"
    verloren = set()
    try:
        for t in _teile(vids):
            verloren.update(t)          # VOR dem Senden: eine verlorene Antwort heisst «womöglich gelöst»
            e = _fehler(gql(M_DET, {"p": pid, "vm": [{"variantId": v, "mediaIds": [alt]} for v in t]}), "productVariantDetachMedia")
            if e:
                raise _Gescheitert(f"Lösen gescheitert: {str(e)[:160]}")
        for t in _teile(vids):
            e = _fehler(gql(M_APP, {"p": pid, "vm": [{"variantId": v, "mediaIds": [neu]} for v in t]}), "productVariantAppendMedia")
            if e:
                raise _Gescheitert(f"Anhängen gescheitert: {str(e)[:160]}")
        ok, ist = _warten_auf(vids, neu)
        if ok:
            return "", "neu"
        grund = f"Rücklesen: {sum(1 for v in vids if ist.get(v) != neu)} von {len(vids)} Varianten zeigen nicht das neue Bild"
    except _Gescheitert as e:
        grund = str(e)
    except Exception as e:
        grund = f"Abbruch beim Umhängen: {type(e).__name__}: {str(e)[:160]}"
    try:
        ok, wie = _zurueckbauen(pid, vids, alt, neu, verloren=verloren)
        if ok:
            return f"{grund} · zurückgebaut ({wie})", "alt"
        return f"{grund} · Rückbau nicht nachgewiesen ({wie})", "teil"
    except Exception as e:
        return f"{grund} · Rückbau abgebrochen: {type(e).__name__}: {str(e)[:120]}", "teil"


def _geloescht(d, mid):
    return mid in ((((d or {}).get("data") or {}).get("productDeleteMedia") or {}).get("deletedMediaIds") or [])


def medium_entfernen(pid, neu):
    """Im Lauf: eigenes Zuschnitt-Medium löschen — nur nach QUITTIERTEM Rückbau aufrufen. → True NUR, wenn Shopify die
    Löschung mit deletedMediaIds bestätigt; alles andere (Ausnahme, null, «does not exist») bleibt für --zurueck offen."""
    if not neu:
        return False
    try:
        return _geloescht(gql(M_DEL, {"p": pid, "m": [neu]}), neu)
    except Exception:
        return False


Q_MEDIEN = 'query($id:ID!){product(id:$id){media(first:250){pageInfo{hasNextPage} nodes{id}}}}'


def medium_da(pid, mid):
    """→ True (in den Produkt-Medien), False (fehlt, Liste vollständig gelesen) oder None (unbekannt)."""
    try:
        p = (gql(Q_MEDIEN, {"id": pid}).get("data") or {}).get("product")
    except Exception:
        return None
    if not p:
        return None
    if mid in [n.get("id") for n in (p.get("media") or {}).get("nodes") or []]:
        return True
    return None if ((p.get("media") or {}).get("pageInfo") or {}).get("hasNextPage") else False


def medium_weg(pid, mid, ruhe):
    """--zurueck: eigenes Medium entfernen MIT Nachweis. → (weg, wie). Weg ist es, wenn Shopify die Löschung quittiert —
    oder wenn es danach zweimal im Abstand «ruhe» in den Produkt-Medien fehlt (eine frühere Löschung, deren Antwort verloren
    ging; Abbruch zwischen Löschen und Ledger-Zeile; Shopify antwortet dann «deletedMediaIds: null, … does not exist»)."""
    try:
        d = gql(M_DEL, {"p": pid, "m": [mid]})
        if _geloescht(d, mid):
            return True, "gelöscht (quittiert)"
        fehl = str((((d or {}).get("data") or {}).get("productDeleteMedia") or {}).get("mediaUserErrors") or d.get("errors") or "")
    except Exception as e:
        fehl = f"{type(e).__name__}: {str(e)[:80]}"
    for _ in range(2):
        time.sleep(ruhe)
        if medium_da(pid, mid) is not False:
            return False, f"nicht entfernt ({fehl[:100]})"
    return True, f"fehlt in den Produkt-Medien (zweimal gelesen; Löschantwort: {fehl[:80] or '-'})"


def hochladen(daten, name):
    """stagedUploadsCreate → POST → resourceUrl (derselbe Weg wie bild_quadrat_auffuellen.hochladen, mit Statusprüfung)."""
    d = gql('mutation($i:[StagedUploadInput!]!){stagedUploadsCreate(input:$i){stagedTargets{url resourceUrl '
            'parameters{name value}} userErrors{message}}}',
            {"i": [{"filename": name, "mimeType": "image/jpeg", "httpMethod": "POST", "resource": "IMAGE"}]})
    t = (((d.get("data") or {}).get("stagedUploadsCreate") or {}).get("stagedTargets") or [None])[0]
    if not t:
        return None
    with tempfile.TemporaryDirectory() as tmp:
        f = os.path.join(tmp, name)
        open(f, "wb").write(daten)
        cmd = ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "120", "-X", "POST", t["url"]]
        for p in t["parameters"]:
            cmd += ["-F", f'{p["name"]}={p["value"]}']
        code = subprocess.run(cmd + ["-F", "file=@" + f], capture_output=True, text=True).stdout.strip()
    return t["resourceUrl"] if code in ("200", "201", "204") else None


def medium_anlegen(pid, kand, h, alt_text, gemerkt=None):
    """Kandidat als NEUES Medium (Original bleibt). gemerkt(media_id) läuft, sobald die ID bekannt ist — vor jeder weiteren
    Abfrage (Ledger «begonnen-zuschneiden»). → (media_id, '', None) oder (None, Grund, übrig) — übrig = ID eines Mediums,
    dessen Löschung Shopify nicht bestätigt hat (sonst None)."""
    b = io.BytesIO()
    kand.convert("RGB").save(b, "JPEG", quality=92)
    src = hochladen(b.getvalue(), f"{h[:40]}-variante-ohne-einblendung.jpg")
    if not src:
        return None, "Upload fehlgeschlagen", None
    d = gql('mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id} mediaUserErrors{message}}}',
            {"id": pid, "m": [{"originalSource": src, "mediaContentType": "IMAGE", "alt": alt_text[:250]}]})
    cr = (d.get("data") or {}).get("productCreateMedia") or {}
    mid = ((cr.get("media") or [{}])[0] or {}).get("id")
    if mid and gemerkt:
        gemerkt(mid)

    def weg(grund):
        # nur eine quittierte Löschung zählt; sonst bleibt die ID als «übrig» im Ledger (fehler-teil-zuschneiden → --zurueck)
        return (None, f"{grund} — wieder entfernt", None) if medium_entfernen(pid, mid) else \
            (None, f"{grund} — Entfernen nicht bestätigt", mid)
    if cr.get("mediaUserErrors") or not mid:
        return weg(f"Medium nicht angelegt {cr.get('mediaUserErrors')}") if mid else \
            (None, f"Medium nicht angelegt {cr.get('mediaUserErrors')}", None)
    status = "PROCESSING"
    for _ in range(20):
        time.sleep(3)
        status = ((gql('query($id:ID!){node(id:$id){... on MediaImage{status}}}', {"id": mid}).get("data") or {}).get("node") or {}).get("status") or status
        if status in ("READY", "FAILED"):
            break
    if status != "READY":
        return weg(f"Medium {status}")
    return mid, "", None


def urteil_netz(text, bilder, beide=True):
    """→ (Gemini, Zweitprüfer|None). Wirft Leer bei leerem Kontingent (Typ, nie Wortlaut: zweitmodell.ist_kontingent_leer)."""
    import google_bild_tausch as gbt
    import zweitmodell as zm
    try:
        g = gbt.gemini(bilder, text)
    except gbt.GeminiLeer as e:
        raise Leer(f"Gemini leer: {e}")
    if not beide:
        return g, None
    c = None
    for versuch in range(2):
        try:
            c = zm.chat_json(text if not versuch else text + "\nAntworte ausschliesslich mit dem JSON-Objekt, ohne Erklärung.", bilder)
            break
        except Exception as e:
            if zm.ist_kontingent_leer(e):
                raise Leer(f"Zweitprüfer leer: {str(e)[:200]}")
            # 14.10.2026 GEMESSEN: Groq-qwen antwortet bei einem Raster aus 15 Bildern mit HTTP 400 «json_validate_failed»
            # (es hielt die Etiketten «Bild n» für Einblendungen und lehnte die Aufgabe ab). Einmal nachfassen, dann Fehler.
            if versuch:
                raise
    return g, c


def ledger_schreiben(**f):
    neu = not os.path.exists(LEDGER)
    with open(LEDGER, "a", encoding="utf-8") as fh:
        if neu:
            fh.write("\t".join(SPALTEN) + "\n")
        fh.write("\t".join(str(f.get(k, "")).replace("\t", " ").replace("\n", " ") for k in SPALTEN) + "\n")


def main():
    import werbetest_sperre as wts
    import bild_text_weg as btw
    stand = json.load(open(STAND))
    handles = stand["handles"].get(KLASSE) or []
    zeilen = ledger_lesen()
    # Auch der Trockenlauf überspringt Quittiertes (zeigt, was SCHARF täte); ALLE=1 beurteilt alles neu.
    erledigt = set() if os.environ.get("ALLE") == "1" else erledigt_aus(zeilen, TAUSCH_FREIGABE)
    teil = teil_offen_aus(zeilen)            # auch mit ALLE=1: ein Teilzustand braucht zuerst --zurueck
    print(f"START {time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}: {KLASSE} · {len(handles)} gemeldet (Stand {stand['stand']}) · "
          f"N={N} · {'SCHARF' if SCHARF else 'TROCKEN → ' + TROCKEN_TSV} · Tausch-Freigabe {len(TAUSCH_FREIGABE)} Paar(e)"
          + (f" · ⚠️ Teilzustand offen: {', '.join(sorted(teil))} (erst --zurueck)" if teil else ""), flush=True)
    if TAUSCH_FREIGABE_FALSCH:
        print(f"⚠️ TAUSCH_FREIGABE ohne Wirkung (Form handle:alte_media:ersatz_media): {', '.join(TAUSCH_FREIGABE_FALSCH)[:300]}",
              flush=True)
    z = {"prod": {}, "bild": {}, "zeilen": []}
    if TROCKEN_BILDER and not SCHARF:
        os.makedirs(TROCKEN_BILDER, exist_ok=True)
    abbruch = ""
    for h in handles[:N]:
        try:
            ein_produkt(h, erledigt, z, wts, btw, abbruch, teil=teil)
        except Leer as e:
            # Kein weiterer Vision-Aufruf. Die übrigen Produkte werden trotzdem gelesen und gelistet (Variantenbilder als
            # «offen-kontingent», nichts quittiert) — damit Trockenliste und Zählung vollständig bleiben.
            abbruch = str(e)
            print(f"ABBRUCH der Vision bei {h}: {abbruch[:200]} — Rest nur gelistet, bleibt offen", flush=True)
            try:
                ein_produkt(h, erledigt, z, wts, btw, abbruch, teil=teil)
            except Exception as e2:
                _prod(z, "fehler", h, f"{type(e2).__name__}: {str(e2)[:160]}")
        except Exception as e:
            _prod(z, "fehler", h, f"{type(e).__name__}: {str(e)[:160]}")
    if not SCHARF:
        with open(TROCKEN_TSV, "w", encoding="utf-8") as fh:
            fh.write("handle\tvariante\tbild\tbefund\tplan\tersatz\tfreigabe\n")
            for zl in z["zeilen"]:
                zl = tuple(zl) + ("-",) * (7 - len(zl))       # «freigabe» nur bei Tausch-Paaren (TAUSCH_FREIGABE-Eintrag)
                fh.write("\t".join(str(x).replace("\t", " ").replace("\n", " ") for x in zl) + "\n")
    print("PRODUKTE: " + " · ".join(f"{k} {v}" for k, v in sorted(z["prod"].items())), flush=True)
    print("VARIANTENBILDER: " + (" · ".join(f"{k} {v}" for k, v in sorted(z["bild"].items())) or "0"), flush=True)
    print(("ABBRUCH: " + abbruch) if abbruch else "FERTIG", flush=True)
    schlecht = any(k.startswith("fehler") for k in z["bild"]) or z["prod"].get("fehler") or z["prod"].get("teilzustand-offen")
    return 2 if abbruch else (1 if schlecht else 0)


def _prod(z, art, h, notiz=""):
    z["prod"][art] = z["prod"].get(art, 0) + 1
    z["zeilen"].append((h, "-", "-", notiz, art, "-"))
    print(f"  {art:18} {h[:58]}" + (f" · {notiz}" if notiz else ""), flush=True)


def ein_produkt(h, erledigt, z, wts, btw, leer="", teil=frozenset()):
    if wts.gesperrt(h):
        return _prod(z, "werbetest-sperre", h)
    if h in teil:            # letzte Ledger-Zeile «begonnen-…»/«fehler-teil-…»: Zustand unklar, nichts lesen, nichts ändern
        return _prod(z, "teilzustand-offen", h, "erst SCHARF=1 … --zurueck " + h)
    p = (gql(Q_PROD, {"h": h}).get("data") or {}).get("p")
    if not p:
        return _prod(z, "fehlt", h)
    if wts.gesperrt(p["id"]):
        return _prod(z, "werbetest-sperre", h)
    if p["status"] != "ACTIVE":
        return _prod(z, "nicht-aktiv", h, p["status"])
    if not p.get("publishedOnPublication"):
        return _prod(z, "nicht-in-google", h)
    vs = varianten_lesen(p["id"])
    vb = variantenbilder(vs)
    if not vb:
        return _prod(z, "kein-variantenbild", h, f"{len(vs)} Var., Hauptbild-Werkzeuge zuständig")
    offen = {m: v for m, v in vb.items() if (h, m) not in erledigt}
    if not offen:
        return _prod(z, "schon-quittiert", h)
    if leer:
        z["prod"]["mit-variantenbild"] = z["prod"].get("mit-variantenbild", 0) + 1
        for m, v in offen.items():
            z["bild"]["offen-kontingent"] = z["bild"].get("offen-kontingent", 0) + 1
            z["zeilen"].append((h, beschreibung(v), kurz(m), "nicht beurteilt: Prüfer-Kontingent leer", "offen-kontingent", "-"))
        print(f"  offen-kontingent   {h[:58]} · {len(offen)} Variantenbild(er) nicht beurteilt", flush=True)
        return
    med = [m for m in p["media"]["nodes"] if (m.get("image") or {}).get("url")]
    url_von = {m["id"]: m["image"]["url"] for m in med}
    if any(m not in url_von for m in offen):
        return _prod(z, "fehler", h, "Variantenbild nicht in der Medienliste")
    klein = [laden(m["image"]["url"], 512) for m in med]
    grp = gruppen([abdruck(im) for im in klein])
    # Reihenfolge: Gruppen mit offenen Variantenbildern, dann übrige Variantenbilder, dann Galerie — gekappt bei MAX_BILDER.
    g_offen = [g for g in grp if any(med[i]["id"] in offen for i in g)]
    g_var = [g for g in grp if g not in g_offen and any(med[i]["id"] in vb for i in g)]
    wahl = (g_offen + g_var + [g for g in grp if g not in g_offen and g not in g_var])[:MAX_BILDER]
    nr_von = {med[i]["id"]: n + 1 for n, g in enumerate(wahl) for i in g}
    rep = {n + 1: med[g[0]]["id"] for n, g in enumerate(wahl)}
    offen = {m: v for m, v in offen.items() if m in nr_von}          # mehr Farben als MAX_BILDER: Rest im nächsten Lauf
    if not offen:
        return _prod(z, "fehler", h, "kein offenes Variantenbild unter MAX_BILDER")
    gruppe_von = {n + 1: [med[i]["id"] for i in g] for n, g in enumerate(wahl)}
    idx_von = {m["id"]: i for i, m in enumerate(med)}
    ergebnis = plane_produkt(p["title"], [_jpg(klein[g[0]]) for g in wahl], nr_von, offen, urteil_netz,
                             lambda m: laden(url_von[m], 2048), btw.bearbeite,
                             lambda m, k: fremdes_variantenbild(offen[m], gruppe_von.get(k, []), vs))   # ersatz_sperre
    z["prod"]["mit-variantenbild"] = z["prod"].get("mit-variantenbild", 0) + 1
    for r in ergebnis:
        m, plan = r["media"], r["plan"]
        vids = [v["id"] for v in offen[m]]
        ersatz = kurz(rep[r["ersatz_nr"]]) if plan == "tauschen" else (f"neu: {r['methode']}" if r["methode"] else "-")
        if r["kandidat"] is not None and TROCKEN_BILDER and not SCHARF:
            r["kandidat"].convert("RGB").save(os.path.join(TROCKEN_BILDER, f"{h[:40]}_{kurz(m)}_{plan}.jpg"), quality=85)
        art, neu_id, notiz, methode, paar = plan, "", r["grund"], r["methode"], "-"
        if plan == "tauschen":
            # Freigabe gilt dem GESICHTETEN PAAR (alt → Ersatz), nicht dem Handle: das Urteil im SCHARF-Lauf ist neu und kann
            # ein anderes Ersatzbild wählen. Ein Doppel desselben Fotos (gleiche Gruppe) gilt als dasselbe Ersatzbild.
            paar = paar_text(h, m, rep[r["ersatz_nr"]])
            frei = freigaben_fuer(TAUSCH_FREIGABE, h, m)
            treffer = next((x for x in gruppe_von.get(r["ersatz_nr"], []) if kurz(x) in frei), None)
            if TROCKEN_BILDER and not SCHARF:
                _tauschbogen(klein[idx_von[m]], klein[idx_von[rep[r["ersatz_nr"]]]], m, rep[r["ersatz_nr"]]).save(
                    os.path.join(TROCKEN_BILDER, f"{h[:40]}_{kurz(m)}_tauschen_{kurz(rep[r['ersatz_nr']])}.jpg"), quality=85)
            if not treffer:
                notiz += (f" · Freigabe gilt {', '.join(f'{h}:{kurz(m)}:{e}' for e in sorted(frei))}, neues Urteil {paar}"
                          f" → wartet (nach Sichtung TAUSCH_FREIGABE={paar})" if frei
                          else f" · ohne Freigabe nur geplant (nach Sichtung TAUSCH_FREIGABE={paar})")
                if SCHARF:
                    art, neu_id = WARTET, rep[r["ersatz_nr"]]
                    methode = GEPRUEFT + "+".join(sorted(frei)) if frei else ""
            elif SCHARF:
                art, neu_id, grund = _aendern(p, h, m, vids, plan, treffer, None, "", methode, r["befund"])
                if grund:
                    notiz = grund
            else:
                notiz += f" · freigegeben ({h}:{kurz(m)}:{kurz(treffer)})"
        elif SCHARF and plan in GEAENDERT:
            art, neu_id, grund = _aendern(p, h, m, vids, plan, "", r["kandidat"],
                                          f"{p['title']} – {farbwert(offen[m])}".rstrip(" –"), methode, r["befund"])
            if grund:
                notiz = grund
        z["bild"][art] = z["bild"].get(art, 0) + 1
        z["zeilen"].append((h, r["variante"], kurz(m), f"{r['befund']} · {notiz}", art, ersatz, paar))
        print(f"  {art:12} {h[:44]:44} Bild {r['nr']:>2} {kurz(m):>14} {r['variante'][:34]:34} → {ersatz} · {notiz[:110]}",
              flush=True)
        if SCHARF:
            ledger_schreiben(datum=time.strftime("%Y-%m-%d"), handle=h, produkt=kurz(p["id"]), art=art, alte_media=m,
                             neue_media=neu_id, varianten=",".join(kurz(v) for v in vids), methode=methode,
                             notiz=f"{notiz} · {r['befund']}"[:400])


def _tauschbogen(alt_bild, ersatz_bild, alt_id, ersatz_id, seite=512):
    """Kontaktbogen für die Sichtung eines Tausch-Paares: links das alte Variantenbild, rechts das geplante Ersatzbild."""
    from PIL import ImageDraw
    teile = []
    for bild, text in ((alt_bild, f"ALT {kurz(alt_id)}"), (ersatz_bild, f"ERSATZ {kurz(ersatz_id)}")):
        b = bild.convert("RGB").copy()
        b.thumbnail((seite, seite))
        feld = Image.new("RGB", (seite, seite + 28), (255, 255, 255))
        feld.paste(b, ((seite - b.width) // 2, 28 + (seite - b.height) // 2))
        ImageDraw.Draw(feld).rectangle((0, 0, seite, 27), fill=(0, 0, 0))
        ImageDraw.Draw(feld).text((8, 8), text, fill=(255, 255, 255))
        teile.append(feld)
    bogen = Image.new("RGB", (2 * seite + 8, seite + 28), (128, 128, 128))
    bogen.paste(teile[0], (0, 0))
    bogen.paste(teile[1], (seite + 8, 0))
    return bogen


def _aendern(p, h, m, vids, plan, ersatz_id, kandidat, alt_text, methode, befund):
    """SCHARF: einen Tausch/Zuschnitt ausführen. VOR der ersten Umhänge-Mutation steht «begonnen-<plan>» mit alter und neuer
    Media im Ledger — bricht der Prozess hart ab (Container-Neustart), findet --zurueck den Teilzustand trotzdem.
    → (art, neue_media, grund): art = plan (geglückt), «fehler» (nichts geändert bzw. bestätigt zurückgebaut) oder
    «fehler-teil-<plan>» (Rückbau unbestätigt oder eigenes Medium übrig — neue_media = Rückweg für --zurueck)."""
    basis = {"handle": h, "produkt": kurz(p["id"]), "alte_media": m, "varianten": ",".join(kurz(v) for v in vids),
             "methode": methode}

    def begonnen(neu):
        ledger_schreiben(datum=time.strftime("%Y-%m-%d"), art="begonnen-" + plan, neue_media=neu,
                         notiz=f"vor dem Umhängen · {befund}"[:400], **basis)
    if plan == "tauschen":
        neu = ersatz_id
        begonnen(neu)
    else:
        neu, grund, uebrig = medium_anlegen(p["id"], kandidat, h, alt_text, gemerkt=begonnen)
        if not neu:
            return ("fehler-teil-zuschneiden", uebrig, grund) if uebrig else ("fehler", "", grund)
    grund, stand = umhaengen(p["id"], vids, m, neu)
    if stand == "neu":
        return plan, neu, ""
    if stand == "teil":
        return "fehler-teil-" + plan, neu, grund
    # stand «alt» = Rückbau QUITTIERT (jede Variante, die «alt» verloren haben könnte, hat das Wieder-Anhängen ohne userError
    # bestätigt bekommen) UND zurückgelesen — nur dann hängt sicher keine Variante mehr am eigenen Zuschnitt-Medium.
    if plan == "zuschneiden":          # eigenes Medium nicht als Galerie-Leiche stehen lassen
        if medium_entfernen(p["id"], neu):
            return "fehler", "", grund + " · Zuschnitt-Medium entfernt"
        return "fehler-teil-zuschneiden", neu, grund + " · Zuschnitt-Medium NICHT entfernt (--zurueck)"
    return "fehler", "", grund


def zurueck(handles, ruhe=None):
    """Rückweg: Varianten wieder an die alte Media-ID — zustandsunabhängig (auch aus «begonnen-…»/«fehler-teil-…», wo ein Teil
    der Varianten am alten, ein Teil am neuen oder an keinem Bild hängt). Bestätigt mit Quittung fürs Wieder-Anhängen oder,
    weil dieser Prozess später läuft, mit zwei Lesungen im Abstand «ruhe» (GVO_RUHE). Ein selbst angelegtes Zuschnitt-Medium
    wird danach entfernt, sofern keine Variante des Produkts daran hängt; schon gelöscht (fehlt zweimal gelesen in den
    Produkt-Medien) zählt als entfernt. Ein getauschtes Ersatzbild (fremdes Galeriebild) bleibt immer. Gleiche Handles nur
    einmal. Ledger-Art «zurueck» (quittiert)."""
    ruhe = RUHE if ruhe is None else ruhe
    zeilen = ledger_lesen()
    ok = fehler = 0
    for h in dict.fromkeys(handles):
        offen = aenderungen_offen(zeilen, h)
        if not offen:
            print(f"  ⚠️ {h}: keine offene Änderung im Ledger"); fehler += 1; continue
        for z in offen:
            pid = "gid://shopify/Product/" + z["produkt"]
            vids = ["gid://shopify/ProductVariant/" + v for v in z["varianten"].split(",") if v]
            print(f"  zurueck {h[:50]:50} {kurz(z['neue_media'])} → {kurz(z['alte_media'])} ({len(vids)} Var., {z['art']})"
                  + ("" if SCHARF else " (TROCKEN)"), flush=True)
            if not SCHARF:
                continue
            basis = dict(datum=time.strftime("%Y-%m-%d"), handle=h, produkt=z["produkt"], alte_media=z["alte_media"],
                         neue_media=z["neue_media"], varianten=z["varianten"], methode=z["methode"])
            try:
                if not vids:
                    raise _Gescheitert("keine Varianten im Ledger")
                bestaetigt, wie = _zurueckbauen(pid, vids, z["alte_media"], z["neue_media"], ruhe=ruhe)
            except Exception as e:
                print(f"  ⚠️ {h}: Rückweg abgebrochen: {type(e).__name__}: {str(e)[:160]}", file=sys.stderr, flush=True)
                fehler += 1; continue
            if not bestaetigt:
                print(f"  ⚠️ {h}: Rückweg nicht bestätigt — {wie}", file=sys.stderr, flush=True); fehler += 1; continue
            notiz = f"Rückweg ({z['art']} vom {z['datum']}; {wie})"
            if z["art"] in EIGENES_MEDIUM and z["neue_media"]:
                try:
                    haengt = z["neue_media"] in [v["media"] for v in varianten_lesen(pid)]
                    weg, wie2 = (False, "eine Variante hängt noch daran") if haengt else medium_weg(pid, z["neue_media"], ruhe)
                except Exception as e:
                    weg, wie2 = False, f"{type(e).__name__}: {str(e)[:100]}"
                if not weg:
                    # Varianten sind zurück, das eigene Medium aber noch da → als Teilzustand stehen lassen (nächstes --zurueck)
                    print(f"  ⚠️ {h}: Varianten zurück, Zuschnitt-Medium {kurz(z['neue_media'])} nicht entfernt: {wie2}",
                          file=sys.stderr, flush=True)
                    ledger_schreiben(art="fehler-teil-zuschneiden", notiz=f"{notiz} · Zuschnitt-Medium nicht entfernt: {wie2}",
                                     **basis)
                    fehler += 1; continue
                notiz += f" · Zuschnitt-Medium {wie2}"
            ok += 1
            ledger_schreiben(art="zurueck", notiz=notiz[:400], **basis)
    print(f"ZURUECK: {ok} zurückgedreht · {fehler} Fehler" + ("" if SCHARF else " (TROCKEN)"), flush=True)
    return 0 if not fehler else 1


# ─────────────────────────────── Selbsttest (Wegwerf-Daten, kein Netz) ───────────────────────────────

def selbsttest():
    from PIL import ImageDraw
    faelle = []

    def f(name, ok):
        """ok = Wahrheitswert oder Funktion (läuft geschützt: eine Ausnahme zählt als FEHLER, der Selbsttest läuft weiter)."""
        if callable(ok):
            try:
                ok = ok()
            except Exception as e:
                faelle.append((f"{name} [Ausnahme {type(e).__name__}: {str(e)[:90]}]", False))
                return
        faelle.append((name, bool(ok)))

    # Orte (Wortgrenzen, Regel 9b)
    f("Ort «Oben rechts» → ecke-oben-rechts", norm_ort("Oben rechts") == "ecke-oben-rechts")
    f("Ort «top-left» → ecke-oben-links", norm_ort("top-left") == "ecke-oben-links")
    f("Ort «rand_oben» → rand-oben", norm_ort("rand_oben") == "rand-oben")
    f("Ort «unten» → rand-unten", norm_ort("unten") == "rand-unten")
    f("Ort «über dem Produkt» → mitte", norm_ort("über dem Produkt") == "mitte")
    f("Ort «ganzes Bild» → flaechig", norm_ort("ganzes Bild") == "flaechig")
    f("Ort «Wasserzeichen-Muster» → flaechig", norm_ort("Wasserzeichen-Muster") == "flaechig")
    f("Kanarie «obenauf» ist kein Rand", norm_ort("obenauf") == "")
    f("Kanarie «Rechtschreibung» ist kein Rand", norm_ort("Rechtschreibung") == "")
    f("Ort «keine» → keine", norm_ort("keine") == "keine")
    f("Ort «linke obere Ecke» → ecke-oben-links", norm_ort("linke obere Ecke") == "ecke-oben-links")
    f("Ort «oben mitte» → rand-oben (Etikett mittig oben)", norm_ort("oben mitte") == "rand-oben")
    f("Ort «über dem Artikel oben» → mitte", norm_ort("über dem Artikel oben") == "mitte")
    f("Ort «mitte (über dem Artikel)» → mitte", norm_ort("mitte (über dem Artikel)") == "mitte")

    # Doppel-Erkennung: gleiches Bild (JPEG-Rauschen) zusammen, andere Farbe getrennt
    a = Image.new("RGB", (200, 200), (250, 250, 250)); ImageDraw.Draw(a).ellipse((60, 60, 140, 140), fill=(20, 20, 20))
    b = a.copy(); b.putpixel((5, 5), (240, 240, 240))
    c = Image.new("RGB", (200, 200), (250, 250, 250)); ImageDraw.Draw(c).ellipse((60, 60, 140, 140), fill=(200, 30, 30))
    d = a.copy(); ImageDraw.Draw(d).ellipse((150, 150, 175, 175), fill=(230, 120, 120))     # kleiner Farbpunkt (Nagellack)
    grp = gruppen([abdruck(x) for x in (a, b, c, d)])
    f("Doppel: a+b zusammen, c und d eigen", grp == [[0, 1], [2], [3]])

    # Variantenbilder gruppieren + Beschreibung
    vs = [{"id": "v1", "title": "Schwarz / 38", "options": [{"name": "Farbe", "value": "Schwarz"}, {"name": "Grösse", "value": "38"}], "media": "m1"},
          {"id": "v2", "title": "Schwarz / 39", "options": [{"name": "Farbe", "value": "Schwarz"}, {"name": "Grösse", "value": "39"}], "media": "m1"},
          {"id": "v3", "title": "Rot / 38", "options": [{"name": "Farbe", "value": "Rot"}, {"name": "Grösse", "value": "38"}], "media": "m2"},
          {"id": "v4", "title": "Rot / 39", "options": [{"name": "Farbe", "value": "Rot"}, {"name": "Grösse", "value": "39"}], "media": None}]
    vb = variantenbilder(vs)
    f("Variantenbilder: 2 Bilder, Bild m1 hat 2 Varianten", set(vb) == {"m1", "m2"} and len(vb["m1"]) == 2)
    f("Beschreibung = gemeinsame Option", beschreibung(vb["m1"]) == "Farbe: Schwarz (2 Var.)")
    f("Alt-Text-Wert ohne Zählung", farbwert(vb["m1"]) == "Schwarz" and farbwert([{"title": "Default", "options": []}]) == "Default")

    # Planlogik
    def B(e, o="rand-oben"):
        return {"einblendung": e, "ort": o, "motiv": ""}
    f("sauber: beide nein", plan_variantenbild(2, {2: B(False)}, {2: B(False)}, {}, {}, 5)[0] == "sauber")
    f("uneinig: nur einer ja", plan_variantenbild(2, {2: B(True)}, {2: B(False)}, {}, {}, 5)[0] == "uneinig")
    f("uneinig: Urteil fehlt", plan_variantenbild(2, {2: B(True)}, {}, {}, {}, 5)[0] == "uneinig")
    f("uneinig: einblendung None", plan_variantenbild(2, {2: B(None)}, {2: B(True)}, {}, {}, 5)[0] == "uneinig")
    f("tauschen: gleiche Ersatz-Nr., Ersatz sauber",
      plan_variantenbild(2, {2: B(True), 4: B(False)}, {2: B(True), 4: B(False)}, {2: 4}, {2: 4}, 5)[:2] == ("tauschen", 4))
    f("kein Tausch: Ersatz trägt selbst Einblendung",
      plan_variantenbild(2, {2: B(True), 4: B(True)}, {2: B(True), 4: B(False)}, {2: 4}, {2: 4}, 5)[0] == "zuschnitt-pruefen")
    f("kein Tausch: Ersatz-Nr. verschieden",
      plan_variantenbild(2, {2: B(True), 4: B(False), 5: B(False)}, {2: B(True), 4: B(False), 5: B(False)}, {2: 4}, {2: 5}, 5)[0] == "zuschnitt-pruefen")
    f("kein Tausch: Ersatz = dasselbe Bild", plan_variantenbild(2, {2: B(True)}, {2: B(True)}, {2: 2}, {2: 2}, 5)[0] == "zuschnitt-pruefen")
    f("kein Tausch: Ersatz-Nr. ausserhalb", plan_variantenbild(2, {2: B(True)}, {2: B(True)}, {2: 9}, {2: 9}, 5)[0] == "zuschnitt-pruefen")
    f("Rand-Badge: beide Ecke/Rand", rand_badge(B(True, "ecke-oben-links"), B(True, "rand-oben")))
    f("kein Rand-Badge: einer flächig", not rand_badge(B(True, "ecke-oben-links"), B(True, "flaechig")))
    f("kein Rand-Badge: einer mitte", not rand_badge(B(True, "mitte"), B(True, "rand-oben")))

    # Zuschnitt-Geometrie (echter Fall Socken «10 Pairs» oben links, Artikel darunter)
    box, seite, rest = zuschnitt_box(800, 800, [[40, 30, 130, 330]], [[160, 200, 1000, 950]])
    f("Socken: Streifen oben, Rest ≥ 80 %", box is not None and seite == "oben" and rest >= 0.8 and box[1] == round(150 * 0.8))
    box, seite, _ = zuschnitt_box(800, 800, [[30, 810, 130, 990]], [[60, 40, 1000, 850]])
    f("Hemd «1-152» oben rechts, Artikel reicht hinein → kein Streifen", box is None and "kein Randstreifen" in seite)
    box, seite, _ = zuschnitt_box(800, 800, [[0, 0, 400, 1000]], [[460, 100, 1000, 900]])
    f("Banner 40 % → zu viel weg", box is None and "nähme" in seite)
    box, seite, _ = zuschnitt_box(800, 800, [[0.03, 0.02, 0.12, 0.98]], [[0.2, 0.1, 0.95, 0.9]])
    f("Boxen 0–1 werden hochgerechnet (Akku-Banner oben)", box is not None and seite == "oben")
    box, seite, _ = zuschnitt_box(800, 800, [[500, 0, 300, 100]], [[0, 0, 1000, 1000]])
    f("ungültige Box → kein Zuschnitt", box is None and "Einblendungs-Box" in seite)
    # Mindestgrösse mit schmaler Box (40 % breit, also kein Banner → Rand 20 ‰ wie bisher)
    box, seite, _ = zuschnitt_box(500, 500, [[0, 0, 100, 400]], [[150, 0, 1000, 1000]])
    f("500 px, Streifen 12 % → 440 px hoch, bleibt (≥ 400)", box is not None and box[3] - box[1] == 440)
    box, seite, _ = zuschnitt_box(420, 420, [[0, 0, 100, 400]], [[150, 0, 1000, 1000]])
    f("danach zu klein (420 px → 370)", box is None and "zu klein" in seite)

    # Auffüllen: weisser Studiohintergrund → wieder quadratisch; unruhiger Rand → bleibt schmal
    w = Image.new("RGB", (800, 680), (250, 250, 250)); ImageDraw.Draw(w).ellipse((250, 200, 550, 500), fill=(30, 30, 30))
    f("Auffüllen bei weissem Rand → 800×800", auffuellen(w, 800, 800).size == (800, 800))
    import random
    random.seed(3)
    u = Image.new("RGB", (800, 680))
    u.putdata([(random.randint(0, 255),) * 3 for _ in range(800 * 680)])
    f("Auffüllen bei unruhigem Rand → unverändert", auffuellen(u, 800, 800).size == (800, 680))

    # Prüfung des Kandidaten
    ok = {"einblendung": False, "artikel_vollstaendig": True}
    f("Prüfung: beide ok", pruef_einig(ok, dict(ok)))
    f("Prüfung: Strings 'false'/'true'", pruef_einig({"einblendung": "false", "artikel_vollstaendig": "true"}, ok))
    f("Prüfung: einer sieht Einblendung", not pruef_einig(ok, {"einblendung": True, "artikel_vollstaendig": True}))
    f("Prüfung: Artikel angeschnitten", not pruef_einig(ok, {"einblendung": False, "artikel_vollstaendig": False}))
    f("Prüfung: Gemini-Sperre", not pruef_einig({"wahl": 1, "grund": "Gemini sperrt die Bilder: SAFETY"}, ok))
    f("Prüfung: Antwort fehlt", not pruef_einig(ok, None))

    # Antworten robust lesen
    jb = je_bild({"bilder": [{"nr": "2", "einblendung": "ja", "ort": "Oben links"}, {"nr": "x"}, {"einblendung": True}]})
    f("je_bild: Nummer als Text, Ort normalisiert, Müll übersprungen", list(jb) == [2] and jb[2]["einblendung"] is True and jb[2]["ort"] == "ecke-oben-links")
    f("je_variante: ersatz null → 0", je_variante({"varianten": [{"nr": 3, "ersatz": None}, {"nr": 4, "ersatz": "5"}]}) == {3: 0, 4: 5})

    # Ledger: quittiert/offen/Rückweg
    L = [dict(zip(SPALTEN, z)) for z in (
        ("2026-10-14", "h1", "1", "tauschen", "mA", "mB", "11,12", "", ""),
        ("2026-10-14", "h1", "1", "lassen", "mC", "", "13", "", ""),
        ("2026-10-14", "h2", "2", "fehler", "mD", "", "21", "", ""),
        ("2026-10-14", "h3", "3", "zuschneiden", "mE", "mF", "31", "rand-ab-oben 85%", ""),
        ("2026-10-15", "h3", "3", "zurueck", "mE", "mF", "31", "", ""))]
    e = erledigt_aus(L)
    f("erledigt: getauscht (alt UND neu), lassen, zurueck", {("h1", "mA"), ("h1", "mB"), ("h1", "mC"), ("h3", "mE")} <= e)
    f("nicht erledigt: fehler", ("h2", "mD") not in e)
    f("Rückweg offen: h1 tauschen", [z["alte_media"] for z in aenderungen_offen(L, "h1")] == ["mA"])
    f("Rückweg: h3 schon zurück", aenderungen_offen(L, "h3") == [])

    # Ganzer Ablauf mit falschen Prüfern (kein Netz): 4 Variantenbilder
    #   Bild 1 «10 Pairs» oben links → kein Ersatz → Text weg (Fake) → beide prüfen ok → zuschneiden
    #   Bild 2 Rot mit Badge → Ersatz Bild 5 (beide) → tauschen
    #   Bild 3 Banner über dem Artikel (mitte) → lassen
    #   Bild 4 → Gemini ja, Zweitprüfer nein → uneinig
    bilder = [_jpg(a)] * 5
    nr_von = {"m1": 1, "m2": 2, "m3": 3, "m4": 4, "m5": 5}
    offen = {k: [{"id": "v" + k, "title": k, "options": [{"name": "Farbe", "value": k}]}] for k in ("m1", "m2", "m3", "m4")}
    antwort_g = {"bilder": [{"nr": 1, "einblendung": True, "ort": "ecke-oben-links"}, {"nr": 2, "einblendung": True, "ort": "ecke-unten-rechts"},
                            {"nr": 3, "einblendung": True, "ort": "mitte"}, {"nr": 4, "einblendung": True, "ort": "rand-oben"},
                            {"nr": 5, "einblendung": False, "ort": "keine"}],
                 "varianten": [{"nr": 1, "ersatz": 0}, {"nr": 2, "ersatz": 5}, {"nr": 3, "ersatz": 0}, {"nr": 4, "ersatz": 0}]}
    antwort_c = json.loads(json.dumps(antwort_g))
    antwort_c["bilder"][3]["einblendung"] = False
    aufrufe = []

    def urteil(text, bs, beide=True):
        aufrufe.append(text.split("]")[0].strip("["))
        if text.startswith("[AUFGABE-PRODUKT]"):
            return antwort_g, antwort_c
        if text.startswith("[AUFGABE-PRUEF]"):
            ok_tw = {"einblendung": False, "artikel_vollstaendig": True, "artikel_unveraendert": True, "grund": "ok"}
            return ok_tw, dict(ok_tw)
        return {"einblendungen": [[0, 0, 100, 300]], "artikel": [200, 100, 1000, 900], "flaechig": False}, None

    def text_weg(im):
        n = im.copy()                                   # «10 Pairs» oben links übermalt (im oberen/linken Randband)
        ImageDraw.Draw(n).rectangle((4, 4, 40, 18), fill=(240, 240, 240))
        return "bereinigt", {"text": "10 Pairs"}, n

    erg = {r["media"]: r for r in plane_produkt("Test-Socken", bilder, nr_von, offen, urteil, lambda m: a.copy(), text_weg)}
    f("Ablauf: m1 zuschneiden (Text weg)", erg["m1"]["plan"] == "zuschneiden" and erg["m1"]["methode"] == "text-weg")
    f("Ablauf: m2 tauschen auf Bild 5", erg["m2"]["plan"] == "tauschen" and erg["m2"]["ersatz_nr"] == 5)
    f("Ablauf: m3 lassen (mitte)", erg["m3"]["plan"] == "lassen" and erg["m3"]["kandidat"] is None)
    f("Ablauf: m4 uneinig", erg["m4"]["plan"] == "uneinig")
    f("Ablauf: 1 Produkt-Urteil + 1 Prüfung, keine Box (Text weg reichte)", aufrufe == ["AUFGABE-PRODUKT", "AUFGABE-PRUEF"])

    # Randstreifen-Weg: Text weg scheitert → Box (nur Gemini) → Streifen oben → Prüfung nicht bestanden → lassen
    aufrufe.clear()

    def urteil2(text, bs, beide=True):
        aufrufe.append(text.split("]")[0].strip("["))
        if text.startswith("[AUFGABE-PRODUKT]"):
            return antwort_g, antwort_g
        if text.startswith("[AUFGABE-PRUEF]"):
            return {"einblendung": False, "artikel_vollstaendig": True}, {"einblendung": True, "artikel_vollstaendig": True, "grund": "Logo bleibt"}
        return {"einblendungen": [[0, 0, 100, 300]], "artikel": [200, 100, 1000, 900], "flaechig": False}, None

    gross = Image.new("RGB", (800, 800), (250, 250, 250))
    erg = {r["media"]: r for r in plane_produkt("Test", bilder, nr_von, {"m1": offen["m1"]}, urteil2, lambda m: gross.copy(),
                                                lambda im: ("unsicher", {"grund": "Rand unruhig"}, None))}
    f("Randstreifen gebaut, Zweitprüfer sieht Logo → lassen",
      erg["m1"]["plan"] == "lassen" and erg["m1"]["methode"].startswith("rand-ab-oben") and erg["m1"]["kandidat"] is not None)
    f("Randstreifen: Box-Aufruf nur einmal (Gemini)", aufrufe == ["AUFGABE-PRODUKT", "AUFGABE-BOX", "AUFGABE-PRUEF"])

    # Gemini sperrt die Bilder → alles lassen, keine weiteren Aufrufe
    aufrufe.clear()
    erg = plane_produkt("Test", bilder, nr_von, offen, lambda t, b, beide=True: (aufrufe.append(1) or {"wahl": 1, "grund": "Gemini sperrt die Bilder: X"}, {}),
                        lambda m: a, text_weg)
    f("Gemini-Sperre → alle lassen", all(r["plan"] == "lassen" for r in erg) and len(aufrufe) == 1)

    # Leeres Kontingent bricht den Lauf ab (Leer wird durchgereicht)
    def leer(text, bs, beide=True):
        raise Leer("Zweitprüfer leer: Groq-Tageskontingent leer")
    try:
        plane_produkt("Test", bilder, nr_von, offen, leer, lambda m: a, text_weg)
        f("Leer wird durchgereicht", False)
    except Leer:
        f("Leer wird durchgereicht", True)

    # Produkt-Ablauf ohne Shopify (gql/varianten_lesen/laden ersetzt): Werbetest-Sperre und «Kontingent leer» lesen KEIN Bild
    g_alt = {k: globals()[k] for k in ("gql", "varianten_lesen", "laden")}
    gelesen = []

    def fake_gql(q, v=None):
        gelesen.append(v.get("h") if v else q[:20])
        return {"data": {"p": {"id": "gid://shopify/Product/42", "handle": v["h"], "title": "T", "status": "ACTIVE",
                               "publishedOnPublication": True,
                               "media": {"nodes": [{"id": "M0", "image": {"url": "u0"}}, {"id": "M1", "image": {"url": "u1"}}]}}}}

    def kein_bild(*a, **k):
        raise AssertionError("Bild geladen, obwohl nicht nötig")

    class Sperre:
        @staticmethod
        def gesperrt(x):
            return x == "gesperrt-handle"

    class SperreId:
        @staticmethod
        def gesperrt(x):
            return x == "gid://shopify/Product/42"
    try:
        globals().update(gql=fake_gql, laden=kein_bild,
                         varianten_lesen=lambda pid: [{"id": "V1", "title": "Rot", "options": [], "media": "M1"},
                                                      {"id": "V2", "title": "Blau", "options": [], "media": "M2"}])
        z = {"prod": {}, "bild": {}, "zeilen": []}
        ein_produkt("gesperrt-handle", set(), z, Sperre, None)
        f("Werbetest-Sperre (Handle): übersprungen, nichts gelesen", z["prod"] == {"werbetest-sperre": 1} and not gelesen)
        z = {"prod": {}, "bild": {}, "zeilen": []}
        ein_produkt("frei-handle", set(), z, SperreId, None)
        f("Werbetest-Sperre (Produkt-ID): übersprungen vor Varianten/Bildern", z["prod"] == {"werbetest-sperre": 1})
        z = {"prod": {}, "bild": {}, "zeilen": []}
        globals()["varianten_lesen"] = lambda pid: [{"id": "V1", "title": "Rot", "options": [], "media": "M1"},
                                                    {"id": "V2", "title": "Rot/38", "options": [], "media": "M1"},
                                                    {"id": "V3", "title": "Blau", "options": [], "media": "M0"}]
        ein_produkt("frei-handle", set(), z, Sperre, None, leer="Zweitprüfer leer")
        f("Kontingent leer: 2 Variantenbilder gelistet als offen-kontingent, kein Bild geladen",
          z["bild"] == {"offen-kontingent": 2} and len(z["zeilen"]) == 2 and all(r[4] == "offen-kontingent" for r in z["zeilen"]))
        z = {"prod": {}, "bild": {}, "zeilen": []}
        ein_produkt("frei-handle", {("frei-handle", "M1"), ("frei-handle", "M0")}, z, Sperre, None, leer="x")
        f("alles quittiert → schon-quittiert", z["prod"] == {"schon-quittiert": 1})
    finally:
        globals().update(g_alt)

    # ═══════ Härtung 14.10. (Prüfer-Befunde): jeder Fall als Funktion — läuft auch gegen eine ältere Fassung (dort rot) ═══════
    import contextlib, re, shutil, types

    # Befund 1 (HOCH): ein Modell-Wort in der Variante verhindert den Tausch (Trinkflasche Luxury ↔ Flagship)
    def var(titel, wert=None, name="Farbe"):
        return {"id": "v-" + titel, "title": titel, "options": [{"name": name, "value": titel if wert is None else wert}]}

    def tausch_plan(vs_liste):
        """plane_produkt, beide Prüfer einig: Bild 1 = Variantenbild mit Einblendung oben, Bild 2 = gleiche Farbe, sauber."""
        g = {"bilder": [{"nr": 1, "einblendung": True, "ort": "rand-oben"}, {"nr": 2, "einblendung": False, "ort": "keine"}],
             "varianten": [{"nr": 1, "ersatz": 2}]}

        def u(text, bs, beide=True):
            if text.startswith("[AUFGABE-PRODUKT]"):
                return g, json.loads(json.dumps(g))
            if text.startswith("[AUFGABE-PRUEF]"):
                return ({"einblendung": False, "artikel_vollstaendig": True},) * 2
            return {"einblendungen": [[0, 0, 100, 300]], "artikel": [200, 100, 1000, 900], "flaechig": False}, None
        return plane_produkt("Trinkflasche", [_jpg(a)] * 2, {"m1": 1, "m2": 2}, {"m1": vs_liste}, u, lambda m: a.copy(),
                             lambda im: ("bereinigt", {}, im.copy()))[0]
    f("Modell: «3086 Luxury Style Brown» → kein Tausch, eigenes Foto wird geprüft (Prüfer-Befund 1)",
      lambda: (lambda r: r["plan"] != "tauschen" and r["ersatz_nr"] == 0 and "Modell" in r["grund"])(
          tausch_plan([var("3086 Luxury Style Brown")])))
    f("Modell: Lesebrille «100/125 degrees-Red» (echte Werte) bleibt Tausch",
      lambda: tausch_plan([var("100 degrees-Red"), var("125 degrees-Red")])["plan"] == "tauschen")
    f("Modell-Kanarien bleiben Tausch: Maxi, Stilvolles, Modellbau, Minimalist, Professional, Typografie",
      lambda: all(tausch_plan([var(t)])["plan"] == "tauschen" for t in
                  ("Maxi Rot", "Stilvolles Schwarz", "Modellbau Grau", "Minimalist Weiss", "Professional Blau", "Typografie Beige")))
    f("Modell-Wort: «Pro Max», «Typ-C», «Upgraded Version», Optionsname «Modell», «Schwarz» → keins",
      lambda: modell_wort([var("iPhone 15 Pro Max Schwarz")]) == "Pro" and modell_wort([var("Typ-C Weiss")]) == "Typ"
      and modell_wort([var("Upgraded Version Blau")]) == "Upgraded" and modell_wort([var("A", "A", name="Modell")]) == "Modell"
      and modell_wort([var("Schwarz")]) == "")
    def freigabe_probe():
        falsch = []
        fr = freigabe_aus(" h1:11:12, gid-h:gid://shopify/MediaImage/21:gid://shopify/MediaImage/22,,nur-handle ,h2:x:3", falsch)
        return fr == {("h1", "11", "12"), ("gid-h", "21", "22")} and falsch == ["nur-handle", "h2:x:3"] \
            and freigabe_aus("") == frozenset()
    f("Freigabe = Paar «handle:alt:ersatz» (kurz oder gid); blosser Handle gibt NICHTS frei (Prüfer-Befund 3)", freigabe_probe)

    # Befund 4 (NIEDRIG): Sicherheitsrand bei Banner-Boxen, Alt-Text nie der Titel der ersten Variante
    f("Banner-Box (100 % breit): Rand 40 ‰ → Schnitt bei 140 statt 120",
      lambda: zuschnitt_box(1000, 1000, [[0, 0, 100, 1000]], [[200, 100, 1000, 900]])[0][1] == 140)
    f("Banner-Box endet 30 ‰ vor dem Artikel → kein Zuschnitt (Rest der Plakette bliebe stehen)",
      lambda: zuschnitt_box(1000, 1000, [[0, 0, 120, 1000]], [[150, 100, 1000, 900]])[0] is None)
    f("schmale Box (30 % breit): Rand bleibt 20 ‰ (Socken «10 Pairs»)",
      lambda: zuschnitt_box(1000, 1000, [[0, 0, 100, 300]], [[200, 100, 1000, 900]])[0][1] == 120)
    f("Banner längs (60 % hoch) am linken Rand: Rand 40 ‰ auch seitlich",
      lambda: zuschnitt_box(1000, 1000, [[0, 0, 600, 100]], [[0, 200, 1000, 1000]])[0][0] == 140)
    LB = [var(f"{g} degrees-Black Frame Red Rope") for g in (100, 125, 150, 175, 200, 250, 300, 350, 400)]
    f("Alt-Text Lesebrille (9 Var., Optionswerte verschieden): «Black Frame Red Rope», nicht «100 degrees-…»",
      lambda: farbwert(LB) == "Black Frame Red Rope")
    f("Alt-Text ohne gemeinsamen Teil («Rot / S», «Blau / M») → '' (nur Produkttitel)",
      lambda: farbwert([var("Rot / S", "Rot"), var("Blau / M", "Blau")]) == "")
    f("Prompt-Beschreibung Lesebrille: «Black Frame Red Rope (9 Var.)»", lambda: beschreibung(LB) == "Black Frame Red Rope (9 Var.)")
    f("Alt-Text: eine Variante → ihr Titel; «Default Title» → ''",
      lambda: farbwert([{"title": "Weiss", "options": []}]) == "Weiss" and gemeinsamer_text(["Default Title"]) == "")

    # Befund 5: Trockenlauf-Pfad
    def trocken_standard():
        quelle = open(__file__, encoding="utf-8").read()
        m = re.search(r'TROCKEN_TSV = os\.environ\.get\("TROCKEN_TSV"\) or "([^"]+)"', quelle)
        return bool(m and m.group(1).startswith("/tmp/") and 'os.environ.get("TROCKEN_BILDER", "")' in quelle
                    and ("/scratch" + "pad/") not in quelle and ("claude" + "-0") not in quelle)
    f("Trockenlauf-Pfad: Standard /tmp/…, Umgebung überschreibt, kein Sitzungsordner im Code", trocken_standard)

    # Befunde 2+3 (MITTEL): Schreibweg gegen eine falsche Shopify-API mit Zustand (Ledger nur im Wegwerf-Ordner)
    class Absturz(BaseException):
        """Harter Abbruch (Container-Neustart, kill) — keine Exception, also von keinem «except Exception» gefangen."""

    P, V1, V2 = "gid://shopify/Product/7", "gid://shopify/ProductVariant/1", "gid://shopify/ProductVariant/2"
    M0, M1, M2 = "gid://shopify/MediaImage/10", "gid://shopify/MediaImage/11", "gid://shopify/MediaImage/12"
    TITEL = {V1: "100 degrees-Black Frame Red Rope", V2: "125 degrees-Black Frame Red Rope"}
    FARBE = {"u:" + M0: (0, 0, 0), "u:" + M1: (250, 0, 0), "u:" + M2: (0, 0, 250)}

    class Laden:
        """Falsche Admin-API: Variante → Medium, Produkt-Medien; Mutationen ganz oder gar nicht (Shopify-Annahme).
        lesen: frisch | hinkt (die ersten «hinkt» Lesungen zeigen den Anfangszustand) | leer (Variante ohne Medium).
        klemmt = {"det"|"app": (ab, bis)}: diese Aufrufe (gezählt je Art) antworten mit userError, ohne etwas zu ändern
        (MEDIA_CANNOT_BE_MODIFIED). del_doppelt: gfw.gql wiederholt eine Löschung, deren Antwort verloren ging — die erste
        löscht, die zweite liefert die Antwort «deletedMediaIds: null, does not exist» (Shopify-Doku)."""
        def __init__(s, lesen="frisch", hinkt=0, absturz=None, klemmt=None, del_doppelt=False, nach=None):
            s.v = {V1: M1, V2: M1}
            s.start = dict(s.v)
            s.medien, s.eigene, s.geloescht, s.muts, s.alt_texte = [M0, M1, M2], [], [], [], []
            s.lesen, s.hinkt, s.reads, s.absturz, s.zaehl, s.n = lesen, hinkt, 0, absturz, {}, 0
            s.klemmt, s.del_doppelt, s.nach = dict(klemmt or {}), del_doppelt, nach   # nach: (art, n, Ausnahme) NACH der Ausführung
            s.ledger_vor_erster_mutation = None

        def _mut(s, art, media):
            if s.ledger_vor_erster_mutation is None and art in ("det", "app"):
                s.ledger_vor_erster_mutation = [z["art"] for z in ledger_lesen()]
            s.zaehl[art] = s.zaehl.get(art, 0) + 1
            if s.absturz and s.absturz[:2] == (art, s.zaehl[art]):
                raise s.absturz[2]
            s.muts.append((art, media))

        def gql(s, q, v=None):
            s.n += 1
            v = v or {}
            if "productByIdentifier" in q:
                return {"data": {"p": {"id": P, "handle": v["h"], "title": "Lesebrille", "status": "ACTIVE",
                                       "publishedOnPublication": True,
                                       "media": {"nodes": [{"id": m, "image": {"url": "u:" + m}} for m in s.medien]}}}}
            if "variants(first:100" in q:
                return {"data": {"product": {"variants": {"pageInfo": {"hasNextPage": False, "endCursor": None}, "nodes": [
                    {"id": k, "title": TITEL[k], "selectedOptions": [{"name": "Farbe", "value": TITEL[k]}],
                     "media": {"nodes": [{"id": m}] if m else []}} for k, m in s.v.items()]}}}}
            if "nodes(ids:" in q:
                s.reads += 1
                q2 = {} if s.lesen == "leer" else s.start if (s.lesen == "hinkt" and s.reads <= s.hinkt) else s.v
                return {"data": {"nodes": [{"id": k, "media": {"nodes": [{"id": q2[k]}] if q2.get(k) else []}} for k in v["ids"]]}}
            if "media(first:250)" in q:
                return {"data": {"product": {"media": {"pageInfo": {"hasNextPage": False}, "nodes": [{"id": m} for m in s.medien]}}}}
            if "productVariantDetachMedia" in q or "productVariantAppendMedia" in q:
                los = "Detach" in q
                feld = "productVariantDetachMedia" if los else "productVariantAppendMedia"
                art = "det" if los else "app"
                s._mut(art, v["vm"][0]["mediaIds"][0])
                ab, bis = s.klemmt.get(art, (0, -1))
                if ab <= s.zaehl[art] <= bis:
                    return {"data": {feld: {"userErrors": [{"code": "MEDIA_CANNOT_BE_MODIFIED", "field": ["variantMedia"],
                                                            "message": "Media cannot be modified"}]}}}
                nein = [x["variantId"] for x in v["vm"] if (s.v.get(x["variantId"]) != x["mediaIds"][0] if los else
                        (s.v.get(x["variantId"]) is not None or x["mediaIds"][0] not in s.medien))]
                if not nein:
                    for x in v["vm"]:
                        s.v[x["variantId"]] = None if los else x["mediaIds"][0]
                if s.nach and s.nach[:2] == (art, s.zaehl[art]):
                    raise s.nach[2]                # ausgeführt, Antwort verloren (gfw.gql gibt auf)
                return {"data": {feld: {"userErrors": [{"field": ["variantMedia"], "message": "abgelehnt " + k} for k in nein]}}}
            if "productCreateMedia" in q:
                s._mut("neu", "")
                mid = f"gid://shopify/MediaImage/9{len(s.eigene) + 1}"
                s.eigene.append(mid)
                s.medien.append(mid)
                s.alt_texte.append(v["m"][0].get("alt"))
                return {"data": {"productCreateMedia": {"media": [{"id": mid}], "mediaUserErrors": []}}}
            if "MediaImage{status}" in q:
                return {"data": {"node": {"status": "READY"}}}
            if "productDeleteMedia" in q:
                s._mut("del", v["m"][0])

                def loeschen():
                    if not all(m in s.medien for m in v["m"]):     # Shopify-Doku: ganz oder gar nicht, sonst null
                        return {"data": {"productDeleteMedia": {"deletedMediaIds": None, "mediaUserErrors": [
                            {"code": "MEDIA_DOES_NOT_EXIST", "field": ["mediaIds"], "message": "Media id does not exist"}]}}}
                    for m in v["m"]:
                        s.medien.remove(m)
                        for k in s.v:
                            if s.v[k] == m:
                                s.v[k] = None      # gelöschtes Medium verschwindet auch an der Variante
                    s.geloescht += list(v["m"])
                    return {"data": {"productDeleteMedia": {"deletedMediaIds": list(v["m"]), "mediaUserErrors": []}}}
                d = loeschen()
                return loeschen() if s.del_doppelt else d
            raise AssertionError("unerwartete Abfrage: " + q[:70])

    def fake_plan(plan):
        def plane(titel, bilder, nr_von, offen, *rest):
            return [{"media": m, "nr": nr_von[m], "plan": plan, "ersatz_nr": nr_von[M2] if plan == "tauschen" else 0,
                     "kandidat": Image.new("RGB", (600, 600), (250, 250, 250)) if plan == "zuschneiden" else None,
                     "methode": "text-weg" if plan == "zuschneiden" else "", "befund": "G: ja rand-oben | C: ja rand-oben",
                     "grund": "Test", "variante": beschreibung(vs)} for m, vs in offen.items()]
        return plane

    class Frei:
        @staticmethod
        def gesperrt(x):
            return False

    def kein_netz(*a, **k):
        raise AssertionError("Netz im Selbsttest")

    def lauf(plan, freigabe=(), lesen="frisch", hinkt=0, absturz=None, zurueck_danach=False, teil=None, klemmt=None,
             del_doppelt=False, vor_zurueck=None, zurueck_handles=("h-test",), nach=None):
        """Ein Produkt SCHARF gegen die falsche API; alles Gepatchte wird danach wiederhergestellt. --zurueck läuft danach
        mit frischen Lesungen und ohne Klemmen (eigener, späterer Prozess); vor_zurueck(shop) verändert den Shop vorher."""
        shop = Laden(lesen, hinkt, absturz, klemmt, del_doppelt, nach)
        namen = ("gql", "laden", "hochladen", "plane_produkt", "urteil_netz", "SCHARF", "LEDGER", "TAUSCH_FREIGABE")
        vorher = {k: globals()[k] for k in namen if k in globals()}
        tmp = tempfile.mkdtemp(prefix="gvo_selbsttest_")
        out = {"laden": shop, "abbruch": None, "ausnahme": None, "z": {}, "ledger": []}
        try:
            globals().update(gql=shop.gql, laden=lambda url, breite=None: Image.new("RGB", (64, 64), FARBE.get(url, (0, 250, 0))),
                             hochladen=lambda daten, name: "https://example.invalid/neu.jpg", plane_produkt=fake_plan(plan),
                             urteil_netz=kein_netz, LEDGER=os.path.join(tmp, "ledger.tsv"), TAUSCH_FREIGABE=frozenset(freigabe))
            globals()["SCHARF"] = True                    # erst NACH dem Austausch von gql
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                z = {"prod": {}, "bild": {}, "zeilen": []}
                try:
                    ein_produkt("h-test", set(), z, Frei, types.SimpleNamespace(bearbeite=None),
                                **({} if teil is None else {"teil": teil}))
                except Absturz:
                    out["abbruch"] = "Absturz"
                except Exception as e:                    # main() fängt so und zählt «fehler» — der Zustand bleibt
                    out["ausnahme"] = f"{type(e).__name__}: {e}"
                out["z"], out["ledger"] = z, ledger_lesen()
                out["v_vor"], out["geloescht_vor"] = dict(shop.v), list(shop.geloescht)
                if zurueck_danach:
                    shop.lesen, shop.klemmt, shop.del_doppelt, shop.zaehl, shop.absturz, shop.nach = "frisch", {}, False, {}, None, None
                    if vor_zurueck:
                        vor_zurueck(shop)
                    out["muts_vor_zurueck"] = len(shop.muts)
                    out["zurueck_rc"] = zurueck(list(zurueck_handles))
                    out["ledger_danach"] = ledger_lesen()
        finally:
            for k in namen:
                if k in vorher:
                    globals()[k] = vorher[k]
                else:
                    globals().pop(k, None)
            shutil.rmtree(tmp, ignore_errors=True)
        return out

    def sicher(fn):
        try:
            return fn()
        except Exception as e:
            return e

    schlaf = time.sleep
    time.sleep = lambda sek: None                        # Warteschleifen (Zurücklesen, READY) ohne Wartezeit
    try:
        r1 = sicher(lambda: lauf("tauschen"))
        r2 = sicher(lambda: lauf("tauschen", freigabe={("h-test", "11", "12")}))
        r3 = sicher(lambda: lauf("zuschneiden"))
        r4 = sicher(lambda: lauf("zuschneiden", lesen="hinkt", hinkt=10))
        r5 = sicher(lambda: lauf("tauschen", freigabe={("h-test", "11", "12")}, lesen="leer", zurueck_danach=True))
        r6 = sicher(lambda: lauf("zuschneiden", lesen="leer", zurueck_danach=True))
        r7 = sicher(lambda: lauf("tauschen", freigabe={("h-test", "11", "12")}, absturz=("app", 1, RuntimeError("gql: 8 Versuche, Drossel"))))
        r8 = sicher(lambda: lauf("zuschneiden", absturz=("app", 1, Absturz()), zurueck_danach=True))
        r9 = sicher(lambda: lauf("tauschen", freigabe={("h-test", "11", "12")}, teil={"h-test"}))
        # Nachbesserung 14.10. (zweite Prüfung): Lesung hinkt 12 + Shopify verweigert das Lösen im Rückbau
        r10 = sicher(lambda: lauf("zuschneiden", lesen="hinkt", hinkt=12, klemmt={"det": (2, 99)}, zurueck_danach=True))
        r11 = sicher(lambda: lauf("tauschen", freigabe={("h-test", "11", "12")}, lesen="hinkt", hinkt=12,
                                  klemmt={"det": (2, 99)}, zurueck_danach=True))
        r16 = sicher(lambda: lauf("zuschneiden", lesen="hinkt", hinkt=12, klemmt={"app": (2, 99)}, zurueck_danach=True))
        # Löschung, deren Antwort verloren ging (gfw.gql wiederholt → «does not exist»)
        r12 = sicher(lambda: lauf("zuschneiden", klemmt={"app": (1, 1)}, del_doppelt=True, zurueck_danach=True))

        def schon_geloescht(shop):            # frühere Löschung ohne Ledger-Zeile (Abbruch zwischen Löschen und Schreiben)
            for mid in shop.eigene:
                if mid in shop.medien:
                    shop.medien.remove(mid)
                    shop.geloescht.append(mid)
        r13 = sicher(lambda: lauf("zuschneiden", absturz=("app", 1, Absturz()), zurueck_danach=True, vor_zurueck=schon_geloescht))
        r14 = sicher(lambda: lauf("zuschneiden", zurueck_danach=True, zurueck_handles=("h-test", "h-test")))
        # Freigabe für ein ANDERES Ersatzbild (13) als das neue Urteil (12)
        r15 = sicher(lambda: lauf("tauschen", freigabe={("h-test", "11", "13")}))
        # Lösen ausgeführt, Antwort verloren; Lesung hinkt; Wieder-Anhängen verweigert → nur die Quittung zählt
        r17 = sicher(lambda: lauf("zuschneiden", lesen="hinkt", hinkt=12, nach=("det", 1, RuntimeError("Antwort verloren")),
                                  klemmt={"app": (1, 99)}, zurueck_danach=True))
    finally:
        time.sleep = schlaf
    alle_r = (r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13, r14, r15, r16, r17)
    alt_am_alten = {V1: M1, V2: M1}

    # Befund 1, Teil 2: Tausch im SCHARF-Lauf nur mit Freigabeliste; Zuschneiden ohne Liste
    f("Freigabe fehlt: SCHARF tauscht NICHT (0 Mutationen), Ledger «tausch-wartet»",
      lambda: not r1["laden"].muts and r1["laden"].v == alt_am_alten and [z["art"] for z in r1["ledger"]] == ["tausch-wartet"])
    f("«tausch-wartet» quittiert ohne Freigabe, mit Freigabe wieder offen",
      lambda: ("h-test", M1) in erledigt_aus(r1["ledger"]) and ("h-test", M1) not in erledigt_aus(r1["ledger"], frozenset({("h-test", "11", "12")})))
    f("Freigabe da: Tausch ausgeführt, beide Varianten am Ersatz, Ledger «tauschen» mit neue_media",
      lambda: r2["laden"].v == {V1: M2, V2: M2} and r2["ledger"][-1]["art"] == "tauschen" and r2["ledger"][-1]["neue_media"] == M2)
    f("Zuschneiden ohne Freigabe: ausgeführt, Original bleibt in der Galerie, nichts gelöscht",
      lambda: r3["laden"].v == {V1: r3["laden"].eigene[0], V2: r3["laden"].eigene[0]} and M1 in r3["laden"].medien
      and not r3["laden"].geloescht and r3["ledger"][-1]["art"] == "zuschneiden")
    f("Alt-Text des neuen Mediums: «Lesebrille – Black Frame Red Rope»",
      lambda: r3["laden"].alt_texte == ["Lesebrille – Black Frame Red Rope"])

    # Befund 3: «begonnen» VOR der ersten Mutation, Abbruch mitten im Umhängen
    f("Tausch: Ledger «begonnen-tauschen» (alt + neu) steht VOR der ersten Umhänge-Mutation",
      lambda: r2["laden"].ledger_vor_erster_mutation == ["begonnen-tauschen"] and r2["ledger"][0]["alte_media"] == M1
      and r2["ledger"][0]["neue_media"] == M2 and r2["ledger"][0]["varianten"] == "1,2")
    f("Zuschnitt: «begonnen-zuschneiden» mit der neuen Media-ID vor dem Umhängen",
      lambda: r3["laden"].ledger_vor_erster_mutation == ["begonnen-zuschneiden"]
      and r3["ledger"][0]["neue_media"] == r3["laden"].eigene[0])
    f("Abbruch (RuntimeError) zwischen Lösen und Anhängen: Varianten wieder am alten Bild, nicht bildlos",
      lambda: r7["laden"].v == alt_am_alten)
    f("… Ledger schliesst den Fall (begonnen-tauschen → fehler), kein Teilzustand",
      lambda: [z["art"] for z in r7["ledger"]] == ["begonnen-tauschen", "fehler"] and not teil_offen_aus(r7["ledger"]))
    f("Harter Abbruch mitten im Umhängen: letzte Zeile «begonnen-zuschneiden» mit alter/neuer Media und Varianten",
      lambda: r8["abbruch"] == "Absturz" and r8["ledger"][-1]["art"] == "begonnen-zuschneiden"
      and r8["ledger"][-1]["alte_media"] == M1 and r8["ledger"][-1]["neue_media"] == r8["laden"].eigene[0]
      and r8["ledger"][-1]["varianten"] == "1,2")
    f("… --zurueck repariert: Varianten wieder am alten Bild, eigenes Zuschnitt-Medium entfernt, Ledger «zurueck»",
      lambda: r8["zurueck_rc"] == 0 and r8["laden"].v == alt_am_alten and r8["laden"].geloescht == r8["laden"].eigene
      and r8["ledger_danach"][-1]["art"] == "zurueck")
    f("Teilzustand im Ledger → nächster Lauf fasst den Handle nicht an (0 Abfragen)",
      lambda: r9["z"]["prod"] == {"teilzustand-offen": 1} and r9["laden"].n == 0)
    f("teil_offen_aus: «begonnen-…» ohne Abschluss sperrt, «begonnen → zurueck» nicht",
      lambda: teil_offen_aus(r8["ledger"]) == {"h-test"} and not teil_offen_aus(r8["ledger_danach"]))

    # Befund 2: Zurücklesen scheitert
    f("Rücklesen hinkt 10 Lesungen (Zuschnitt): Varianten wieder am ALTEN Bild, nicht bildlos (Gegenprobe des Prüfers)",
      lambda: r4["laden"].v == alt_am_alten)
    f("… Zuschnitt-Medium erst nach QUITTIERTEM Rückbau gelöscht, Ledger schliesst mit «fehler»",
      lambda: r4["laden"].geloescht == r4["laden"].eigene and r4["ledger"][-1]["art"] == "fehler" and not teil_offen_aus(r4["ledger"]))
    f("Rücklesen dauerhaft leer (Tausch): «fehler-teil-tauschen» mit neue_media, --zurueck kennt den Fall",
      lambda: r5["ledger"][-1]["art"] == "fehler-teil-tauschen" and r5["ledger"][-1]["neue_media"] == M2
      and [z["alte_media"] for z in aenderungen_offen(r5["ledger"], "h-test")] == [M1] and teil_offen_aus(r5["ledger"]) == {"h-test"})
    f("… --zurueck: alt bestätigt, Ersatzbild bleibt in der Galerie, Ledger «zurueck»",
      lambda: r5["zurueck_rc"] == 0 and r5["laden"].v == alt_am_alten and M2 in r5["laden"].medien
      and not r5["laden"].geloescht and r5["ledger_danach"][-1]["art"] == "zurueck")
    f("Rücklesen dauerhaft leer (Zuschnitt): Medium NICHT gelöscht, «fehler-teil-zuschneiden» mit neue_media",
      lambda: not r6["geloescht_vor"] and r6["v_vor"] == alt_am_alten and r6["ledger"][-1]["art"] == "fehler-teil-zuschneiden"
      and r6["ledger"][-1]["neue_media"] == r6["laden"].eigene[0])
    f("… --zurueck: alt bestätigt, eigenes Zuschnitt-Medium entfernt, Original bleibt",
      lambda: r6["zurueck_rc"] == 0 and r6["laden"].v == alt_am_alten and r6["laden"].geloescht == r6["laden"].eigene
      and M1 in r6["laden"].medien)
    # ── Prüfer-Befund (mittel) 1: Rückbau nur mit QUITTUNG bestätigt, nie mit einer Lesung allein ──
    f("hinkt 12 + Lösen im Rückbau verweigert (Zuschnitt): nichts gelöscht, Varianten am Zuschnitt (nicht bildlos), "
      "Ledger offen «fehler-teil-zuschneiden» mit neue_media (Gegenprobe des Prüfers)",
      lambda: not r10["geloescht_vor"] and all(m == r10["laden"].eigene[0] for m in r10["v_vor"].values())
      and [z["art"] for z in r10["ledger"]] == ["begonnen-zuschneiden", "fehler-teil-zuschneiden"]
      and r10["ledger"][-1]["neue_media"] == r10["laden"].eigene[0] and teil_offen_aus(r10["ledger"]) == {"h-test"})
    f("… --zurueck (später, ohne Klemmen): rc 0, Varianten am alten Bild, Zuschnitt-Medium entfernt, Handle frei",
      lambda: r10["zurueck_rc"] == 0 and r10["laden"].v == alt_am_alten and r10["laden"].geloescht == r10["laden"].eigene
      and not teil_offen_aus(r10["ledger_danach"]))
    f("hinkt 12 + Lösen im Rückbau verweigert (Tausch): Ledger «fehler-teil-tauschen» statt «fehler», --zurueck rc 0 → alt",
      lambda: r11["ledger"][-1]["art"] == "fehler-teil-tauschen" and r11["ledger"][-1]["neue_media"] == M2
      and r11["v_vor"] == {V1: M2, V2: M2} and r11["zurueck_rc"] == 0 and r11["laden"].v == alt_am_alten
      and M2 in r11["laden"].medien and not r11["laden"].geloescht)
    f("hinkt 12 + Wieder-Anhängen im Rückbau verweigert: nichts gelöscht, Ledger offen; --zurueck repariert",
      lambda: not r16["geloescht_vor"] and r16["ledger"][-1]["art"] == "fehler-teil-zuschneiden"
      and r16["zurueck_rc"] == 0 and r16["laden"].v == alt_am_alten and r16["laden"].geloescht == r16["laden"].eigene)

    f("Lösen ausgeführt, Antwort verloren, Wieder-Anhängen verweigert: Varianten zählen als «womöglich gelöst» → nichts "
      "gelöscht, Ledger offen; --zurueck repariert",
      lambda: not r17["geloescht_vor"] and r17["ledger"][-1]["art"] == "fehler-teil-zuschneiden"
      and r17["zurueck_rc"] == 0 and r17["laden"].v == alt_am_alten and r17["laden"].geloescht == r17["laden"].eigene)

    def bau_probe(lesung, quittung, verloren, ruhe=0):
        """_zurueckbauen allein: Lesung zeigt immer «lesung»; quittung = Wieder-Anhängen ohne userError?"""
        def g(q, v=None):
            if "nodes(ids:" in q:
                return {"data": {"nodes": [{"id": k, "media": {"nodes": [{"id": lesung}] if lesung else []}} for k in v["ids"]]}}
            if "productVariantDetachMedia" in q:
                return {"data": {"productVariantDetachMedia": {"userErrors": [{"message": "nicht angehängt"}]}}}
            if "productVariantAppendMedia" in q:
                return {"data": {"productVariantAppendMedia": {"userErrors": [] if quittung else [{"message": "hat schon ein Bild"}]}}}
            raise AssertionError(q[:60])
        vorher, schl = globals()["gql"], time.sleep
        globals()["gql"], time.sleep = g, (lambda sek: None)
        try:
            return _zurueckbauen("P", ["V1", "V2"], "ALT", "NEU", verloren=verloren, ruhe=ruhe)[0]
        finally:
            globals()["gql"], time.sleep = vorher, schl
    f("_zurueckbauen: Lesung «alt» OHNE Quittung (im Lauf) → NICHT bestätigt", lambda: bau_probe("ALT", False, {"V1", "V2"}) is False)
    f("_zurueckbauen: Quittung + Lesung «alt» → bestätigt", lambda: bau_probe("ALT", True, {"V1", "V2"}) is True)
    f("_zurueckbauen: Quittung, aber Lesung zeigt «neu» → NICHT bestätigt", lambda: bau_probe("NEU", True, {"V1", "V2"}) is False)
    f("_zurueckbauen: Varianten nie gelöst (verloren leer) + Lesung «alt» → bestätigt", lambda: bau_probe("ALT", False, set()) is True)
    f("_zurueckbauen: --zurueck (Ruhe > 0), keine Quittung, zweimal «alt» gelesen → bestätigt",
      lambda: bau_probe("ALT", False, None, ruhe=60) is True)

    def del_probe(antwort):
        """medium_entfernen (im Lauf): nur deletedMediaIds zählt."""
        def g(q, v=None):
            if "productDeleteMedia" in q:
                if isinstance(antwort, Exception):
                    raise antwort
                return antwort
            raise AssertionError(q[:60])
        vorher = globals()["gql"]
        globals()["gql"] = g
        try:
            return medium_entfernen("P", "NEU")
        finally:
            globals()["gql"] = vorher
    f("medium_entfernen im Lauf: nur deletedMediaIds zählt; null/«does not exist»/Ausnahme → nicht entfernt",
      lambda: del_probe({"data": {"productDeleteMedia": {"deletedMediaIds": ["NEU"]}}}) is True
      and del_probe({"data": {"productDeleteMedia": {"deletedMediaIds": None, "mediaUserErrors": [{"message": "does not exist"}]}}})
      is False and del_probe(RuntimeError("Antwort verloren")) is False)

    # ── Prüfer-Befund (mittel) 2: --zurueck ohne Sackgasse, wenn das eigene Medium schon weg ist ──
    f("Löschantwort verloren (gfw wiederholt → «does not exist»): Lauf lässt es offen, --zurueck rc 0, Medium weg, Handle frei",
      lambda: r12["ledger"][-1]["art"] == "fehler-teil-zuschneiden" and r12["v_vor"] == alt_am_alten
      and r12["zurueck_rc"] == 0 and r12["ledger_danach"][-1]["art"] == "zurueck" and not teil_offen_aus(r12["ledger_danach"])
      and not [m for m in r12["laden"].eigene if m in r12["laden"].medien])
    f("«begonnen-zuschneiden», eigenes Medium schon gelöscht (Abbruch vor der Ledger-Zeile): --zurueck rc 0, Handle frei",
      lambda: r13["ledger"][-1]["art"] == "begonnen-zuschneiden" and r13["zurueck_rc"] == 0
      and r13["laden"].v == alt_am_alten and r13["ledger_danach"][-1]["art"] == "zurueck"
      and not teil_offen_aus(r13["ledger_danach"]) and M1 in r13["laden"].medien)
    f("«--zurueck h h» (Handle doppelt): einmal bearbeitet, rc 0, genau eine «zurueck»-Zeile, Handle frei",
      lambda: r14["zurueck_rc"] == 0 and [z["art"] for z in r14["ledger_danach"]].count("zurueck") == 1
      and r14["ledger_danach"][-1]["art"] == "zurueck" and not teil_offen_aus(r14["ledger_danach"])
      and r14["laden"].v == alt_am_alten)

    # ── Prüfer-Befund (mittel) 3: Freigabe an das gesichtete PAAR gebunden, feste Sperre gegen fremde Variantenbilder ──
    f("Freigabe für Paar 11→13, neues Urteil 11→12: 0 Mutationen, «tausch-wartet», neues Paar in der Notiz",
      lambda: not r15["laden"].muts and r15["laden"].v == alt_am_alten and r15["ledger"][-1]["art"] == WARTET
      and "h-test:11:12" in r15["ledger"][-1]["notiz"] and r15["ledger"][-1]["methode"] == GEPRUEFT + "13"
      and r15["ledger"][-1]["neue_media"] == M2)
    f("… dieselbe Freigabe öffnet den Fall nicht erneut (kein Vision-Kontingent), eine NEUE Freigabe (11→12) schon",
      lambda: ("h-test", M1) in erledigt_aus(r15["ledger"], frozenset({("h-test", "11", "13")}))
      and ("h-test", M1) not in erledigt_aus(r15["ledger"], frozenset({("h-test", "11", "13"), ("h-test", "11", "12")})))
    f("Freigabe für ein anderes altes Bild desselben Handles öffnet nichts",
      lambda: ("h-test", M1) in erledigt_aus(r1["ledger"], frozenset({("h-test", "99", "12")})))

    def V(i, farbe, groesse, media):
        return {"id": f"V{i}", "title": f"{farbe} / {groesse}", "media": media,
                "options": [{"name": "Farbe", "value": farbe}, {"name": "Grösse", "value": groesse}]}
    rot = [V(1, "Rot", "S", "A"), V(2, "Rot", "M", "A")]
    hemd = rot + [V(3, "Bordeaux", "S", "C")]
    f("Sperre: Ersatz = Variantenbild «Bordeaux» für Rot → gesperrt",
      lambda: "Bordeaux" in fremdes_variantenbild(rot, ["C"], hemd))
    f("Sperre: Ersatz ist kein Variantenbild → frei", lambda: fremdes_variantenbild(rot, ["B"], hemd) == "")
    split = [V(1, "Rot", "S", "A"), V(2, "Rot", "M", "B"), V(3, "Blau", "S", "C"), V(4, "Blau", "M", "C")]
    f("Sperre: Rot/M hat ein eigenes Bild, Ersatz für Rot/S → frei (gleiche Bild-Option «Farbe»)",
      lambda: bild_optionen(split) == ["Farbe"] and fremdes_variantenbild(split[:1], ["B"], split) == "")
    misch = [{"id": "L1", "title": "100 degrees-Red", "media": "R", "options": [{"name": "Farbe", "value": "100 degrees-Red"}]},
             {"id": "L2", "title": "125 degrees-Red", "media": "R", "options": [{"name": "Farbe", "value": "125 degrees-Red"}]},
             {"id": "L3", "title": "100 degrees-Black", "media": "K", "options": [{"name": "Farbe", "value": "100 degrees-Black"}]}]
    f("Sperre: Option mischt Grad und Farbe (keine Bild-Option) → fremdes Variantenbild gesperrt",
      lambda: "nicht vergleichbar" in fremdes_variantenbild(misch[:2], ["K"], misch))

    def hemd_lauf(ersatz_nr):
        """Prüfer-Szenario (freigabe_bindung): Rot S/M an Bild 11 mit Einblendung, Bordeaux an 13, sauberes Rot-Foto 12.
        Trockenlauf mit TROCKEN_BILDER: was plant ein_produkt, welcher Kontaktbogen entsteht?"""
        A, B, C = "gid://shopify/MediaImage/11", "gid://shopify/MediaImage/12", "gid://shopify/MediaImage/13"
        T = {"gid://shopify/ProductVariant/1": ("Rot", "S", A), "gid://shopify/ProductVariant/2": ("Rot", "M", A),
             "gid://shopify/ProductVariant/3": ("Bordeaux", "S", C)}

        def g(q, v=None):
            if "productByIdentifier" in q:
                return {"data": {"p": {"id": "gid://shopify/Product/8", "handle": "h-hemd", "title": "Shirt", "status": "ACTIVE",
                                       "publishedOnPublication": True,
                                       "media": {"nodes": [{"id": m, "image": {"url": "u:" + m}} for m in (A, B, C)]}}}}
            if "variants(first:100" in q:
                return {"data": {"product": {"variants": {"pageInfo": {"hasNextPage": False, "endCursor": None}, "nodes": [
                    {"id": k, "title": f"{fa} / {gr}", "selectedOptions": [{"name": "Farbe", "value": fa}, {"name": "Grösse", "value": gr}],
                     "media": {"nodes": [{"id": m}]}} for k, (fa, gr, m) in T.items()]}}}}
            raise AssertionError("Trockenlauf: unerwartete Abfrage " + q[:50])

        def u(text, bs, beide=True):
            if text.startswith("[AUFGABE-PRODUKT]"):        # Nummern: 1 = Bild 11, 2 = Bild 13 (Bordeaux), 3 = Bild 12
                gg = {"bilder": [{"nr": 1, "einblendung": True, "ort": "rand-oben"}, {"nr": 2, "einblendung": False, "ort": "keine"},
                                 {"nr": 3, "einblendung": False, "ort": "keine"}],
                      "varianten": [{"nr": 1, "ersatz": ersatz_nr}, {"nr": 2, "ersatz": 0}]}
                return gg, json.loads(json.dumps(gg))
            if text.startswith("[AUFGABE-BOX]"):
                return {"flaechig": True}, None
            raise AssertionError("unerwartet " + text[:30])
        farbe = {"u:" + A: (200, 0, 0), "u:" + B: (230, 0, 0), "u:" + C: (120, 0, 40)}
        namen = ("gql", "laden", "urteil_netz", "SCHARF", "TROCKEN_BILDER")
        vorher = {k: globals()[k] for k in namen}
        ordner = tempfile.mkdtemp(prefix="gvo_bogen_")
        try:
            globals().update(gql=g, laden=lambda url, breite=None: Image.new("RGB", (64, 64), farbe[url]), urteil_netz=u,
                             SCHARF=False, TROCKEN_BILDER=ordner)
            z = {"prod": {}, "bild": {}, "zeilen": []}
            with contextlib.redirect_stdout(io.StringIO()):
                ein_produkt("h-hemd", set(), z, Frei, types.SimpleNamespace(bearbeite=lambda im: ("unsicher", {}, None)))
            return {r[2]: r for r in z["zeilen"]}, sorted(os.listdir(ordner))
        finally:
            globals().update(vorher)
            shutil.rmtree(ordner, ignore_errors=True)
    f("ein_produkt: Vision wählt das Bordeaux-Variantenbild als Ersatz für Rot → KEIN Tausch, kein Kontaktbogen",
      lambda: (lambda zl, bo: zl["11"][4] != "tauschen" and "Bordeaux" in zl["11"][3] and bo == [])(*hemd_lauf(2)))
    f("ein_produkt (Trockenlauf): Tausch auf das saubere Rot-Foto → Kontaktbogen «alt | Ersatz» + Freigabe-Zeile h:alt:ersatz",
      lambda: (lambda zl, bo: zl["11"][4] == "tauschen" and zl["11"][6] == "h-hemd:11:12"
               and "TAUSCH_FREIGABE=h-hemd:11:12" in zl["11"][3] and bo == ["h-hemd_11_tauschen_12.jpg"])(*hemd_lauf(3)))

    # ── Prüfer-Befund (mittel) 4: text-weg darf den Artikel nicht verändern ──
    leer_bild = Image.new("RGB", (800, 800), (255, 255, 255))
    ecke = leer_bild.copy(); ImageDraw.Draw(ecke).rectangle((20, 20, 280, 80), fill=(250, 250, 250))
    mitte = ecke.copy(); ImageDraw.Draw(mitte).rectangle((250, 420, 640, 520), fill=(250, 250, 250))
    f("Randband: Änderung nur oben links, Prüfer ecke-oben-links + rand-oben → ok",
      lambda: aenderung_im_rand(leer_bild, ecke, ("ecke-oben-links", "rand-oben"))[0] is True)
    f("Randband: Aufdruck in der Mitte mit übermalt (Prüfer-Gegenprobe «SUMMER VIBES») → abgelehnt",
      lambda: aenderung_im_rand(leer_bild, mitte, ("ecke-oben-links", "ecke-oben-links"))[0] is False)
    f("Randband: Prüfer nennen keine gemeinsame Seite (rand-links / rand-oben) → abgelehnt",
      lambda: aenderung_im_rand(leer_bild, ecke, ("rand-links", "rand-oben"))[0] is False)
    f("Randband: 1 Pixel Unterschied bei 0,1 Helligkeit zählt (exakt, nicht L > 40)",
      lambda: (lambda k: (k.putpixel((400, 400), (255, 255, 254)), aenderung_im_rand(leer_bild, k, ("rand-oben", "rand-oben"))[0])[1]
               is False)(leer_bild.copy()))
    tw_aufrufe = []

    def tw_urteil(antwort_pruef):
        def u(text, bs, beide=True):
            tw_aufrufe.append((text.split("]")[0].strip("["), len(bs), "ORIGINAL" in text))
            if text.startswith("[AUFGABE-PRODUKT]"):
                gg = {"bilder": [{"nr": 1, "einblendung": True, "ort": "ecke-oben-links"}], "varianten": [{"nr": 1, "ersatz": 0}]}
                return gg, json.loads(json.dumps(gg))
            if text.startswith("[AUFGABE-PRUEF]"):
                return dict(antwort_pruef), dict(antwort_pruef)
            return {"einblendungen": [[0, 0, 120, 380]], "artikel": [400, 100, 1000, 900], "flaechig": False}, None
        return u
    ok_tw = {"einblendung": False, "artikel_vollstaendig": True, "artikel_unveraendert": True}

    def tw_plan(kand, antwort=ok_tw):
        tw_aufrufe.clear()
        return plane_produkt("Shirt", [_jpg(leer_bild)], {"m1": 1}, {"m1": [var("Weiss")]}, tw_urteil(antwort),
                             lambda m: leer_bild.copy(), lambda im: ("bereinigt", {}, kand.copy()))[0]
    f("text-weg nur am Rand: zuschneiden «text-weg», Prüfung sieht Original UND Kandidat (2 Bilder)",
      lambda: (lambda r: r["plan"] == "zuschneiden" and r["methode"] == "text-weg"
               and tw_aufrufe[-1] == ("AUFGABE-PRUEF", 2, True))(tw_plan(ecke)))
    f("text-weg übermalt auch die Mitte: Kandidat verworfen → Randstreifen-Weg (Box), nie «text-weg»",
      lambda: (lambda r: r["methode"] != "text-weg" and "Randband" in r["grund"]
               and [a[0] for a in tw_aufrufe] == ["AUFGABE-PRODUKT", "AUFGABE-BOX", "AUFGABE-PRUEF"])(tw_plan(mitte)))
    f("text-weg: Prüfer bestätigen «Artikel unverändert» nicht (Feld fehlt) → lassen",
      lambda: tw_plan(ecke, {"einblendung": False, "artikel_vollstaendig": True})["plan"] == "lassen")

    f("Gelöscht wird in allen Abläufen nur, was der Lauf selbst angelegt hat (nie Original, nie Ersatz)",
      lambda: all(set(r["laden"].geloescht) <= set(r["laden"].eigene) for r in alle_r))
    f("Kein Ablauf lässt eine Variante bildlos oder an einem gelöschten Medium zurück, ohne dass das Ledger offen ist",
      lambda: all(all(m is not None and m not in r["geloescht_vor"] for m in r["v_vor"].values())
                  or teil_offen_aus(r["ledger"]) for r in alle_r))
    f("Abläufe ohne unerwartete Ausnahme (ausser dem gewollten harten Abbruch)",
      lambda: all(r["ausnahme"] is None for r in alle_r))

    fehler = [n for n, ok in faelle if not ok]
    for n, ok in faelle:
        print(("  ok  " if ok else "  FEHLER ") + n)
    print(f"Selbsttest google_variantenbild_overlay: {len(faelle) - len(fehler)}/{len(faelle)}")
    return not fehler


if __name__ == "__main__":
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest() else 1)
    if "--zurueck" in sys.argv:
        sys.exit(zurueck([a for a in sys.argv[sys.argv.index("--zurueck") + 1:] if not a.startswith("-")]))
    sys.exit(main())
