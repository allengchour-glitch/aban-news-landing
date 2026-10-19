#!/usr/bin/env python3
"""kollektion_versprechen_s3.py — S3 «Unbelegte Versprechen» in Kollektionstexten (Schritte 1–7, 14.10.2026).

WARUM (GEMESSEN 14.10.2026, Admin-API, 568 Kollektionen, 396 im Onlineshop; Grundlage S3_messung.json):
  Kollektionstexte (descriptionHtml + seo.title/description) versprechen, was niemand belegt: «✔ Geprüfte Angaben /
  Qualität», «schnelle Lieferung» / «Blitzversand» bei Ware, die laut Kasse 10–20 Werktage braucht, «Premium-Marken»
  bei Eigenmarke, «Gratis-Versand ab CHF 50» ohne Land (Liechtenstein zahlt immer CHF 14.90), «30 Tage Rückgabe» bei
  Selbst-gestalten-Ware (laut Richtlinie ausgenommen) und abgeschnittene SEO-Beschreibungen («… in die Schwe…»).
  Microsoft lehnte am 01.10. als «irreführend» ab; KI-Prüfer lesen genau diese Texte.

REGELN (feste Satzpaare/Muster, nichts frei generiert; Reihenfolge je Feld = Reihenfolge unten):
  R8  abgeschnittene SEO-Beschreibung («…» am Ende ODER ≥ 150 Zeichen ohne Schlusszeichen) → Vorlage «<Titel> online
      kaufen bei LuxeStyle: Gratis-Versand in der Schweiz ab CHF 50, 30 Tage Rückgabe, Lieferzeit auf jeder Produktseite.»,
      sonst ganze Sätze aus der eigenen Beschreibung / letzter ganzer Satz / Ende am letzten Gedankenstrich (+ die
      abgeschnittene Gratis-Aussage wieder angehängt, wenn Platz ist)
  R1  Trust-Zeile «✔ Geprüfte Angaben · 🚚 … · Gratis-Versand ab CHF 50 · …» → «🚚 Lieferzeit auf jeder Produktseite ·
      Gratis-Versand in der Schweiz ab CHF 50 · ↩️ 30 Tage Rückgabe · –10 % mit Code WELCOME10» (+ Varianten)
  R7  Selbst gestalten: «↩️ 30 Tage Rückgabe» → «↩️ Ersatz bei Druckfehlern», Rückgabe-Sätze → Ausschluss-Satz
  R3  «✔ Geprüfte Angaben/Qualität/Auswahl/Ware» streichen (+ Handfälle)
  R5  «Premium» als Qualitäts-/Markenbehauptung ausserhalb der Premium-Kollektionen (+ sachliche Satzpaare IN den
      Premium-Kollektionen: «exklusive», «Entertainment-Erlebnis», «Premium-Produkte, die deinen Alltag bereichern»)
  R4  Tempo-Wörter/Werktage mit Tor: Anteil `profil-ch-lager` unter den AKTIVEN Produkten der Kollektion LIVE gemessen
      (VOLL ≥ voll, VIEL ≥ teil, sonst KAUM — Schwellen aus versprechen_regel.json → kollektion.tempo, dieselben wie der
      Wächter; unter teil fällt jede Werktage-Zusage, wie die PLAN-Regel S3 Schritt 3 verlangt); der Lager-Ort allein bleibt,
      «viele Artikel/vieles ab Schweizer Lager» nur ab tempo.lager_viele Anteil `ch-lager`; EU-Aussagen gegen `eu-lager`
  R9  Marke oder Ware im Text ohne aktives Produkt (Prüfung S3 14.10. spät: «Givenchy …», «Sonax, Turtle Wax & Goodyear», «IPL-Geräte»
      bei 0 IPL-Geräten) → feste Satzpaare auf LIVE gemessene aktive Ware (INHALT_PAARE); der Wächter zählt Marken ohne Ware als R9 rot
      (Liste kollektion.marken_ohne_ware) und Ware ohne aktives Produkt als Hinweis (kollektion.ware_im_text)
      Runde 3 (Prüfung S3 14.10. 13:36): Ersatztexte nennen Warengruppen mit ≥ 2 aktiven Produkten statt Einzelstücke; JEDE genannte
      Ware steht als «im Ersatztext genannt» in kollektion.ware_im_text (Muster trifft Text UND aktiven Titel, Beispiel in genannt_beleg)
      → der Wächter meldet ihren Wegfall, und S3 prüft VOR dem Schreiben gegen die live aktiven Titel (r9_ware_pruefen): fehlt die
      Ware, wird das Satzpaar nicht gesetzt («offen» R9-WARE). R9 im SEO-Titel nur in Handfällen (R9_SEO_T: 3d-drucker), sonst
      bleiben Titel/SEO-Titel «manuell».
  R6  «Gratis-Versand / gratis / versandkostenfrei / kostenloser Versand ab CHF 50» ohne Land-Beleg in der NÄHE (Land-Regel +
      land_naehe aus versprechen_regel.json, dieselben wie der Wächter) → «… in der Schweiz …»; danach in DEMSELBEN Satz
      die überzählige Land-Angabe weg («…, Lieferung in die ganze Schweiz.», «für alle Bestellungen in der Schweiz»)
  Danach: SEO-Beschreibung ≤ 155 (nie «…»; zu lang → schwache Teilaussagen streichen, NICHT gierig: die Kombination, die das
  Wichtigste behält — Rückgabe vor Lieferzeit vor Langform «in der Schweiz» vor «TWINT & Klarna» vor «LuxeStyle Schweiz» vor
  «Jetzt … entdecken» vor «Schweizer Shop» vor WELCOME10 vor «grosse Auswahl» —, bei Gleichstand die längste; Muster
  koll_seo_laengen._auswahl; passt das Land trotzdem nicht, bleibt R6 in DIESER SEO-Beschreibung weg → «offen»).
  Tempo-Tor-Messung: Kombination collection_id + tag zählt in der Produktsuche 0 (GEMESSEN 14.10.) → es wird geblättert.
  Stufe-3-Kandidaten (ch-lager ≥ 95 %, profil < 50 %): nach Stufe 3 (≥ 17.10.) neu messen, dann
  `--zurueck-regel R4 <handle>` (setzt NUR die R4-Änderungen zurück, R1/R3/R6 bleiben) und S3 erneut laufen lassen.
  Rest nach den Regeln = versprechen_wache.koll_funde (derselbe Finder wie die Ampel-Zeile KOLL-VERSPRECHEN).

NICHT ANGEFASST: <!--gd2-->, der Block <!-- ls-verwandt -->…<!-- /ls-verwandt --> (interne_links.py), jeder Absatz
  <p data-lux-anlass="…">…</p> (anlass_lieferzeit_wache.py) und alle übrigen HTML-Kommentare — sie werden vor den
  Regeln maskiert und danach wörtlich zurückgesetzt; stimmen sie nicht byte-genau, wird die Kollektion übersprungen.
  Premium-Kollektionen (Liste + Handle-Regel aus versprechen_regel.json, wie der Wächter) bekommen NUR ihre Satzpaare
  (PREMIUM_VOLL=1 schaltet R1/R3/R6/R8 dort zu — bleibt AUS, Betreiber-Entscheid; der Wächter zeigt sie als «Premium-Hinweis»).

  python3 automation/kollektion_versprechen_s3.py --selbsttest
  S3_TROCKEN=<pfad.tsv> python3 automation/kollektion_versprechen_s3.py          # Trockenlauf (Standard, schreibt NICHTS nach Shopify)
  SCHARF=1 [CAP=n] [NUR=h1,h2] python3 automation/kollektion_versprechen_s3.py   # Selbsttest-Tor, schreibt, liest zurück, Ledger
  [SCHARF=1] python3 automation/kollektion_versprechen_s3.py --zurueck [handle …]           # alles zurück (nur bis Kettenbruch)
  [SCHARF=1] python3 automation/kollektion_versprechen_s3.py --zurueck-regel R4 [handle …]  # nur eine Regel zurück
  Ohne SCHARF=1 zeigen auch --zurueck/--zurueck-regel nur. Unbekannte Argumente → Hilfe, Exit 2 (Lehre herbst 14.10.).
  Nicht während des koll_seo_laengen-Tageslaufs starten (Aufseher, ~12:50–13:30 UTC): S3 nimmt dessen Sperre je Kollektion
  nur kurz, ein Start von koll_seo_laengen genau in diesem Moment endet aber mit «läuft schon» und ruht 20 h.
Ledger: dropship/_kollektion_versprechen_s3.tsv — zeit, handle, feld, alt, neu, status, regeln, schluessel (\\ \\t \\n escaped,
  umkehrbar). Vor JEDEM collectionUpdate je Feld «geplant» (fsync), nach erfolgreichem Rücklesen «ok» (neu = Rückgelesenes),
  sonst «fehler». --zurueck: «geplant» ohne «ok» → live == neu: zurücksetzen · live == alt: nichts · sonst melden. Dieser Vergleich ist
  STRENG (nur &amp; und Leerraum toleriert, Tags samt Attributen exakt): ohne «ok» gibt es kein Rückgelesenes, und eine fremde reine
  Markup-Änderung (umgebogene href) darf --zurueck nicht still überschreiben (Prüfung S3 14.10. spät).
Sperren: eigene /tmp/lock_kollektion_versprechen_s3.lock für den ganzen Lauf; /tmp/lock_koll_seo_laengen_intern.lock nur je
  Kollektion um Frisch-Lesen, Schreiben und Rücklesen.
Letzte Zeile: «KOLL-S3 (DRY|SCHARF): …» bzw. «KOLL-S3 ZURÜCK …» — auch nach Fehlern. Exit 1 auch bei «gesperrt» > 0 (Lauf nicht fertig)
  bzw. bei «Abweichung» > 0 im Rückweg (nicht alles zurück). Schutzschalter S3_RUECK_STOPP (Standard 3): so viele Rücklese-Abweichungen
  in Folge → keine weiteren Mutationen im Lauf.
"""
import fcntl
import html as html_mod
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)

SCHARF = os.environ.get("SCHARF") == "1"
CAP = int(os.environ.get("CAP") or 0)
NUR = {h.strip() for h in (os.environ.get("NUR") or "").split(",") if h.strip()}
PREMIUM_VOLL = os.environ.get("PREMIUM_VOLL") == "1"
LEDGER = os.environ.get("S3_LEDGER") or os.path.join(REPO, "dropship", "_kollektion_versprechen_s3.tsv")
TROCKEN = os.environ.get("S3_TROCKEN") or "/tmp/kollektion_versprechen_s3_trocken.tsv"
# 14.10.2026 abends (Prüfung S3): EIGENE Sperre für den ganzen Lauf; die Sperre von koll_seo_laengen.py nur kurz je Kollektion
EIGENE_SPERRE = os.environ.get("S3_SPERRE") or "/tmp/lock_kollektion_versprechen_s3.lock"
SPERRE = os.environ.get("S3_KOLL_SPERRE") or "/tmp/lock_koll_seo_laengen_intern.lock"
SPERRE_WARTEN = float(os.environ.get("S3_SPERRE_WARTEN") or 300)   # Sekunden je Kollektion, dann übersprungen
# Schutzschalter: so viele Rücklese-ABWEICHUNGEN in Folge (nicht Netzfehler) → keine weiteren Mutationen (systematische Normalisierung,
# die das Rücklesen nicht kennt, würde sonst ~478 Kollektionen in «fehler» schreiben, die --zurueck nicht sicher zurücknimmt). 0 = aus.
RUECK_STOPP = int(os.environ.get("S3_RUECK_STOPP") or 3)

SEO_D_MAX, SEO_T_MAX = 155, 70
# EINE Regelquelle mit dem Wächter (versprechen_wache.py): Land-Beleg, Nähe, Premium-Liste, Tempo-Schwellen
REGEL_KO = json.load(open(os.path.join(HIER, "data", "versprechen_regel.json"), encoding="utf-8"))["kollektion"]
_R6 = REGEL_KO["finder"]["R6"]
_TEMPO = REGEL_KO["tempo"]
VOLL_AB, VIEL_AB, LAGER_VIELE_AB = float(_TEMPO["voll"]), float(_TEMPO["teil"]), float(_TEMPO["lager_viele"])
PREMIUM_LISTE = set(REGEL_KO["premium_kollektionen"])
PREMIUM_RX = re.compile(REGEL_KO["premium_handle"], re.I)
PREMIUM_NICHT = set(REGEL_KO["premium_handle_ausnahme"])


def ist_premium(h):
    """Premium-Kollektion — dieselbe Regel wie versprechen_wache.premium_kollektion (Liste + Handle-Regel − Ausnahmen)."""
    return (h or "") in PREMIUM_LISTE or (bool(PREMIUM_RX.search(h or "")) and h not in PREMIUM_NICHT)


SG = {"selbst-gestalten-1", "sg-bekleidung", "sg-taschen", "sg-wohnen", "sg-trinken", "sg-accessoires", "sg-alle",
      "✏️-selbst-gestalten"}

# ─────────────────────────────────────────────────────────────── Schutz (Maskieren)
SCHUTZ_RX = re.compile(r"<!--\s*ls-verwandt\s*-->.*?<!--\s*/ls-verwandt\s*-->"
                       r"|<p\b[^>]*\bdata-lux-anlass=\"[^\"]*\"[^>]*>.*?</p>"
                       r"|<!--.*?-->", re.S)
TOK_RX = re.compile("\uE000(\\d+)\uE001")


def maskieren(html):
    teile = []

    def ers(m):
        teile.append(m.group(0))
        return f"\uE000{len(teile) - 1}\uE001"
    return SCHUTZ_RX.sub(ers, html or ""), teile


def entmaskieren(text, teile):
    gefunden = [int(x) for x in TOK_RX.findall(text)]
    if sorted(gefunden) != list(range(len(teile))):
        raise ValueError(f"Schutzblock verloren/verdoppelt: {gefunden} statt {len(teile)}")
    return TOK_RX.sub(lambda m: teile[int(m.group(1))], text)


def schutz_bilanz(html):
    h = html or ""
    return (h.count("<!--gd2-->"), len(re.findall(r"<!--\s*ls-verwandt\s*-->", h)),
            len(re.findall(r"<!--\s*/ls-verwandt\s*-->", h)),
            tuple(re.findall(r"<p\b[^>]*\bdata-lux-anlass=\"[^\"]*\"[^>]*>.*?</p>", h, re.S)),
            tuple(re.findall(r"<!--\s*ls-verwandt\s*-->.*?<!--\s*/ls-verwandt\s*-->", h, re.S)))


# ─────────────────────────────────────────────────────────────── Hilfen
VOR_WORT = r"(?<![0-9A-Za-zÄÖÜäöüß-])"
FUNKTION = {"ab", "vieles", "viele", "einige", "einiges", "teils", "in", "meist", "die", "das"}
GRENZE_RX = re.compile(r"[.!?](?=\s|<|$|\uE000)|[·|•]|</?(?:p|li|ul|ol|h\d|div|br|tr|td)\b[^>]*>|\uE000\d+\uE001")
# Land-Beleg + Nähe: versprechen_regel.json → kollektion.finder.R6 (ohne Flag i, wie im Wächter). KEIN Beleg: «Schweizer Shop»,
# «LuxeStyle Schweiz», «Schweizer Lager», «aus der Schweiz», «Liechtenstein».
LAND_RX = re.compile(_R6["land"])
LAND_NAEHE = int(_R6["land_naehe"])


def sichtbar(html):
    t = TOK_RX.sub(" ", html or "")
    t = re.sub(r"<[^>]+>", " ", t)
    t = t.replace("&amp;", "&").replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", t).strip()


def _grenzen(text, a, e):
    links, rechts = 0, len(text)
    for m in GRENZE_RX.finditer(text):
        if m.end() <= a:
            links = m.end()
        elif m.start() >= e:
            rechts = m.start()
            break
    return links, rechts


def satzteil(text, a, e):
    """Sichtbarer Text des Satzteils um text[a:e] (Grenzen . ! ? · | • und Block-Tags)."""
    links, rechts = _grenzen(text, a, e)
    return sichtbar(text[links:rechts])


def land_nah(text, a, e):
    """Land-Beleg im Satzteil um text[a:e], höchstens LAND_NAEHE sichtbare Zeichen davor/dahinter (wie versprechen_wache.land_nah;
    gezählt am sichtbaren Text, Tags zählen nicht)."""
    links, rechts = _grenzen(text, a, e)
    vor = sichtbar(text[links:a])
    mitte = sichtbar(text[a:e])
    nach = sichtbar(text[e:rechts])
    s = " ".join(x for x in (vor, mitte, nach) if x)
    i = len(vor) + (1 if vor else 0)
    j = i + len(mitte)
    return any(m.end() >= i - LAND_NAEHE and m.start() <= j + LAND_NAEHE for m in LAND_RX.finditer(s))


def satzanfang(text, pos):
    """True, wenn vor pos (ohne Leerraum und Inline-Tags) ein Satz beginnt."""
    vor = re.sub(r"(?:<(?:strong|b|em|i|span|a)\b[^>]*>|</(?:strong|b|em|i|span|a)>|\s)+$", "", text[:pos])
    if not vor:
        return True
    z = vor[-1]
    return not (z.isalnum() or z in ",;:–—-(«\"'")


def fall(orig, neu, text, pos):
    """Funktionswort am Anfang der Ersetzung (ab/vieles/in …) folgt dem Satzanfang; Nomen bleiben gross."""
    if not neu:
        return neu
    w = neu.split(" ", 1)[0].lower()
    if w not in FUNKTION:
        return neu
    return (neu[0].upper() if satzanfang(text, pos) else neu[0].lower()) + neu[1:]


def glaetten(neu, alt):
    """Kosmetik NUR für Muster, die der Ausgangstext nicht schon hatte (fremde Formatierung bleibt)."""
    if neu == alt:
        return neu
    for rx, ers in ((r"(?<=\S) {2,}(?=\S)", " "),
                    (r"(?<=[^\s·|•]) +([,.;:!?])(?=\s|<|$)", r"\1"),
                    (r"([,;:])\1+", r"\1"),
                    (r"(?<!\.)\.\.(?!\.)", "."),
                    (r"·\s*·", "·"),
                    (r"(<p\b[^>]*>|<li\b[^>]*>)\s*[·,]\s*", r"\1"),
                    (r"\s*[·,]\s*(</p>|</li>)", r"\1"),
                    (r"<p>\s*</p>|<li>\s*</li>", "")):
        if not re.search(rx, alt):
            neu = re.sub(rx, ers, neu)
    if "<" not in neu and not re.search(r"^\s*[·,]|[·,]\s*$", alt):
        neu = re.sub(r"^\s*[·,]\s*|\s*[·,]\s*$", "", neu)
    return neu


class Fund:
    __slots__ = ("regel", "alt", "neu")

    def __init__(self, regel, alt, neu):
        self.regel, self.alt, self.neu = regel, alt, neu


def paar(text, alt, neu, regel, funde, genau_eins=False, offen=None):
    k = text.count(alt)
    if not k:
        return text
    if genau_eins and k != 1:
        if offen is not None:
            offen.append(f"{regel}: Baustein {k}× («{alt[:40]}…»)")
        return text
    funde.extend(Fund(regel, alt, neu) for _ in range(k))
    return text.replace(alt, neu)


def regex(text, rx, ers, regel, funde, ctx=None):
    """ers: str (mit \\1) oder f(m, text) → str | None (None = stehen lassen)."""
    out, pos = [], 0
    for m in rx.finditer(text):
        neu = ers(m, text) if callable(ers) else m.expand(ers)
        if neu is None or neu == m.group(0):
            continue
        out.append(text[pos:m.start()])
        out.append(neu)
        funde.append(Fund(regel, m.group(0), neu))
        pos = m.end()
    if not out:
        return text
    out.append(text[pos:])
    return "".join(out)


# ─────────────────────────────────────────────────────────────── R8 abgeschnittene SEO
R8_VORLAGE = re.compile(r"^(?P<titel>.+?) online kaufen bei LuxeStyle(?P<ch> Schweiz)?: (?:(?:grosse Auswahl|kuratierte "
                        r"Premium-Auswahl), )?Gratis-Versand ab CHF 50, 30 Tage Rückgabe, (?:schnelle )?Lief.*(?:…|\.\.\.)\s*$")
SATZENDE_RX = re.compile(r"(?<=[A-Za-zÄÖÜäöüß0-9)»”\"%])[.!?](?=\s|$)")
# Abgeschnitten OHNE «…» (GEMESSEN 14.10.: «… & mehr – In», «… Nur f», «… 30 Tage Rü», «…, TWINT»): ≥ 150 Zeichen und kein
# Schlusszeichen (alle 6 Fälle über 568 Kollektionen waren abgeschnitten)
R8_PAARE = {  # kein ganzer Satz ≤ 155 vorhanden → fester Satz aus dem eigenen Beschreibungstext (14.10. gelesen)
    "elektronik-kleinteile": "Die kleinen Helfer, die immer fehlen: Ladegeräte und Ladestationen, Kabel und Adapter, Powerbanks, "
                             "Batterien, Netzteile und Steckdosen-Zubehör.",
    # alt «… Überwachungskameras & mehr – In» (160); erster Satz der Beschreibung 186 Zeichen. 14.10. spät LIVE (251 aktive): 0 Action-Cams,
    # 0 Laser-Gravierer, E-Scooter nur Zubehör → nur Ware, die in der Kollektion aktiv ist (wie das R9-Satzpaar im Text)
    "hightech-gadgets": "Neueste Technik & smarte Gadgets: Drohnen, Überwachungskameras, Saugroboter, VR-Brillen, Gimbals, "
                        "Massagepistolen, E-Scooter-Zubehör & mehr.",
}
USP_LANG, USP_KURZ = "Gratis-Versand in der Schweiz ab CHF 50.", "Gratis-Versand CH ab CHF 50."


def _satz_prefix(text, grenze):
    bestes = None
    for m in SATZENDE_RX.finditer(text):
        if m.end() > grenze:
            break
        bestes = text[:m.end()]
    return bestes


def abgeschnitten(seo_d):
    s = (seo_d or "").rstrip()
    if re.search(r"(?:…|\.\.\.)$", s):
        return True
    return len(s) >= 150 and not re.search(r"[.!?»\"')]$", s)


def r8(seo_d, ctx, funde):
    if not abgeschnitten(seo_d):
        return seo_d
    m = R8_VORLAGE.match(seo_d)
    if m:
        rueck = "Ersatz bei Druckfehlern" if ctx["handle"] in SG else "30 Tage Rückgabe"
        neu = (f"{m.group('titel')} online kaufen bei LuxeStyle{m.group('ch') or ''}: Gratis-Versand in der Schweiz ab "
               f"CHF 50, {rueck}, Lieferzeit auf jeder Produktseite.")
        if len(neu) > SEO_D_MAX:
            neu = neu.replace(", Lieferzeit auf jeder Produktseite.", ".")
        if len(neu) <= SEO_D_MAX:
            funde.append(Fund("R8", seo_d, neu))
            return neu
    if ctx["handle"] in R8_PAARE:
        neu = R8_PAARE[ctx["handle"]]
        funde.append(Fund("R8", seo_d, neu))
        return neu
    roh = re.sub(r"\s*(?:…|\.\.\.)\s*$", "", seo_d).rstrip()
    roh_ganz = re.sub(r"\s*\S+$", "", roh)               # letztes (angeschnittenes) Wort weg
    html_t = ctx.get("html_text") or ""
    neu = None
    if len(roh_ganz) >= 40 and html_t.startswith(roh_ganz):
        neu = _satz_prefix(html_t, SEO_D_MAX)            # ganze Sätze aus der eigenen Beschreibung
    if not neu or len(neu) < 40:
        neu = _satz_prefix(roh, SEO_D_MAX)               # letzter ganzer Satz der alten SEO-Beschreibung
    if not neu or len(neu) < 40:
        k = max(roh.rfind(" – "), roh.rfind(" — "))        # an der letzten Gedankenstrich-Grenze enden
        neu = roh[:k].rstrip(" ,;:") + "." if k >= 60 else None
        if neu and len(neu) > SEO_D_MAX:
            neu = None
    if not neu or len(neu) < 40:
        ctx["offen"].append("R8: kein ganzer Satz ≥ 40 Zeichen")
        return seo_d
    weg = seo_d[len(neu.rstrip(".")):]
    # Die Gratis-Aussage stand im abgeschnittenen Rest → am Ende der Pipeline wieder anhängen, wenn Platz ist
    ctx["r8_usp"] = bool(re.search(r"Gratis|CHF 50", weg)) and "CHF 50" not in neu
    funde.append(Fund("R8", seo_d, neu))
    return neu


def r8_usp(t, ctx, funde):
    if not ctx.pop("r8_usp", False) or "CHF 50" in t:
        return t
    for usp in (USP_LANG, USP_KURZ):
        if len(t) + 1 + len(usp) <= SEO_D_MAX:
            funde.append(Fund("R8", "", usp))
            return f"{t} {usp}"
    return t


# ─────────────────────────────────────────────────────────────── R1 Trust-Zeile
NEU_ZEILE = ("🚚 Lieferzeit auf jeder Produktseite · Gratis-Versand in der Schweiz ab CHF 50 · ↩️ 30 Tage Rückgabe · "
             "–10 % mit Code WELCOME10")
R1_ZEILEN = [
    ("✔ Geprüfte Angaben · 🚚 Lieferzeit auf jeder Produktseite · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · "
     "–10 % mit Code WELCOME10", NEU_ZEILE),
    ("✔ Geprüfte Qualität · 🚚 Schnelle Lieferung · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · "
     "–10 % mit Code WELCOME10", NEU_ZEILE),
    ("✔ Geprüfte Angaben · 🚚 Versand aus EU-Lager · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · "
     "–10 % mit Code WELCOME10", NEU_ZEILE),
    ("– die passende Auswahl für dich. Geprüfte Angaben, faire Preise, Lieferzeit auf jeder Produktseite. "
     "Gratis ab CHF 50.",
     "– die passende Auswahl für dich. Faire Preise, Lieferzeit auf jeder Produktseite. In der Schweiz gratis ab CHF 50."),
]
R1_TEILE = [
    ("🚚 Schnelle Lieferung · ", "🚚 Lieferzeit auf jeder Produktseite · "),
    ("🚚 Versand aus EU-Lager · ", "🚚 Lieferzeit auf jeder Produktseite · "),
    ("🚚 EU-Lager (2–7 Werktage) · ", "🚚 Lieferzeit auf jeder Produktseite · "),
    ("✓ 100 % Original · ", ""),
    ("100 % Original · ", ""),
    ("Versand CHF 7, gratis ab CHF 50", "Versand in der Schweiz CHF 7, gratis ab CHF 50"),
]


def r1(text, ctx, funde):
    for alt, neu in R1_ZEILEN:
        text = paar(text, alt, neu, "R1", funde, genau_eins=True, offen=ctx["offen"])
    for alt, neu in R1_TEILE:
        text = paar(text, alt, neu, "R1", funde)
    return text


# ─────────────────────────────────────────────────────────────── R7 Selbst gestalten
AUSSCHLUSS = "Gestaltete Artikel sind von der Rückgabe ausgenommen, bei Druckfehlern gibt es Ersatz."
R7_HTML = [
    ("↩️ 30 Tage Rückgabe", "↩️ Ersatz bei Druckfehlern"),
    ("Profitiere von unserem Gratis-Versand ab CHF 50 und einer unkomplizierten 30-Tage-Rückgabe.",
     "Profitiere von unserem Gratis-Versand in der Schweiz ab CHF 50. " + AUSSCHLUSS),
    ("Profitiere dabei von unserem kostenlosen Versand ab CHF 50 und einem unkomplizierten 30-Tage-Rückgaberecht für "
     "deine Bestellungen in der Schweiz.",
     "Profitiere dabei von unserem kostenlosen Versand in der Schweiz ab CHF 50. " + AUSSCHLUSS),
    ("Geniesse dabei den Gratis-Versand ab CHF 50 und profitiere von unserer 30-Tage-Rückgabe.",
     "Geniesse dabei den Gratis-Versand in der Schweiz ab CHF 50. " + AUSSCHLUSS),
    ("Profitiere dabei von unserem kostenlosen Versand ab CHF 50 und einem 30-tägigen Rückgaberecht, damit dein "
     "Einkaufserlebnis in der Schweiz rundum perfekt wird.",
     "Profitiere dabei von unserem kostenlosen Versand in der Schweiz ab CHF 50. " + AUSSCHLUSS),
]
R7_REST = re.compile(r"30[- ]Tage[- ]?Rückgabe|30-tägig|Rückgaberecht|30 Tage Rückgabe", re.I)


def r7(text, ctx, funde):
    if ctx["handle"] not in SG:
        return text
    if ctx["feld"] == "html":
        for alt, neu in R7_HTML:
            text = paar(text, alt, neu, "R7", funde)
    elif ctx["feld"] == "seo_d":
        text = paar(text, "30 Tage Rückgabe", "Ersatz bei Druckfehlern", "R7", funde)
    return text


# ─────────────────────────────────────────────────────────────── R3 «Geprüft…»
R3_PAARE = [
    ("hype-jetzt", "html", "Was gerade wirklich läuft — von uns geprüft, mit Bildern,", "Was gerade gefragt ist — mit Bildern,"),
    ("auto-kfz-zubehoer", "html", "findest du geprüfte Marken-Produkte und clevere Helfer",
     "findest du Produkte und clevere Helfer"),
    ("beauty-geraete", "html", "Alle Geräte sind auf Qualität geprüft. ", ""),
    ("3d-filament", "seo_d", "Geprüfte Qualität, schnelle Lieferung, Gratis-Versand ab CHF 50.",
     "Gratis-Versand in der Schweiz ab CHF 50."),
    ("handy-schutzglas", "html", "Geprüfte Angaben, schnelle CH-Lieferung.", "Lieferung in die ganze Schweiz."),
    ("handy-schutzglas", "seo_d", "Geprüfte Qualität, schnelle CH-Lieferung.", "Lieferung in die ganze Schweiz."),
]
R3_RX = re.compile(VOR_WORT + r"(?:[✔✓✅]\ufe0f?\s*)?[Gg]eprüfte\s+(?:Angaben|Qualit(?:ät|aet)|Markenqualit(?:ät|aet)|"
                   r"Auswahl|Ware)\b(?:\s*[,·]\s*|\s+(?=für\b))?")


def r3(text, ctx, funde):
    for h, f, alt, neu in R3_PAARE:
        if h == ctx["handle"] and f == ctx["feld"]:
            text = paar(text, alt, neu, "R3", funde)
    out, pos, n = [], 0, 0
    for m in R3_RX.finditer(text):
        out.append(text[pos:m.start()])
        rest_start = m.end()
        # Satzanfang: das folgende Wort gross schreiben («Geprüfte Angaben, faire Preise» → «Faire Preise»)
        if satzanfang(text, m.start()) and rest_start < len(text) and text[rest_start].islower():
            out.append(text[rest_start].upper())
            funde.append(Fund("R3", m.group(0) + text[rest_start], text[rest_start].upper()))
            pos = rest_start + 1
        else:
            funde.append(Fund("R3", m.group(0), ""))
            pos = rest_start
        n += 1
    if n:
        out.append(text[pos:])
        text = "".join(out)
    return text


# ─────────────────────────────────────────────────────────────── R5 «Premium»
R5_PAARE = [  # (handle, feld, alt, neu) — ausserhalb der Premium-Kollektionen (GEMESSEN 14.10.)
    ("frontpage", "seo_d",
     "🏆 Unsere 16 Hero-Produkte Handverlesen für dich — Premium Schweizer Lifestyle in 4 Kategorien: Vatertag & Herren "
     "· Damen & Beauty · Tech & Gadgets · P",
     "Unsere Lieblingsstücke: luftige Maxikleider, Boho-Kleider, Plateau-Sandalen und Resort-Sets. "
     "Gratis-Versand in der Schweiz ab CHF 50, 30 Tage Rückgabe."),
    ("herren-jacken", "html", "Premium-Marken, versandkostenfrei ab CHF 50.", "Versandkostenfrei in der Schweiz ab CHF 50."),
    ("herren-pullover", "html", "Premium-Marken, versandkostenfrei ab CHF 50.", "Versandkostenfrei in der Schweiz ab CHF 50."),
    ("haustier-gadgets", "html", " Premium-Qualitaet, sorgfaeltig fuer den Schweizer Markt kuratiert.", ""),
    ("3d-filament", "seo_d", "Premium 3D-Drucker-Filament:", "3D-Drucker-Filament:"),
    ("schmuck-uhren", "html", "Premium-Stücke aus 925er Silber und Edelstahl", "Stücke aus 925er Silber und Edelstahl"),
    # 14.10. abends GEMESSEN: 150 aktive, 0 «Headset» im Titel (Kopfhörer mit Mikrofon: «Gaming-Kopfhörer mit Mikrofon», «In-Ear
    # Gaming-Kopfhörer mit Mikrofon»), 32 Lautsprecher (überwiegend Bluetooth, «Outdoor», «für unterwegs»), 1 Soundbar
    ("audio-sub", "html",
     "oder ein vielseitiges Headset für Anrufe, Musik und Gaming benötigst, hier findest du die passende Lösung, einschliesslich "
     "hochwertiger Lautsprecher und Premium Headsets für klare Kommunikation und besten Sound.",
     "oder Kopfhörer mit Mikrofon für Anrufe, Musik und Gaming brauchst, hier findest du die passende Lösung, einschliesslich "
     "Bluetooth-Lautsprecher für drinnen und draussen."),
    # 14.10. GEMESSEN: 13 aktive in deko-wohnaccessoires, 0 Wandkunst/Spiegel/Vase/Mandala; beide Bodenvasen DRAFT
    ("deko-wohnaccessoires", "html",
     " – von beeindruckender Metall-Wandkunst und stilvollen Vintage Wandspiegeln bis hin zu eleganten Premium "
     "Keramik-Bodenvase und filigranen Holz-Mandala Wandkunst.", "."),
    # 14.10. GEMESSEN: Moltó (14), Brio, PlayGo, T-Racers alle DRAFT; aktiv sind RC-Autos, Stunt-Autos, Modellautos
    ("spielzeug-fahrzeuge", "html",
     "Ob ein Brio Batterie-Zug, coole Rutscher-Motorräder wie das Premium Grün von Moltó oder praktische Müllwagen von "
     "PlayGo und als Spielzeug – für jeden kleinen Fan ist etwas dabei. Auch Auto-Transporter von T-Racers findest du "
     "hier, um deine Sammlung zu erweitern und spannende Abenteuer zu erleben.",
     "Ob ferngesteuertes Auto, Stunt-Auto oder Modellauto – für jeden kleinen Fan ist etwas dabei."),
    # 14.10. abends GEMESSEN (290 aktive): Matten 56, Hosen/Leggings 53, Sets 23, Widerstandsbänder 21, Tops 15, Blöcke 5, Gurte 3,
    # Faszienrollen 3; 0 Yoga-Figuren/Deko/Statuen, 0 Akupressur, 0 Decken (Gift Box + Recovery-Set DRAFT)
    ("yoga-pilates", "html",
     "Hier findest du edle Deko wie gold-schwarze oder indianische Yoga-Figuren, die Ruhe und Stil in dein Heim bringen. Mit "
     "Premium Yoga Devotion Gift Boxen oder Recovery-Sets mit Akupressur-Matte, Faszienrolle und Wolldecke bist du bestens "
     "ausgerüstet für deine Praxis und Entspannung.",
     "Hier findest du Yogamatten, Yoga-Blöcke, Gurte, Faszienrollen und Widerstandsbänder sowie Yoga-Hosen, Tops und Sets – damit "
     "bist du bestens ausgerüstet für deine Praxis und Entspannung."),
    # 14.10. abends GEMESSEN (18 aktive): Augen-, Gesichts-/Hals-, Kopf- und Handmassagegeräte, Massagekamm, Meridian-Bürste
    # (Nacken/Schultern), Augenbrauen-Schere; 0 aktive mit «LED»/«RF»/«Schallbürste|6-in-1»; «Premium Beauty-Komplett-Set» DRAFT
    ("wellness-beauty-tools", "html",
     "Von RF &amp; LED Instrumenten für Anti-Aging bis zur smarten 6-in-1 Schallbürste für makellose Haut findest du alles. Verwöhne "
     "dich mit LED-Lichttherapie-Masken oder einem Premium Beauty-Komplett-Set, auch als Muttertags-Geschenkbox.",
     "Hier findest du Augen-, Gesichts- und Kopfmassagegeräte sowie Massagekämme und Bürsten für Kopfhaut, Nacken und Schultern."),
]
# haustier-gadgets schreibt ae/oe/ue — feste Wortliste (nie blind ae→ä: Michael, Aerosol, Israel …)
UMLAUT_WOERTER = {"haustier-gadgets": [("fuer ", "für "), ("Fuer ", "Für "), ("foerdert", "fördert"),
                                       ("Fluesterleise", "Flüsterleise"), ("fluesterleise", "flüsterleise")]}
R5_RX = [
    (re.compile(r"kuratierte Premium-Auswahl,\s*"), ""),
    (re.compile(r"(?<=: )Premium-Auswahl,\s*"), ""),
    (re.compile(r"[✔✓]\ufe0f?\s*Premium-Qualit(?:ät|aet)\s*·\s*"), ""),
    (re.compile(r"<li>\s*[✔✓]\ufe0f?\s*Premium-Qualit(?:ät|aet), sorgfältig ausgewählt\s*</li>\s*"), ""),
]
# Sachliche Satzpaare IN den Premium-Kollektionen (Schritt 4; Inhalt 14.10. gemessen: Schmuck 925 Silber/Moissanit/
# Süsswasserperlen, Echtleder; keine Akkusauger/TV/Monitore mehr aktiv)
R5_PREMIUM_PAARE = [
    ("luxestyle-premium", "html",
     "Entdecke in unserer exklusiven Kategorie \"LuxeStyle Premium\" innovative Technologie für dein Zuhause und deinen "
     "persönlichen Stil. Ob ein smarter Akkusauger für streifenfreie Sauberkeit, ein leistungsstarkes Haarstyling-Tool für "
     "seidiges Haar oder hochauflösende TV &amp; Monitore für ein unvergleichliches Entertainment-Erlebnis – hier findest "
     "du Premium-Produkte, die deinen Alltag bereichern.",
     "In der Kategorie \"LuxeStyle Premium\" findest du Schmuck aus 925er Silber mit Moissanit, Edelsteinen oder "
     "Süsswasserperlen, Taschen aus Echtleder und einzelne Wellness-Artikel."),
    ("luxus-highend", "html",
     "Entdecke in unserer 💎 Premium-Auswahl bei LuxeStyle exklusive Staubsauger für eine makellose Reinheit und "
     "innovative Haarstyling-Tools, die dein Haar perfekt in Szene setzen. Diese ausgewählte Kollektion überzeugt durch "
     "höchste Qualität und herausragende Leistung, um deinen Alltag zu bereichern und zu vereinfachen.",
     "In der 💎 Premium-Auswahl findest du Schmuck aus 925er Silber, Süsswasserperlen und Moissanit mit GRA-Zertifikat "
     "sowie Taschen und Sandalen aus Echtleder."),
    # 14.10. abends GEMESSEN (1'928 aktive, Smart-Regel Variantenpreis > 80): Bodenreiniger/Wischer 0, Multistyler 0 aktiv;
    # Taschen 251, Elektronik 174, Uhren 125, Sport 111, Küche 109 — Geräteaufzählung und «seidiges Haar … zaubern» weg
    ("💎-premium-ab-chf-80", "html",
     "Entdecke hier unsere Premium-Auswahl für dein Zuhause und deine Schönheit! Freu dich auf innovative Geräte wie den 2-in-1 "
     "Bodenreiniger, smarte Akkusauger oder Power-Wischer, die dir streifenfreie Sauberkeit garantieren. Auch für deine Haare "
     "findest du Glättbürsten oder Multistyler, die dir seidiges Haar und perfekte Locken zaubern.",
     "Hier findest du Artikel mit Preisen über CHF 80 – von Taschen und Uhren über Elektronik bis zu Sport- und Küchenartikeln."),
    ("made-in-switzerland-premium", "html", "Entdecke in unserer exklusiven Kollektion \"Curated Premium\"",
     "Entdecke in unserer Kollektion \"Curated Premium\""),
    ("premium-bundles", "html", "Entdecke unsere exklusiven Premium-Bundles", "Entdecke unsere Premium-Bundles"),
]


def r5(text, ctx, funde):
    h, f = ctx["handle"], ctx["feld"]
    if ist_premium(h):
        for hh, ff, alt, neu in R5_PREMIUM_PAARE:
            if hh == h and ff == f:
                text = paar(text, alt, neu, "R5", funde)
        return text
    for hh, ff, alt, neu in R5_PAARE:
        if hh == h and ff == f:
            text = paar(text, alt, neu, "R5", funde)
    for alt, neu in UMLAUT_WOERTER.get(h, []):
        text = paar(text, alt, neu, "R5", funde)
    for rx, neu in R5_RX:
        text = regex(text, rx, neu, "R5", funde)
    return text


# ─────────────────────────────────────────────────────────────── R9 Marke/Ware ohne aktives Produkt
# Prüfung S3 14.10. spät: Markennamen mit 0 aktiven Produkten im ganzen Shop (Export 09:46, 54'512 aktive) und Ware, die in DIESER
# Kollektion kein aktives Produkt hat (aktive Titel je Kollektion live 12:00–12:35). Ersatz nennt nur gemessene aktive Ware, keine Marke,
# keine Wirkzusage («dauerhaft» ohne IPL-Gerät, «schmerzarm», «meistverkauft» ohne Beleg). Nach dem Lauf: Wächter R9 = 0 (Marken) und
# Ware-Hinweis = 0 für diese Felder (versprechen_regel.json → kollektion.marken_ohne_ware / ware_im_text).
# Runde 3 (Prüfung S3 14.10. 13:36, Befund 1+2; aktive Titel live 14.10. 13:40 UTC): (a) Ersatz nennt WARENGRUPPEN mit ≥ 2 aktiven
# Produkten statt Einzelstücke («Kristall-Whiskyglas», «Kofferwaage», «einer davon mit Reifendruckmesser», «Bali»/«Ibiza» …), wo das
# ohne Falschaussage geht; (b) JEDE genannte Ware hat einen Eintrag in kollektion.ware_im_text («genannt», Muster trifft Text UND
# Titel) — fällt sie weg, meldet der Wächter einen Ware-Hinweis, und S3 schreibt das Satzpaar nicht mehr (r9_ware_pruefen, «offen»);
# (c) neue Paare 3d-drucker (0 Drucker, auch SEO-Titel: Handfall), 3d-druck (0 Drucker, 0 Tische/Ständer/Schränke, 0 Düsen),
# kochen-backen (0 Messer), kuschel-heizdecken «Cashmere-Look» (0/18) und auto-kfz-zubehoer SEO «Becherhalter» (0/467).
INHALT_PAARE = [
    # make-up (781 aktive): 0 Parfüms; Foundation 42, Concealer 36, Lidschatten 184, Mascara 25, Eyeliner 50, Lippenstift 76, Pinsel 199
    ("make-up", "html",
     "Hier findest du hochwertige Make-up Grundierungen für makellosen Halt und eine exklusive Auswahl an Damenparfüms, wie Givenchy "
     "L'Interdit Rouge Ultime oder Nina Ricci Rouge. Tauche ein in die Welt der Düfte und verwöhne dich mit unwiderstehlichen Kreationen!",
     "Hier findest du Foundations und Concealer für einen ebenmässigen Teint, Lidschatten-Paletten, Mascara und Eyeliner, Lippenstifte "
     "sowie Make-up-Pinsel und Pinselsets."),
    # beauty-makeup (806 aktive): dieselbe Ware, 0 Parfüms
    ("beauty-makeup", "html",
     "Von Make-up Grundierung für makellosen Halt bis hin zu einer exklusiven Auswahl an Damenparfüms wie Givenchy L'Interdit Rouge "
     "Ultime oder Nina Ricci Rouge. Finde dein Lieblingsparfüm und die Basis für einen strahlenden Teint – alles, was du für deine "
     "Schönheit brauchst.",
     "Von Foundation und Concealer über Lidschatten-Paletten, Mascara und Eyeliner bis zu Lippenstiften und Make-up-Pinseln – alles, was "
     "du für deinen Look brauchst."),
    # hautpflege (350 aktive): 0 Estée Lauder; Gesichtscremes 10, Nachtcremes 3
    ("hautpflege", "html", "bis zu luxuriösen Gesichtscremes wie Estee Lauder Advanced Night Repair findest du alles",
     "bis zu Gesichts- und Nachtcremes findest du alles"),
    # beauty-tools (521 aktive): 0 Medisana, 0 Seidenkissen-Geschenksets; Fussmassage 5, Vibration 13, Jade-Roller 2, Gua Sha 6
    # («mit Wärme» = 1 Gerät → weg)
    ("beauty-tools", "html",
     "Von entspannenden Fussmassagegeräten wie dem Medisana MC 850 bis hin zu Vibrations-Massagegeräten für den ganzen Körper findest du "
     "alles, um dich zu verwöhnen. Auch exquisite Geschenksets mit Jade Roller und Seidenkissen warten darauf, dich oder deine Liebsten "
     "glücklich zu machen.",
     "Von Fussmassagegeräten bis hin zu Vibrations-Massagegeräten für den ganzen Körper findest du alles, um dich zu verwöhnen. "
     "Auch Jade-Roller und Gua Sha fürs Gesicht warten darauf, dich oder deine Liebsten glücklich zu machen."),
    # auto-zubehoer (467 aktive): 0 Michelin/Schneeketten, 0 Kompressoren; Sitzbezüge 19, Lenkradbezüge 54, Dashcams 5, Ladegeräte 4,
    # Auto-Staubsauger 3 (alle kabellos; «mit Reifendruckmesser» = 1 → weg)
    ("auto-zubehoer", "html",
     "Mit unseren Michelin Easy Grip EVOLUTION Schneeketten bist du auch im Winter sicher unterwegs. Entdecke zudem flexible "
     "Akku-Kompressoren und passendes Zubehör für Werkstatt, Haus oder unterwegs, um immer den richtigen Reifendruck zu haben.",
     "Entdecke zudem Sitz- und Lenkradbezüge, Dashcams, Ladegeräte und kabellose Auto-Staubsauger."),
    # auto-kfz-zubehoer (467 aktive, Vendor 467/467 LuxeStyle): 0 Sonax/Turtle Wax/Goodyear, 0 Shampoo, 0 Schneeketten/Scheibenwischer/
    # Glühbirnen/Kompressoren, 0 «Politur»; Poliermaschinen 6, Polier-Sets 2 (Polier-Set, Polierschwamm-Set), Wachse 3, Bürsten 3,
    # Dashcams 5, Halterungen 2, Ladegeräte 4 (Waschhandschuh, Rücksitzspiegel, Parkstopper, MagSafe je 1 → Warengruppe)
    ("auto-kfz-zubehoer", "html",
     "Shampoos, Reifenreiniger, Wachse, Politur-Sets, Mikrofasertücher &amp; Detail-Bürsten von Sonax, Turtle Wax &amp; Goodyear.",
     "Poliermaschinen, Polier-Sets, Wachse &amp; Reinigungsbürsten."),
    ("auto-kfz-zubehoer", "html", "Dashcams, Schneeketten, Scheibenwischer, Glühbirnen, Reifendruck &amp; Kompressoren.",
     "Dashcams &amp; weiteres Zubehör für unterwegs."),
    ("auto-kfz-zubehoer", "html", "Handyhalter, MagSafe-Halter, Schnellladegeräte,", "Halterungen und Ladegeräte,"),
    # SEO: 0 Becherhalter (einziger «Becher» = Scheinwerfer-Vernebler-Becher); Sitzkissen 25, Lenkradbezüge 54, Poliermaschinen 6
    ("auto-kfz-zubehoer", "seo_d", ", Dashcams und Becherhalter.", " und Dashcams."),
    # auto-pflege (8 aktive): 0 Sonax/Turtle Wax/Rain-X, 0 Shampoo/Felgenreiniger/Wachs/Politur; 2 kabellose Auto-Staubsauger, 2 Bürsten
    # (Reinigungsbürste, Bürsten-Set) — Handyhalterung (1) und «mit Reifendruckmesser» (1) → weg
    ("auto-pflege", "html", "<strong>Glanz wie aus der Waschstrasse – für zuhause.</strong>",
     "<strong>Sauber unterwegs – für den Innenraum.</strong>"),
    ("auto-pflege", "html",
     "Unsere Auto-Pflege &amp; Reinigung vereint Marken wie <strong>Sonax</strong>, <strong>Turtle Wax</strong> und "
     "<strong>Rain-X</strong>: von Fahrzeugshampoo, Reifen- und Felgenreiniger über Armaturenbrett- und Cockpitpflege bis zu Autowachs, "
     "Politur-Sets und dem kabellosen Auto-Staubsauger für den Innenraum.",
     "Hier findest du Helfer für den Innenraum: kabellose Auto-Staubsauger und Bürsten für die Innenraum-Reinigung."),
    ("auto-pflege", "html", "Alles, was dein Fahrzeug innen und aussen strahlen lässt – profitauglich, einfach anzuwenden und zu fairen "
                            "Preisen.", "Einfach anzuwenden und zu fairen Preisen."),
    ("auto-pflege", "seo_d", "Autoshampoo, Reifen- & Felgenreiniger, Armaturenbrett-Pflege & Autowachs",
     "kabellose Auto-Staubsauger & Innenraum-Bürsten"),
    # bar-glaeser (14 aktive): 0 Luminarc/Bormioli, 0 Cocktail-/Sektgläser (nur ein Organizer), 0 Sets; Weingläser 4 (Edo Kiriko, Retro,
    # Drachen-Kelch, Rotweingläser), Alltagsgläser 2 (Kristall-Whiskyglas, Trinkglas mit Strohhalm) — Einzelstücke → Warengruppe
    ("bar-glaeser", "html",
     "Ob stilvolle Weingläser für besondere Momente und Feste mit Freunden, robuste Trinkgläser für den Alltag oder farbige Varianten wie "
     "das Luminarc Floral und Bormioli Rocco Rock Bar – hier findest du hochwertige Gläser, die dein Getränk perfekt in Szene setzen und "
     "Kauflust wecken.",
     "Ob Weingläser für besondere Momente oder ein Glas für jeden Tag – hier findest du Gläser, die dein Getränk perfekt in Szene "
     "setzen."),
    ("bar-glaeser", "seo_d", "Weingläser, Whiskygläser, Sekt- & Cocktailgläser, edel & im Set", "Weingläser & Alltagsgläser"),
    # bar-wein-accessoires (49 aktive): 0 Arcoroc/Chef & Sommelier, 0 6er-Sets, 0 Whisky, 0 Cocktail; Dekanter 11, Korkenzieher 5,
    # Flaschenöffner 13 (elektrisch 4), Weinkühler 3, Weinregale 5
    ("bar-wein-accessoires", "html",
     "Entdecke unsere Auswahl an eleganten Weingläsern im 6er-Set für besondere Momente mit Freunden oder stabile Weingläser, die perfekt "
     "für Alltag und Feste geeignet sind. Ob Arcoroc Normandi oder Chef &amp; Sommelier Macaron, hier findest du dein ideales Glas für "
     "jeden Anlass.",
     "Entdecke Weindekanter, Korkenzieher und elektrische Flaschenöffner, Weinkühler und Weinregale – für besondere Momente mit Freunden "
     "und für jeden Tag."),
    ("bar-wein-accessoires", "seo_d", "Whisky-Sets, Weingläser, Cocktail-Tools & edle Bar-Accessoires",
     "Weindekanter, Korkenzieher, Flaschenöffner, Weinkühler & Weinregale"),
    # kuschel-heizdecken (18 aktive): 0 Beurer/Medisana/Solac, 0 Wolle/Baumwolle/Fleece/Cashmere im Titel (auch 0 Beschreibungen mit
    # «Cashmere»); 2 beheizte (Heizbare Kuscheldecke mit Ärmeln und Kapuze · Büro-Heizdecke), 16 Kuscheldecken, 7 mit Muster/Motiv/
    # Druck/kariert — Einzelmerkmale (Timer, USB, Quasten, Babys) → Warengruppe
    ("kuschel-heizdecken", "html",
     "Von der klassischen Kuscheldecke aus weichem Cashmere-Look bis zur elektrischen Heizdecke",
     "Von der klassischen Kuscheldecke bis zur elektrischen Heizdecke"),
    ("kuschel-heizdecken", "html",
     "Unsere <strong>Heizdecken</strong> von Marken wie Beurer, Medisana und Solac spenden gleichmässige Wärme mit mehreren "
     "Temperaturstufen und Abschaltautomatik – ideal für kalte Winterabende, verspannte Muskeln oder einfach zum Entspannen.",
     "Unsere <strong>Heizdecken</strong> spenden Wärme für kalte Winterabende oder einfach zum Entspannen."),
    ("kuschel-heizdecken", "html",
     "Die <strong>Kuschel- und Wolldecken</strong> aus atmungsaktiver Baumwolle und flauschigem Fleece sorgen",
     "Die <strong>Kuscheldecken</strong> mit vielen Mustern und Motiven sorgen"),
    ("kuschel-heizdecken", "html", "🔥 Elektrische Heizdecken mit einstellbaren Wärmestufen &amp; Sicherheits-Abschaltung",
     "🔥 Beheizbare Decken für wohlige Wärme"),
    ("kuschel-heizdecken", "html", "🛋️ Weiche Kuschel- &amp; Wolldecken für Sofa", "🛋️ Weiche Kuscheldecken für Sofa"),
    # wellness-gesundheit (27 aktive): 0 Luftreiniger/Hanteln/Fitnessstationen/Blutdruck/Heizkissen, 0 Beurer/Medisana; Massagegeräte 14
    # (Gesicht 4, Hals 2, Kopf 2), Augenmassagegeräte 4 (mit Wärme 3), Aroma-Diffuser 5
    ("wellness-gesundheit", "html",
     "Entdecke bei uns alles für dein Wohlbefinden und deine Fitness! Hier findest du innovative Luftreiniger für reine Luft gegen Pollen "
     "und Feinstaub, damit du endlich wieder durchatmen kannst. Zudem bieten wir dir effektive Hanteln und komplette Fitnessstationen für "
     "dein Heim-Gym, damit dein Muskeltraining flexibel und erfolgreich wird.",
     "Entdecke bei uns Helfer für dein Wohlbefinden: Massagegeräte für Gesicht, Hals und Kopf, Augenmassagegeräte mit Wärme sowie "
     "Aroma-Diffuser für eine entspannte Atmosphäre."),
    ("wellness-gesundheit", "seo_d", "Massagegeräte, Blutdruckmessgeräte & Heizkissen (Beurer, Medisana)",
     "Massagegeräte für Augen, Gesicht & Kopf und Aroma-Diffuser"),
    # modellautos (28 aktive): 0 Hot Wheels/Ferrari/Marvel; Metall-Modelle 3 (Rückziehfunktion 2 → weg), Bausteine-Modelle > 10,
    # Spielzeugautos 7
    ("modellautos", "html", "von Hot Wheels bis Ferrari: detailgetreue Modelle zum Spielen &amp; Sammeln.",
     "vom Metall-Modellauto bis zum Bausteine-Modell: Modelle zum Spielen, Bauen &amp; Sammeln."),
    ("modellautos", "seo_d", "Modellautos, Spielzeugautos & Sammlerfahrzeuge (Hot Wheels, Ferrari, Marvel)",
     "Modellautos aus Metall, Bausteine-Modelle & Spielzeugautos"),
    # sub-ringe (506 aktive): 0 Panarea/Breil/Folli Follie, 0 «Eternità»; verstellbar 47, Blumenringe 15, Zirkonia 93, Ring-Sets 16,
    # 925/Silber 87 («verstellbarer Blumenring» = 1 → getrennt genannt)
    ("sub-ringe", "html",
     "elegante Damenringe von Panarea und Breil, oder zarte Modelle von Folli Follie – wir haben für jeden Anlass das Richtige. Finde "
     "auch stapelbare Sets wie «Eternità» in 925 Sterling-Silber.",
     "ein verstellbarer Ring, ein Blumenring oder ein schlichter Zirkonia-Ring – wir haben für jeden Anlass das Richtige. Finde auch "
     "Ring-Sets und Ringe aus 925 Sterling-Silber."),
    # spielzeug-schminkset (39 aktive): 0 Deborah, 0 «Skin Foundation», 0 Hello-Kitty-Set; Aqua-Schminke 5, Schminksets 7, Schmink-
    # Spielsachen aus Holz 2 (Schminktisch, Schmink- & Frisier-Set) — «Einhorn»/«Malkasten Fantasie» je 1 → weg
    ("spielzeug-schminkset", "html",
     "Von der praktischen Schminkstange Skin Foundation bis zum Augenschminke Deborah Schwarz Eyeliner findest du alles für kreatives "
     "Spielen. Auch das beliebte Kinder-Schönheitsset «Hello Kitty» wartet darauf, von dir entdeckt zu werden.",
     "Von Aqua-Schminke in vielen Farben über Schminksets bis zu Schmink-Spielsachen aus Holz findest du alles für kreatives Spielen."),
    # caps-huete (128 aktive): 0 New Era/NBA/Lakers, 0 Shorts/T-Shirts; Länder-Caps 7 (Flag-Cap …), Baseball 32, Beanies 2, Hüte > 40
    # (Sonnenhut «Riviera» = 1 → «Hut»)
    ("caps-huete", "html",
     "Egal ob du Fan der New Era NBA Mesh Panel OS Shorts CHIBUL bist oder ein Sport T-Shirt der LA Lakers suchst – bei uns findest du "
     "die passende Kopfbedeckung.",
     "Ob Länder-Cap, Baseball-Cap, Beanie oder Hut – bei uns findest du die passende Kopfbedeckung."),
    # gaming-controller (137 aktive): 0 Ninebot/E-Scooter-Platinen; Ladestationen 10
    ("gaming-controller", "html",
     ", sowie Ladestationen für deine Gamecontroller und sogar Steuerplatinen für E-Scooter wie den Ninebot MAX G30.",
     ", sowie Ladestationen für deine Gamecontroller."),
    # hightech-gadgets (251 aktive): 0 Action-Cams, 0 Laser-Gravierer, E-Scooter nur Zubehör 8; Drohnen 144, Überwachungskameras 51,
    # Saugroboter 16, VR-Brillen 13, Gimbals 10, Massagepistolen 2
    ("hightech-gadgets", "html",
     "Saugroboter, VR-Headsets, Action-Cams, Gimbals, E-Scooter, Laser-Gravierer, Massage-Guns, Überwachungskameras &amp; mehr",
     "Drohnen, Überwachungskameras, Saugroboter, VR-Brillen, Gimbals, Massagepistolen, E-Scooter-Zubehör &amp; mehr"),
    # ipl-haarentfernung (17 aktive): 0 «IPL», 0 Laser im Titel (Photon-Gerät ohne IPL-Angabe); Epilierer 3, Haarentfernungsgeräte 6,
    # Lady Shaver/Mini-Rasierer 2, Wachswärmer 3 — «dauerhaft» weg (kein IPL-Gerät), «schmerzarm»/«professionell» weg
    ("ipl-haarentfernung", "html",
     "Dauerhaft glatte Haut zu Hause: Unsere Auswahl an <strong>IPL-Geräten, Epilierern, Laser-Trimmern und Wachserhitzern</strong> macht "
     "die professionelle Haarentfernung einfach und schmerzarm. Ob sanftes Epilieren, IPL-Anwendung oder Warmwachs – hier findest du das "
     "passende Gerät für jeden Bereich.",
     "Glatte Haut zu Hause: Unsere Auswahl an <strong>Epilierern, Haarentfernungsgeräten, Lady-Shavern und Wachswärmern</strong> macht die "
     "Haarentfernung einfach. Ob Epilieren, Rasieren oder Warmwachs – hier findest du das passende Gerät für jeden Bereich."),
    ("ipl-haarentfernung", "seo_d", "IPL-Geräte, Epilierer & Wachserhitzer für dauerhaft glatte Haut",
     "Epilierer, Haarentfernungsgeräte & Wachswärmer für glatte Haut"),
    # beauty-geraete (113 aktive): 0 IPL/Epilierer/Gesichtssauna/Laser/Poren-Tools/Hochfrequenz; LED-Masken 18, Mikrostrom 15,
    # Gesichtsreinigungsbürsten 22, Haarentfernungsgeräte 6, Lady Shaver/Rasierer 2, Wachswärmer 3, Gesichtsroller 2, Massage 9
    # (Hals 2, Augen 2) — Gua Sha = 1 → weg
    ("beauty-geraete", "html", "vom IPL-Gerät und Epilierer über Wachserhitzer bis zu Gesichtssauna, Gua Sha und Gesichtsrollern.",
     "von LED-Masken und Mikrostrom-Geräten über Gesichtsreinigungsbürsten bis zu Haarentfernungsgeräten, Wachswärmern und "
     "Gesichtsrollern."),
    ("beauty-geraete", "html", "IPL-Geräte, Epilierer, Laser-Trimmer und Wachserhitzer für dauerhaft glatte Haut.",
     "Haarentfernungsgeräte, Lady-Shaver und Wachswärmer für glatte Haut."),
    ("beauty-geraete", "html", "Gesichtssaunen, Poren-Tools, Gesichtsroller &amp; Gua Sha für einen frischen, straffen Teint.",
     "Gesichtsreinigungsbürsten, LED-Masken &amp; Gesichtsroller für einen frischen Teint."),
    ("beauty-geraete", "html", "Massage- und Hochfrequenz-Geräte für sichtbar gepflegte Haut.",
     "Mikrostrom- und Massagegeräte für Gesicht, Hals und Augen."),
    # «Kuratierte Beauty-Geräte,» fällt mit weg (sonst 164 Zeichen mit Land > 155; mit Land jetzt 153)
    ("beauty-geraete", "seo_d", "IPL-Geräte, Epilierer, Wachserhitzer, Gesichtssaunen & Anti-Aging-Geräte online kaufen bei LuxeStyle. "
                                "Kuratierte Beauty-Geräte,",
     "LED-Masken, Mikrostrom-Geräte, Gesichtsbürsten, Haarentfernungsgeräte & Wachswärmer online kaufen bei LuxeStyle."),
    # gesichtspflege-geraete (40 aktive): 0 Gesichtssaunen; Porenreiniger ~25 (Vakuum 4, Ultraschall 4), Gesichtsroller 4, LED-Masken 2,
    # Gua Sha 6 — elektrische Gesichtsbürste = 1 → weg
    ("gesichtspflege-geraete", "html",
     "Gesichtssaunen für die tiefe Porenreinigung, Poren-Tools, Gesichtsroller sowie Gua Sha für die entspannende Gesichtsmassage.",
     "Porenreiniger mit Vakuum oder Ultraschall, Gesichtsroller, LED-Masken sowie Gua Sha für die entspannende Gesichtsmassage."),
    ("gesichtspflege-geraete", "seo_d", "Gesichtssaunen, Poren-Tools, Gesichtsroller & Gua Sha",
     "Porenreiniger, LED-Masken, Gesichtsroller & Gua Sha"),
    # top-5-start (2 aktive: Strand-Maxikleid «Bali», Boho-Kleid «Ibiza»): Jade-Roller-Set und Sonnenbrille nicht in der Kollektion;
    # «Fünf»/«Top 5» weg; Namen der beiden Kleider → Warengruppe «Sommerkleider»
    ("top-5-start", "html",
     "Fünf Stücke, die wir gerade hervorheben: das Jade-Roller-Set fürs Gesicht, eine polarisierte Retro-Sonnenbrille mit UV400 und die "
     "beiden Sommerkleider «Bali» und «Ibiza».",
     "Stücke, die wir gerade hervorheben: luftige Sommerkleider."),
    ("top-5-start", "seo_d", "Die Top 5 Favoriten von LuxeStyle Schweiz: beliebte, vielseitige Lieblinge zum Reinschnuppern.",
     "Unsere Favoriten bei LuxeStyle Schweiz: luftige Sommerkleider."),     # mit Land + WELCOME10 ≤ 155
    # bestseller-shop (6 aktive: 5 Damenkleider «Ibiza», «Bali», «Brise», «Noir», «Lumea», Herren-Rüschenhemd «Monsieur»): Herrenuhr,
    # Portemonnaie, Diffuser, Kissenbezug nicht in der Kollektion; «meistverkauft/meistgekauft» ohne Beleg (Regel versprechen_regel.json)
    # weg; Einzelnamen → Warengruppe («Herren-Rüschenhemd» = 1 Produkt → «und mehr»)
    ("bestseller-shop", "html",
     "Von der eleganten Herrenuhr mit Saphirglas bis zum praktischen Damen Portemonnaie aus Echtleder findest du hier unsere "
     "meistverkauften Produkte. Lass dich inspirieren und sichere dir dein neues Lieblingsstück, sei es ein stylisches Sommerhemd, ein "
     "beruhigender Aroma Diffuser oder ein luxuriöser Seiden-Kissenbezug.",
     "Luftige Sommerkleider und mehr – lass dich inspirieren und sichere dir dein neues Lieblingsstück."),
    ("bestseller-shop", "seo_d",
     "Die meistgekauften Produkte von LuxeStyle CH auf einen Blick – die Favoriten, zu denen unsere Kundinnen und Kunden immer wieder "
     "greifen.",
     "Beliebte Stücke von LuxeStyle CH auf einen Blick: luftige Sommerkleider und mehr."),
    # favoriten (5 aktive: Mini-Kleid mit Rüschen, Plateau-Sandalen, Boho Resort-Set, «Ibiza», «Bali»): Herrenuhr, Slim Wallet,
    # Strand-Maxiröcke nicht in der Kollektion; Set und Sandalen je 1 → «passende Begleiter»
    ("favoriten", "html",
     "Von der klassischen Herrenuhr mit Saphirglas bis zum praktischen Slim Wallet mit RFID-Schutz – hier findest du hochwertige Produkte, "
     "die begeistern. Auch für den Sommer 2026 bist du mit unseren Boho Resort-Sets, Strand-Maxiröcken und luftigen Kleidern wie dem "
     "«Ibiza» oder «Bali» perfekt ausgestattet.",
     "Für den Sommer bist du mit luftigen Kleidern und passenden Begleitern perfekt ausgestattet."),
    # strand (7 aktive: 3 Luftmatratzen Ananas/Erdbeere/Alien, 2 Strandtücher, rechteckiger Pool, Tunika-Kleid): 0 Schlauchboote/
    # Bollerwagen/Luftpumpen; Pool = 1 → weg
    ("strand", "html",
     "von robusten Schlauchbooten für die ganze Familie bis hin zu praktischem Spielzeug und Zubehör wie Bollerwagen oder Luftpumpen, die "
     "deinen Ausflug perfekt machen.",
     "von Luftmatratzen in lustigen Formen bis zu Strandtüchern."),
    # ── weitere aus der Prüfung (Beleg «Ware nicht aktiv»), live gemessen 14.10. 12:00–13:05 ──
    # reise-gadgets (309 aktive): 0 Packwürfel, 0 Nackenkissen, 0 Kabel-Organizer (Titel); Kompressionsrucksäcke 8, Kompressionsbeutel 10,
    # Reiseadapter 3, Kulturbeutel 2, Rucksäcke 146, Reisetaschen 123 — Kofferwaage = 1 → weg
    ("reise-gadgets", "html",
     "von <strong>Packwürfeln</strong> und <strong>Vakuum-Kompressions-Rucksäcken</strong> über <strong>Reiseadapter</strong>, "
     "<strong>Reise-Nackenkissen</strong> und <strong>Kulturbeutel</strong> bis zu praktischen <strong>Kabel-Organizern</strong> und "
     "<strong>Weekender-Taschen</strong>.",
     "von <strong>Vakuum-Kompressions-Rucksäcken</strong> und <strong>Kompressionsbeuteln</strong> über <strong>Reiseadapter</strong> "
     "und <strong>Kulturbeutel</strong> bis zu <strong>Reiserucksäcken</strong> und <strong>Reisetaschen</strong>."),
    ("reise-gadgets", "seo_d", "Packwürfel, Reiseadapter, Nackenkissen & Kulturbeutel",
     "Kompressionsbeutel, Adapter & Kulturbeutel"),   # mit Land 155 Zeichen
    # wellness-selfcare (99 aktive): 0 Akupressurmatten, 0 Shiatsu; Massagepistolen 2, Faszienrollen 7, Augenmassagegeräte 19,
    # Aroma-Diffuser 71 — «kraftvoll … schnelle Muskel-Regeneration» (Wirkzusage) weg
    ("wellness-selfcare", "html",
     "von kraftvollen Massagepistolen für die schnelle Muskel-Regeneration über Faszienrollen, Akupressurmatten und Shiatsu-Massagegeräte bis "
     "zu beruhigenden Augenmassagegeräten",
     "von Massagepistolen über Faszienrollen bis zu beruhigenden Augenmassagegeräten"),
    ("wellness-selfcare", "seo_d", "Massagepistolen, Faszienrollen & Akupressurmatten",
     "Aroma-Diffuser, Faszienrollen & Augenmassage"),   # mit Land 152 Zeichen
    # 3d-filament (9 aktive): PLA 4 (Seide 2, Mehrfarbig/Regenbogen 2), flexibel 2 (TPU, flexibles transparentes), carbonfaserverstärkt 2
    # (PETG-CF, ASA-CF); 0 ABS, 0 Resin — PETG/ASA/TPU je 1 → Warengruppen
    ("3d-filament", "html", "PLA, PETG, ABS, TPU sowie Resin/Harz – in vielen Farben, inkl. Seiden-, Regenbogen- und carbonfaserverstärkten "
                            "Varianten",
     "PLA in vielen Farben – auch als Seiden- und mehrfarbiges Filament – sowie flexibles und carbonfaserverstärktes Filament"),
    ("3d-filament", "seo_d", "PLA, PETG, ABS, TPU und Resin", "PLA, flexibles und carbonfaserverstärktes Filament"),
    # kuechen-gadgets (85 aktive): 0 Vakuumierer, 0 Sous-Vide; Gemüseschneider 39, Reiben 4, Zerkleinerer 21, Küchenwaagen 9
    # — Milchaufschäumer = 1 → weg
    ("kuechen-gadgets", "html",
     "Von multifunktionalen Gemüse- und Spiralschneidern über kraftvolle Zerkleinerer bis zu Milchaufschäumern, Vakuumierern, präzisen "
     "Küchenwaagen und Sous-Vide-Garern:",
     "Von multifunktionalen Gemüseschneidern und Reiben über Zerkleinerer bis zu Küchenwaagen:"),
    ("kuechen-gadgets", "seo_d", "Gemüseschneider, Zerkleinerer, Milchaufschäumer, Vakuumierer, Küchenwaagen & Sous-Vide",
     "Gemüseschneider, Reiben, Zerkleinerer & Küchenwaagen"),
    # haustier-gadgets (23 aktive, alles Trinkbrunnen 1,5–4 L): 0 mit 7,5 L, 0 Edelstahl (Live-Text: «7,5 L», geschütztes
    # Leerzeichen); Keramik 4, mit Futternapf 5, kabellos/ohne Strom 3, gross 3 (3 L, 4 L, «gross»), kompakt 2 (1,5 L, 1,8 L) —
    # Literzahlen je 1 → Warengruppe
    ("haustier-gadgets", "html",
     "Von kompakten Mini-Brunnen bis zum grossen 7,5 L-Modell fuer Mehrtierhaushalte: leise Pumpen, hygienische Keramik- und "
     "Edelstahl-Varianten sowie kabellose Smart-Modelle.",
     "Von kompakten Brunnen bis zu grossen Modellen für Mehrtierhaushalte: Keramik-Brunnen, Modelle mit Futternapf sowie kabellose "
     "Brunnen ohne Stromkabel."),
    # ── Runde 3 (Prüfung S3 14.10. 13:36, Befund 2), live 13:40 ──
    # 3d-drucker (13 aktive): 0 Drucker — Ersatzteile 6 (Motherboard, Druckkopf, Federstahlplatte, Düse, Netzteil, Sensor), 3D-Stifte 6.
    # Der SEO-Titel ist ein Handfall (R4 schreibt ihn schon); der Kollektionstitel «3D-Drucker & Stifte» bleibt manuell.
    ("3d-drucker", "html", "3D-Drucker und 3D-Stifte für Einsteiger und Profis – kreatives Gestalten und präzises Drucken zuhause.",
     "3D-Stifte für Einsteiger und Profis sowie Ersatzteile für 3D-Drucker – für kreatives Gestalten und präzises Drucken zuhause."),
    ("3d-drucker", "seo_d", "3D-Drucker und 3D-Stifte für Einsteiger und Profis.",
     "3D-Stifte für Einsteiger und Profis sowie Ersatzteile für 3D-Drucker."),
    ("3d-drucker", "seo_t", "3D-Drucker & 3D-Stifte kaufen", "3D-Stifte & 3D-Drucker-Ersatzteile kaufen"),
    # 3d-druck (26 aktive): 0 Drucker, 0 Tische/Ständer/Schränke, 0 Düsen; 3D-Stifte 7, Heizbetten 2, Druckplatten 2 (Glasplatte,
    # PEI-Platte), Sensoren 2 (Extruder/Hotend je 1 → weg). Der Link-Text «3D-Drucker & Stifte» = Titel der Unterkollektion (manuell).
    ("3d-druck", "html", "<strong>3D-Drucker &amp; 3D-Stifte</strong>", "<strong>3D-Stifte</strong>"),
    ("3d-druck", "html", "Düsen, Extruder, Hotends, Heizbetten und PEI-Druckplatten. Dazu clevere Aufbewahrung wie 3D-Drucker-Tische, "
                         "-Ständer und -Schränke mit Filamenthalterung.",
     "Heizbetten, Druckplatten und Sensoren."),
    # kochen-backen (195 aktive): 0 Küchenmesser zum Schneiden («Küchenmesser mit Strass» = Kostüm-Accessoire, Klingen-Regel 16.09.);
    # Messerhalter/-ständer/-aufbewahrung 4, Messerschärfer/Schleifsteine 5. Der SEO-Titel «… & Messer» bleibt manuell.
    ("kochen-backen", "html", ", <strong>Schneidebretter</strong> und scharfe <strong>Küchenmesser</strong>",
     ", <strong>Schneidebretter</strong>, <strong>Messerhalter</strong> und <strong>Messerschärfer</strong>"),
    ("kochen-backen", "seo_d", "Schneidebretter & Küchenmesser", "Schneidebretter & Messerhalter"),   # gleich lang: ≤ 155 ohne Kürzung
    # ── 19.10.2026 (Spähtrupp koll, Prüfung K7): vier gefüllte Kollektionen mit Marken im Text, die live 0 aktive Produkte haben ─────────
    # damen-uhren (50 aktive, alle Vendor LuxeStyle): 0 Tissot/Calvin Klein/Casio/Citizen/Guess; Strass ≥ 8, Edelstahl ≥ 8, Retro 4, Holz 4
    ("damen-uhren", "html",
     "Ob elegant und zart wie die Tissot Lovely oder die Calvin Klein Dainty Diamonds, oder sportlich und robust wie die Casio Protrek – "
     "bei uns findest du eine vielfältige Auswahl von Citizen bis Guess.",
     "Ob elegant mit Strasssteinen, minimalistisch mit Edelstahl-Armband oder im Retro-Stil mit Holz-Gehäuse – bei uns findest du eine "
     "vielfältige Auswahl an Quarz-Damenuhren."),
    # messwerkzeug (7 aktive): 0 Stanley/Bosch/Dewalt/Ferrestock, 0 Laser-Wasserwaagen; Messschieber 4, Wasserwaagen 2, Entfernungsmesser 1
    ("messwerkzeug", "html",
     "Wasserwaagen, Laser-Wasserwaagen, Laser-Entfernungsmesser und Messschieber von Stanley, Bosch, Dewalt und Ferrestock – für exakte "
     "Linien und millimetergenaue Ergebnisse.",
     "Messschieber, Wasserwaagen und Entfernungsmesser – für exakte Linien und millimetergenaue Ergebnisse."),
    ("messwerkzeug", "seo_d",
     "Wasserwaagen, Laser-Wasserwaagen, Entfernungsmesser & Messschieber von Stanley, Bosch & Dewalt. Präzises Messwerkzeug für exakte "
     "Ergebnisse.",
     "Messschieber, Wasserwaagen & Entfernungsmesser. Präzises Messwerkzeug für exakte Ergebnisse – Gratis-Versand in der Schweiz ab CHF 50."),
    # werkzeugkoffer-sets (11 aktive): 0 Stanley/Bosch/Dewalt/Facom, 0 Werkzeugkoffer/-kästen; Werkzeug-Sets 5, Bit-Sets 3, Steckschlüsselsätze 2
    ("werkzeugkoffer-sets", "html",
     "Werkzeugkoffer, Werkzeugkästen, komplette Werkzeug-Sets, Bit-Sets und Steckschlüsselsätze von Stanley, Bosch, Dewalt und Facom – "
     "ordentlich verstaut und sofort einsatzbereit.",
     "Werkzeug-Sets, Bit-Sets und Steckschlüsselsätze – ordentlich verstaut und sofort einsatzbereit."),
    ("werkzeugkoffer-sets", "seo_d",
     "Werkzeugkoffer, Werkzeugkästen, Werkzeug-Sets, Bit-Sets & Steckschlüsselsätze von Stanley, Bosch, Dewalt & Facom. Alles griffbereit "
     "an einem Ort.",
     "Werkzeug-Sets, Bit-Sets & Steckschlüsselsätze. Alles griffbereit an einem Ort – Gratis-Versand in der Schweiz ab CHF 50."),
    ("damen-uhren", "seo_d", "elegante Marken & Designs", "elegante Designs mit Quarzwerk, Strass oder Edelstahl"),       # Prüfung 19.10. (theme B5): 0 Markenware, Vendor 50/50 LuxeStyle
    ("werkzeugkoffer-sets", "html",
     "Der ideale Grundstock für Haushalt, Werkstatt und Baustelle. Ob Einsteiger-Set oder Profi-Sortiment: Finde die passende Komplettlösung – sortiert nach günstigstem Preis.",
     "Vom Handy-Reparatur-Set über Bit-Sets bis zum Steckschlüsselsatz: Finde das passende Set für deine Aufgabe – sortiert nach günstigstem Preis."),     # Prüfung theme B4
    # damen-duefte (1 aktives Produkt «Damenparfüm langanhaltend», 646 Mitglieder in Entwurf — BigBuy-Marken-Parfums): 0 Dolce & Gabbana/
    # Elie Saab/Lancôme/YSL; «Original Marken-Parfums … 100 % echt & versiegelt» ist für ein No-Name-Parfum eine Falschaussage
    ("damen-duefte", "seo_d",
     "Damen-Düfte bei LuxeStyle: Original Marken-Parfums (Dolce & Gabbana, Elie Saab, Lancôme, YSL) – 100 % echt & versiegelt. "
     "Gratis-Versand CH ab CHF 50.",
     "Damen-Düfte bei LuxeStyle: Damenparfüm online bestellen. Gratis-Versand in der Schweiz ab CHF 50, 30 Tage Rückgabe."),
    ("damen-duefte", "html",
     "Original-Markenparfüms — ob jugendlicher Charme, exklusive Ausstrahlung oder zeitlose Klasse: finde dein perfektes Damenparfüm.",
     "Ob jugendlicher Charme, besondere Ausstrahlung oder zeitlose Klasse: finde dein perfektes Damenparfüm."),
]
# R9 im SEO-Titel nur in Handfällen, in denen S3 den SEO-Titel ohnehin schreibt (R4: eu-lager-schnell, 3d-drucker) — sonst «manuell»
R9_SEO_T = {"3d-drucker"}


def r9(text, ctx, funde):
    """ctx["r9_aus"] = Indizes in INHALT_PAARE, deren genannte Ware live fehlt (r9_ware_pruefen) — diese Paare werden nicht gesetzt."""
    aus = ctx.get("r9_aus") or ()
    for i, (h, f, alt, neu) in enumerate(INHALT_PAARE):
        if h == ctx["handle"] and f == ctx["feld"] and i not in aus and (f != "seo_t" or h in R9_SEO_T):
            text = paar(text, alt, neu, "R9", funde)
    return text


def r9_ware_pruefen(c, angewandt, tor):
    """R9-Beleg vor dem Schreiben (Prüfung S3 14.10. 13:36, Befund 1): Ware, die ein Ersatztext NENNT, muss in einem AKTIVEN Produkttitel
    DIESER Kollektion stehen. Geprüft wird mit derselben Liste wie der Wächter (versprechen_regel.json → kollektion.ware_im_text, Muster
    trifft Text UND Titel; «genannt»- wie Nein-Einträge). Trifft ein Eintrag ohne aktiven Titel den Ersatz eines gesetzten Satzpaars:
      · der ALTE Satz nennt diese Ware nicht → das Paar würde sie neu behaupten → NICHT gesetzt (aus);
      · der alte Satz nennt sie schon (z. B. «elektrischen Heizdecke» im Cashmere-Paar) → gesetzt (es fällt nur Falsches weg), gemeldet.
    → (aus, meldungen); aus = Indizes in INHALT_PAARE, angewandt = {(alt, neu)} der R9-Funde. Beide Fälle stehen als «offen» R9-WARE.
    tor ohne .titel (Selbsttest-Attrappen, Rückweg je Regel ohne Titel) → keine Prüfung."""
    titel = getattr(tor, "titel", None)
    if titel is None:
        return frozenset(), []
    vw = _vw()
    h = c["handle"]
    klar = lambda f, x: vw.koll_klartext(x) if f == "html" else x  # noqa: E731
    paare = [(i, f, a, n) for i, (hh, f, a, n) in enumerate(INHALT_PAARE) if hh == h and (a, n) in angewandt]
    eintraege = [(rx, was) for hh, rx, was in vw.KO_WARE if hh == h]
    if not paare or not eintraege:
        return frozenset(), []
    t = titel()
    aus, meld = set(), []
    for rx, was in eintraege:
        if any(rx.search(x) for x in t):
            continue
        neu_beh = [i for i, f, a, n in paare if rx.search(klar(f, n)) and not rx.search(klar(f, a))]
        schon = [i for i, f, a, n in paare if rx.search(klar(f, n)) and rx.search(klar(f, a))]
        if neu_beh:
            aus.update(neu_beh)
            meld.append(f"R9-WARE: «{was}» hat live kein aktives Produkt — {len(neu_beh)} Satzpaar(e) NICHT gesetzt (neu messen, Paar "
                        f"anpassen)")
        if schon:
            meld.append(f"R9-WARE: «{was}» hat live kein aktives Produkt — {len(schon)} Satzpaar(e) trotzdem gesetzt (der alte Satz nennt "
                        f"die Ware schon), Text prüfen")
    return frozenset(aus), meld


# ─────────────────────────────────────────────────────────────── R4 Tempo mit CH-Lager-Tor
TIERS = ("VOLL", "VIEL", "KAUM")


def stufe(anteil):
    """Schwellen aus versprechen_regel.json → kollektion.tempo (wie der Wächter): VOLL ≥ voll, VIEL ≥ teil, sonst KAUM. Das frühere
    Band TEIL (20–50 %) ist weg: unter teil fällt jede Werktage-Zusage (PLAN-Regel S3 Schritt 3, Prüfung 14.10. abends)."""
    if anteil is None:
        return None
    return "VOLL" if anteil >= VOLL_AB else "VIEL" if anteil >= VIEL_AB else "KAUM"


def lager_stufe(anteil):
    """Lager-Ort «viele Artikel/vieles ab Schweizer Lager» (Tag ch-lager): ab tempo.lager_viele «VIEL», sonst «KAUM»."""
    if anteil is None:
        return None
    return "VIEL" if anteil >= LAGER_VIELE_AB else "KAUM"


def alle(x, **aus):
    d = {t: x for t in TIERS}
    d.update(aus)
    return d


NICHT_VOLL = lambda x: alle(x, VOLL=None)  # noqa: E731
NACHSATZ_PRAEP = re.compile(r"\s+(?:in|nach|durch|innerhalb|per|mit|bis|via|zu|an|aus|direkt)(?![\w])")


def _schnell_ers(m, t):
    """«schnelle Lieferung/Versand/Zustellung …»: Schweiz-Nachsatz → «Lieferung in die ganze Schweiz» (frisst ihn, kein «… in die ganze
    Schweiz in die ganze Schweiz»); anderer Nachsatz («nach Hause», «durch die Schweizer Post», «innerhalb von …») → nur das Adjektiv
    weg; ohne Nachsatz → «Lieferung in die ganze Schweiz»."""
    if m.group("nach"):
        return "Lieferung in die ganze Schweiz"
    if NACHSATZ_PRAEP.match(t, m.end()):
        return m.group("nomen")
    return "Lieferung in die ganze Schweiz"


# (handles|None, felder, regex, {stufe: ersatz|None|callable(m, text)}, tor)
#   tor: T = profil-ch-lager, EU = eu-lager, TL = profil-ch-lager UND Lager-Ort (ch-lager ≥ lager_viele), - = ohne Messung (KAUM)
R4 = [
    # Handfälle
    ({"eu-lager-schnell"}, {"titel"}, r"^EU-Lager — kürzere Lieferzeit$", NICHT_VOLL("EU-Lager"), "T"),
    ({"eu-lager-schnell"}, {"seo_t"}, r"EU-Lager\s+Schnell geliefert kaufen Schweiz", NICHT_VOLL("EU-Lager kaufen Schweiz"), "T"),
    ({"eu-lager-schnell"}, {"seo_d"}, r"EU-Lager\s+Schnell geliefert online kaufen bei LuxeStyle Schweiz – schnelle Lieferung,",
     NICHT_VOLL("EU-Lager online kaufen bei LuxeStyle Schweiz – Lieferzeit auf jeder Produktseite,"), "T"),
    ({"eu-lager-schnell"}, {"html"}, r" und sind meist schneller bei dir als der Direktversand aus Asien\.", NICHT_VOLL("."), "T"),
    ({"3d-drucker"}, {"html"}, r" Marken-Drucker werden aus dem EU-Lager versendet: kurze Lieferzeit, keine Zoll-Überraschungen\.",
     alle("", VOLL=None, VIEL=None), "EU"),
    ({"3d-druck"}, {"html"}, r"<p>🇪🇺 <strong>Marken-Drucker werden aus dem EU-Lager versendet</strong> – kurze Lieferzeiten, "
                             r"keine Zoll-Überraschungen\.</p>", alle("", VOLL=None, VIEL=None), "EU"),
    ({"3d-drucker"}, {"seo_d"}, r"Marken-Drucker aus dem EU-Lager, schnelle Lieferung",
     alle("Lieferzeit auf jeder Produktseite", VOLL=None, VIEL=None), "EU"),
    ({"3d-drucker"}, {"seo_t"}, r" – Versand aus EU \| LuxeStyle$", alle(" | LuxeStyle Schweiz", VOLL=None, VIEL=None), "EU"),
    ({"smoke-zubehoer"}, {"seo_d"}, r"Diskreter Versand ab EU-Lager\.", alle("Diskreter Versand.", VOLL=None, VIEL=None), "EU"),
    ({"ft-maske"}, {"html"}, r"Schnell geliefert aus der Schweiz, Kauf auf Rechnung\.",
     {"VOLL": "Ab Schweizer Lager, meist 2–3 Werktage, Kauf auf Rechnung.",
      "VIEL": "Vieles ab Schweizer Lager, meist 2–3 Werktage, Kauf auf Rechnung.",
      "KAUM": "Kauf auf Rechnung mit Klarna."}, "T"),
    ({"ft-maske"}, {"seo_d"}, r"Blitzversand aus der Schweiz\.",
     {"VOLL": "Ab Schweizer Lager, meist 2–3 Werktage.", "VIEL": "Vieles ab Schweizer Lager, meist 2–3 Werktage.",
      "KAUM": "Lieferung in die ganze Schweiz."}, "T"),
    ({"schuhe"}, {"seo_d"}, r"Bequem & stilvoll, schnelle Lieferung\.",
     NICHT_VOLL("Bequem & stilvoll, Lieferzeit auf jeder Produktseite."), "T"),
    # blitzversand-schweiz (69 %): «Alles, was …» ist ein Allquantor — bei VIEL «Vieles, was …» (zählt der Wächter als erlaubt)
    ({"blitzversand-schweiz"}, {"html"}, r"Alles, was bei uns in der Schweiz liegt — meist in 2–3 Werktagen bei dir, ",
     {"VOLL": None, "VIEL": "Vieles, was bei uns in der Schweiz liegt — meist in 2–3 Werktagen bei dir, ",
      "KAUM": "Alles, was bei uns in der Schweiz liegt — "}, "T"),
    ({"blitzversand-schweiz"}, {"seo_d"}, r"Artikel ab Schweizer Lager – meist in 2–3 Werktagen bei dir, ",
     {"VOLL": None, "VIEL": "Artikel ab Schweizer Lager – viele in 2–3 Werktagen bei dir, ", "KAUM": "Artikel ab Schweizer Lager – "},
     "T"),
    # Gegensatz zur übrigen Ware = implizites «diese hier sind schneller» (Prüfung S3 14.10. spät; Wächter: tempo.kontrast). Gemessen live:
    # blitzversand-highlights profil 0/22 (alle General profile, Kasse 10–20 Werktage), blitzversand-schweiz profil 69 %
    ({"blitzversand-highlights"}, {"html"}, r" Der übrige Katalog kommt direkt ab Werk \(10–20 Werktage\)\.",
     {"VOLL": None, "VIEL": " Ware ohne Schweizer Lager kommt direkt ab Werk (10–20 Werktage).", "KAUM": ""}, "T"),
    ({"blitzversand-schweiz"}, {"html"}, r" Was hier nicht steht, kommt direkt ab Werk und braucht 10–20 Werktage\.",
     {"VOLL": None, "VIEL": " Ware ohne Schweizer Lager kommt direkt ab Werk und braucht 10–20 Werktage.", "KAUM": ""}, "T"),
    # Allgemeine Muster (nur mit Liefer-Substantiv — Regel 9b: «Schnellladegerät», «am schnellsten wachsende»)
    (None, {"html", "seo_d"}, r"[Ss]chnelle Lieferung aus der Schweiz",
     {"VOLL": "ab Schweizer Lager, meist 2–3 Werktage", "VIEL": "vieles ab Schweizer Lager, meist 2–3 Werktage",
      "KAUM": "Lieferung in die ganze Schweiz"}, "T"),
    (None, {"html", "seo_d"}, r"Blitzversand aus der Schweiz",
     {"VOLL": "ab Schweizer Lager, meist 2–3 Werktage", "VIEL": "vieles ab Schweizer Lager, meist 2–3 Werktage",
      "KAUM": "Lieferung in die ganze Schweiz"}, "T"),
    # VOLL ohne zweites «Ab Schweizer Lager» (kostueme-fasnacht sagt es im Satz davor schon: «… aus Schweizer Lager — …»)
    (None, {"html", "seo_d"}, r"Schnelle CH-Lieferung, meist in 2–3 Werktagen; das genaue Datum steht beim Artikel und in der Kasse\.",
     {"VOLL": "Lieferung meist in 2–3 Werktagen; das genaue Datum steht beim Artikel und in der Kasse.",
      "VIEL": "Vieles ab Schweizer Lager, meist in 2–3 Werktagen; das genaue Datum steht beim Artikel und in der Kasse.",
      "KAUM": "Das genaue Lieferdatum steht beim Artikel und in der Kasse."}, "T"),
    (None, {"html", "seo_d"}, r"vieles ab (Schweizer |CH-)Lager mit Blitzversand",
     {"VOLL": r"vieles ab \1Lager, meist 2–3 Werktage", "VIEL": r"vieles ab \1Lager, meist 2–3 Werktage",
      "KAUM": r"vieles ab \1Lager"}, "TL"),
    (None, {"html"}, r"Dank Blitzversand und bequemem Kauf auf Rechnung",
     alle("Dank bequemem Kauf auf Rechnung", VOLL="Dank Versand ab Schweizer Lager und bequemem Kauf auf Rechnung"), "T"),
    (None, {"html", "seo_d"}, r" — schnell bei dir(?=\.)", NICHT_VOLL(""), "T"),
    # fortura-weihnachten (2 %): «… die in die ganze Schweiz blitzschnell zu dir kommt» (Prüfung S3 14.10.); Rest-Fall allgemein
    (None, {"html", "seo_d"}, r", die in die ganze Schweiz blitzschnell zu dir kommt", NICHT_VOLL(", mit Lieferung in die ganze Schweiz"),
     "T"),
    (None, {"html", "seo_d"}, r" blitzschnell(?= (?:zu|bei) dir)", NICHT_VOLL(""), "T"),
    (None, {"html", "seo_d"}, r"(liegen|liegt)((?: im Schweizer Lager| bei uns in der Schweiz)?)(: | — | – )Lieferung meist in "
                              r"2–3 Werktagen",
     {"VOLL": None, "VIEL": r"\1\2\3Lieferung für viele Artikel in 2–3 Werktagen",
      "KAUM": r"\1\2\3das genaue Lieferdatum steht beim Artikel"}, "T"),
    (None, {"html", "seo_d"}, r"(ab Schweizer Lager) – Lieferung meist in 2–3 Werktagen",
     {"VOLL": None, "VIEL": r"\1 – Lieferung für viele Artikel in 2–3 Werktagen", "KAUM": r"\1 – Lieferdatum beim Artikel"}, "T"),
    (None, {"html"}, r"Aus der Schweiz, meist in 2–3 Werktagen\.",
     {"VOLL": None, "VIEL": "Vieles aus der Schweiz, meist in 2–3 Werktagen.", "KAUM": "Die Lieferzeit steht bei jedem Artikel."}, "T"),
    (None, {"html", "seo_d"}, r"(ab Schweizer Lager), meist in 2–3 Werktagen bei dir",
     {"VOLL": None, "VIEL": r"\1, viele Artikel meist in 2–3 Werktagen bei dir", "KAUM": r"\1"}, "T"),
    (None, {"html", "seo_d"}, r"vieles ab Schweizer Lager meist in 2–3 Werktagen",
     {"VOLL": None, "VIEL": None, "KAUM": "vieles ab Schweizer Lager"}, "TL"),
    (None, {"html", "seo_d"}, r"viele Artikel ab Schweizer Lager meist in 2–3 Werktagen",
     {"VOLL": None, "VIEL": None, "KAUM": "viele Artikel ab Schweizer Lager"}, "TL"),
    # liefer_seo (versprechen_regel.json): unbelegtes «schnell» ohne Lagerbezug → Lieferung in die ganze Schweiz bzw. nur Adjektiv weg
    (None, {"html", "seo_d"}, r"[Ss]chnell(?:e|er|en)?\s+(?:CH-|EU-)?(?P<nomen>Lieferung|Versand|Zustellung)"
                              r"(?P<nach>\s+(?:(?:in|nach|innerhalb|durch)\s+(?:die\s+|der\s+)?(?:ganze\s+)?Schweiz(?![\w])"
                              r"|aus\s+der\s+Schweiz(?![\w])))?",
     alle(_schnell_ers), "-"),
]
R4_KOMP = [(h, f, re.compile(VOR_WORT + rx if not rx.startswith(("^", " ", "<", "(", ",")) else rx), e, t)
           for h, f, rx, e, t in R4]
# Finder für Tempo-Zusagen — aus versprechen_regel.json (hart + Werktage, dieselben wie der Wächter; «blitzschnell … zu dir» ist
# drin, «blitzschnelle Raumerfrischung» nicht). Nur Selbsttest/Diagnose; den Rest zählt bearbeiten() mit versprechen_wache.
TEMPO_RX = re.compile("|".join(f"(?:{x})" for x in _TEMPO["hart"] + _TEMPO["weich"]), re.I)


def r4(text, ctx, funde):
    h, f = ctx["handle"], ctx["feld"]
    for hs, felder, rx, ersatz, tor in R4_KOMP:
        if hs is not None and h not in hs:
            continue
        if f not in felder or not rx.search(text):
            continue
        if tor == "-":
            st = "KAUM"
        else:
            st = ctx["tor"]("EU" if tor == "EU" else "T")
            if st is None:
                ctx["offen"].append(f"R4: Tor {tor} nicht messbar")
                continue
        e = ersatz.get(st)
        # «vieles/viele Artikel ab Schweizer Lager» braucht bei KAUM auch beim Lager-Ort einen Anteil ≥ lager_viele (Tag ch-lager);
        # ab VIEL belegt profil-ch-lager (Teilmenge von ch-lager, ch_lager_profil.py) den Lager-Ort schon
        if tor == "TL" and e is not None and st == "KAUM" and ctx["tor"]("L") == "KAUM":
            e = "die Lieferzeit steht bei jedem Artikel"

        def ers(m, t, e=e):
            if e is None:
                return None
            neu = e(m, t) if callable(e) else m.expand(e)
            return fall(m.group(0), neu, t, m.start())
        text = regex(text, rx, ers, "R4", funde)
    return text


# ─────────────────────────────────────────────────────────────── R6 «ab CHF 50» ohne Land in der Nähe
R6_MUSTER = [
    (re.compile(VOR_WORT + r"(Gratis-Versand|Gratisversand|Gratis Versand|gratis Versand|Gratis-Lieferung|"
                r"[Kk]ostenlose[nrm]? Versand)(\s+)ab\s(CHF\s?50)(?![\d'’]|\.\d)"), r"\1 in der Schweiz ab \3"),
    (re.compile(VOR_WORT + r"(Versand)\sab\s(CHF\s?50)\sgratis"), r"\1 in der Schweiz ab \2 gratis"),
    (re.compile(VOR_WORT + r"([Vv])ersandkostenfrei\sab\s(CHF\s?50)(?![\d'’]|\.\d)"), "VKF"),
    (re.compile(VOR_WORT + r"([Gg])ratis\sab\s(CHF\s?50)(?![\d'’]|\.\d)"), "GAB"),
]
R6_FINDER = re.compile(VOR_WORT + r"(?:Gratis-?\s?Versand|Gratisversand|gratis|Gratis|[Vv]ersandkostenfrei|"
                       r"[Kk]ostenlose[nrm]?\s+Versand)[^.·|•<]{0,40}?ab\sCHF\s?50(?![\d'’]|\.\d)")
# Nach einer R6-Einfügung: die überzählige Land-Angabe weiter hinten in DEMSELBEN Satz weg (Vorlagen 14.10. abends gelesen:
# «…, 30 Tage Rückgabe, Lieferung in die ganze Schweiz.», «Profitiere … von unserem Gratis-Versand ab CHF 50 und einem
# 30-Tage-Rückgaberecht für alle Bestellungen in der Schweiz.», «… damit dein Einkaufserlebnis in der Schweiz rundum perfekt wird.»,
# «– so macht Shopping in der Schweiz Freude.»). Kein Komma in der Lücke: «für Produkte, die in der Schweiz hergestellt …» bleibt.
R6_MARKE = "\uE003"
R6_NACH = [
    (re.compile(r"(?:,| und) Lieferung in die (?:ganze )?Schweiz(?=\.|$)"), ""),
    (re.compile(r"((?<![\w])(?:für|damit|so macht)\s[^.,;:!?<\uE000]{0,60}?) in der Schweiz(?=[\s.!?<]|$)"), r"\1"),
]
SATZENDE_NACH_RX = re.compile(r"[.!?](?=\s|<|$|\uE000)|[·|•]|</?(?:p|li|ul|ol|h\d|div|br|tr|td)\b[^>]*>|\uE000\d+\uE001")


# SEO-Beschreibungen, in die das Land auch in der Kurzform nicht passt (14.10. abends gemessen: 158 bzw. 155 Zeichen schon VOR R6) —
# feste Satzpaare, die eine Aufzählung kürzen statt die Land-Angabe wegzulassen (vorher «offen»)
R6_SEO_PAARE = {
    "laptop-tablet-zubehoer": ("Laptop-Sleeves, Taschen & Rucksäcke, Ständer, Ladekabel, Lautsprecher & Tablet-Halter – alles Zubehör für "
                               "Laptop, Notebook & Tablet. Gratis-Versand ab CHF 50.",
                               "Laptop-Sleeves, Taschen & Rucksäcke, Ständer, Ladekabel & Tablet-Halter – Zubehör für Laptop, Notebook & "
                               "Tablet. Gratis-Versand in der Schweiz ab CHF 50."),
    "haustier-katze": ("Katzenbett kaufen: flauschige Katzenbetten, mit Kletterrahmen oder aus Massivholz, dazu Katzenspielzeug, "
                       "Kratzmöbel und Katzenklo. Gratisversand ab CHF 50.",
                       "Katzenbett kaufen: flauschige Katzenbetten, mit Kletterrahmen oder aus Massivholz, dazu Spielzeug, Kratzmöbel "
                       "und Katzenklo. Gratis-Versand CH ab CHF 50."),
}


def r6(text, ctx, funde):
    vorher = len(funde)
    if ctx.get("feld") == "seo_d" and ctx.get("handle") in R6_SEO_PAARE:
        text = paar(text, *R6_SEO_PAARE[ctx["handle"]], "R6", funde)
    for rx, ers in R6_MUSTER:
        def f(m, t, ers=ers):
            if land_nah(t, m.start(), m.end()):
                return None
            if ers == "VKF":
                start = satzanfang(t, m.start())
                neu = ("In der Schweiz versandkostenfrei" if start else "in der Schweiz versandkostenfrei") + f" ab {m.group(2)}"
            elif ers == "GAB":
                start = satzanfang(t, m.start()) or (m.group(1) == "G" and not re.search(r"[,;]\s*$", t[:m.start()]))
                neu = ("In der Schweiz gratis" if start else "in der Schweiz gratis") + f" ab {m.group(2)}"
            else:
                neu = m.expand(ers)
            return neu + R6_MARKE
        text = regex(text, rx, f, "R6", funde)
    for x in funde[vorher:]:
        x.neu = x.neu.replace(R6_MARKE, "")
    if R6_MARKE not in text:
        return text
    stellen = [m.start() for m in re.finditer(R6_MARKE, text)]
    for p in reversed(stellen):
        q = SATZENDE_NACH_RX.search(text, p + 1)
        q = q.start() if q else len(text)
        seg = text[p + 1:q]
        for rx, ers in R6_NACH:
            neu_seg = rx.sub(ers, seg, count=1)
            if neu_seg != seg:
                funde.append(Fund("R6", seg, neu_seg))
                seg = neu_seg
        text = text[:p] + seg + text[q:]
    return text


def r6_rest(text):
    """Gratis-Aussagen «ab CHF 50» ohne Land-Beleg in der Nähe (wie versprechen_wache.ab50_ohne_land, aber am HTML)."""
    return sum(1 for m in R6_FINDER.finditer(text) if not land_nah(text, m.start(), m.end()))


# ─────────────────────────────────────────────────────────────── SEO-Länge (nie «…»)
SCHWACH = [  # Reihenfolge = zuerst fallen (fest, nie «…»); KOMPAKT kommt vor Rückgabe/Lieferzeit
    re.compile(r"(?<=: )grosse Auswahl,\s*|,\s*grosse Auswahl(?=[,.])|\s*·\s*grosse Auswahl(?=\s*·)"),
    re.compile(r",\s*(?:10\s?% Rabatt mit|[−–-]?\s?10\s?% mit)(?: Code)? WELCOME10(?= ?(?:bei LuxeStyle)?\.?$)"
               r"|\s*·\s*[−–-]?\s?10\s?% mit(?: Code)? WELCOME10(?=\.?$)"
               r"|(?<=\.)\s*(?:Jetzt\s+)?[−–-]?\s?10\s?% mit(?: Code)? WELCOME10(?: bei LuxeStyle)?\.$"
               r"|,\s*Code WELCOME10(?: für –10 %)?(?=\.$)|(?<=\.)\s*Code WELCOME10 für –10 %\.$"),
    re.compile(r"Schweizer (?:Online-?)?Shop,\s*|\s*[–—]\s*Schweizer Online-Shop(?=\.)"),
    re.compile(r"\s*Jetzt entdecken bei LuxeStyle(?= –)|(?<=\.)\s*Jetzt(?:\s+\S+){1,3}\s+entdecken[.!](?=\s|$)"),
    re.compile(r"(?<=LuxeStyle) Schweiz(?=[:,.]| [–—])"),
    re.compile(r",\s*TWINT (?:&|und|oder) Klarna(?=\.$)|\s*·\s*TWINT (?:&|und|oder) Klarna(?=\.?$)"),
    "KOMPAKT",
    "KOMPAKT2",
    re.compile(r",\s*Lieferzeit auf jeder Produktseite(?=\.$)"),
    re.compile(r",\s*30 Tage Rückgabe(?=[,.])|\s*·\s*30 Tage Rückgabe(?=[\s·.]|$)"),
]
KOMPAKT_RX = re.compile(r"(Gratis-Versand|Gratisversand|Gratis Versand|gratis Versand|[Kk]ostenlose[nrm]? Versand|Versand) in der "
                        r"Schweiz ab (CHF ?50)")
KOMPAKT2_RX = re.compile(r"(?:Gratis-Versand|Gratisversand|Gratis Versand) CH ab (CHF ?50)(?! gratis)")


def _schwach_schritt(rx, s):
    if rx == "KOMPAKT":
        neu = KOMPAKT_RX.sub(r"\1 CH ab \2", s)
    elif rx == "KOMPAKT2":
        neu = KOMPAKT2_RX.sub(r"Versandfrei CH ab \1", s)
    else:
        neu = rx.sub("", s, count=1)
    if neu != s:
        neu = re.sub(r"\s{2,}", " ", neu).replace(" .", ".").replace(",.", ".")
    return neu


def seo_kuerzen(s, funde):
    """≤ SEO_D_MAX, nie «…», NICHT gierig (Prüfung S3 14.10.; Muster koll_seo_laengen._auswahl): unter allen Kombinationen der
    SCHWACH-Schritte die, die das Wichtigste behält (Gewicht 2^i — ein späterer Schritt ist wichtiger als alle früheren zusammen),
    bei Gleichstand die längste. So kommen Langform «in der Schweiz», «30 Tage Rückgabe» und «LuxeStyle Schweiz» zurück, sobald
    sie nach einem späteren Schritt wieder passen. Passt keine Kombination: alle Schritte (der Aufrufer meldet dann «offen»)."""
    if len(s) <= SEO_D_MAX:
        return s
    wirksam = [i for i, rx in enumerate(SCHWACH) if _schwach_schritt(rx, s) != s]
    if SCHWACH.index("KOMPAKT") in wirksam:
        wirksam.append(SCHWACH.index("KOMPAKT2"))       # Kurzform 2 setzt Kurzform 1 voraus
    wirksam = sorted(set(wirksam))
    bestes = None
    for maske in range(1 << len(wirksam)):
        t = s
        for b, i in enumerate(wirksam):
            if maske >> b & 1:
                t = _schwach_schritt(SCHWACH[i], t)
        if len(t) > SEO_D_MAX:
            continue
        behalten = sum(1 << i for b, i in enumerate(wirksam) if not maske >> b & 1)
        schluessel = (behalten, len(t))
        if bestes is None or schluessel > bestes[0]:
            bestes = (schluessel, t)
    if bestes is None:
        t = s
        for rx in SCHWACH:
            t = _schwach_schritt(rx, t)
    else:
        t = bestes[1]
    if t != s:
        funde.append(Fund("SEO≤155", s, t))
    return t


# ─────────────────────────────────────────────────────────────── Pipeline
REGELN = ("R1", "R3", "R4", "R5", "R6", "R7", "R8", "R9")


def _feld(feld, t, ctx, premium_nur, mit_r6=True, ohne=frozenset()):
    """ohne = Regeln, die NICHT laufen (Rückweg je Regel: --zurueck-regel)."""
    fl = []
    an = lambda r: r not in ohne  # noqa: E731
    if feld in ("html", "seo_d", "seo_t") and an("R9"):
        t = r9(t, ctx, fl)                                 # Satzpaare auf den LIVE-Text, vor allen anderen Regeln (auch Premium);
        #                                                    seo_t nur in Handfällen (R9_SEO_T), r9() prüft das selbst
    if premium_nur:
        if feld == "html" and an("R5"):
            t = r5(t, ctx, fl)
        return t, fl
    if feld == "seo_d":
        if an("R5"):
            t = r5(t, ctx, fl)                             # Handfälle zuerst (frontpage-SEO endet auf «· P»)
        if an("R3"):
            t = r3(t, ctx, fl)
        if an("R8"):
            t = r8(t, ctx, fl)
    if feld == "html" and an("R1"):
        t = r1(t, ctx, fl)
    if feld in ("html", "seo_d"):
        if an("R7"):
            t = r7(t, ctx, fl)
        if an("R3"):
            t = r3(t, ctx, fl)
        if an("R5"):
            t = r5(t, ctx, fl)
    if an("R4"):
        t = r4(t, ctx, fl)
    if feld in ("html", "seo_d") and mit_r6 and an("R6"):
        t = r6(t, ctx, fl)
    if feld == "seo_d" and an("R8"):
        t = r8_usp(t, ctx, fl)
    return t, fl


_VW = []


def _vw():
    """versprechen_wache (derselbe Finder wie die Ampel-Zeile) — einmal geladen."""
    if not _VW:
        import versprechen_wache as vw
        _VW.append(vw)
    return _VW[0]


def koll_rest(neu, h, tor):
    """Rest nach den Regeln mit dem WÄCHTER-Finder (versprechen_wache.koll_funde/koll_klassen): {"rot", "manuell", "premium"} je
    {Regel: Zahl}. Der Anteil profil-ch-lager wird nur gemessen, wenn ein Tempo-Treffer da ist (wie im Wächter)."""
    vw = _vw()
    fe = {"title": neu["titel"], "descriptionHtml": vw.koll_klartext(neu["html"]), "seo.title": neu["seo_t"],
          "seo.description": neu["seo_d"]}
    anteil = None
    if any(vw.tempo_treffer(t) for t in fe.values()):
        a = getattr(tor, "anteil", None)
        anteil = a("T") if a else None
    rot, man, prem = vw.koll_klassen(vw.koll_funde(fe, h, anteil), h)
    zahl = lambda d: {r: len(v) for r, v in d.items()}  # noqa: E731
    return {"rot": zahl(rot), "manuell": zahl(man), "premium": zahl(prem)}


def bearbeiten(c, tor, premium_voll=PREMIUM_VOLL, ohne=frozenset(), r9_aus=None):
    """c = {handle, title, os, descriptionHtml, seo{title,description}} → (neu-Dict, funde je feld, offen, rest).
    rest = {"rot": {Regel: n}, "manuell": {…}, "premium": {…}} — rot = was der Wächter danach noch zählt (+ R7/R8 des Werkzeugs).
    R9-Beleg (Prüfung S3 14.10. 13:36): hat tor ein .titel (aktive Produkttitel, live), werden Satzpaare, deren genannte Ware dort fehlt,
    NICHT gesetzt (r9_ware_pruefen) und als «offen» geführt; r9_aus = diese Paare von aussen (None = selbst prüfen)."""
    if r9_aus is None:
        neu, funde, offen, rest = bearbeiten(c, tor, premium_voll, ohne, r9_aus=frozenset())
        if "R9" in ohne or not any(x.regel == "R9" for fl in funde.values() for x in fl):
            return neu, funde, offen, rest
        aus, meld = r9_ware_pruefen(c, {(x.alt, x.neu) for fl in funde.values() for x in fl if x.regel == "R9"}, tor)
        if not meld:
            return neu, funde, offen, rest
        neu, funde, offen, rest = bearbeiten(c, tor, premium_voll, ohne, r9_aus=aus)
        return neu, funde, offen + meld, rest
    h = c["handle"]
    seo = c.get("seo") or {}
    alt = {"titel": c.get("title") or "", "html": c.get("descriptionHtml") or "",
           "seo_t": seo.get("title") or "", "seo_d": seo.get("description") or ""}
    masked, teile = maskieren(alt["html"])
    ctx = {"handle": h, "os": c.get("os"), "tor": tor, "offen": [], "html_text": sichtbar(masked), "r9_aus": r9_aus}
    premium_nur = ist_premium(h) and not premium_voll
    neu, funde = dict(alt), {}
    for feld in ("titel", "html", "seo_t", "seo_d"):
        ctx["feld"] = feld
        orig = masked if feld == "html" else alt[feld]
        t, fl = _feld(feld, orig, ctx, premium_nur, ohne=ohne)
        t = glaetten(t, orig)
        if feld == "seo_d" and t != orig and len(t) > SEO_D_MAX:
            t = seo_kuerzen(t, fl)
            if len(t) > SEO_D_MAX:
                # Land passt nicht mehr hinein: SEO-Beschreibung OHNE R6, die übrigen Regeln bleiben (nie «…»)
                ctx["offen"].append(f"R6-SEO: {len(t)} Zeichen > {SEO_D_MAX} — «in der Schweiz» passt nicht, R6 dort weggelassen")
                t, fl = _feld(feld, orig, ctx, premium_nur, mit_r6=False, ohne=ohne)
                t = glaetten(t, orig)
                if t != orig and len(t) > SEO_D_MAX:
                    t = seo_kuerzen(t, fl)
        if feld == "html":
            try:
                t = entmaskieren(t, teile)
            except ValueError as e:
                ctx["offen"].append(f"SCHUTZ: {e}")
                t = alt["html"]
                fl = []
        neu[feld] = t
        if fl and t != alt[feld]:
            funde[feld] = fl
    rest = koll_rest(neu, h, tor)
    ziel = rest["premium"] if premium_nur else rest["rot"]
    sicht = " ".join([sichtbar(maskieren(neu["html"])[0]), neu["seo_d"], neu["seo_t"], neu["titel"]])
    if abgeschnitten(neu["seo_d"]):
        ziel["R8"] = 1
    if h in SG and R7_REST.search(sicht) and "ausgenommen" not in sicht:
        ziel["R7"] = len(R7_REST.findall(sicht))
    return neu, funde, ctx["offen"], rest


# «… in die ganze Schweiz in die ganze Schweiz», «in der Schweiz … in der Schweiz» (Prüfung S3: «Schweiz [^.]{0,20}Schweiz»). Nicht über
# · | • hinweg und nicht «Schweizer …» (14.10. abends gemessen: «Gratis-Versand in der Schweiz ab CHF 50 · 🇨🇭 Schweizer Onlineshop»
# bzw. «· Schweizer Kundenservice» sind zwei Aussagen, kein Doppel)
SCHWEIZ_NAH_RX = re.compile(r"Schweiz [^.·|•]{0,20}Schweiz(?![\w])")


def pruefen(alt, neu):
    """Verstösse der NEUEN Werte (nur geänderte Felder)."""
    v = []
    if neu["html"] != alt["html"]:
        if schutz_bilanz(alt["html"]) != schutz_bilanz(neu["html"]):
            v.append("html: Schutzblöcke (gd2/ls-verwandt/data-lux-anlass) verändert")
        p_alt = alt["html"].count("<p") - alt["html"].count("</p>")
        p_neu = neu["html"].count("<p") - neu["html"].count("</p>")
        if p_alt != p_neu:
            v.append("html: <p>-Bilanz verändert")
        if re.search(r"<p>\s*</p>|<li>\s*</li>", neu["html"]) and not re.search(r"<p>\s*</p>|<li>\s*</li>", alt["html"]):
            v.append("html: leerer Absatz")
        if R6_MARKE in neu["html"]:
            v.append("html: interne Marke übrig")
    for f in ("titel", "html", "seo_t", "seo_d"):
        if neu[f] == alt[f]:
            continue
        a, n = alt[f], neu[f]
        if n.count("ß") > a.count("ß"):
            v.append(f"{f}: ß")
        if n.count("…") > a.count("…") or (f == "seo_d" and re.search(r"(?:…|\.\.\.)\s*$", n)):
            v.append(f"{f}: «…»")
        if "in der Schweiz in der Schweiz" in n or "Schweiz ab CHF 50 in der Schweiz" in n:
            v.append(f"{f}: Land doppelt")
        if len(SCHWEIZ_NAH_RX.findall(sichtbar(n))) > len(SCHWEIZ_NAH_RX.findall(sichtbar(a))):
            v.append(f"{f}: «Schweiz … Schweiz» (≤ 20 Zeichen)")
        for rx, name in ((r"\w [,.](?=\s|<|$)", "Leerzeichen vor Satzzeichen"), (r",,|\.\.(?!\.)|·\s*·", "Doppelzeichen")):
            if len(re.findall(rx, n)) > len(re.findall(rx, a)):
                v.append(f"{f}: {name}")
        if not n.strip():
            v.append(f"{f}: leer")
        if R6_MARKE in n:
            v.append(f"{f}: interne Marke übrig")
    if neu["seo_d"] != alt["seo_d"] and len(neu["seo_d"]) > SEO_D_MAX:
        v.append(f"seo_d: {len(neu['seo_d'])} Zeichen > {SEO_D_MAX}")
    if neu["seo_t"] != alt["seo_t"] and len(neu["seo_t"]) > SEO_T_MAX:
        v.append(f"seo_t: {len(neu['seo_t'])} Zeichen > {SEO_T_MAX}")
    return v


# ─────────────────────────────────────────────────────────────── Shopify (lesen; schreiben nur SCHARF=1)
def _gql():
    import google_feedback_wache as g   # Eimer-Etikette (nachlauf) steckt dort drin
    return g.gql


def onlineshop_id(gql):
    d = gql("{publications(first:50){nodes{id name}}}")["data"]["publications"]["nodes"]
    t = [p["id"] for p in d if p["name"] == "Online Store"]
    if len(t) != 1:
        raise RuntimeError(f"Onlineshop-Publikation nicht eindeutig: {t}")
    return t[0]


Q_KOLL = ("query($c:String,$p:ID!){collections(first:50,after:$c){pageInfo{hasNextPage endCursor} nodes{id handle title "
          "descriptionHtml seo{title description} os:publishedOnPublication(publicationId:$p)}}}")
Q_EINE = ("query($h:String!,$p:ID!){collectionByHandle(handle:$h){id handle title descriptionHtml seo{title description} "
          "os:publishedOnPublication(publicationId:$p)}}")
Q_PROD = ("query($h:String!,$c:String){collectionByHandle(handle:$h){products(first:250,after:$c){pageInfo{hasNextPage "
          "endCursor} nodes{status tags title}}}}")


def alle_kollektionen(gql, pub):
    alle_, cur = [], None
    while True:
        d = gql(Q_KOLL, {"c": cur, "p": pub})["data"]["collections"]
        alle_ += d["nodes"]
        if not d["pageInfo"]["hasNextPage"]:
            break
        cur = d["pageInfo"]["endCursor"]
    z = gql("{collectionsCount(limit:null){count precision}}")["data"]["collectionsCount"]
    if z["precision"] != "EXACT" or z["count"] != len(alle_):
        raise RuntimeError(f"Unvollständig gelesen: {len(alle_)} statt {z}")
    return alle_


def anteile(gql, handle):
    """LIVE: Anteil profil-ch-lager / ch-lager / eu-lager unter den AKTIVEN Produkten (Kombi collection_id+tag
    zählt in der Suche 0 — GEMESSEN 14.10. —, deshalb blättern). «titel» = Titel der aktiven Produkte (R9-Beleg, r9_ware_pruefen)."""
    cur, akt, pro, chl, eu, titel = None, 0, 0, 0, 0, []
    marke = _TEMPO.get("marke") or "profil-ch-lager"
    while True:
        p = gql(Q_PROD, {"h": handle, "c": cur})["data"]["collectionByHandle"]["products"]
        for n in p["nodes"]:
            if n["status"] != "ACTIVE":
                continue
            akt += 1
            t = set(n["tags"])
            pro += marke in t
            chl += "ch-lager" in t
            eu += "eu-lager" in t
            titel.append(n.get("title") or "")
        if not p["pageInfo"]["hasNextPage"]:
            break
        cur = p["pageInfo"]["endCursor"]
    if not akt:
        return {"akt": 0, "T": 0.0, "L": 0.0, "EU": 0.0, "titel": []}
    return {"akt": akt, "T": pro / akt, "L": chl / akt, "EU": eu / akt, "titel": titel}


def tor_fabrik(gql, handle, memo):
    """tor(art) → Stufe (T/EU: stufe(), L: lager_stufe()); tor.anteil(art) → gemessener Anteil (für den Wächter-Finder);
    tor.titel() → Titel der aktiven Produkte (R9-Beleg vor dem Schreiben)."""
    def messen():
        if handle not in memo:
            memo[handle] = anteile(gql, handle)
        return memo[handle]

    def tor(art):
        a = messen()[art]
        return lager_stufe(a) if art == "L" else stufe(a)

    def titel():
        if "titel" not in messen():                    # Eintrag ohne Titel (älterer Zwischenspeicher) → neu messen
            memo[handle] = anteile(gql, handle)
        return memo[handle]["titel"]
    tor.anteil = lambda art: messen()[art]
    tor.titel = titel
    return tor


def esc(s):
    return (s or "").replace("\\", "\\\\").replace("\t", "\\t").replace("\n", "\\n").replace("\r", "\\r")


def unesc(s):
    return re.sub(r"\\(.)", lambda m: {"t": "\t", "n": "\n", "r": "\r", "\\": "\\"}.get(m.group(1), m.group(0)), s)


LEDGER_KOPF = ("zeit", "handle", "feld", "alt", "neu", "status", "regeln", "schluessel")


def ledger(handle, feld, alt, neu, status, regeln="", schluessel=""):
    """Eine Zeile, sofort fsync (Prüfung S3 14.10.: Container startet ~stündlich neu — «geplant» MUSS vor der Mutation auf der
    Platte stehen, sonst kann --zurueck eine geänderte Kollektion nicht finden)."""
    zeit = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(os.path.dirname(LEDGER) or ".", exist_ok=True)
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write("\t".join([zeit, handle, feld, esc(alt), esc(neu), status, regeln, schluessel]) + "\n")
        f.flush()
        os.fsync(f.fileno())


def ledger_lesen():
    """→ Liste von Dicts in Dateireihenfolge. Alte 5-Spalten-Zeilen (vor 14.10. abends) gelten als «ok» (bzw. «zurueck-ok»)."""
    out = []
    if not os.path.exists(LEDGER):
        return out
    for nr, z in enumerate(open(LEDGER, encoding="utf-8")):
        t = z.rstrip("\n").split("\t")
        if len(t) < 5:
            continue
        d = {"nr": nr, "zeit": t[0], "handle": t[1], "feld": t[2], "alt": unesc(t[3]), "neu": unesc(t[4]),
             "status": t[5] if len(t) > 5 else "ok", "regeln": set(x for x in (t[6] if len(t) > 6 else "").split(",") if x),
             "schluessel": t[7] if len(t) > 7 else f"alt:{nr}"}
        if d["feld"].startswith("zurueck:"):
            d["feld"] = d["feld"].split(":", 1)[1]
            d["status"] = "zurueck-ok"
            d["regeln"] = {"ZURUECK"}
        out.append(d)
    return out


def ops_je_feld(zeilen, handles=None):
    """{(handle, feld): [op]} — op = {alt, neu, regeln, kind: ok|offen}. «geplant» wird über den Schlüssel mit seiner «ok»-Zeile
    gepaart (neu = Rückgelesenes); ohne «ok» (Abbruch, Neustart, Fehler) bleibt es «offen» mit neu = geplant."""
    offen, ops = {}, {}
    for d in zeilen:
        if handles and d["handle"] not in handles:
            continue
        key = (d["handle"], d["feld"])
        st = d["status"].replace("zurueck-", "")
        if st == "geplant":
            op = {"alt": d["alt"], "neu": d["neu"], "regeln": d["regeln"], "kind": "offen", "schluessel": d["schluessel"]}
            offen[key + (d["schluessel"],)] = op
            ops.setdefault(key, []).append(op)
        elif st in ("ok", "fehler"):
            op = offen.pop(key + (d["schluessel"],), None)
            if op is None:                                  # Zeile ohne «geplant» (alte Ledger-Fassung)
                if st == "ok":
                    ops.setdefault(key, []).append({"alt": d["alt"], "neu": d["neu"], "regeln": d["regeln"], "kind": "ok",
                                                    "schluessel": d["schluessel"]})
                continue
            if st == "ok":
                op["kind"], op["neu"] = "ok", d["neu"]
            # «fehler»: bleibt «offen» (Stand unklar: neu = geplant)
    return ops


def tag_bilanz(h):
    """Anzahl <a, <strong, <li, <p — Markup-Verluste, die der sichtbare Text nicht zeigt (Prüfung S3 14.10.)."""
    return tuple(len(re.findall(re.escape(t) + r"(?![\w-])", h or "")) for t in ("<a", "<strong", "<li", "<p"))


def entities(x):
    """HTML-Entities dekodieren (&ndash; → –, &#39; → ', &amp; → &), &lt;/&gt; bleiben (sonst würde Text «&lt;p&gt;» zum Tag)."""
    x = (x or "").replace("&lt;", "\uE010").replace("&gt;", "\uE011")
    return html_mod.unescape(x).replace("\uE010", "&lt;").replace("\uE011", "&gt;")


def gleich(f, a, b):
    """Rücklesen nach dem eigenen Schreiben (tolerant: Shopify darf Entities/Attribute/Leerraum normalisieren): sichtbarer Text,
    Schutzblöcke und Tag-Zahlen. NICHT für «geplant ohne ok» — dort streng()."""
    if f != "html":
        return (a or "") == (b or "")
    a, b = entities(a), entities(b)
    return (sichtbar(maskieren(a)[0]) == sichtbar(maskieren(b)[0]) and schutz_bilanz(a) == schutz_bilanz(b)
            and tag_bilanz(a) == tag_bilanz(b))


def streng(f, a, b):
    """Für «geplant» ohne «ok» (Prüfung S3 14.10. spät): es gibt kein Rückgelesenes — nur Entities und Leerraum tolerieren, Tags samt
    Attributen exakt. gleich() verglich nur sichtbaren Text + Tag-Zahlen: eine fremd umgebogene href galt als «= neu», --zurueck hätte
    den Originaltext samt alter href zurückgeschrieben, 0 Abweichung gemeldet und rc 0 geliefert."""
    if f != "html":
        return (a or "") == (b or "")
    n = lambda x: re.sub(r"\s+", " ", entities(x)).strip()  # noqa: E731 — Entities/Leerraum ja, Tags und Attribute exakt
    return n(a) == n(b)


def kette(ops, live_f, feld):
    """Zeilen eines (handle, feld) zu einer Kette — NUR solange alt(n+1) == neu(n) (exakt). «offen» (geplant ohne ok): Folgestand
    (nächstes alt bzw. live) == neu → als Glied (neu = Folgestand) · == alt → nicht angekommen, entfällt · sonst Bruch — verglichen
    mit streng() (Tags/Attribute exakt), nie mit gleich().
    → {start, ende, glieder, bruch, meld}; {leer: True, meld} ohne Glied (nichts angekommen); {unklar: True, meld} wenn das letzte
    Glied ein Bruch ist; None ohne Zeilen."""
    glieder, meld = [], []
    for i, op in enumerate(ops):
        if op["kind"] == "ok":
            glieder.append(op)
            continue
        nach = ops[i + 1]["alt"] if i + 1 < len(ops) else live_f
        if streng(feld, nach, op["neu"]):
            glieder.append(dict(op, neu=nach))
            meld.append("geplant ohne ok: Folgestand = neu → mitgenommen")
        elif streng(feld, nach, op["alt"]):
            meld.append("geplant ohne ok: nicht angekommen (Folgestand = alt)")
        else:
            glieder.append({"bruch": True})
            meld.append("geplant ohne ok: Folgestand weder alt noch neu")
    if not ops:
        return None
    if not glieder:
        return {"leer": True, "meld": meld}
    if glieder[-1].get("bruch"):
        return {"unklar": True, "meld": meld}
    j = len(glieder) - 1
    while j > 0 and not glieder[j - 1].get("bruch") and glieder[j]["alt"] == glieder[j - 1]["neu"]:
        j -= 1
    if j > 0:
        meld.append(f"Kettenbruch vor Glied {j + 1} von {len(glieder)} — nur bis dorthin zurück")
    return {"start": glieder[j]["alt"], "ende": glieder[-1]["neu"], "glieder": glieder[j:], "bruch": j > 0, "meld": meld}


def sperre_nehmen(pfad, warten):
    """flock auf pfad; warten Sekunden (0 = sofort). → Datei-Objekt oder None."""
    f = open(pfad, "a")
    ende = time.time() + warten
    while True:
        try:
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return f
        except OSError:
            if time.time() >= ende:
                f.close()
                return None
            time.sleep(2)


def sperre_frei(f):
    if f:
        try:
            fcntl.flock(f, fcntl.LOCK_UN)
        finally:
            f.close()


def schreiben(gql, cid, alt, neu):
    inp = {"id": cid}
    if neu["html"] != alt["html"]:
        inp["descriptionHtml"] = neu["html"]
    if neu["titel"] != alt["titel"]:
        inp["title"] = neu["titel"]
    if neu["seo_t"] != alt["seo_t"] or neu["seo_d"] != alt["seo_d"]:
        inp["seo"] = {"title": neu["seo_t"], "description": neu["seo_d"]}   # SEOInput immer mit BEIDEN Feldern
    r = gql("mutation($i:CollectionInput!){collectionUpdate(input:$i){collection{id} userErrors{field message}}}", {"i": inp})
    e = ((r.get("data") or {}).get("collectionUpdate") or {}).get("userErrors")
    if e is None or e:
        return f"userErrors {e}"
    return None


def live_felder(c):
    seo = c.get("seo") or {}
    return {"titel": c.get("title") or "", "html": c.get("descriptionHtml") or "",
            "seo_t": seo.get("title") or "", "seo_d": seo.get("description") or ""}


FELDER = ("titel", "html", "seo_t", "seo_d")


def schreiben_mit_ledger(gql, pub, h, cid, alt, neu, regeln_je_feld, schluessel, art=""):
    """Ledger «geplant» (fsync) → collectionUpdate → Rücklesen → «ok» je Feld (neu = Rückgelesenes) bzw. «fehler».
    → (ok: bool, Text). Wirft nie (Fehler werden Text)."""
    felder = [f for f in FELDER if neu[f] != alt[f]]
    pre = "zurueck-" if art == "zurueck" else ""
    for f in felder:
        ledger(h, f, alt[f], neu[f], pre + "geplant", regeln_je_feld.get(f, ""), schluessel)
    try:
        err = schreiben(gql, cid, alt, neu)
    except Exception as e:  # noqa: BLE001
        err = f"{type(e).__name__}: {str(e)[:160]}"
    if err:
        for f in felder:
            ledger(h, f, alt[f], neu[f], pre + "fehler", regeln_je_feld.get(f, ""), schluessel)
        return False, f"Schreiben: {err}"
    try:
        c = gql(Q_EINE, {"h": h, "p": pub})["data"]["collectionByHandle"]
        back = live_felder(c)
    except Exception as e:  # noqa: BLE001
        for f in felder:
            ledger(h, f, alt[f], neu[f], pre + "fehler", regeln_je_feld.get(f, ""), schluessel)
        return False, f"Rücklesen: {type(e).__name__}: {str(e)[:160]}"
    fehl = [f for f in felder if not gleich(f, back[f], neu[f])]
    for f in felder:
        if f in fehl:
            ledger(h, f, alt[f], neu[f], pre + "fehler", regeln_je_feld.get(f, ""), schluessel)
        else:
            ledger(h, f, alt[f], back[f], pre + "ok", regeln_je_feld.get(f, ""), schluessel)
    if fehl:
        return False, f"Rücklesen weicht ab in {fehl}"
    return True, ", ".join(felder)


def _lauf_id():
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + f"-{os.getpid()}"


def zurueck(handles, regel=None):
    """Ledger rückwärts. regel=None: jedes Feld auf den Anfang seiner UNGEBROCHENEN Kette (alt(n+1) == neu(n)); beim Bruch nur bis
    dorthin, Bruch gemeldet. regel="R4": nur die Änderungen dieser Regel — Ziel = bearbeiten(Kettenanfang, ohne R4), geschrieben
    nur in Feldern, deren Kette R4 trägt (R1/R3/R6 bleiben), und nur wenn die heutigen Regeln den Live-Stand für eine Stufen-Kombination
    exakt erzeugen (sonst gemeldet). Ohne SCHARF=1 nur Anzeige. Eigene Sperre + koll_seo_laengen-Sperre je
    Kollektion; «ok» nur, wenn das Rücklesen aller Felder stimmt. Schlusszeile auch nach Fehlern."""
    modus = "SCHARF" if SCHARF else "DRY"
    st = {"ok": 0, "abw": 0, "fehl": 0, "bruch": 0, "nichts": 0, "wuerde": 0}
    eigene = None
    lauf = _lauf_id()
    try:
        if SCHARF:
            eigene = sperre_nehmen(EIGENE_SPERRE, 0)
            if not eigene:
                print("KOLL-S3 ZURÜCK: S3 läuft schon (eigene Sperre belegt) — nichts getan")
                return 0
        ops = ops_je_feld(ledger_lesen(), handles)
        gql = _gql()
        pub = onlineshop_id(gql)
        memo = {}
        for nr, h in enumerate(sorted({h for h, _ in ops})):
            try:
                _zurueck_eine(gql, pub, h, {f: o for (hh, f), o in ops.items() if hh == h}, regel, st, f"{lauf}:{nr}", memo)
            except Exception as e:  # noqa: BLE001
                st["fehl"] += 1
                print(f"  ✗ {h}: {type(e).__name__}: {str(e)[:160]}")
    except Exception as e:  # noqa: BLE001
        st["fehl"] += 1
        print(f"  ✗ Abbruch: {type(e).__name__}: {str(e)[:160]}")
    finally:
        sperre_frei(eigene)
        was = f"Regel {regel}" if regel else "alles"
        print(f"KOLL-S3 ZURÜCK ({modus}, {was}): {st['ok']} zurückgesetzt · {st['wuerde']} würde · {st['nichts']} nichts zu tun · "
              f"{st['abw']} Abweichung · {st['bruch']} Kettenbruch · {st['fehl']} Fehler")
    return 1 if st["fehl"] or st["abw"] else 0           # Abweichung = nicht alles zurück (gemeldet) → nicht «grün»


def _zurueck_eine(gql, pub, h, ops_h, regel, st, schluessel, memo):
    koll = sperre_nehmen(SPERRE, SPERRE_WARTEN) if SCHARF else None
    if SCHARF and not koll:
        st["abw"] += 1
        print(f"  ⏳ {h}: koll_seo_laengen-Sperre {SPERRE_WARTEN:.0f} s belegt — übersprungen")
        return
    try:
        c = gql(Q_EINE, {"h": h, "p": pub})["data"]["collectionByHandle"]
        if not c:
            st["abw"] += 1
            print(f"  ❔ {h}: fehlt")
            return
        live = live_felder(c)
        ketten = {}
        for f, o in ops_h.items():
            k = kette(o, live[f], f)
            if k is None:
                continue
            for m in k["meld"]:
                print(f"  · {h} {f}: {m}")
            if k.get("leer"):
                continue
            if k.get("unklar"):
                st["abw"] += 1
                print(f"  ≠ {h} {f}: Stand unklar — nicht zurückgesetzt")
                continue
            if live[f] != k["ende"]:
                st["abw"] += 1
                print(f"  ≠ {h} {f}: live weicht vom Ledger-Stand ab — nicht zurückgesetzt")
                continue
            if k["bruch"]:
                st["bruch"] += 1
            ketten[f] = k
        if not ketten:
            st["nichts"] += 1
            return
        ziel = dict(live)
        if regel is None:
            for f, k in ketten.items():
                ziel[f] = k["start"]
            regeln = {f: "ZURUECK" for f in ketten}
        else:
            felder = []
            for f, k in ketten.items():
                idx = [i for i, g in enumerate(k["glieder"]) if regel in g["regeln"]]
                if not idx:
                    continue
                danach = set().union(*(g["regeln"] for g in k["glieder"][idx[-1] + 1:])) if idx[-1] + 1 < len(k["glieder"]) else set()
                if danach & {"ZURUECK", f"ZURUECK-{regel}"}:
                    continue                                  # schon zurückgesetzt
                felder.append(f)
            if not felder:
                st["nichts"] += 1
                print(f"  · {h}: keine offene {regel}-Änderung im Ledger")
                return
            c_orig = {"handle": h, "os": c.get("os"), "title": ketten["titel"]["start"] if "titel" in ketten else live["titel"],
                      "descriptionHtml": ketten["html"]["start"] if "html" in ketten else live["html"],
                      "seo": {"title": ketten["seo_t"]["start"] if "seo_t" in ketten else live["seo_t"],
                              "description": ketten["seo_d"]["start"] if "seo_d" in ketten else live["seo_d"]}}
            # Prüfung S3 14.10. spät (C2): nur zurück, wenn die HEUTIGEN Regeln den Live-Stand aus dem Kettenanfang exakt erzeugen — für
            # irgendeine Stufen-Kombination (T/L/EU; nach Stufe 3 ist der heutige Anteil ein anderer als beim Lauf). Dann wird mit GENAU
            # dieser Kombination ohne die Regel geplant: alle anderen Teile bleiben byte-gleich. Sonst (Regel/Text seit dem Lauf geändert)
            # → gemeldet, nur volles --zurueck.
            # R9-Beleg (Runde 3): ein Satzpaar, dessen Ware beim Lauf fehlte, wurde nicht gesetzt — erst ohne Titel-Prüfung (alle Paare),
            # dann mit den HEUTIGEN aktiven Titeln versuchen; erzeugt keine Variante den Live-Stand → gemeldet (nur volles --zurueck)
            stufen_tor = None
            titel_live = tor_fabrik(gql, h, memo).titel
            for t_, l_, e_, mit_titel in ((a, b, c_, m) for m in (False, True) for a in TIERS for b in TIERS for c_ in TIERS):
                tor_k = (lambda t_, l_, e_: (lambda art: {"T": t_, "L": l_, "EU": e_}[art]))(t_, l_, e_)
                tor_k.anteil = (lambda t_: (lambda art: {"VOLL": 1.0, "VIEL": 0.7, "KAUM": 0.1}[t_]))(t_)
                if mit_titel:
                    tor_k.titel = titel_live
                mit_neu = bearbeiten(c_orig, tor_k)[0]
                if all(mit_neu[f] == live[f] for f in ketten):
                    stufen_tor = tor_k
                    break
            if stufen_tor is None:
                st["abw"] += 1
                print(f"  ≠ {h}: Rückweg {regel} nicht sicher — die heutigen Regeln erzeugen den Live-Stand nicht (Regel oder Text seit "
                      f"dem Lauf geändert); nur volles --zurueck")
                return
            ohne_neu, _, offen, _ = bearbeiten(c_orig, stufen_tor, ohne=frozenset({regel}))
            v = pruefen(live_felder(c_orig), ohne_neu)
            if v:
                st["abw"] += 1
                print(f"  ⛔ {h}: Rückweg {regel} ergäbe Verstoss {v} — nicht geschrieben")
                return
            for f in felder:
                ziel[f] = ohne_neu[f]
            regeln = {f: f"ZURUECK-{regel}" for f in felder}
        aend = [f for f in FELDER if ziel[f] != live[f]]
        if not aend:
            st["nichts"] += 1
            return
        if not SCHARF:
            st["wuerde"] += 1
            print(f"  → {h}: würde {', '.join(aend)} zurücksetzen (SCHARF=1)")
            return
        ok, text = schreiben_mit_ledger(gql, pub, h, c["id"], live, ziel, regeln, schluessel, art="zurueck")
        if ok:
            st["ok"] += 1
            print(f"  ✓ {h}: {text} zurückgesetzt + rückgelesen")
        else:
            st["fehl"] += 1
            print(f"  ✗ {h}: {text}")
    finally:
        sperre_frei(koll)


def main():
    modus = "SCHARF" if SCHARF else "DRY"
    stat = {"geplant": [0, 0], "verstoss": [0, 0], "offen": [0, 0], "premium_rest": [0, 0], "manuell": [0, 0], "geschrieben": 0,
            "fehler": 0, "abweichung": 0, "gesperrt": 0}
    rueck_folge = 0                                    # Rücklese-Abweichungen in Folge (Schutzschalter RUECK_STOPP)
    zaehl, rest_z = {}, {}
    memo, stufe3 = {}, []
    eigene = tl = tf = None
    abbruch = None
    lauf = _lauf_id()
    try:
        if SCHARF:
            if selbsttest(laut=False) != 0:                  # Tor: rote Kanarien → nichts schreiben
                abbruch = "Selbsttest ROT — nichts geschrieben"
                return 1
            eigene = sperre_nehmen(EIGENE_SPERRE, 0)
            if not eigene:
                abbruch = "läuft schon (eigene Sperre belegt) — nichts getan"
                return 0
        gql = _gql()
        pub = onlineshop_id(gql)
        kolls = alle_kollektionen(gql, pub)
        n_pub = sum(1 for c in kolls if c["os"])
        print(f"Kollektionen: {len(kolls)} (EXACT) · veröffentlicht {n_pub} · nicht veröffentlicht {len(kolls) - n_pub}"
              f"{' · PREMIUM_VOLL' if PREMIUM_VOLL else ''}{' · NUR ' + ','.join(sorted(NUR)) if NUR else ''}")
        if NUR - {c["handle"] for c in kolls}:
            print(f"  ❔ NUR: nicht gefunden {sorted(NUR - {c['handle'] for c in kolls})}")
        os.makedirs(os.path.dirname(TROCKEN) or ".", exist_ok=True)
        tl = open(TROCKEN, "w", encoding="utf-8")
        tl.write("handle\tveroeffentlicht\tfeld\tregel\talt\tneu\n")
        tf = open(re.sub(r"\.tsv$", "", TROCKEN) + "_felder.tsv", "w", encoding="utf-8")
        tf.write("handle\tveroeffentlicht\tfeld\tlaenge_alt\tlaenge_neu\talt\tneu\tverstoss\n")
        geschrieben_n = 0
        for nr, c in enumerate(kolls):
            h = c["handle"]
            if NUR and h not in NUR:
                continue
            i = 0 if c["os"] else 1
            try:
                tor = tor_fabrik(gql, h, memo)
                neu, funde, offen, rest = bearbeiten(c, tor)
            except Exception as e:  # noqa: BLE001 — eine Kollektion darf den Lauf nicht beenden
                stat["fehler"] += 1
                print(f"  ✗ {h}: Planung {type(e).__name__}: {str(e)[:160]}")
                continue
            alt = live_felder(c)
            if h in memo and memo[h]["akt"] and memo[h]["L"] >= 0.95 and memo[h]["T"] < VIEL_AB:
                stufe3.append(f"{h} (profil {memo[h]['T']:.0%}, ch-lager {memo[h]['L']:.0%})")
            for r in rest["rot"]:
                rest_z.setdefault(r, [0, 0])[i] += 1
            if rest["premium"]:
                stat["premium_rest"][i] += 1
            if rest["manuell"]:
                stat["manuell"][i] += 1
                tl.write(f"{h}\t{'ja' if c['os'] else 'nein'}\t-\tMANUELL\t{esc(str(rest['manuell']))}\t\n")
            if offen:
                stat["offen"][i] += 1
                for o in offen:
                    tl.write(f"{h}\t{'ja' if c['os'] else 'nein'}\t-\tOFFEN\t{esc(o)}\t\n")
            if not funde:
                continue
            verst = pruefen(alt, neu)
            for f, fl in funde.items():
                for x in fl:
                    tl.write("\t".join([h, "ja" if c["os"] else "nein", f, x.regel, esc(x.alt), esc(x.neu)]) + "\n")
                tf.write("\t".join([h, "ja" if c["os"] else "nein", f, str(len(alt[f])), str(len(neu[f])), esc(alt[f]),
                                    esc(neu[f]), esc("; ".join(verst))]) + "\n")
            if verst:
                stat["verstoss"][i] += 1
                print(f"  ⛔ {h}: {verst}")
                continue
            regeln_k = set()
            for f, fl in funde.items():
                for x in fl:
                    z = zaehl.setdefault(x.regel, [0, 0, 0, 0])
                    z[2 + i] += 1
                    regeln_k.add(x.regel)
            for r in regeln_k:
                zaehl[r][i] += 1
            stat["geplant"][i] += 1
            if not SCHARF or (CAP and geschrieben_n >= CAP) or (RUECK_STOPP and rueck_folge >= RUECK_STOPP):
                continue
            geschrieben_n += 1
            ergebnis = _scharf_eine(gql, pub, c, tor, f"{lauf}:{nr}")
            rueck_folge = rueck_folge + 1 if ergebnis == "rueck" else (0 if ergebnis == "ok" else rueck_folge)
            if ergebnis == "ok":
                stat["geschrieben"] += 1
            elif ergebnis == "gesperrt":
                stat["gesperrt"] += 1
            elif ergebnis == "abweichung":
                stat["abweichung"] += 1
            else:
                stat["fehler"] += 1
            if RUECK_STOPP and rueck_folge >= RUECK_STOPP and not abbruch:
                abbruch = (f"Schutzschalter: Rücklesen {rueck_folge}× in Folge abweichend — keine weiteren Mutationen (Ledger + "
                           f"--zurueck prüfen)")
                print(f"  ⛔ {abbruch}")
    except Exception as e:  # noqa: BLE001
        abbruch = f"Abbruch {type(e).__name__}: {str(e)[:200]}"
        stat["fehler"] += 1
    finally:
        for f in (tl, tf):
            if f:
                f.close()
        sperre_frei(eigene)
        print("\nZählung je Regel (Kollektionen veröffentlicht/unveröffentlicht · Fundstellen veröffentlicht/unveröffentlicht):")
        for r in ("R1", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "SEO≤155"):
            z = zaehl.get(r, [0, 0, 0, 0])
            print(f"  {r:8s} Kollektionen {z[0]:>3} / {z[1]:>3}   Fundstellen {z[2]:>4} / {z[3]:>4}")
        print("Rest nach den Regeln (Wächter-Finder, Kollektionen veröffentlicht/unveröffentlicht, ohne manuell und Premium):")
        for r in ("R1", "R3", "R4", "R5", "R6", "R7", "R8", "R9"):
            z = rest_z.get(r, [0, 0])
            print(f"  {r:8s} {z[0]:>3} / {z[1]:>3}")
        print(f"manuell (Titel/SEO-Titel, nur im Bericht): {stat['manuell'][0]} / {stat['manuell'][1]} · Premium-Hinweis "
              f"(nur Satzpaare, PREMIUM_VOLL=1 schaltet R1/R3/R6/R8 zu — bleibt aus): {stat['premium_rest'][0]} / {stat['premium_rest'][1]}")
        print(f"Tore gemessen: {len(memo)} Kollektionen")
        for s in stufe3:
            print(f"  STUFE-3-KANDIDAT (ch-lager ≥ 95 %, profil < {VIEL_AB:.0%} → nach Stufe 3 neu messen, dann --zurueck-regel R4 "
                  f"<handle> und S3 erneut): {s}")
        if abbruch:
            print(f"  ⛔ {abbruch}")
        print(f"Trockenliste: {TROCKEN}")
        print(f"KOLL-S3 ({modus}): geplant {stat['geplant'][0]}/{stat['geplant'][1]} (veröff./unveröff.) · "
              f"Verstoss {stat['verstoss'][0]}/{stat['verstoss'][1]} · offen {stat['offen'][0]}/{stat['offen'][1]} · "
              f"geschrieben {stat['geschrieben']} · Abweichung {stat['abweichung']} · gesperrt {stat['gesperrt']} · "
              f"Fehler {stat['fehler']}{' · ' + abbruch if abbruch else ''}")
    return 1 if stat["fehler"] or stat["gesperrt"] else 0    # übersprungen (Sperre) = nicht fertig → nicht «grün»


def _scharf_eine(gql, pub, c, tor, schluessel):
    """SCHARF für eine Kollektion: koll_seo_laengen-Sperre kurz nehmen, frisch lesen und neu planen, Ledger «geplant»,
    schreiben, rücklesen, Ledger «ok», Sperre frei. → ok | gesperrt | abweichung | rueck (Rücklesen weicht ab) | fehler. Wirft nie."""
    h = c["handle"]
    koll = sperre_nehmen(SPERRE, SPERRE_WARTEN)
    if not koll:
        print(f"  ⏳ {h}: koll_seo_laengen-Sperre {SPERRE_WARTEN:.0f} s belegt — übersprungen")
        return "gesperrt"
    try:
        frisch = gql(Q_EINE, {"h": h, "p": pub})["data"]["collectionByHandle"]
        if not frisch:
            print(f"  ≠ {h}: Kollektion nicht mehr da — übersprungen")
            return "abweichung"
        alt = live_felder(frisch)
        neu, funde, _, _ = bearbeiten(frisch, tor)       # immer auf dem FRISCHEN Stand planen
        if not funde:
            print(f"  ≠ {h}: frisch gelesen ohne Fund — übersprungen")
            return "abweichung"
        v = pruefen(alt, neu)
        if v:
            print(f"  ≠ {h}: frisch geplant mit Verstoss {v} — übersprungen")
            return "abweichung"
        regeln = {f: ",".join(sorted({x.regel for x in fl})) for f, fl in funde.items()}
        ok, text = schreiben_mit_ledger(gql, pub, h, frisch["id"], alt, neu, regeln, schluessel)
        print(f"  {'✓' if ok else '✗'} {h}: {text}{' geschrieben + rückgelesen' if ok else ''}")
        return "ok" if ok else ("rueck" if text.startswith("Rücklesen weicht ab") else "fehler")
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ {h}: {type(e).__name__}: {str(e)[:160]}")
        return "fehler"
    finally:
        sperre_frei(koll)


# ─────────────────────────────────────────────────────────────── Selbsttest (offline)
def selbsttest(laut=True):
    t = []
    VERTRETER = {"VOLL": 1.0, "VIEL": 0.7, "KAUM": 0.1}   # Anteil je Stufe für den Wächter-Finder im Rest

    def lauf(handle, html="", seo_d="", seo_t="", titel="X", os_=True, tiers=None, ohne=frozenset(), titel_akt=None):
        tiers = tiers or {}
        tor = lambda art: tiers.get(art, "KAUM")  # noqa: E731
        tor.anteil = lambda art: VERTRETER[tiers.get(art, "KAUM")]
        if titel_akt is not None:                       # aktive Produkttitel (R9-Beleg); ohne → keine Titel-Prüfung
            tor.titel = lambda: titel_akt
        c = {"handle": handle, "title": titel, "os": os_, "descriptionHtml": html,
             "seo": {"title": seo_t, "description": seo_d}}
        return bearbeiten(c, tor, ohne=ohne)

    alt_z = ("<p>Text.</p><p>✔ Geprüfte Angaben · 🚚 Lieferzeit auf jeder Produktseite · Gratis-Versand ab CHF 50 · "
             "↩️ 30 Tage Rückgabe · –10 % mit Code WELCOME10</p><!--gd2-->")
    n, f, o, r = lauf("x", alt_z)
    t.append(("R1 Trust-Zeile → neue Zeile, gd2 bleibt",
              n["html"] == "<p>Text.</p><p>" + NEU_ZEILE + "</p><!--gd2-->"))
    n, f, o, r = lauf("x", "<p>✔ Geprüfte Qualität · 🚚 Schnelle Lieferung · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · "
                           "–10 % mit Code WELCOME10</p><!--gd2-->")
    t.append(("R2-Zeile (Geprüfte Qualität + Schnelle Lieferung) → neue Zeile", n["html"] == f"<p>{NEU_ZEILE}</p><!--gd2-->"))
    vw = ('<p>Gratis-Versand ab CHF 50.</p>\n<!-- ls-verwandt --><p class="ls-verwandt">Gratis-Versand ab CHF 50 · schnelle '
          'Lieferung</p><!-- /ls-verwandt -->')
    n, f, o, r = lauf("x", vw)
    t.append(("ls-verwandt-Block bleibt wörtlich, nur der Text davor ändert sich",
              n["html"].endswith('<!-- ls-verwandt --><p class="ls-verwandt">Gratis-Versand ab CHF 50 · schnelle Lieferung</p>'
                                 '<!-- /ls-verwandt -->') and n["html"].startswith("<p>Gratis-Versand in der Schweiz ab CHF 50.</p>")))
    hw = ('<p>Kostüme. Gratis-Versand ab CHF 50.</p><p data-lux-anlass="halloween">🎃 Für Halloween: Kostüme kommen am '
          'schnellsten an, Gratis-Versand ab CHF 50, Blitzversand aus der Schweiz.</p>')
    n, f, o, r = lauf("halloween", hw, tiers={"T": "VIEL", "L": "VIEL"})
    t.append(("Halloween-Absatz data-lux-anlass unverändert", hw.split("</p>", 1)[1] in n["html"]
              and n["html"].startswith("<p>Kostüme. Gratis-Versand in der Schweiz ab CHF 50.</p>")))
    for s in ("Schnellladegeräte und Kabel.", "Smart Home ist der am schnellsten wachsende Tech-Trend 2026.",
              "Schnellspannmuttern für Winkelschleifer.", "Titan und Edelstahl: schnell abgespült.",
              "Ein Handstaubsauger ist schnell zur Hand."):
        n, f, o, r = lauf("x", f"<p>{s}</p>")
        t.append((f"Kanarie ohne Lieferbezug bleibt: «{s[:28]}…»", n["html"] == f"<p>{s}</p>" and "R4" not in r["rot"]))
    n, f, o, r = lauf("schule-buro", "<p>Ordnung. Versand innerhalb der Schweiz, gratis ab CHF 50, 30 Tage Rückgabe.</p>")
    t.append(("«Versand innerhalb der Schweiz, gratis ab CHF 50» → kein Fund", not f and "R6" not in r["rot"]))
    n, f, o, r = lauf("x", "<p>Das Set ab CHF 50 ist ein Geschenk. Lieblinge unter CHF 50.</p>")
    t.append(("«Set ab CHF 50» / «unter CHF 50» → kein Fund", not f))
    n, f, o, r = lauf("x", "<p>Gratis-Versand ab CHF 500 und Ab 45 Grad waschbar, kostenlos.</p>")
    t.append(("«ab CHF 500» / «Ab 45 Grad … kostenlos» → kein Fund", not f))
    n, f, o, r = lauf("x", "<p>Gratis-Versand ab CHF 50 · 30 Tage Rückgabe</p>")
    t.append(("«Gratis-Versand ab CHF 50 · 30 Tage» → «… in der Schweiz ab CHF 50 · 30 Tage»",
              n["html"] == "<p>Gratis-Versand in der Schweiz ab CHF 50 · 30 Tage Rückgabe</p>"))
    n, f, o, r = lauf("x", "<p>🇨🇭 Schweizer Shop · Gratis-Versand ab CHF 50</p>")
    t.append(("Nachbarsegment «Schweizer Shop» deckt die Gratis-Aussage nicht",
              n["html"] == "<p>🇨🇭 Schweizer Shop · Gratis-Versand in der Schweiz ab CHF 50</p>"))
    n2, f2, _, _ = lauf("x", n["html"])
    t.append(("idempotent (zweiter Lauf ändert nichts)", not f2 and n2["html"] == n["html"]))
    n, f, o, r = lauf("x", "<p>Warm. Versandkostenfrei ab CHF 50.</p>")
    t.append(("«Versandkostenfrei ab CHF 50.» am Satzanfang → «In der Schweiz versandkostenfrei …»",
              n["html"] == "<p>Warm. In der Schweiz versandkostenfrei ab CHF 50.</p>"))
    n, f, o, r = lauf("x", seo_d="100 % echt, schnelle EU-Lieferung, Gratis ab CHF 50.")
    t.append(("«…, Gratis ab CHF 50» mitten im Satz → klein, Tempo weg",
              n["seo_d"] == "100 % echt, Lieferung in die ganze Schweiz, Gratis ab CHF 50." or
              n["seo_d"] == "100 % echt, Lieferung in die ganze Schweiz, in der Schweiz gratis ab CHF 50."))
    n, f, o, r = lauf("reise-gadgets", seo_d="Clever packen. Versand ab CHF 50 gratis.")
    t.append(("«Versand ab CHF 50 gratis» → «Versand in der Schweiz ab CHF 50 gratis»",
              n["seo_d"] == "Clever packen. Versand in der Schweiz ab CHF 50 gratis."))
    n, f, o, r = lauf("ft-herrenkostuem", "<p>Kostüme &amp; Verkleidung für Herren – schnelle Lieferung aus der Schweiz.</p>",
                      tiers={"T": "VOLL", "L": "VOLL"})
    t.append(("Tempo-Tor VOLL: «schnelle Lieferung aus der Schweiz» → «ab Schweizer Lager, meist 2–3 Werktage»",
              n["html"] == "<p>Kostüme &amp; Verkleidung für Herren – ab Schweizer Lager, meist 2–3 Werktage.</p>"))
    n, f, o, r = lauf("ft-pluesch", "<p>Kuschelige Plüschtiere – schnelle Lieferung aus der Schweiz.</p>",
                      tiers={"T": "KAUM", "L": "VIEL"})
    t.append(("Tempo-Tor KAUM: → «Lieferung in die ganze Schweiz»",
              n["html"] == "<p>Kuschelige Plüschtiere – Lieferung in die ganze Schweiz.</p>"))
    n, f, o, r = lauf("ft-kinderkostuem", seo_d="Kostüme für Kinder – Tiere, Helden & mehr. Blitzversand aus der Schweiz.",
                      tiers={"T": "VOLL"})
    t.append(("Blitzversand am Satzanfang (VOLL) → «Ab Schweizer Lager, meist 2–3 Werktage.»",
              n["seo_d"] == "Kostüme für Kinder – Tiere, Helden & mehr. Ab Schweizer Lager, meist 2–3 Werktage."))
    n, f, o, r = lauf("haustier-hunde", "<p>Alles für deinen Hund: Näpfe und Pflege — geprüfte Qualität für treue Begleiter. "
                                        "Gratis-Versand ab CHF 50.</p>")
    t.append(("«— geprüfte Qualität für treue Begleiter» → «— für treue Begleiter»",
              n["html"] == "<p>Alles für deinen Hund: Näpfe und Pflege — für treue Begleiter. Gratis-Versand in der Schweiz ab CHF 50.</p>"))
    n, f, o, r = lauf("uhren", "<p>Uhren. Geprüfte Angaben, faire Preise, Gratis-Versand ab CHF 50 und 30 Tage Rückgabe.</p>")
    t.append(("«Geprüfte Angaben, faire Preise» → «Faire Preise» (Satzanfang gross)",
              n["html"] == "<p>Uhren. Faire Preise, Gratis-Versand in der Schweiz ab CHF 50 und 30 Tage Rückgabe.</p>"))
    n, f, o, r = lauf("haustier-gadgets", "<p>Modelle. Premium-Qualitaet, sorgfaeltig fuer den Schweizer Markt kuratiert.</p>"
                                          "<ul><li>🔇 Fluesterleise</li><li>🐾 Fuer Katze</li></ul>")
    t.append(("«Premium-Qualitaet» (ae-Form) weg, ae/oe/ue nur per Wortliste",
              n["html"] == "<p>Modelle.</p><ul><li>🔇 Flüsterleise</li><li>🐾 Für Katze</li></ul>"))
    n, f, o, r = lauf("wellness-selfcare", "<p>✔ Massage  ·  ✔ Premium-Qualität  ·  ✔ Gratis-Versand ab CHF 50</p>")
    t.append(("«✔ Premium-Qualität ·» weg, Doppel-Leerzeichen des Originals bleiben",
              n["html"] == "<p>✔ Massage  ·  ✔ Gratis-Versand in der Schweiz ab CHF 50</p>"))
    n, f, o, r = lauf("herren-jacken", "<p>Sportlich. Premium-Marken, versandkostenfrei ab CHF 50.</p>")
    t.append(("«Premium-Marken, versandkostenfrei» → «Versandkostenfrei in der Schweiz …»",
              n["html"] == "<p>Sportlich. Versandkostenfrei in der Schweiz ab CHF 50.</p>"))
    n, f, o, r = lauf("kueche", seo_d="Küche online kaufen bei LuxeStyle: kuratierte Premium-Auswahl, Gratis-Versand ab CHF 50, "
                                      "30 Tage Rückgabe, schnelle Lieferung in die Schweiz.", os_=False)
    t.append(("SEO-Vorlage unveröffentlicht: Premium-Auswahl + schnelle Lieferung weg, Land an die Gratis-Aussage (Nähe)",
              n["seo_d"] == "Küche online kaufen bei LuxeStyle: Gratis-Versand in der Schweiz ab CHF 50, 30 Tage Rückgabe."))
    n, f, o, r = lauf("mystery", "<p>Die \"Gentleman's Premium Gift Box\" mit Uhr.</p>", os_=False)
    t.append(("Produktname «Premium Gift Box» ohne festes Muster bleibt (kein R5-Fund im Wächter-Finder)", not f and "R5" not in r["rot"]))
    pv = ("<p>" + [x[2] for x in R5_PREMIUM_PAARE if x[0] == "💎-premium-ab-chf-80"][0] + "</p><p>✔ Geprüfte Angaben · 🚚 "
          "Lieferzeit auf jeder Produktseite · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · –10 % mit Code WELCOME10</p>")
    n, f, o, r = lauf("💎-premium-ab-chf-80", pv)
    t.append(("Premium-Kollektion: nur Satzpaar «Artikel mit Preisen über CHF 80», Trust-Zeile bleibt (Premium-Hinweis, nicht rot)",
              "Hier findest du Artikel mit Preisen über CHF 80" in n["html"] and "✔ Geprüfte Angaben" in n["html"]
              and not re.search(r"zaubern|Bodenreiniger|Multistyler|Akkusauger", n["html"]) and not r["rot"] and "R1" in r["premium"]))
    n, f, o, r = lauf("sg-wohnen", "<p>Deko.</p><p>✔ Geprüfte Angaben · 🚚 Lieferzeit auf jeder Produktseite · Gratis-Versand ab "
                                   "CHF 50 · ↩️ 30 Tage Rückgabe · –10 % mit Code WELCOME10</p><!--gd2-->")
    t.append(("Selbst gestalten: «↩️ 30 Tage Rückgabe» → «↩️ Ersatz bei Druckfehlern»",
              "↩️ Ersatz bei Druckfehlern" in n["html"] and "30 Tage" not in n["html"]
              and any(x.regel == "R7" for x in f.get("html", []))))
    lang = ("Selbst gestalten alle Produkte online kaufen bei LuxeStyle: grosse Auswahl, Gratis-Versand ab CHF 50, 30 Tage "
            "Rückgabe, schnelle Lieferung in die S…")
    n, f, o, r = lauf("sg-alle", seo_d=lang)
    t.append(("R8 abgeschnitten → Vorlage ≤ 155, ohne «…», Ersatz bei Druckfehlern",
              len(n["seo_d"]) <= 155 and "…" not in n["seo_d"] and "Ersatz bei Druckfehlern" in n["seo_d"]
              and "in der Schweiz ab CHF 50" in n["seo_d"]))
    s = ("Sonnenbrillen online kaufen: Retro, Oversized & Sport-Styles mit UV-Schutz. Schweizer Shop, Gratis-Versand ab CHF 50 "
         "· 30 Tage Rückgabe · -10% mit Code WELCOME10.")
    n, f, o, r = lauf("sonnenbrillen-eyewear", seo_d=s, os_=False)
    t.append(("SEO-Länge: +«in der Schweiz» → schwächste Teilaussage fällt, ≤ 155, kein «…»",
              len(n["seo_d"]) <= 155 and "…" not in n["seo_d"] and "in der Schweiz ab CHF 50" in n["seo_d"]
              and "Rückgabe" in n["seo_d"]))
    n, f, o, r = lauf("halloween", seo_d="Halloween-Kostüme online kaufen – vieles ab CH-Lager mit Blitzversand. Gratis-Versand "
                                         "ab CHF 50, 30 Tage Rückgabe.", tiers={"T": "VIEL"})
    t.append(("Halloween-SEO VIEL: «mit Blitzversand» → «meist 2–3 Werktage», ≤ 155",
              n["seo_d"] == "Halloween-Kostüme online kaufen – vieles ab CH-Lager, meist 2–3 Werktage. Gratis-Versand in der "
                            "Schweiz ab CHF 50, 30 Tage Rückgabe." and len(n["seo_d"]) <= 155))
    n, f, o, r = lauf("halloween", "<p>Kostüme ab Schweizer Lager kommen am schnellsten – Datum in der Kasse.</p>",
                      tiers={"T": "VIEL"})
    t.append(("«kommen am schnellsten» (relativ, belegt) bleibt", not f))
    n, f, o, r = lauf("frontpage", seo_d=R5_PAARE[0][2])
    t.append(("frontpage-SEO ohne Premium/Vatertag, ≤ 155", "Premium" not in n["seo_d"] and "Vatertag" not in n["seo_d"]
              and len(n["seo_d"]) <= 155))
    n, f, o, r = lauf("x", "<p>Top. 🇨🇭 In der Schweiz gratis ab CHF 50 · TWINT. In der Schweiz versandkostenfrei ab CHF 50.</p>")
    t.append(("«In der Schweiz gratis/versandkostenfrei» (gross) → kein zweites Land (idempotent)", not f and "R6" not in r["rot"]))
    lang155 = ("Katzenbett kaufen: flauschige Katzenbetten, mit Kletterbaum oder aus Massivholz, dazu Katzenspielzeug, "
               "Kratzmöbel und Katzenklo. Gratis-Versand ab CHF 50.")
    t.append(("Testtext 154 Zeichen", len(lang155) == 154))
    n, f, o, r = lauf("x", seo_d=lang155)
    t.append(("SEO 154 Zeichen ohne schwache Teilaussage → Kurzform «Versandfrei CH», ≤ 155",
              len(n["seo_d"]) <= 155 and n["seo_d"].endswith("Versandfrei CH ab CHF 50.") and "R6" not in r["rot"]))
    n, f, o, r = lauf("x", "<p>Die neueste Technik: Saugroboter, Gimbals, Massage-Guns, Überwachungskameras &amp; mehr – Innovation "
                           "zum fairen Preis, und zwar für alle, die gern Neues ausprobieren und vergleichen.</p>",
                      seo_d="Die neueste Technik: Saugroboter, Gimbals, Massage-Guns, Überwachungskameras & mehr – Innovation zum "
                            "fairen Preis, und zwar für alle, die gern Neues ausprob")
    t.append(("R8 ohne «…» (≥ 150, kein Schlusszeichen) → am Gedankenstrich beendet",
              n["seo_d"] == "Die neueste Technik: Saugroboter, Gimbals, Massage-Guns, Überwachungskameras & mehr."))
    n, f, o, r = lauf("q", "<p>Aus jeder Kategorie ein Stück: Mode, Schmuck, Wohnen und mehr. Täglich neu. Gratis-Versand ab CHF 50.</p>",
                      seo_d="Aus jeder Kategorie ein Stück: Mode, Schmuck, Wohnen und mehr. Täglich neu. Gratis-Versand ab …")
    t.append(("R8: abgeschnittene Gratis-Aussage wird mit Land wieder angehängt",
              n["seo_d"] == "Aus jeder Kategorie ein Stück: Mode, Schmuck, Wohnen und mehr. Täglich neu. Gratis-Versand in der "
                            "Schweiz ab CHF 50."))
    n, f, o, r = lauf("ft-ballone", "<p>Alles liegt im Schweizer Lager: Lieferung meist in 2–3 Werktagen. Gratis-Versand ab CHF 50.</p>",
                      tiers={"T": "KAUM", "L": "VOLL"})
    t.append(("Lager-Ort bleibt, Tempo fällt bei KAUM («liegt im Schweizer Lager: das genaue Lieferdatum …»)",
              n["html"] == "<p>Alles liegt im Schweizer Lager: das genaue Lieferdatum steht beim Artikel. Gratis-Versand in der "
                           "Schweiz ab CHF 50.</p>"))
    n, f, o, r = lauf("ft-ballone", "<p>Alles liegt im Schweizer Lager: Lieferung meist in 2–3 Werktagen.</p>", tiers={"T": "VOLL"})
    t.append(("dieselbe Aussage bei VOLL (≥ 95 % profil-ch-lager) bleibt", not f))
    kom = '<p>Gratis-Versand ab CHF 50.</p><!-- interne Notiz: schnelle Lieferung, Gratis-Versand ab CHF 50 -->'
    n, f, o, r = lauf("x", kom)
    t.append(("andere HTML-Kommentare bleiben wörtlich",
              n["html"] == '<p>Gratis-Versand in der Schweiz ab CHF 50.</p><!-- interne Notiz: schnelle Lieferung, Gratis-Versand ab '
                           'CHF 50 -->'))
    gemischt = ('<p>Kostüme – schnelle Lieferung aus der Schweiz. Geprüfte Auswahl, Gratis-Versand ab CHF 50.</p><p>✔ Geprüfte '
                'Qualität · 🚚 Schnelle Lieferung · Gratis-Versand ab CHF 50 · ↩️ 30 Tage Rückgabe · –10 % mit Code WELCOME10'
                '</p><!--gd2-->')
    n1, f1, _, _ = lauf("x", gemischt, tiers={"T": "VOLL"})
    n2, f2, _, _ = lauf("x", n1["html"], tiers={"T": "VOLL"})
    t.append(("gemischter Text: zweiter Lauf ändert nichts mehr", f1 and not f2 and n2["html"] == n1["html"]))
    t.append(("alle Premium-Satzpaare ohne «exklusiv»/«Entertainment»/«bereichern»",
              all(not re.search(r"exklusiv|Entertainment|bereichern|garantier", x[3]) for x in R5_PREMIUM_PAARE)))
    t.append(("kein ß in Ersatztexten", all("ß" not in x for x in
                                             [NEU_ZEILE, AUSSCHLUSS] + [p[3] for p in R5_PAARE + R5_PREMIUM_PAARE + R3_PAARE])))
    # ── 14.10.2026 abends (Prüfung S3): jede Zeile wäre gegen die Fassung vom Nachmittag rot ──────────────────────────────────────
    # Nachsatz-Muster (Befund Code «schnell…»-Muster)
    for ein, soll in (("<p>Schnelle Lieferung in die ganze Schweiz.</p>", "<p>Lieferung in die ganze Schweiz.</p>"),
                      ("<p>Alles mit schneller Lieferung innerhalb der Schweiz.</p>", "<p>Alles mit Lieferung in die ganze Schweiz.</p>"),
                      ("<p>Schneller Versand nach Hause.</p>", "<p>Versand nach Hause.</p>"),
                      ("<p>Deko – schnelle Lieferung durch die Schweizer Post.</p>", "<p>Deko – Lieferung durch die Schweizer Post.</p>")):
        n, f, o, r = lauf("x", ein)
        t.append((f"Nachsatz: «{ein[3:40]}…» → ohne Doppel", n["html"] == soll))
    t.append(("pruefen(): «Schweiz [^.]{0,20}Schweiz» ist ein Verstoss",
              any("Schweiz" in v for v in pruefen({"titel": "", "html": "<p>a</p>", "seo_t": "", "seo_d": ""},
                                                    {"titel": "", "html": "<p>Lieferung in die ganze Schweiz in die ganze Schweiz.</p>",
                                                     "seo_t": "", "seo_d": ""}))))
    # Eine Regelquelle: Schwellen/Land/Premium aus versprechen_regel.json, TEIL-Band weg (Befunde Inhalt R4 + Code Regelsätze)
    t.append(("Stufen aus der Regeldatei: 0.37 → KAUM, 0.5 → VIEL, 0.95 → VOLL (TEIL-Band weg)",
              (stufe(0.37), stufe(0.5), stufe(0.949), stufe(0.95)) == ("KAUM", "VIEL", "VIEL", "VOLL")))
    n, f, o, r = lauf("beauty-haar", "<p>Haarpflege — kuratierte Auswahl, viele Artikel ab Schweizer Lager meist in 2–3 Werktagen. "
                                     "Gratis-Versand ab CHF 50 · 30 Tage Rückgabe.</p>", tiers={"T": "KAUM", "L": "VIEL"})
    t.append(("beauty-haar 37 %: Werktage weg, Lager-Ort bleibt, Wächter-Rest R4 = 0",
              "viele Artikel ab Schweizer Lager. Gratis-Versand in der Schweiz ab CHF 50" in n["html"] and "Werktag" not in n["html"]
              and "R4" not in r["rot"]))
    bv = ("<p>Alles, was bei uns in der Schweiz liegt — meist in 2–3 Werktagen bei dir, das genaue Lieferdatum steht auf jeder "
          "Produktseite und in der Kasse.</p>")
    n, f, o, r = lauf("blitzversand-schweiz", bv, tiers={"T": "VIEL"})
    t.append(("blitzversand-schweiz 69 %: «Vieles, was …» statt Allquantor, Wächter-Rest R4 = 0",
              n["html"].startswith("<p>Vieles, was bei uns in der Schweiz liegt — meist in 2–3 Werktagen") and "R4" not in r["rot"]))
    n, f, o, r = lauf("x", "<p>Viele Masken ab Schweizer Lager.</p>", titel="🇨🇭 Alles ab Schweizer Lager", tiers={"T": "KAUM"})
    t.append(("Lager-Ort ohne Tempo-Wort (Text und Titel) → kein Rest", not r["rot"] and not r["manuell"]))
    n, f, o, r = lauf("fortura-weihnachten", "<p>Verwandle dein Zuhause – mit stimmungsvoller Weihnachtsdeko, die in die ganze "
                                             "Schweiz blitzschnell zu dir kommt. Entdecke mehr.</p>", os_=False, tiers={"T": "KAUM"})
    t.append(("fortura-weihnachten: «blitzschnell zu dir» → «mit Lieferung in die ganze Schweiz», Rest R4 = 0",
              "Weihnachtsdeko, mit Lieferung in die ganze Schweiz. Entdecke" in n["html"] and "R4" not in r["rot"]))
    t.append(("TEMPO_RX aus der Regeldatei: «blitzschnell zu dir» ja, «blitzschnelle Raumerfrischung» nein",
              bool(TEMPO_RX.search("die blitzschnell zu dir kommt")) and not TEMPO_RX.search("für blitzschnelle Raumerfrischung")))
    n, f, o, r = lauf("kostueme-fasnacht", "<p>Kostüme &amp; Verkleidung aus Schweizer Lager — Fasnacht, Halloween, Motto-Partys. "
                                           "Schnelle CH-Lieferung, meist in 2–3 Werktagen; das genaue Datum steht beim Artikel und in "
                                           "der Kasse.</p>", tiers={"T": "VOLL"})
    t.append(("kostueme-fasnacht VOLL: kein zweites «Ab Schweizer Lager»",
              n["html"].count("Schweizer Lager") == 1 and "Lieferung meist in 2–3 Werktagen; das genaue Datum" in n["html"]))
    # R6-Nähe + feste Satzenden (Befund Inhalt R6)
    n, f, o, r = lauf("trends-gadgets", "<p>Gadgets. Profitiere von unserem Gratis-Versand ab CHF 50 und einem sorgenfreien "
                                        "30-Tage-Rückgaberecht für alle deine Einkäufe in der Schweiz.</p>")
    t.append(("Nähe: Land am Satzende belegt nicht → Land an die Zusage, Satzende ohne zweites «in der Schweiz»",
              n["html"] == "<p>Gadgets. Profitiere von unserem Gratis-Versand in der Schweiz ab CHF 50 und einem sorgenfreien "
                           "30-Tage-Rückgaberecht für alle deine Einkäufe.</p>" and "R6" not in r["rot"]))
    n, f, o, r = lauf("ipl-haarentfernung", "<p><strong>Gratis-Versand ab CHF 50</strong>, 30 Tage Rückgabe, Lieferung in die Schweiz.</p>")
    t.append(("«<strong>Gratis-Versand ab CHF 50</strong>, 30 Tage Rückgabe, Lieferung in die Schweiz.» → Land an die Zusage",
              n["html"] == "<p><strong>Gratis-Versand in der Schweiz ab CHF 50</strong>, 30 Tage Rückgabe.</p>"))
    n, f, o, r = lauf("spielzeug-basteln", "<p>Bei LuxeStyle profitierst du zudem von Gratis-Versand ab CHF 50 und einer unkomplizierten "
                                           "30-Tage-Rückgabe, damit dein Einkaufserlebnis in der Schweiz rundum perfekt ist.</p>")
    t.append(("«damit dein Einkaufserlebnis in der Schweiz rundum perfekt ist» → ohne zweites Land",
              "damit dein Einkaufserlebnis rundum perfekt ist." in n["html"] and n["html"].count("Schweiz") == 1))
    n, f, o, r = lauf("x", "<p>Gratis-Versand ab CHF 50 und 30 Tage Rückgabe auch für Produkte, die in der Schweiz hergestellt wurden.</p>")
    t.append(("Satzende mit Komma («für Produkte, die in der Schweiz hergestellt») bleibt",
              "die in der Schweiz hergestellt wurden" in n["html"] and "Gratis-Versand in der Schweiz ab CHF 50" in n["html"]))
    n, f, o, r = lauf("naegel", seo_d="Nagellack & Gel. Jetzt bei LuxeStyle CH entdecken – Gratis-Versand ab CHF 50.")
    t.append(("«LuxeStyle CH» ist kein Land-Beleg", "Gratis-Versand in der Schweiz ab CHF 50" in n["seo_d"]))
    n, f, o, r = lauf("x", "<p>Schweizer Shop, Gratis-Versand ab CHF 50.</p>")
    t.append(("«Schweizer Shop» ist kein Land-Beleg (Werkzeug = Wächter)", "Gratis-Versand in der Schweiz ab CHF 50" in n["html"]
              and "R6" not in r["rot"]))
    # Premium-Liste aus der Regeldatei (premium-marken-lager + Handle-Regel)
    tz = ("<p>Marken.</p><p>✔ Geprüfte Angaben · 🚚 Lieferzeit auf jeder Produktseite · Gratis-Versand ab CHF 50 · ↩️ 30 Tage "
          "Rückgabe · –10 % mit Code WELCOME10</p>")
    n, f, o, r = lauf("premium-marken-lager", tz, os_=False)
    t.append(("premium-marken-lager = Premium (nur Satzpaare, Hinweis statt rot)", not f and not r["rot"] and r["premium"]))
    n, f, o, r = lauf("premium-geschenke", tz)
    t.append(("premium-geschenke ist KEINE Premium-Kollektion (Ausnahme) → volle Regeln", "Gratis-Versand in der Schweiz" in n["html"]))
    # Inhalt: nur aktive Ware (Befunde Inhalt wellness/yoga/audio)
    for h, alt_txt, verboten in (("wellness-beauty-tools", None, r"LED|RF|Schallbürste|Premium"),
                                 ("yoga-pilates", None, r"Figur|Deko|Gift Box|Akupressur|Wolldecke|Premium"),
                                 ("audio-sub", None, r"Headset|Premium")):
        paare = [x for x in R5_PAARE if x[0] == h]
        n, f, o, r = lauf(h, "<p>" + " ".join(x[2] for x in paare) + "</p>")
        t.append((f"{h}: neues Satzpaar nennt nur aktive Ware", len(paare) == 1 and not re.search(verboten, n["html"])
                  and paare[0][3] in n["html"]))
    # Kürzung nicht gierig (Befund Code seo_kuerzen)
    s_lang = "Taschen und Uhren für jeden Tag " + "x" * 70 + " bei LuxeStyle Schweiz: Gratis-Versand ab CHF 50."
    n, f, o, r = lauf("x", seo_d=s_lang)
    t.append(("Kürzung behält «LuxeStyle Schweiz», wenn die Kurzform allein reicht",
              len(n["seo_d"]) <= 155 and "LuxeStyle Schweiz" in n["seo_d"] and "Gratis-Versand CH ab CHF 50" in n["seo_d"]))
    s_rueck = "Ab Lager " + "y" * 85 + " – Gratis-Versand ab CHF 50, 30 Tage Rückgabe."
    n, f, o, r = lauf("x", seo_d=s_rueck)
    t.append(("Kürzung behält «30 Tage Rückgabe» vor der Langform", len(n["seo_d"]) <= 155 and "30 Tage Rückgabe" in n["seo_d"]))
    # Rückweg je Regel (Befund Code --zurueck): ohne R4 bleibt R6, Tempo-Satz steht wieder
    n, f, o, r = lauf("ft-pluesch", "<p>Kuschelige Plüschtiere – schnelle Lieferung aus der Schweiz. Gratis-Versand ab CHF 50.</p>",
                      tiers={"T": "KAUM"}, ohne=frozenset({"R4"}))
    t.append(("bearbeiten(ohne R4): R6 bleibt, Tempo-Satz bleibt original",
              n["html"] == "<p>Kuschelige Plüschtiere – schnelle Lieferung aus der Schweiz. Gratis-Versand in der Schweiz ab CHF 50.</p>"))
    # Kette (Befund Code Ledger/--zurueck)
    ok_ = lambda a, b, rg="R6": {"alt": a, "neu": b, "regeln": {rg}, "kind": "ok"}  # noqa: E731
    offen_ = lambda a, b: {"alt": a, "neu": b, "regeln": {"R6"}, "kind": "offen"}  # noqa: E731
    k1 = kette([ok_("A", "B"), ok_("B", "C")], "C", "seo_d")
    k2 = kette([ok_("A", "B"), ok_("X", "C")], "C", "seo_d")
    t.append(("Kette verkettet nur bei alt(n+1) == neu(n); Bruch → nur bis zum Bruch",
              k1["start"] == "A" and not k1["bruch"] and k2["start"] == "X" and k2["bruch"]))
    k3, k4, k5 = (kette([offen_("A", "B")], "B", "seo_d"), kette([offen_("A", "B")], "A", "seo_d"),
                  kette([offen_("A", "B")], "Z", "seo_d"))
    t.append(("geplant ohne ok: live == neu → zurück · live == alt → nichts · sonst unklar",
              k3["start"] == "A" and k3["ende"] == "B" and k4.get("leer") and k5.get("unklar")))
    t.append(("R6-SEO-Paare: ≤ 155 Zeichen, Land drin, alter Text = Live 14.10.", all(len(n_) <= SEO_D_MAX and LAND_RX.search(n_)
                                                                                 for _, n_ in R6_SEO_PAARE.values())))
    n, f, o, r = lauf("fitness-geraete", "<p>🚚 Gratis-Versand ab CHF 50 · 🇨🇭 Schweizer Onlineshop</p>")
    t.append(("«… in der Schweiz ab CHF 50 · 🇨🇭 Schweizer Onlineshop» ist kein Doppel (kein Verstoss)",
              f and not pruefen({"titel": "X", "html": "<p>🚚 Gratis-Versand ab CHF 50 · 🇨🇭 Schweizer Onlineshop</p>", "seo_t": "",
                                 "seo_d": ""}, n)))
    # ── 14.10.2026 spät (Prüfung S3, 2. Runde): jede Zeile wäre gegen die Fassung vom Abend rot ──────────────────────────────────────
    a_html = '<p>Siehe <a href="/collections/halloween">Halloween</a> – Gratis-Versand ab CHF 50.</p>'
    n_html = '<p>Siehe <a href="/collections/halloween">Halloween</a> – Gratis-Versand in der Schweiz ab CHF 50.</p>'
    fremd = n_html.replace("/collections/halloween", "/collections/kostueme")
    k6 = kette([{"alt": a_html, "neu": n_html, "regeln": {"R6"}, "kind": "offen"}], fremd, "html")
    k7 = kette([{"alt": a_html, "neu": n_html, "regeln": {"R6"}, "kind": "offen"}], n_html.replace("&", "&amp;"), "html")
    t.append(("geplant ohne ok + fremde href (nur Markup) → Bruch/«unklar», NICHT mitgenommen", bool(k6.get("unklar"))))
    t.append(("geplant ohne ok: nur &amp;/Leerraum anders → Folgestand = neu", k7.get("ende") is not None and not k7.get("unklar")))
    t.append(("gleich() bleibt tolerant fürs Rücklesen (href zählt dort nicht), streng() nicht",
              gleich("html", fremd, n_html) and not streng("html", fremd, n_html)))
    for h_ in sorted({x[0] for x in INHALT_PAARE}):
        ps = [x for x in INHALT_PAARE if x[0] == h_]
        c_ = {"html": "<p>" + " | ".join(x[2] for x in ps if x[1] == "html") + "</p>" if any(x[1] == "html" for x in ps) else "",
              "seo_d": " ".join(x[2] for x in ps if x[1] == "seo_d"), "seo_t": " ".join(x[2] for x in ps if x[1] == "seo_t")}
        n, f, o, r = lauf(h_, c_["html"], seo_d=c_["seo_d"], seo_t=c_["seo_t"], tiers={"T": "KAUM"})
        rest_marke = "R9" in r["rot"] or "R9" in r["manuell"] or "R9" in r["premium"]
        t.append((f"R9 {h_}: alle Satzpaare greifen, keine Marke ohne Ware übrig",
                  all(x[3] in n[x[1]] for x in ps) and not rest_marke))
    t.append(("R9-Ersatztexte: keine gelistete Marke, kein «dauerhaft/schmerzarm/meistverkauft/meistgekauft/IPL/Laser»",
              all(not _vw().marken_im_text(x[3]) and not re.search(r"dauerhaft|schmerzarm|meistverkauft|meistgekauft|IPL|Laser", x[3])
                  for x in INHALT_PAARE)))
    # ── 14.10.2026 13:45 (Prüfung S3, Runde 3): genannte Ware hat eine Wache, fehlt sie live, wird das Satzpaar nicht gesetzt ─────────
    vw_ = _vw()
    gen = [(h_, rx, w) for h_, rx, w in vw_.KO_WARE if "im Ersatztext genannt" in w]
    neu_von = {}
    for h_, f_, _a, n_ in INHALT_PAARE:
        neu_von.setdefault(h_, []).append(vw_.koll_klartext(n_) if f_ == "html" else n_)
    for h_, n_ in R8_PAARE.items():
        neu_von.setdefault(h_, []).append(n_)
    t.append(("jede R9-Kollektion hat «genannt»-Einträge in ware_im_text, und jedes «genannt»-Muster trifft einen ihrer Ersatztexte",
              {x[0] for x in INHALT_PAARE} <= {g[0] for g in gen}
              and all(any(rx.search(n_) for n_ in neu_von.get(h_, [])) for h_, rx, _ in gen) and len(gen) >= 100))
    nein = [(h_, rx, w) for h_, rx, w in vw_.KO_WARE if "im Ersatztext genannt" not in w]
    t.append(("kein Ersatztext nennt Ware, die ware_im_text als fehlend führt (Nein-Einträge «(0/n)»)",
              not [(h_, w) for h_, rx, w in nein for n_ in neu_von.get(h_, []) if rx.search(n_)]))
    t.append(("R9 im SEO-Titel nur in Handfällen (R9_SEO_T ⊆ R4-Handfälle mit seo_t)",
              {x[0] for x in INHALT_PAARE if x[1] == "seo_t"} <= R9_SEO_T
              and R9_SEO_T <= {h_ for hs_, fe_, *_ in R4 if hs_ and "seo_t" in fe_ for h_ in hs_}))
    n, f, o, r = lauf("3d-drucker", seo_t="3D-Drucker & 3D-Stifte kaufen – Versand aus EU | LuxeStyle", tiers={"EU": "KAUM"})
    t.append(("3d-drucker SEO-Titel: R9 + R4 → «3D-Stifte & 3D-Drucker-Ersatzteile kaufen | LuxeStyle Schweiz» (≤ 70)",
              n["seo_t"] == "3D-Stifte & 3D-Drucker-Ersatzteile kaufen | LuxeStyle Schweiz" and len(n["seo_t"]) <= SEO_T_MAX))
    n, f, o, r = lauf("x", seo_t="3D-Drucker & 3D-Stifte kaufen")
    t.append(("SEO-Titel-Paar greift nur im eigenen Handle", not f and n["seo_t"] == "3D-Drucker & 3D-Stifte kaufen"))
    t5 = [x for x in INHALT_PAARE if x[0] == "top-5-start"]
    h5 = "<p>" + [x[2] for x in t5 if x[1] == "html"][0] + "</p>"
    s5 = [x[2] for x in t5 if x[1] == "seo_d"][0]
    n, f, o, r = lauf("top-5-start", h5, seo_d=s5, titel_akt=["Strand-Maxikleid «Bali»", "Boho-Kleid «Ibiza»"])
    t.append(("R9-Beleg: Ware live da → Satzpaare gesetzt, nichts offen",
              "luftige Sommerkleider" in n["html"] and "luftige Sommerkleider" in n["seo_d"] and not any("R9-WARE" in x for x in o)))
    n, f, o, r = lauf("top-5-start", h5, seo_d=s5, titel_akt=["Retro-Sonnenbrille UV400"])
    t.append(("R9-Beleg: Ware live weg → SEO-Paar (führt «Sommerkleider» neu ein) NICHT gesetzt; Text-Paar (alter Satz nennt sie schon) "
              "gesetzt; beides «offen» R9-WARE",
              n["seo_d"] == s5 and "luftige Sommerkleider" in n["html"] and "Jade-Roller" not in n["html"]
              and any("NICHT gesetzt" in x and "Sommerkleider" in x for x in o) and any("trotzdem gesetzt" in x for x in o)))
    kh = [x for x in INHALT_PAARE if x[0] == "kuschel-heizdecken"]
    hh = "<p>" + " | ".join(x[2] for x in kh if x[1] == "html") + "</p>"
    n, f, o, r = lauf("kuschel-heizdecken", hh, titel_akt=["Kuscheldecke mit Motiv", "Kuscheldecke Rot-Schwarz Kariert"])
    t.append(("R9-Beleg: ohne beheizte Decken fallen «Cashmere-Look», Beurer & Co. trotzdem weg (jeder alte Satz nennt die Heizdecke "
              "schon — es fällt nur Falsches weg), gemeldet",
              "Cashmere" not in n["html"] and "Beurer" not in n["html"] and "Die <strong>Kuscheldecken</strong> mit vielen Mustern" in n["html"]
              and any("trotzdem gesetzt" in x and "Heizdecken" in x for x in o) and not any("NICHT gesetzt" in x for x in o)))
    st = [x for x in INHALT_PAARE if x[0] == "strand"]
    hs = "<p>" + st[0][2] + " Gratis-Versand ab CHF 50.</p>"
    n, f, o, r = lauf("strand", hs, titel_akt=["Strandtuch & Badetuch bedrucken", "Rechteckiger Pool"])
    t.append(("R9-Beleg: strand ohne Luftmatratzen → Paar (nennt sie NEU) nicht gesetzt, R6 läuft weiter",
              st[0][2] in n["html"] and "Gratis-Versand in der Schweiz ab CHF 50" in n["html"]
              and any("NICHT gesetzt" in x and "Luftmatratzen" in x for x in o)))
    kp = [x for x in INHALT_PAARE if x[0] == "auto-kfz-zubehoer"]
    hk = "<p>" + " | ".join(x[2] for x in kp if x[1] == "html") + "</p>"
    sk = "Auto-Zubehör: Lenkradbezüge, Sitzkissen, Poliermaschinen, Reinigungssets, Dashcams und Becherhalter. Versand in die ganze Schweiz."
    tk = ["Kabellose Poliermaschine", "Auto Polier-Set 9-teilig", "Hartwachs-Versiegelung", "Stahlfelgen- und Nabenbürste",
          "Auto-Halterung mit Ladefunktion", "Doppel-Ladegerät"]
    n, f, o, r = lauf("auto-kfz-zubehoer", hk, seo_d=sk, titel_akt=tk)
    t.append(("R9-Beleg: ohne Dashcams bleiben die Dashcam-Paare gesetzt (alter Satz nennt Dashcams schon), «offen» meldet es",
              "Poliermaschinen, Polier-Sets, Wachse &amp; Reinigungsbürsten." in n["html"] and "Halterungen und Ladegeräte," in n["html"]
              and "Schneeketten" not in n["html"] and "Becherhalter" not in n["seo_d"]
              and any("Dashcams" in x and "trotzdem gesetzt" in x for x in o)))
    n, f, o, r = lauf("auto-kfz-zubehoer", hk, seo_d=sk, titel_akt=tk + ["4-Kamera-Dashcam"])
    t.append(("R9-Beleg: mit Dashcam alle Paare gesetzt (auch SEO «Becherhalter» weg)",
              "Dashcams &amp; weiteres Zubehör für unterwegs." in n["html"] and "Becherhalter" not in n["seo_d"] and not o))
    t.append(("R8 hightech-gadgets: nur aktive Ware (keine Action-Cams/Laser-Gravierer), ≤ 155",
              not re.search(r"Action|Laser", R8_PAARE["hightech-gadgets"]) and len(R8_PAARE["hightech-gadgets"]) <= SEO_D_MAX))
    bh = ("<p>Diese Artikel liegen in unserem Schweizer Lager – das genaue Lieferdatum steht auf jeder Produktseite und in der Kasse. "
          "Der übrige Katalog kommt direkt ab Werk (10–20 Werktage). Gratis-Versand ab CHF 50, 30 Tage Rückgabe.</p>")
    n, f, o, r = lauf("blitzversand-highlights", bh, tiers={"T": "KAUM", "L": "VOLL"})
    t.append(("blitzversand-highlights KAUM (0/22 profil): Gegensatz-Satz weg, Wächter-Rest R4 = 0",
              "übrige Katalog" not in n["html"] and "Werktage" not in n["html"] and "R4" not in r["rot"]))
    bs = ("<p>Vieles, was bei uns in der Schweiz liegt — meist in 2–3 Werktagen bei dir, das genaue Lieferdatum steht auf jeder "
          "Produktseite und in der Kasse. Was hier nicht steht, kommt direkt ab Werk und braucht 10–20 Werktage. Gratis-Versand in der "
          "Schweiz ab CHF 50, 30 Tage Rückgabe.</p>")
    n, f, o, r = lauf("blitzversand-schweiz", bs, tiers={"T": "VIEL"})
    t.append(("blitzversand-schweiz VIEL (69 %): «Ware ohne Schweizer Lager …» statt Gegensatz, Wächter-Rest R4 = 0",
              "Ware ohne Schweizer Lager kommt direkt ab Werk und braucht 10–20 Werktage." in n["html"]
              and "Was hier nicht steht" not in n["html"] and "R4" not in r["rot"]))
    n, f, o, r = lauf("blitzversand-schweiz", bs, tiers={"T": "VOLL"})
    t.append(("blitzversand-schweiz VOLL: Gegensatz bleibt (belegt)", "Was hier nicht steht" in n["html"] and "R4" not in r["rot"]))
    n, f, o, r = lauf("x", "<p>Pflege-Sets von Sonax und Rain-X.</p>")
    t.append(("Marke ohne Ware ohne Satzpaar → Wächter-Rest R9 (rot)", r["rot"].get("R9") == 1))
    t.append(("--zurueck-regel R9 erlaubt", argv_pruefen(["--zurueck-regel", "R9", "x"])[0] is None))
    t.append(("Rücklesen toleriert Entities (– ↔ &ndash;, ' ↔ &#39;), streng() auch — Tags/Attribute bleiben exakt",
              gleich("html", "<p>A – B's</p>", "<p>A &ndash; B&#39;s</p>") and streng("html", "<p>A – B's</p>", "<p>A &ndash; B&#39;s</p>")
              and not streng("html", '<p><a href="/a">x</a></p>', '<p><a href="/b">x</a></p>')
              and not gleich("html", "<p>&lt;p&gt;x</p>", "<p><p>x</p>")))
    t.append(("Argumente streng: unbekannte Flags → Exit 2", argv_pruefen(["--hilfe"])[0] == 2
              and argv_pruefen(["--zurueck-regel", "R2"])[0] == 2 and argv_pruefen(["--zurueck-regel", "R4", "x"])[0] is None
              and argv_pruefen([])[0] is None))
    ok = True
    for name, cnd in t:
        if laut or not cnd:
            print(("✓ " if cnd else "✗ ") + name)
        ok &= bool(cnd)
    print(f"SELBSTTEST {'BESTANDEN' if ok else 'FEHLGESCHLAGEN'} ({sum(1 for _, c in t if c)}/{len(t)})")
    return 0 if ok else 1


def argv_pruefen(args):
    """→ (exit|None, aktion, regel, handles). Streng (Lehre 14.10.: «herbst_kuratieren.py --help» lief scharf): unbekanntes «-…»
    → Hilfe + Exit 2; --help/-h → Hilfe, Exit 0; nichts schreibt ohne SCHARF=1."""
    if any(a in ("--help", "-h") for a in args):
        return 0, "hilfe", None, set()
    if not args:
        return None, "lauf", None, set()
    if args == ["--selbsttest"]:
        return None, "selbsttest", None, set()
    if args[0] == "--zurueck":
        rest = args[1:]
        if any(a.startswith("-") for a in rest):
            return 2, "hilfe", None, set()
        return None, "zurueck", None, set(rest)
    if args[0] == "--zurueck-regel":
        if len(args) < 2 or args[1] not in REGELN:
            return 2, "hilfe", None, set()
        rest = args[2:]
        if any(a.startswith("-") for a in rest):
            return 2, "hilfe", None, set()
        return None, "zurueck", args[1], set(rest)
    return 2, "hilfe", None, set()


if __name__ == "__main__":
    code, aktion, regel_arg, handles_arg = argv_pruefen(sys.argv[1:])
    if aktion == "hilfe":
        print(__doc__)
        if code:
            print(f"Unbekannte Argumente: {sys.argv[1:]} — nichts getan.", file=sys.stderr)
        sys.exit(code)
    if aktion == "selbsttest":
        sys.exit(selbsttest())
    if aktion == "zurueck":
        sys.exit(zurueck(handles_arg, regel_arg))
    sys.exit(main())
